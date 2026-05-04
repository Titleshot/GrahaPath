const swe = require('swisseph');
const { interpretChartPlanets } = require('./interpretationService');
const { getLifePhaseValidation } = require('./lifePhaseService');
const { buildPaywallPreview } = require('./paywallService');
const { generateRemedies } = require('./remedyService');

const ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces'
];

const NAKSHATRAS = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati'
];

const PLANETS = [
  { name: 'Sun', symbol: '☉', body: swe.SE_SUN },
  { name: 'Moon', symbol: '☽', body: swe.SE_MOON },
  { name: 'Mars', symbol: '♂', body: swe.SE_MARS },
  { name: 'Mercury', symbol: '☿', body: swe.SE_MERCURY },
  { name: 'Jupiter', symbol: '♃', body: swe.SE_JUPITER },
  { name: 'Venus', symbol: '♀', body: swe.SE_VENUS },
  { name: 'Saturn', symbol: '♄', body: swe.SE_SATURN },
  { name: 'Rahu', symbol: '☊', body: swe.SE_TRUE_NODE }
];

const SIDEREAL_FLAGS = swe.SEFLG_SWIEPH | swe.SEFLG_SIDEREAL | swe.SEFLG_SPEED;
const TROPICAL_FLAGS = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
const HOUSE_SYSTEM_PLACIDUS = 'P';
const FULL_CIRCLE_DEGREES = 360;
const SIGN_DEGREES = 30;
const NAKSHATRA_DEGREES = FULL_CIRCLE_DEGREES / 27;
const NODE_TYPE = 'True Node';
const CALCULATION_NOTES = {
  ephemeris: 'Swiss Ephemeris',
  zodiac: 'Sidereal',
  ayanamsa: 'Lahiri',
  houseSystem: 'Whole Sign',
  nodeType: NODE_TYPE
};

if (process.env.SWISSEPH_EPHE_PATH) {
  swe.swe_set_ephe_path(process.env.SWISSEPH_EPHE_PATH);
}

class AstrologyCalculationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AstrologyCalculationError';
    this.code = 'ASTROLOGY_CALCULATION_FAILED';
    this.statusCode = 422;
  }
}

function normalizeDegree(degree) {
  return ((degree % FULL_CIRCLE_DEGREES) + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES;
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function signFromLongitude(longitude) {
  return ZODIAC_SIGNS[Math.floor(normalizeDegree(longitude) / SIGN_DEGREES)];
}

function signDegree(longitude) {
  return normalizeDegree(longitude) % SIGN_DEGREES;
}

function nakshatraFromLongitude(longitude) {
  const index = Math.min(
    NAKSHATRAS.length - 1,
    Math.floor(normalizeDegree(longitude) / NAKSHATRA_DEGREES)
  );

  return NAKSHATRAS[index];
}

function wholeSignHouse(longitude, ascendantLongitude) {
  const planetSign = Math.floor(normalizeDegree(longitude) / SIGN_DEGREES);
  const ascendantSign = Math.floor(normalizeDegree(ascendantLongitude) / SIGN_DEGREES);

  return ((planetSign - ascendantSign + 12) % 12) + 1;
}

function toJulianDay(utcDateTime) {
  const decimalHour =
    utcDateTime.hour +
    utcDateTime.minute / 60 +
    utcDateTime.second / 3600 +
    utcDateTime.millisecond / 3600000;

  const result = swe.swe_julday(
    utcDateTime.year,
    utcDateTime.month,
    utcDateTime.day,
    decimalHour,
    swe.SE_GREG_CAL
  );

  return typeof result === 'number' ? result : result.julianDay;
}

function callSwissEphemeris(methodName, ...args) {
  return new Promise((resolve, reject) => {
    const method = swe[methodName];

    if (typeof method !== 'function') {
      reject(new AstrologyCalculationError(`Swiss Ephemeris method unavailable: ${methodName}`));
      return;
    }

    try {
      const maybeResult = method(...args, (callbackResult) => {
        if (callbackResult && callbackResult.error) {
          reject(new AstrologyCalculationError(callbackResult.error));
          return;
        }

        resolve(callbackResult);
      });

      if (maybeResult !== undefined) {
        if (maybeResult && maybeResult.error) {
          reject(new AstrologyCalculationError(maybeResult.error));
          return;
        }

        resolve(maybeResult);
      }
    } catch (error) {
      reject(new AstrologyCalculationError(error.message));
    }
  });
}

async function calculatePlanet(julianDay, planet) {
  const [tropicalResult, siderealResult] = await Promise.all([
    callSwissEphemeris('swe_calc_ut', julianDay, planet.body, TROPICAL_FLAGS),
    callSwissEphemeris('swe_calc_ut', julianDay, planet.body, SIDEREAL_FLAGS)
  ]);

  if (tropicalResult.error || siderealResult.error) {
    throw new AstrologyCalculationError(
      `Swiss Ephemeris failed for ${planet.name}: ${tropicalResult.error || siderealResult.error}`
    );
  }

  return {
    name: planet.name,
    symbol: planet.symbol,
    tropicalLongitude: normalizeDegree(tropicalResult.longitude),
    longitude: normalizeDegree(siderealResult.longitude),
    speed: siderealResult.longitudeSpeed
  };
}

async function calculateHouseCusps(julianDay, latitude, longitude) {
  // Swiss Ephemeris calculates the astronomical Ascendant through its house
  // routine. We request Placidus only to obtain that angle, then use whole-sign
  // houses for planet assignment because it is the standard Jyotish approach.
  const houses = await callSwissEphemeris(
    'swe_houses',
    julianDay,
    latitude,
    longitude,
    HOUSE_SYSTEM_PLACIDUS
  );

  if (houses.error) {
    throw new AstrologyCalculationError(`Swiss Ephemeris house calculation failed: ${houses.error}`);
  }

  return {
    ascendantTropical: normalizeDegree(houses.ascendant)
  };
}

function wholeSignCusps(ascendantLongitude) {
  const ascendantSignStart =
    Math.floor(normalizeDegree(ascendantLongitude) / SIGN_DEGREES) * SIGN_DEGREES;

  return Array.from({ length: 12 }, (_value, index) => {
    const degree = normalizeDegree(ascendantSignStart + index * SIGN_DEGREES);

    return {
      house: index + 1,
      degree: round(degree, 4),
      sign: signFromLongitude(degree)
    };
  });
}

function calculateKetu(rahu) {
  return {
    name: 'Ketu',
    symbol: '☋',
    tropicalLongitude: normalizeDegree(rahu.tropicalLongitude + 180),
    longitude: normalizeDegree(rahu.longitude + 180),
    speed: rahu.speed
  };
}

function formatPlanet(rawPlanet, ascendantLongitude) {
  return {
    name: rawPlanet.name,
    symbol: rawPlanet.symbol,
    degree: round(signDegree(rawPlanet.longitude), 2),
    absoluteDegree: round(rawPlanet.longitude, 4),
    sign: signFromLongitude(rawPlanet.longitude),
    house: wholeSignHouse(rawPlanet.longitude, ascendantLongitude),
    nakshatra: nakshatraFromLongitude(rawPlanet.longitude)
  };
}

function formatDebugPlanet(rawPlanet, ayanamsa) {
  return {
    name: rawPlanet.name,
    symbol: rawPlanet.symbol,
    tropicalLongitude: round(rawPlanet.tropicalLongitude, 6),
    lahiriAyanamsa: round(ayanamsa, 6),
    siderealLongitude: round(rawPlanet.longitude, 6),
    sign: signFromLongitude(rawPlanet.longitude),
    nakshatra: nakshatraFromLongitude(rawPlanet.longitude)
  };
}

async function generateBirthChart({
  name,
  place,
  location,
  timezone,
  localDateTime,
  utcDateTime,
  dateMetadata,
  includeDebug = false
}) {
  // Lahiri is the required Vedic ayanamsa. Swiss Ephemeris subtracts it when
  // SEFLG_SIDEREAL is used, so planet longitudes below are sidereal positions.
  swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);

  const julianDay = toJulianDay(utcDateTime);
  const ayanamsa = swe.swe_get_ayanamsa_ut(julianDay);
  const houses = await calculateHouseCusps(julianDay, location.latitude, location.longitude);
  const ascendantLongitude = normalizeDegree(houses.ascendantTropical - ayanamsa);

  const rawPlanets = await Promise.all(PLANETS.map((planet) => calculatePlanet(julianDay, planet)));
  const rahu = rawPlanets.find((planet) => planet.name === 'Rahu');
  const rawPlanetsWithKetu = [...rawPlanets, calculateKetu(rahu)];
  const allPlanets = rawPlanetsWithKetu.map((planet) => formatPlanet(planet, ascendantLongitude));
  const interpretations = interpretChartPlanets(allPlanets);
  const interpretedPlanets = allPlanets.map((planet, index) => ({
    ...planet,
    interpretation: interpretations[index]
  }));
  const lifePatternPreview = interpretations
    .filter((interpretation) => interpretation.reportLine)
    .slice(0, 3)
    .map((interpretation) => interpretation.reportLine);
  const lifePhaseValidation = getLifePhaseValidation();
  const paywallPreview = buildPaywallPreview();
  const remedies = generateRemedies({ planets: interpretedPlanets });

  const moon = interpretedPlanets.find((planet) => planet.name === 'Moon');
  const sun = interpretedPlanets.find((planet) => planet.name === 'Sun');
  const chart = {
    name,
    place,
    location: {
      displayName: location.displayName,
      latitude: location.latitude,
      longitude: location.longitude
    },
    timezone,
    ...dateMetadata,
    localDateTime: localDateTime.toISO(),
    utcDateTime: utcDateTime.toISO(),
    ascendant: signFromLongitude(ascendantLongitude),
    ascendantDegree: round(signDegree(ascendantLongitude), 2),
    ascendantAbsoluteDegree: round(ascendantLongitude, 4),
    moonSign: moon.sign,
    sunSign: sun.sign,
    ayanamsa: 'Lahiri',
    ayanamsaDegree: round(ayanamsa, 6),
    houseSystem: 'Whole Sign',
    nodeType: NODE_TYPE,
    calculationNotes: CALCULATION_NOTES,
    planets: interpretedPlanets,
    interpretations,
    lifePatternPreview,
    lifePhases: lifePhaseValidation.phases,
    lifePhaseTransition: lifePhaseValidation.transition,
    paywallPreview,
    remedies,
    remedyPreview: remedies,
    houseCusps: wholeSignCusps(ascendantLongitude),
    julianDay: round(julianDay, 6)
  };

  if (includeDebug) {
    chart.debug = {
      planets: rawPlanetsWithKetu.map((planet) => formatDebugPlanet(planet, ayanamsa))
    };
  }

  return chart;
}

module.exports = {
  AstrologyCalculationError,
  generateBirthChart
};

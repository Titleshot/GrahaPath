/**
 * Lazy-load swisseph so `node server.js` can start when the native addon
 * is not yet built (Windows: need Python + MSVC, then `npm rebuild swisseph`).
 */
let sweModule = null;

function getSwe() {
  if (!sweModule) {
    try {
      sweModule = require('swisseph');
    } catch (cause) {
      const err = new Error(
        'Swiss Ephemeris native module is missing. Install build tools (Python 3 + VS C++ workload), then run: npm rebuild swisseph'
      );
      err.code = 'SWISSEPH_LOAD_FAILED';
      err.cause = cause;
      throw err;
    }
    if (process.env.SWISSEPH_EPHE_PATH) {
      sweModule.swe_set_ephe_path(process.env.SWISSEPH_EPHE_PATH);
    }
  }
  return sweModule;
}

function getPlanetaryBodies() {
  const s = getSwe();
  return [
    { name: 'Sun', symbol: '☉', body: s.SE_SUN },
    { name: 'Moon', symbol: '☽', body: s.SE_MOON },
    { name: 'Mars', symbol: '♂', body: s.SE_MARS },
    { name: 'Mercury', symbol: '☿', body: s.SE_MERCURY },
    { name: 'Jupiter', symbol: '♃', body: s.SE_JUPITER },
    { name: 'Venus', symbol: '♀', body: s.SE_VENUS },
    { name: 'Saturn', symbol: '♄', body: s.SE_SATURN },
    { name: 'Rahu', symbol: '☊', body: s.SE_TRUE_NODE }
  ];
}

function tropicalFlags() {
  const s = getSwe();
  return s.SEFLG_SWIEPH | s.SEFLG_SPEED;
}

function siderealFlags() {
  const s = getSwe();
  return s.SEFLG_SWIEPH | s.SEFLG_SIDEREAL | s.SEFLG_SPEED;
}

const { interpretChartPlanets } = require('./interpretationService');
const { getLifePhaseValidation } = require('./lifePhaseService');
const { buildPaywallPreview } = require('./paywallService');
const { generateRemedies } = require('./remedyService');
const {
  generateAstroBrain,
  buildAstroBrainPublicPayload,
  buildAstroBrainDebugPayload
} = require('./astroBrain/astroBrainService');
const { buildCareerWealthDomain } = require('./astroBrain/careerWealthEngine');
const { buildTimeCalibration } = require('./astroBrain/timeCalibrationEngine');
const { buildPredictionQuality } = require('./predictionQualityService');
const { buildRemedyMapping } = require('./remedyMappingService');

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

function nakshatraPadaFromLongitude(longitude) {
  const withinNakshatra = normalizeDegree(longitude) % NAKSHATRA_DEGREES;
  return Math.min(4, Math.floor(withinNakshatra / (NAKSHATRA_DEGREES / 4)) + 1);
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

  const s = getSwe();
  const result = s.swe_julday(
    utcDateTime.year,
    utcDateTime.month,
    utcDateTime.day,
    decimalHour,
    s.SE_GREG_CAL
  );

  return typeof result === 'number' ? result : result.julianDay;
}

function callSwissEphemeris(methodName, ...args) {
  return new Promise((resolve, reject) => {
    const method = getSwe()[methodName];

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
    callSwissEphemeris('swe_calc_ut', julianDay, planet.body, tropicalFlags()),
    callSwissEphemeris('swe_calc_ut', julianDay, planet.body, siderealFlags())
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

  const tropicalCusps = Array.isArray(houses.house)
    ? houses.house.slice(0, 12).map((value) => normalizeDegree(value))
    : Array.isArray(houses.cusps)
      ? houses.cusps.slice(0, 12).map((value) => normalizeDegree(value))
      : [];

  return {
    ascendantTropical: normalizeDegree(houses.ascendant),
    tropicalCusps
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

function isWithinArc(longitude, start, end) {
  if (start <= end) {
    return longitude >= start && longitude < end;
  }
  return longitude >= start || longitude < end;
}

function activeBhavaHouse(longitude, siderealCusps) {
  if (!Array.isArray(siderealCusps) || siderealCusps.length < 12) {
    return null;
  }

  const degree = normalizeDegree(longitude);
  for (let i = 0; i < 12; i += 1) {
    const start = siderealCusps[i];
    const end = siderealCusps[(i + 1) % 12];
    if (isWithinArc(degree, start, end)) {
      return i + 1;
    }
  }

  return null;
}

function formatPlanet(rawPlanet, ascendantLongitude, siderealBhavaCusps) {
  return {
    name: rawPlanet.name,
    symbol: rawPlanet.symbol,
    degree: round(signDegree(rawPlanet.longitude), 2),
    absoluteDegree: round(rawPlanet.longitude, 4),
    sign: signFromLongitude(rawPlanet.longitude),
    house: wholeSignHouse(rawPlanet.longitude, ascendantLongitude),
    speed: round(rawPlanet.speed, 6),
    retrograde: Number(rawPlanet.speed) < 0,
    activeBhavaHouse: activeBhavaHouse(rawPlanet.longitude, siderealBhavaCusps),
    nakshatra: nakshatraFromLongitude(rawPlanet.longitude),
    nakshatraPada: nakshatraPadaFromLongitude(rawPlanet.longitude)
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

/**
 * When unset, transits prefer bhāva-chalit (Placidus sidereal cusps) if cusps are passed.
 * Set TRANSIT_PRIMARY_HOUSE=whole_sign_only to force whole-sign houses only.
 */
function transitHouseResolution(siderealLongitude, natalAscendantLongitude, siderealBhavaCusps) {
  const whole = wholeSignHouse(siderealLongitude, natalAscendantLongitude);
  const bhava =
    Array.isArray(siderealBhavaCusps) && siderealBhavaCusps.length >= 12
      ? activeBhavaHouse(siderealLongitude, siderealBhavaCusps)
      : null;
  const preferBhava =
    bhava != null && String(process.env.TRANSIT_PRIMARY_HOUSE || '').toLowerCase() !== 'whole_sign_only';
  const primary = preferBhava ? bhava : whole;
  return {
    houseWholeSign: whole,
    houseBhavaChalit: bhava,
    houseFromNatalAsc: primary,
    transitHouseMode: preferBhava ? 'bhava_chalit_sidereal' : 'whole_sign'
  };
}

async function buildTransitSnapshot({ natalAscendantLongitude, siderealBhavaCusps = null }) {
  const { DateTime } = require('luxon');
  const nowUtc = DateTime.utc();
  return buildTransitSnapshotAtUtc(nowUtc.toISO(), natalAscendantLongitude, { siderealBhavaCusps });
}

/** Sidereal transit snapshot at a specific UTC instant (for life-event rectification tests). */
async function buildTransitSnapshotAtUtc(utcIso, natalAscendantLongitude, options = {}) {
  const siderealBhavaCusps = options?.siderealBhavaCusps ?? null;
  const { DateTime } = require('luxon');
  const utc = typeof utcIso === 'string' ? DateTime.fromISO(utcIso, { zone: 'utc' }) : utcIso;
  if (!utc || !utc.isValid) {
    throw new AstrologyCalculationError('Invalid UTC instant for transit snapshot.');
  }

  const swe = getSwe();
  const jd = toJulianDay(utc);
  const ayanamsaAt = swe.swe_get_ayanamsa_ut(jd);

  const rawPlanets = await Promise.all(getPlanetaryBodies().map((planet) => calculatePlanet(jd, planet)));
  const rahu = rawPlanets.find((planet) => planet.name === 'Rahu');
  const withKetu = [...rawPlanets, calculateKetu(rahu)];

  return {
    generatedAt: utc.toISO(),
    transitHouseNote:
      siderealBhavaCusps && String(process.env.TRANSIT_PRIMARY_HOUSE || '').toLowerCase() !== 'whole_sign_only'
        ? 'Primary house column uses Lahiri sidereal Placidus cusps when available; see houseWholeSign for whole-sign reference.'
        : 'Primary house column uses whole-sign houses from natal ascendant.',
    planets: withKetu.map((p) => {
      const siderealLongitude = normalizeDegree(p.tropicalLongitude - ayanamsaAt);
      const hrs = transitHouseResolution(siderealLongitude, natalAscendantLongitude, siderealBhavaCusps);
      return {
        name: p.name,
        sign: signFromLongitude(siderealLongitude),
        absoluteDegree: round(siderealLongitude, 4),
        houseFromNatalAsc: hrs.houseFromNatalAsc,
        houseWholeSign: hrs.houseWholeSign,
        houseBhavaChalit: hrs.houseBhavaChalit,
        transitHouseMode: hrs.transitHouseMode
      };
    })
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
  const swe = getSwe();
  swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);

  const julianDay = toJulianDay(utcDateTime);
  const ayanamsa = swe.swe_get_ayanamsa_ut(julianDay);
  const houses = await calculateHouseCusps(julianDay, location.latitude, location.longitude);
  const ascendantLongitude = normalizeDegree(houses.ascendantTropical - ayanamsa);
  const siderealBhavaCusps = (houses.tropicalCusps || []).map((cusp) => normalizeDegree(cusp - ayanamsa));

  const rawPlanets = await Promise.all(
    getPlanetaryBodies().map((planet) => calculatePlanet(julianDay, planet))
  );
  const rahu = rawPlanets.find((planet) => planet.name === 'Rahu');
  const rawPlanetsWithKetu = [...rawPlanets, calculateKetu(rahu)];
  const allPlanets = rawPlanetsWithKetu.map((planet) =>
    formatPlanet(planet, ascendantLongitude, siderealBhavaCusps)
  );
  const interpretations = interpretChartPlanets(allPlanets);
  const interpretedPlanets = allPlanets.map((planet, index) => ({
    ...planet,
    interpretation: interpretations[index]
  }));
  const lifePatternPreview = interpretations
    .filter((interpretation) => interpretation.reportLine)
    .slice(0, 3)
    .map((interpretation) => interpretation.reportLine);
  const lifePhaseValidation = getLifePhaseValidation({
    ascendant: signFromLongitude(ascendantLongitude),
    planets: interpretedPlanets
  });
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
    bhavaChalit: {
      houseSystem: 'Placidus cusps from Swiss Ephemeris, shifted to sidereal Lahiri for active-house reference',
      siderealCusps: siderealBhavaCusps.map((degree, index) => ({
        house: index + 1,
        degree: round(degree, 4),
        sign: signFromLongitude(degree)
      })),
      caveat:
        'Bhava-chalit active house is provided as an auxiliary interpretive layer. Whole-sign houses remain primary for Jyotish framing.'
    },
    julianDay: round(julianDay, 6)
  };

  chart.transitsNow = await buildTransitSnapshot({
    natalAscendantLongitude: ascendantLongitude,
    siderealBhavaCusps
  });
  chart.timeCalibration = buildTimeCalibration(chart, chart.transitsNow);

  if (includeDebug) {
    chart.debug = {
      planets: rawPlanetsWithKetu.map((planet) => formatDebugPlanet(planet, ayanamsa))
    };
  }

  const astroFull = generateAstroBrain(chart);
  chart.careerWealth = buildCareerWealthDomain(chart, astroFull);
  chart.astroBrain = includeDebug
    ? buildAstroBrainDebugPayload(astroFull)
    : buildAstroBrainPublicPayload(astroFull);
  chart.predictionQuality = buildPredictionQuality(chart);
  chart.remedyMapping = buildRemedyMapping(chart);

  return chart;
}

module.exports = {
  AstrologyCalculationError,
  generateBirthChart,
  buildTransitSnapshotAtUtc
};

const { DateTime } = require('luxon');
const { geocodePlace, searchPlaceSuggestions } = require('../services/geocodeService');
const { getTimezoneForCoordinates } = require('../services/timezoneService');
const { generateBirthChart } = require('../services/astrologyService');
const { buildLifeEventVerification } = require('../services/astroBrain/rectificationEngine');
const { adjustPredictionQualityWithLifeEvents } = require('../services/predictionQualityService');
const { convertBsToAd, formatBsDate } = require('../services/dateConversionService');
const { scorePhaseResponses } = require('../services/lifePhaseService');
const { evaluateBirthTimeRectification, compareRectificationOffsets } = require('../services/timeRectificationService');
const { buildDailyGrahaWeatherFromTransit } = require('../services/dailyGrahaWeatherService');
const {
  buildIdentityHash,
  extractClientFingerprint
} = require('../services/antiBypassService');
const {
  issueSessionToken,
  buildSessionCookie,
  issueDeviceToken,
  verifyDeviceToken,
  readDeviceTokenFromRequest,
  buildDeviceCookie
} = require('../services/sessionTokenService');
const { applyClientChartAccess, snapshotNatalCore } = require('../services/chartClientRedaction');
const { buildPanchangaForDate } = require('../services/currentAstronomyService');
const { saveChartForEmail } = require('../services/premiumAccessService');
const { assignChartToUser, normalizeAccessId, createOrUpdateUser } = require('../services/authUserService');

const VALID_DATE_TYPES = new Set(['AD', 'BS']);

function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function isDemoPremiumUnlocked(req) {
  return String(req.headers['x-gp-demo-premium'] || '').toLowerCase() === 'true';
}

/** Preserved through free-tier redaction so Vimshottari age-timing can run in chat. */
function attachTimingCore(chart) {
  const moon = (chart.planets || []).find((p) => p?.name === 'Moon');
  chart.timingCore = {
    birthDateAD: chart.birthDateAD || null,
    localDateTime: chart.localDateTime || null,
    timezone: chart.timezone || null,
    moonAbsoluteDegree: Number.isFinite(Number(moon?.absoluteDegree)) ? Number(moon.absoluteDegree) : null,
    moonNakshatra: moon?.nakshatra || null
  };
  return chart;
}

function isValidTimezone(zone) {
  if (typeof zone !== 'string' || zone.trim().length === 0) {
    return false;
  }
  return DateTime.now().setZone(zone.trim()).isValid;
}

function hasExactLocation(body) {
  return (
    body?.location &&
    typeof body.location === 'object' &&
    Number.isFinite(body.location.latitude) &&
    Number.isFinite(body.location.longitude)
  );
}

function buildDateMetadata({
  dateType,
  birthDateAD,
  birthDateBS,
  calculatedFrom,
  bsDate,
  exactLocationProvided,
  timeUnknown
}) {
  return {
    inputDateType: dateType,
    birthDateAD,
    birthDateBS: dateType === 'BS' ? birthDateBS : null,
    calculatedFrom,
    originalBsDate: dateType === 'BS' ? formatBsDate(bsDate.year, bsDate.month, bsDate.day) : null,
    locationInputMode: exactLocationProvided ? 'exact_coordinates' : 'place_geocoded',
    timeInputMode: timeUnknown === true ? 'unknown_assumed_noon' : 'exact_time'
  };
}

function summarizeTimeSensitivity(baseChart, shiftedCharts = []) {
  const baseline = baseChart?.planets || [];
  const shifted = shiftedCharts.filter(Boolean);
  if (!shifted.length) return null;

  let ascChanged = 0;
  let moonHouseChanged = 0;
  let totalHouseShifts = 0;
  let comparedRows = 0;

  shifted.forEach((chart) => {
    if (chart.ascendant !== baseChart.ascendant) ascChanged += 1;
    const moonA = (baseChart.planets || []).find((p) => p.name === 'Moon');
    const moonB = (chart.planets || []).find((p) => p.name === 'Moon');
    if (moonA && moonB && moonA.house !== moonB.house) moonHouseChanged += 1;

    (chart.planets || []).forEach((p) => {
      const b = baseline.find((x) => x.name === p.name);
      if (!b) return;
      comparedRows += 1;
      if (b.house !== p.house) totalHouseShifts += 1;
    });
  });

  const houseShiftRate = comparedRows ? totalHouseShifts / comparedRows : 0;
  const unstable = ascChanged > 0 || moonHouseChanged > 0 || houseShiftRate > 0.18;

  return {
    testedOffsetsMinutes: shifted.map((c) => c?.timeSensitivityOffsetMinutes).filter(Number.isFinite),
    unstable,
    confidenceImpact: unstable ? 'reduce_house_confidence' : 'stable',
    metrics: {
      ascendantChangedInVariants: ascChanged,
      moonHouseChangedInVariants: moonHouseChanged,
      houseShiftRate: Number(houseShiftRate.toFixed(3))
    },
    note: unstable
      ? 'House-level interpretation appears sensitive to small birth-time shifts; prioritize broader and moon/dasha anchored themes.'
      : 'Core house structure is stable across +/-20 minute sensitivity checks.'
  };
}

function validateChartRequest(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return ['Request body must be a JSON object.'];
  }

  if (!body.name || typeof body.name !== 'string') {
    errors.push('name is required and must be a string.');
  }

  const dateType = body.dateType || 'AD';

  if (!VALID_DATE_TYPES.has(dateType)) {
    errors.push('dateType must be either AD or BS.');
  }

  if (dateType === 'AD' && (!body.date || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date))) {
    errors.push('date is required in YYYY-MM-DD format for AD input.');
  }

  if (dateType === 'BS') {
    if (!body.bsDate || typeof body.bsDate !== 'object') {
      errors.push('bsDate is required when dateType is BS.');
    } else {
      const { year, month, day } = body.bsDate;

      if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        errors.push('bsDate.year, bsDate.month, and bsDate.day must be numbers.');
      }
    }
  }

  const hasTimeString = typeof body.time === 'string' && body.time.trim().length > 0;
  if (!hasTimeString && body.timeUnknown !== true) {
    errors.push('time is required in HH:MM 24-hour format (or set timeUnknown=true).');
  }
  if (hasTimeString && !/^\d{2}:\d{2}$/.test(body.time)) {
    errors.push('time must be in HH:MM 24-hour format.');
  }

  const exactLocationProvided = hasExactLocation(body);
  if (!exactLocationProvided && (!body.place || typeof body.place !== 'string')) {
    errors.push('Provide either place (string) or location.latitude/location.longitude.');
  }

  if (typeof body.name === 'string' && body.name.trim().length === 0) {
    errors.push('name cannot be empty.');
  }

  if (!exactLocationProvided && typeof body.place === 'string' && body.place.trim().length === 0) {
    errors.push('place cannot be empty.');
  }

  if (body.location !== undefined) {
    if (!body.location || typeof body.location !== 'object') {
      errors.push('location must be an object when provided.');
    } else {
      const { latitude, longitude, timezone } = body.location;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        errors.push('location.latitude and location.longitude must be valid numbers.');
      }
      if (timezone !== undefined && !isValidTimezone(timezone)) {
        errors.push('location.timezone must be a valid IANA timezone (example: Asia/Kathmandu).');
      }
    }
  }

  return errors;
}

async function buildChartFromRequest(body, options = {}) {
  const validationErrors = validateChartRequest(body);

  if (validationErrors.length > 0) {
    const error = new Error('Invalid chart request.');
    error.code = 'INVALID_CHART_REQUEST';
    error.statusCode = 400;
    error.details = validationErrors;
    throw error;
  }

  const exactLocationProvided = hasExactLocation(body);

  const { name, place } = body;
  const time = body.timeUnknown === true ? '12:00' : body.time;
  const dateType = body.dateType || 'AD';
  let birthDateAD = body.date;
  let birthDateBS = null;
  let calculatedFrom = 'AD Gregorian date';

  if (dateType === 'BS') {
    const convertedDate = convertBsToAd(body.bsDate.year, body.bsDate.month, body.bsDate.day);
    birthDateAD = convertedDate.adDate;
    birthDateBS = convertedDate.bsDate;
    calculatedFrom = 'AD Gregorian date after BS conversion';
  }

  let location;
  let timezone;
  let resolvedPlace;

  if (hasExactLocation(body)) {
    const latitude = Number(body.location.latitude);
    const longitude = Number(body.location.longitude);
    location = {
      place: typeof place === 'string' ? place.trim() : '',
      displayName:
        typeof body.location.displayName === 'string' && body.location.displayName.trim().length > 0
          ? body.location.displayName.trim()
          : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      latitude,
      longitude
    };
    timezone =
      typeof body.location.timezone === 'string' && body.location.timezone.trim().length > 0
        ? body.location.timezone.trim()
        : getTimezoneForCoordinates(latitude, longitude);
    resolvedPlace =
      typeof place === 'string' && place.trim().length > 0 ? place.trim() : location.displayName;
  } else {
    location = await geocodePlace(place.trim());
    timezone = getTimezoneForCoordinates(location.latitude, location.longitude);
    resolvedPlace = place.trim();
  }

  const localDateTime = DateTime.fromFormat(`${birthDateAD} ${time}`, 'yyyy-MM-dd HH:mm', {
    zone: timezone,
    setZone: true
  });

  if (!localDateTime.isValid) {
    const error = new Error('Invalid birth date or time.');
    error.code = 'INVALID_BIRTH_DATETIME';
    error.statusCode = 400;
    error.details = [localDateTime.invalidExplanation || localDateTime.invalidReason];
    throw error;
  }

  const dateMetadata = buildDateMetadata({
    dateType,
    birthDateAD,
    birthDateBS,
    calculatedFrom,
    bsDate: body.bsDate,
    exactLocationProvided,
    timeUnknown: body.timeUnknown
  });

  const chart = await generateBirthChart({
    name: name.trim(),
    place: resolvedPlace,
    location,
    timezone,
    localDateTime,
    utcDateTime: localDateTime.toUTC(),
    dateMetadata,
    includeDebug: options.includeDebug === true
  });

  if (body.timeUnknown !== true && options.includeSensitivity !== false) {
    const offsets = [-20, 20];
    const variants = await Promise.all(
      offsets.map(async (offset) => {
        const shiftedLocal = localDateTime.plus({ minutes: offset });
        const shifted = await generateBirthChart({
          name: name.trim(),
          place: resolvedPlace,
          location,
          timezone,
          localDateTime: shiftedLocal,
          utcDateTime: shiftedLocal.toUTC(),
          dateMetadata,
          includeDebug: false
        });
        shifted.timeSensitivityOffsetMinutes = offset;
        return shifted;
      })
    );
    chart.timeSensitivity = summarizeTimeSensitivity(chart, variants);
    const baseCandidate = { ...chart };
    chart.rectificationOffsetCandidates = [{ offsetMinutes: 0, chart: baseCandidate }, ...variants.map((v) => ({
      offsetMinutes: v.timeSensitivityOffsetMinutes,
      chart: v
    }))];
  }

  return chart;
}

function buildAccuracySummary(chart) {
  const locationInputMode = chart.locationInputMode || 'place_geocoded';
  const timeInputMode = chart.timeInputMode || 'exact_time';

  if (timeInputMode === 'unknown_assumed_noon') {
    return {
      analysisMode: 'moon_based',
      confidenceLevel: 'low',
      accuracyNotes: [
        'Birth time is missing or uncertain; noon was used as a placeholder for calculations.',
        'Moon-based and broad timing themes are more reliable than house-level precision.',
        'Provide exact birth time for high-confidence ascendant and house-based interpretation.'
      ]
    };
  }

  if (locationInputMode === 'exact_coordinates') {
    const unstableBySensitivity = chart?.timeSensitivity?.unstable === true;
    return {
      analysisMode: 'full',
      confidenceLevel: unstableBySensitivity ? 'medium' : 'high',
      accuracyNotes: [
        'Exact coordinates and timezone context were used for chart calculation.',
        unstableBySensitivity
          ? 'Birth-time sensitivity test shows some house drift in +/-20 minutes; treat house-level claims with moderate confidence.'
          : 'Ascendant and house-level interpretation are enabled with high confidence.'
      ]
    };
  }

  return {
    analysisMode: 'full',
    confidenceLevel: 'medium',
    accuracyNotes: [
      'Location was resolved from place text via geocoding.',
      'Results are usually reliable, but exact coordinates can improve house-level precision.'
    ]
  };
}

function handleChartError(error, res, next) {
  if (error.code === 'INVALID_CHART_REQUEST' || error.code === 'INVALID_BIRTH_DATETIME') {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details
    });
  }

  if (error.code === 'GEOCODE_NOT_FOUND' || error.code === 'GEOCODE_PROVIDER_FAILED') {
    return res.status(error.code === 'GEOCODE_NOT_FOUND' ? 404 : 422).json({
      error: 'Place could not be geocoded.',
      details: [error.message]
    });
  }

  if (error.code === 'TIMEZONE_LOOKUP_FAILED' || error.code === 'ASTROLOGY_CALCULATION_FAILED') {
    return res.status(422).json({
      error: 'Chart could not be generated.',
      details: [error.message]
    });
  }

  if (error.code === 'SWISSEPH_LOAD_FAILED') {
    return res.status(503).json({
      error: 'Swiss Ephemeris is not available on this server.',
      details: [error.message]
    });
  }

  return next(error);
}

async function generateChart(req, res, next) {
  try {
    const demoPremium = isDemoPremiumUnlocked(req);
    const clientFingerprint = extractClientFingerprint(req);
    const { profileHash } = buildIdentityHash(req.body || {}, clientFingerprint);
    const assignedProfileHash = String(req.authUser?.assignedProfileHash || '').trim();
    if (assignedProfileHash && assignedProfileHash !== profileHash) {
      return res.status(403).json({
        error: 'ProfileAccessDenied',
        message: 'This login is bound to a different chart profile.'
      });
    }

    const chart = await buildChartFromRequest(req.body);
    chart.profileHash = profileHash;
    const sessionToken = issueSessionToken({ profileHash, fp: clientFingerprint.slice(0, 64) });
    const cookies = [buildSessionCookie(sessionToken)];
    const existingDevice = verifyDeviceToken(readDeviceTokenFromRequest(req));
    if (!existingDevice.valid) {
      const deviceToken = issueDeviceToken({
        fp: clientFingerprint.slice(0, 64)
      });
      cookies.push(buildDeviceCookie(deviceToken));
    }
    res.setHeader('Set-Cookie', cookies);
    chart.accuracy = buildAccuracySummary(chart);
    const lifeEvents = Array.isArray(req.body?.lifeEvents) ? req.body.lifeEvents : [];
    chart.timeRectification = evaluateBirthTimeRectification(chart, lifeEvents);
    if (lifeEvents.length > 0 && Array.isArray(chart.rectificationOffsetCandidates)) {
      chart.timeRectification.offsetComparison = compareRectificationOffsets(chart.rectificationOffsetCandidates, lifeEvents);
    }
    delete chart.rectificationOffsetCandidates;

    if (lifeEvents.length > 0) {
      const verification = await buildLifeEventVerification(chart, lifeEvents);
      if (verification) {
        chart.lifeEventVerification = verification;
        adjustPredictionQualityWithLifeEvents(chart);
      }
    }

    if (!chart.predictionQuality) {
      chart.predictionQuality = {
        inputConfidence: { score: 0, level: 'low', note: 'Prediction quality unavailable.' },
        logicDepthScore: { score: 0, note: 'Prediction quality unavailable.' },
        timingStrengthScore: { score: 0, note: 'Prediction quality unavailable.' },
        personalizationScore: { score: 0, note: 'Prediction quality unavailable.' },
        ashtakavargaSavScore: { score: 0, note: 'Prediction quality unavailable.' },
        overallQuality: { score: 0, note: 'Prediction quality unavailable.', weights: {} }
      };
    }

    attachTimingCore(chart);

    chart.natalCore = snapshotNatalCore(chart);
    if (!demoPremium) {
      applyClientChartAccess(chart);
    } else {
      chart.access = { deepData: true, tier: 'full' };
    }

    if (typeof req.body?.email === 'string' && req.body.email.trim().length > 0) {
      await saveChartForEmail({
        email: req.body.email.trim(),
        chart
      });
    }

    chart.sessionToken = sessionToken;
    const assignAccessId = normalizeAccessId(req.body?.assignAccessId || '');
    if (assignAccessId && String(req.authUser?.role || '') === 'admin') {
      const providedPassword = String(req.body?.assignPassword || '').trim();
      const issuedPassword = providedPassword || generateTempPassword(12);
      const displayName = String(req.body?.assignDisplayName || req.body?.name || '').trim();
      createOrUpdateUser({
        accessId: assignAccessId,
        password: issuedPassword,
        displayName,
        assignedProfileHash: profileHash,
        role: 'user',
        insightsLimit: 55
      });
      assignChartToUser(assignAccessId, chart);
      chart.adminProvisioning = {
        accessId: assignAccessId,
        issuedPassword,
        note: 'Share these credentials with the specific user.'
      };
    }
    return res.json(chart);
  } catch (error) {
    return handleChartError(error, res, next);
  }
}

async function generateChartReport(req, res, next) {
  try {
    const { buildChartReportPdf, safeFilename } = require('../services/chartReport/chartReportPdfService');
    let chart = req.body?.chart;
    const hasPlanets = chart && typeof chart === 'object' && Array.isArray(chart.planets) && chart.planets.length > 0;
    if (!hasPlanets) {
      chart = await buildChartFromRequest(req.body || {});
      attachTimingCore(chart);
    }
    const pdf = await buildChartReportPdf(chart);
    const filename = `GrahaPath-Report-${safeFilename(chart.name)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(pdf.length));
    return res.send(pdf);
  } catch (error) {
    if (error?.statusCode === 400) {
      return res.status(400).json({
        error: 'Chart report failed.',
        details: [error.message]
      });
    }
    return handleChartError(error, res, next);
  }
}

async function debugChart(req, res, next) {
  try {
    const chart = await buildChartFromRequest(req.body, { includeDebug: true });
    return res.json(chart);
  } catch (error) {
    return handleChartError(error, res, next);
  }
}

async function placeSuggestions(req, res) {
  try {
    const query = typeof req.query?.q === 'string' ? req.query.q : '';
    const suggestions = await searchPlaceSuggestions(query, 6);
    return res.json({ suggestions });
  } catch (error) {
    return res.status(422).json({
      error: 'Place suggestions failed.',
      details: [error?.message || 'Unable to fetch place suggestions.']
    });
  }
}

function validateLifePhases(req, res) {
  try {
    const responses = req.body?.responses || {};
    const responseList = Array.isArray(responses)
      ? responses
      : Object.entries(responses).map(([phaseId, value]) => ({ phaseId, value }));
    const result = scorePhaseResponses(responseList);

    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid phase validation request.',
      details: [error.message]
    });
  }
}

async function dailyWeather(req, res) {
  try {
    const chart = req.body?.chart;
    if (!chart || typeof chart !== 'object') {
      return res.status(400).json({
        error: 'Invalid weather request.',
        details: ['Request body must include chart object.']
      });
    }
    const dailyGrahaWeather = await buildDailyGrahaWeatherFromTransit(chart);
    return res.json({ dailyGrahaWeather });
  } catch (error) {
    return res.status(400).json({
      error: 'Daily weather generation failed.',
      details: [error.message]
    });
  }
}

async function panchanga(req, res) {
  try {
    const requestedDate =
      typeof req.query?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : DateTime.now().setZone('Asia/Kathmandu').toISODate();
    const payload = await buildPanchangaForDate(requestedDate);
    return res.json(payload);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      error: 'Panchanga calculation failed.',
      details: [error.message]
    });
  }
}

module.exports = {
  buildChartFromRequest,
  debugChart,
  generateChart,
  generateChartReport,
  placeSuggestions,
  validateLifePhases,
  dailyWeather,
  panchanga
};

const { DateTime } = require('luxon');
const { geocodePlace } = require('../services/geocodeService');
const { getTimezoneForCoordinates } = require('../services/timezoneService');
const { generateBirthChart } = require('../services/astrologyService');
const { convertBsToAd, formatBsDate } = require('../services/dateConversionService');
const { scorePhaseResponses } = require('../services/lifePhaseService');

const VALID_DATE_TYPES = new Set(['AD', 'BS']);

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

  if (!body.time || typeof body.time !== 'string' || !/^\d{2}:\d{2}$/.test(body.time)) {
    errors.push('time is required in HH:MM 24-hour format.');
  }

  if (!body.place || typeof body.place !== 'string') {
    errors.push('place is required and must be a string.');
  }

  if (typeof body.name === 'string' && body.name.trim().length === 0) {
    errors.push('name cannot be empty.');
  }

  if (typeof body.place === 'string' && body.place.trim().length === 0) {
    errors.push('place cannot be empty.');
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

  const { name, time, place } = body;
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

  const location = await geocodePlace(place.trim());
  const timezone = getTimezoneForCoordinates(location.latitude, location.longitude);

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

  return generateBirthChart({
    name: name.trim(),
    place: place.trim(),
    location,
    timezone,
    localDateTime,
    utcDateTime: localDateTime.toUTC(),
    dateMetadata: {
      inputDateType: dateType,
      birthDateAD,
      birthDateBS: dateType === 'BS' ? birthDateBS : null,
      calculatedFrom,
      originalBsDate: dateType === 'BS' ? formatBsDate(body.bsDate.year, body.bsDate.month, body.bsDate.day) : null
    },
    includeDebug: options.includeDebug === true
  });
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

  return next(error);
}

async function generateChart(req, res, next) {
  try {
    const chart = await buildChartFromRequest(req.body);

    return res.json(chart);
  } catch (error) {
    return handleChartError(error, res, next);
  }
}

async function debugChart(req, res, next) {
  try {
    const chart = await buildChartFromRequest(req.body, { includeDebug: true });

    return res.json({
      name: chart.name,
      place: chart.place,
      timezone: chart.timezone,
      localDateTime: chart.localDateTime,
      utcDateTime: chart.utcDateTime,
      julianDay: chart.julianDay,
      calculationNotes: chart.calculationNotes,
      debugPlanets: chart.debug.planets
    });
  } catch (error) {
    return handleChartError(error, res, next);
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

module.exports = {
  debugChart,
  generateChart,
  validateLifePhases
};

const { DateTime } = require('luxon');
const { geocodePlace } = require('../services/geocodeService');
const { getTimezoneForCoordinates } = require('../services/timezoneService');
const { generateBirthChart } = require('../services/astrologyService');

function validateChartRequest(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return ['Request body must be a JSON object.'];
  }

  if (!body.name || typeof body.name !== 'string') {
    errors.push('name is required and must be a string.');
  }

  if (!body.date || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    errors.push('date is required in YYYY-MM-DD format.');
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

  const { name, date, time, place } = body;
  const location = await geocodePlace(place.trim());
  const timezone = getTimezoneForCoordinates(location.latitude, location.longitude);

  const localDateTime = DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm', {
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

module.exports = {
  debugChart,
  generateChart
};

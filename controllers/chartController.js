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

async function generateChart(req, res, next) {
  try {
    const validationErrors = validateChartRequest(req.body);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid chart request.',
        details: validationErrors
      });
    }

    const { name, date, time, place } = req.body;
    const location = await geocodePlace(place.trim());
    const timezone = getTimezoneForCoordinates(location.latitude, location.longitude);

    const localDateTime = DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm', {
      zone: timezone,
      setZone: true
    });

    if (!localDateTime.isValid) {
      return res.status(400).json({
        error: 'Invalid birth date or time.',
        details: [localDateTime.invalidExplanation || localDateTime.invalidReason]
      });
    }

    const utcDateTime = localDateTime.toUTC();
    const chart = await generateBirthChart({
      name: name.trim(),
      place: place.trim(),
      location,
      timezone,
      localDateTime,
      utcDateTime
    });

    return res.json(chart);
  } catch (error) {
    if (error.code === 'GEOCODE_NOT_FOUND') {
      return res.status(404).json({
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
}

module.exports = {
  generateChart
};

const tzLookup = require('tz-lookup');

function getTimezoneForCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const error = new Error('Latitude and longitude are required for timezone lookup.');
    error.code = 'TIMEZONE_LOOKUP_FAILED';
    error.statusCode = 400;
    throw error;
  }

  try {
    return tzLookup(latitude, longitude);
  } catch (lookupError) {
    const error = new Error('Unable to determine timezone for the provided coordinates.');
    error.code = 'TIMEZONE_LOOKUP_FAILED';
    error.statusCode = 422;
    error.details = lookupError.message;
    throw error;
  }
}

module.exports = {
  getTimezoneForCoordinates
};

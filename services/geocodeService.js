const axios = require('axios');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

class GeocodingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GeocodingError';
    this.code = 'GEOCODE_NOT_FOUND';
    this.statusCode = 422;
  }
}

async function geocodePlace(place) {
  const normalizedPlace = typeof place === 'string' ? place.trim() : '';

  if (!normalizedPlace) {
    throw new GeocodingError('Place is required.');
  }

  const response = await axios.get(NOMINATIM_URL, {
    params: {
      q: normalizedPlace,
      format: 'json',
      limit: 1,
      addressdetails: 1
    },
    headers: {
      // Nominatim requires a useful User-Agent for operational contact.
      'User-Agent': 'GrahaPath/1.0 (birth-chart-calculation)'
    },
    timeout: 10000
  });

  const [match] = response.data || [];

  if (!match) {
    throw new GeocodingError(`Unable to resolve place: ${normalizedPlace}`);
  }

  return {
    place: normalizedPlace,
    displayName: match.display_name,
    latitude: Number.parseFloat(match.lat),
    longitude: Number.parseFloat(match.lon)
  };
}

module.exports = {
  GeocodingError,
  geocodePlace
};

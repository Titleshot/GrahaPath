const axios = require('axios');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

class GeocodingError extends Error {
  constructor(message, code = 'GEOCODE_NOT_FOUND') {
    super(message);
    this.name = 'GeocodingError';
    this.code = code;
    this.statusCode = 422;
  }
}

async function geocodePlace(place) {
  const normalizedPlace = typeof place === 'string' ? place.trim() : '';

  if (!normalizedPlace) {
    throw new GeocodingError('Place is required.');
  }

  let response;

  try {
    response = await axios.get(NOMINATIM_URL, {
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
  } catch (error) {
    throw new GeocodingError(
      `Geocoding provider failed for place: ${normalizedPlace}`,
      'GEOCODE_PROVIDER_FAILED'
    );
  }

  const [match] = response.data || [];

  if (!match) {
    throw new GeocodingError(`Unable to resolve place: ${normalizedPlace}`);
  }

  const latitude = Number.parseFloat(match.lat);
  const longitude = Number.parseFloat(match.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new GeocodingError(`Geocoding provider returned invalid coordinates for: ${normalizedPlace}`);
  }

  return {
    place: normalizedPlace,
    displayName: match.display_name,
    latitude,
    longitude
  };
}

module.exports = {
  GeocodingError,
  geocodePlace
};

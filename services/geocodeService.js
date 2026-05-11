const axios = require('axios');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const PHOTON_URL = 'https://photon.komoot.io/api';
const MIN_IMPORTANCE = 0.02;
const MIN_TOKEN_OVERLAP = 0.35;
const STRONG_TOKEN_OVERLAP = 0.6;
const MIN_QUERY_CHARS = 5;
const SUGGESTION_LIMIT = 5;
const SOUTH_ASIA_COUNTRY_CODES = new Set(['np', 'in', 'bt', 'bd', 'pk', 'lk']);
const MAJOR_SETTLEMENT_TYPES = new Set(['city', 'town', 'village']);
const REGIONAL_TYPES = new Set(['administrative', 'state', 'county', 'province', 'region']);
const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL || 'radheradhe742@proton.me';

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
  if (normalizedPlace.length < MIN_QUERY_CHARS) {
    throw new GeocodingError('Place is too short. Please enter at least City, Country.');
  }
  if (!looksLikePlaceInput(normalizedPlace)) {
    throw new GeocodingError('Please enter a complete place like "City, Country".');
  }

  let match = null;

  try {
    const response = await requestNominatim(
      {
        q: normalizedPlace,
        format: 'json',
        limit: 5,
        addressdetails: 1,
        extratags: 1,
        'accept-language': 'en'
      },
      2
    );
    const matches = Array.isArray(response.data) ? response.data : [];
    match = selectBestMatch(normalizedPlace, matches);
  } catch (error) {
    console.warn(`[GrahaPath] Nominatim geocode failed: ${error?.message || error}`);
  }

  if (!match) {
    try {
      const photonResult = await geocodePlacePhoton(normalizedPlace);
      if (photonResult) return photonResult;
    } catch (error) {
      console.warn(`[GrahaPath] Photon geocode fallback failed: ${error?.message || error}`);
    }
  }

  if (!match) {
    throw new GeocodingError(
      `Geocoding failed for: ${normalizedPlace}. Try a more specific place like "Kathmandu, Nepal".`,
      'GEOCODE_PROVIDER_FAILED'
    );
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

async function searchPlaceSuggestions(query, limit = 6) {
  const normalizedQuery = typeof query === 'string' ? query.trim() : '';
  if (normalizedQuery.length < 3) {
    return [];
  }

  let response;
  try {
    response = await requestNominatim({
      q: normalizedQuery,
      format: 'json',
      limit: Math.max(1, Math.min(10, limit)),
      addressdetails: 1,
      extratags: 1,
      'accept-language': 'en',
      viewbox: '68,39,98,5',
      bounded: 0
    });
  } catch (error) {
    const status = error?.response?.status;
    const code = error?.code;
    console.warn(`[GrahaPath] Nominatim place search failed: status=${status || 'n/a'} code=${code || 'n/a'} — ${error?.message || error}`);
    return [];
  }

  const matches = Array.isArray(response.data) ? response.data : [];
  const requestedLimit = Math.max(1, Math.min(SUGGESTION_LIMIT, limit));

  const mapped = matches
    .map((candidate) => ({
      candidate,
      displayName: candidate.display_name,
      latitude: Number.parseFloat(candidate.lat),
      longitude: Number.parseFloat(candidate.lon),
      importance: Number(candidate.importance) || 0,
      overlap: tokenOverlapScore(normalizedQuery, candidate.display_name || ''),
      score: scoreMatch(normalizedQuery, candidate),
      countryCode: String(candidate?.address?.country_code || '').toLowerCase(),
      placeType: String(candidate?.type || '').toLowerCase()
    }))
    .filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude));

  const preferred = mapped
    .filter((row) => MAJOR_SETTLEMENT_TYPES.has(row.placeType) || REGIONAL_TYPES.has(row.placeType))
    .sort((a, b) => scoreSuggestionRow(b) - scoreSuggestionRow(a));

  const fallback = mapped
    .filter((row) => !MAJOR_SETTLEMENT_TYPES.has(row.placeType) && !REGIONAL_TYPES.has(row.placeType))
    .sort((a, b) => scoreSuggestionRow(b) - scoreSuggestionRow(a));

  const nominatimResults = [...preferred, ...fallback]
    .slice(0, requestedLimit)
    .map((row) => ({
      displayName: row.displayName,
      latitude: row.latitude,
      longitude: row.longitude
    }));

  if (nominatimResults.length > 0) return nominatimResults;

  return searchPlaceSuggestionsPhoton(normalizedQuery, requestedLimit);
}

async function geocodePlacePhoton(place) {
  try {
    const response = await axios.get(PHOTON_URL, {
      params: { q: place, limit: 3, lang: 'en' },
      headers: { 'User-Agent': 'GrahaPath/1.0 (birth-chart-calculation; radheradhe742@proton.me)' },
      timeout: 10000
    });
    const features = response.data?.features || [];
    for (const f of features) {
      const coords = f.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const lat = coords[1];
      const lon = coords[0];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const p = f.properties || {};
      const parts = [p.name, p.state, p.country].filter(Boolean);
      return {
        place,
        displayName: parts.join(', ') || p.label || place,
        latitude: lat,
        longitude: lon
      };
    }
    return null;
  } catch (error) {
    console.warn(`[GrahaPath] Photon geocode error: ${error?.message || error}`);
    return null;
  }
}

async function searchPlaceSuggestionsPhoton(query, limit = 6) {
  const normalizedQuery = typeof query === 'string' ? query.trim() : '';
  if (normalizedQuery.length < 3) return [];
  try {
    const response = await axios.get(PHOTON_URL, {
      params: { q: normalizedQuery, limit: Math.min(10, limit), lang: 'en' },
      headers: { 'User-Agent': 'GrahaPath/1.0 (birth-chart-calculation)' },
      timeout: 10000
    });
    const features = response.data?.features || [];
    return features
      .map((f) => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const parts = [p.name, p.state, p.country].filter(Boolean);
        return {
          displayName: parts.join(', ') || p.label || '',
          latitude: coords[1],
          longitude: coords[0]
        };
      })
      .filter((r) => r && Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && r.displayName)
      .slice(0, Math.max(1, limit));
  } catch (error) {
    console.warn(`[GrahaPath] Photon fallback failed: ${error?.message || error}`);
    return [];
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNominatimError(error) {
  const status = Number(error?.response?.status || 0);
  const code = String(error?.code || '').toLowerCase();
  return (
    status === 429 ||
    status >= 500 ||
    code === 'etimedout' ||
    code === 'econnaborted' ||
    code === 'econnreset'
  );
}

async function requestNominatim(params, retries = 1) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await axios.get(NOMINATIM_URL, {
        params: {
          ...params,
          ...(NOMINATIM_EMAIL ? { email: NOMINATIM_EMAIL } : {})
        },
        headers: {
          'User-Agent': 'GrahaPath/1.0 (birth-chart-calculation; support@grahapath.ai)',
          'Accept-Language': 'en,en-US'
        },
        timeout: 10000
      });
      return response;
    } catch (error) {
      lastError = error;
      if (!isRetryableNominatimError(error) || attempt === retries) {
        throw error;
      }
      await sleep(350 * (attempt + 1));
    }
  }
  throw lastError;
}

function scoreSuggestionRow(row) {
  if (!row) return 0;
  const southAsiaBoost = SOUTH_ASIA_COUNTRY_CODES.has(row.countryCode) ? 0.12 : 0;
  const typeBoost = MAJOR_SETTLEMENT_TYPES.has(row.placeType)
    ? 0.2
    : REGIONAL_TYPES.has(row.placeType)
      ? 0.11
      : 0;
  const osmNodeBoost = String(row?.candidate?.osm_type || '').toUpperCase() === 'N' ? 0.06 : 0;
  const population = parsePopulation(row?.candidate?.extratags?.population);
  const populationBoost = population > 0 ? Math.min(0.16, Math.log10(population + 1) / 40) : 0;
  return row.score + southAsiaBoost + typeBoost + osmNodeBoost + populationBoost;
}

function parsePopulation(value) {
  if (value == null) return 0;
  const digits = String(value).replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s,.-]/g, ' ')
    .split(/[\s,.-]+/)
    .filter((token) => token.length >= 2);
}

function looksLikePlaceInput(value) {
  const tokens = tokenize(value);
  if (tokens.length < 2) {
    return false;
  }

  // Accept either comma-separated place strings or at least two substantial tokens.
  const hasComma = value.includes(',');
  const hasTwoLongTokens = tokens.filter((t) => t.length >= 3).length >= 2;
  return hasComma || hasTwoLongTokens;
}

function tokenOverlapScore(query, candidate) {
  const q = new Set(tokenize(query));
  const c = new Set(tokenize(candidate));
  if (!q.size || !c.size) {
    return 0;
  }
  let overlap = 0;
  q.forEach((token) => {
    if (c.has(token)) {
      overlap += 1;
    }
  });
  return overlap / q.size;
}

function scoreMatch(query, candidate) {
  const overlap = tokenOverlapScore(query, candidate.display_name || '');
  const importance = Number(candidate.importance) || 0;
  return overlap * 0.7 + importance * 0.3;
}

function selectBestMatch(query, matches) {
  if (!matches.length) {
    return null;
  }

  const ranked = [...matches]
    .map((candidate) => ({
      candidate,
      overlap: tokenOverlapScore(query, candidate.display_name || ''),
      importance: Number(candidate.importance) || 0,
      score: scoreMatch(query, candidate)
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) {
    return null;
  }

  const queryTokens = tokenize(query);
  const hasEnoughText = queryTokens.length >= 2;
  const strictOverlap = hasEnoughText ? best.overlap >= MIN_TOKEN_OVERLAP : best.overlap >= 0.25;
  const strongOverlapPass = hasEnoughText && best.overlap >= STRONG_TOKEN_OVERLAP;
  const strictImportance = best.importance >= MIN_IMPORTANCE;
  const highImportanceFallback = best.overlap === 0 && best.importance >= 0.35;

  if ((!strictOverlap || !strictImportance) && !strongOverlapPass && !highImportanceFallback) {
    return null;
  }

  return best.candidate;
}

module.exports = {
  GeocodingError,
  geocodePlace,
  searchPlaceSuggestions
};

const OPEN_METEO_GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export function openMeteoQueryVariants(query) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (!trimmed) return [];
  const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  const variants = [trimmed];
  if (parts.length >= 2) {
    variants.push(parts[0]);
    variants.push(`${parts[0]}, ${parts[parts.length - 1]}`);
    if (parts.length >= 3) {
      variants.push(`${parts[0]}, ${parts[1]}, ${parts[parts.length - 1]}`);
    }
  }
  return [...new Set(variants.filter((v) => v.length >= 3))];
}

function formatDisplayName(row) {
  const parts = [row.name, row.admin1, row.country].filter(Boolean);
  return parts.join(', ');
}

export async function fetchOpenMeteoPlaceSuggestions(query, limit = 6, signal) {
  const variants = openMeteoQueryVariants(query);
  const requestedLimit = Math.max(1, Math.min(6, limit));

  for (const variant of variants) {
    const url = `${OPEN_METEO_GEOCODE_URL}?name=${encodeURIComponent(variant)}&count=${Math.min(10, requestedLimit)}&language=en&format=json`;
    const response = await fetch(url, { signal, credentials: 'omit' });
    if (!response.ok) continue;
    const payload = await response.json();
    const mapped = (payload.results || [])
      .map((row) => ({
        displayName: formatDisplayName(row),
        latitude: row.latitude,
        longitude: row.longitude
      }))
      .filter((r) => r.displayName && Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
    if (mapped.length > 0) {
      return mapped.slice(0, requestedLimit);
    }
  }
  return [];
}

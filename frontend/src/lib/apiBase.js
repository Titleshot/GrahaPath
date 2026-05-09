const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export function withApiBase(path) {
  const cleanPath = String(path || '').trim();
  if (!cleanPath) return API_BASE || '';
  if (/^https?:\/\//i.test(cleanPath)) return cleanPath;
  if (!API_BASE) return cleanPath;
  return `${API_BASE}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

export { API_BASE };

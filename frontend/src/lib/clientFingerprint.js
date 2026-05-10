const KEY = 'gp_client_fp_v1';

function hashDjb2(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function getClientFingerprint() {
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && existing.trim()) return existing;
    const raw = [
      navigator.userAgent || '',
      navigator.language || '',
      `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      String(new Date().getTimezoneOffset())
    ].join('|');
    const fp = `gp_${hashDjb2(raw)}_${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(KEY, fp);
    return fp;
  } catch {
    return 'gp_unavailable';
  }
}


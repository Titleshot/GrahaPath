/**
 * Chart fingerprint utility for demo abuse protection
 * Uses SHA256 hash of birth date + time + place
 */

async function generateChartFingerprint(birthData) {
  const { date, time, place } = birthData;
  
  if (!date || !time || !place) {
    return null;
  }

  // Create normalized fingerprint string
  const fingerprintString = [
    String(date).trim().toLowerCase(),
    String(time).trim().toLowerCase(),
    String(place).trim().toLowerCase()
  ].join('|');

  // Generate SHA256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Check if chart fingerprint has used demo
 */
function hasChartUsedDemo(fingerprint) {
  if (!fingerprint) return false;
  
  try {
    const usedCharts = JSON.parse(localStorage.getItem('usedDemoCharts') || '[]');
    return usedCharts.includes(fingerprint);
  } catch {
    return false;
  }
}

/**
 * Mark chart fingerprint as having used demo
 */
function markChartAsUsedDemo(fingerprint) {
  if (!fingerprint) return;
  
  try {
    const usedCharts = JSON.parse(localStorage.getItem('usedDemoCharts') || '[]');
    if (!usedCharts.includes(fingerprint)) {
      usedCharts.push(fingerprint);
      localStorage.setItem('usedDemoCharts', JSON.stringify(usedCharts));
    }
  } catch {
    // Silent fail for localStorage issues
  }
}

/**
 * Get stored chart data for fingerprint
 */
function getStoredChartData(fingerprint) {
  if (!fingerprint) return null;
  
  try {
    const storedCharts = JSON.parse(localStorage.getItem('storedCharts') || '{}');
    return storedCharts[fingerprint] || null;
  } catch {
    return null;
  }
}

/**
 * Store chart data for fingerprint
 */
function storeChartData(fingerprint, chartData) {
  if (!fingerprint || !chartData) return;
  
  try {
    const storedCharts = JSON.parse(localStorage.getItem('storedCharts') || '{}');
    storedCharts[fingerprint] = {
      ...chartData,
      storedAt: Date.now()
    };
    localStorage.setItem('storedCharts', JSON.stringify(storedCharts));
  } catch {
    // Silent fail for localStorage issues
  }
}

// For Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateChartFingerprint,
    hasChartUsedDemo,
    markChartAsUsedDemo,
    getStoredChartData,
    storeChartData
  };
}

// For browser/ES modules
export {
  generateChartFingerprint,
  hasChartUsedDemo,
  markChartAsUsedDemo,
  getStoredChartData,
  storeChartData
};

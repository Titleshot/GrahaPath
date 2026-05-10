const counters = new Map();

function incCounter(name, by = 1) {
  const k = String(name || 'unknown');
  const cur = Number(counters.get(k) || 0);
  counters.set(k, cur + Number(by || 1));
}

function getSecurityMetrics() {
  const out = {};
  for (const [k, v] of counters.entries()) {
    out[k] = v;
  }
  return out;
}

module.exports = {
  incCounter,
  getSecurityMetrics
};


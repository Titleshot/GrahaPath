const { calculateCurrentDasha } = require('./dashaCalculator');
const { interpretDashaTiming } = require('./dashaInterpreter');

function buildDashaContext(chart, options = {}) {
  const calc = calculateCurrentDasha(chart, options);
  const interpreted = interpretDashaTiming(chart, calc, options);

  const base = {
    mahaDasha: calc.mahaDasha,
    antarDasha: calc.antarDasha,
    startDate: calc.startDate,
    endDate: calc.endDate,
    yearsRemaining: calc.yearsRemaining,
    activeThemes: interpreted.activeThemes,
    timingSummary: interpreted.timingSummary
  };

  const premiumUnlocked = options.premiumUnlocked === true || String(options.userPlan || '').toLowerCase() === 'full';
  if (premiumUnlocked) {
    return {
      ...base,
      source: calc.source,
      nextMahaDasha: calc.nextMahaDasha || null,
      premium: interpreted.premium || null
    };
  }

  return base;
}

module.exports = {
  buildDashaContext
};

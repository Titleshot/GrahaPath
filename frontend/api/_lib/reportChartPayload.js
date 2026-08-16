const { enrichPlanet } = require('./natalMath');

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

function slimPlanet(p) {
  if (!p || typeof p !== 'object') return null;
  const house = Number(p.house) || Number(p.activeBhavaHouse) || p.house;
  return enrichPlanet({
    name: p.name,
    symbol: p.symbol || '',
    sign: p.sign || p.rashi || p.rasi || '',
    house,
    degree: p.degree,
    absoluteDegree: p.absoluteDegree,
    nakshatra: p.nakshatra || '',
    nakshatraPada: p.nakshatraPada || null,
    retrograde: p.retrograde === true,
    dignity: p.dignity || null,
    d9Sign: p.d9Sign || null,
    d10Sign: p.d10Sign || null
  });
}

function slimDasha(row) {
  if (typeof row === 'string' && row.trim()) {
    return { planet: row.trim(), antarLord: row.trim() };
  }
  if (!row || typeof row !== 'object') return null;
  const planet = row.planet || row.mahaLord || row.mahaDasha || null;
  const antarLord = row.antarLord || row.antarDasha || null;
  if (!planet && !antarLord) return null;
  return {
    planet,
    mahaLord: row.mahaLord || planet,
    antarLord,
    startDateApprox: row.startDateApprox || row.startDate || row.start || null,
    endDateApprox: row.endDateApprox || row.endDate || row.end || null
  };
}

function cuspsFromLagna(ascendant, existing) {
  const i = SIGNS.indexOf(ascendant);
  if (i < 0) {
    return Array.isArray(existing)
      ? existing.map((c) => ({ house: c.house, sign: c.sign }))
      : [];
  }
  return Array.from({ length: 12 }, (_, k) => {
    const prev = (existing || []).find((c) => Number(c.house) === k + 1);
    return {
      house: k + 1,
      sign: prev?.sign || SIGNS[(i + k) % 12]
    };
  });
}

function toReportChart(chart) {
  if (!chart || typeof chart !== 'object') return chart;
  const core = chart.natalCore && typeof chart.natalCore === 'object' ? chart.natalCore : {};
  const byName = new Map((core.planets || []).map((p) => [p.name, p]));
  const rawPlanets = Array.isArray(chart.planets) ? chart.planets : [];
  const planets = rawPlanets
    .map((p) => slimPlanet({ ...(byName.get(p.name) || {}), ...p }))
    .filter(Boolean);
  const ab = chart.astroBrain && typeof chart.astroBrain === 'object' ? chart.astroBrain : {};
  const nested = ab.dasha && typeof ab.dasha === 'object' ? ab.dasha : {};
  const summary = ab.summary && typeof ab.summary === 'object' ? ab.summary : {};
  const snap = chart.dashaSnapshot && typeof chart.dashaSnapshot === 'object' ? chart.dashaSnapshot : {};

  let current = slimDasha(ab.currentDasha || nested.currentDasha || core.currentDasha);
  let antar = slimDasha(ab.currentAntardasha || nested.currentAntardasha || core.currentAntardasha);
  if (!current?.planet && (snap.mahaDasha || summary.currentMahadashaPlanet)) {
    current = slimDasha({
      planet: snap.mahaDasha || summary.currentMahadashaPlanet,
      startDateApprox: snap.startDate,
      endDateApprox: snap.endDate
    });
  }
  if (!antar?.antarLord && (snap.antarDasha || summary.currentAntardashaLord)) {
    antar = slimDasha({
      antarLord: snap.antarDasha || summary.currentAntardashaLord,
      planet: snap.antarDasha || summary.currentAntardashaLord,
      startDateApprox: snap.startDate,
      endDateApprox: snap.endDate
    });
  }

  const ascendant = chart.ascendant || '';
  return {
    name: chart.name || '',
    place: chart.place || chart.location?.displayName || '',
    location: chart.location?.displayName ? { displayName: chart.location.displayName } : undefined,
    localDateTime: chart.localDateTime || chart.birthDateAD || '',
    birthDateAD: chart.birthDateAD || '',
    natalCore: core,
    ascendant,
    moonSign: chart.moonSign || planets.find((p) => p.name === 'Moon')?.sign || '',
    sunSign: chart.sunSign || planets.find((p) => p.name === 'Sun')?.sign || '',
    planets,
    houseCusps: cuspsFromLagna(ascendant, chart.houseCusps),
    astroBrain: {
      currentDasha: current,
      currentAntardasha: antar,
      vimshottariTimeline: (ab.vimshottariTimeline || nested.timeline || core.vimshottariTimeline || [])
        .slice(0, 12)
        .map(slimDasha)
        .filter(Boolean),
      yogas: (ab.yogas || core.yogas || []).slice(0, 12).map((y) => ({
        name: y.name,
        strength: y.strength,
        interpretation: y.interpretation || ''
      })),
      aspects: (ab.aspects || core.aspects || []).slice(0, 18).map((a) => ({
        planetA: a.planetA,
        planetB: a.planetB,
        aspectType: a.aspectType,
        orb: a.orb,
        strength: a.strength
      })),
      divisionalRows: core.divisionalRows || ab.divisional?.divisionalRows || [],
      natalTimeline: core.vimshottariTimeline || ab.vimshottariTimeline || [],
      summary: {
        currentMahadashaPlanet: current?.planet || summary.currentMahadashaPlanet || snap.mahaDasha || null,
        currentAntardashaLord: antar?.antarLord || summary.currentAntardashaLord || snap.antarDasha || null
      }
    },
    dashaSnapshot: {
      mahaDasha: current?.planet || snap.mahaDasha || null,
      antarDasha: antar?.antarLord || snap.antarDasha || null,
      startDate: current?.startDateApprox || snap.startDate || null,
      endDate: antar?.endDateApprox || current?.endDateApprox || snap.endDate || null
    }
  };
}

module.exports = { toReportChart };

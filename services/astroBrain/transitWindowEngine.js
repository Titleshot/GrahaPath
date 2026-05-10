function byName(planets, name) {
  return (planets || []).find((p) => p.name === name) || null;
}

function norm360(value) {
  return ((value % 360) + 360) % 360;
}

function angularDistance(a, b) {
  const diff = Math.abs(norm360(a || 0) - norm360(b || 0));
  return diff > 180 ? 360 - diff : diff;
}

function triggerAspect(distance) {
  const defs = [
    { type: 'conjunction', angle: 0, orb: 3.5 },
    { type: 'square', angle: 90, orb: 3 },
    { type: 'trine', angle: 120, orb: 3 },
    { type: 'opposition', angle: 180, orb: 3.5 }
  ];
  for (const d of defs) {
    const delta = Math.abs(distance - d.angle);
    if (delta <= d.orb) {
      return { aspectType: d.type, orb: Number(delta.toFixed(3)) };
    }
  }
  return null;
}

const SAV_TRANSIT_SOFT = Number(process.env.SAV_TRANSIT_SOFT_THRESHOLD || 22);
const SAV_TRANSIT_GOLDEN = Number(process.env.SAV_TRANSIT_GOLDEN_MIN || 28);
const BAV_TRANSIT_STRONG = Number(process.env.BAV_TRANSIT_STRONG_MIN || 5);

function sarvaBinduForHouse(sav, house) {
  const v = sav?.[house];
  return Number.isFinite(v) ? v : null;
}

function bavBinduForPlanetHouse(planetHouseScores, planetName, house) {
  const row = planetHouseScores?.[planetName];
  const v = row?.[house];
  return Number.isFinite(v) ? v : null;
}

/** Per-graha Bhinnaṣṭakavarga bindu for occupied house (0–8 scale in this engine). */
function bavTransitWeight(bindu) {
  if (bindu == null) return { mult: 1, tone: 'unknown', bindu: null };
  if (bindu >= 6) return { mult: 1.12, tone: 'bav_strong', bindu };
  if (bindu >= 4) return { mult: 1, tone: 'bav_moderate', bindu };
  if (bindu < 3) return { mult: 0.7, tone: 'bav_thin', bindu };
  return { mult: 0.92, tone: 'bav_neutral', bindu };
}

/** Downweight “positive” transit triggers when that house has thin *collective* SAV reinforcement. */
function savTransitWeight(bindu) {
  if (bindu == null) return { mult: 1, tone: 'unknown' };
  if (bindu < SAV_TRANSIT_SOFT) return { mult: 0.68, tone: 'softened' };
  if (bindu >= SAV_TRANSIT_GOLDEN) return { mult: 1.12, tone: 'golden_window' };
  return { mult: 1, tone: 'stable' };
}

function buildTransitTriggers(chartPayload, transit, dasha, sav = null, planetHouseScores = null) {
  const natal = chartPayload?.planets || [];
  const trans = transit?.planets || [];
  const currentDasha = dasha?.currentDasha?.planet;
  const currentAntar = dasha?.currentAntardasha?.antarLord;
  const currentPraty = dasha?.currentPratyantar?.pratyantarLord;
  const focusLords = new Set([currentDasha, currentAntar, currentPraty].filter(Boolean));
  const triggers = [];

  trans.forEach((tp) => {
    const house = tp.houseFromNatalAsc;
    const savBindu = sarvaBinduForHouse(sav, house);
    const savW = savTransitWeight(savBindu);
    const bavBindu = bavBinduForPlanetHouse(planetHouseScores, tp.name, house);
    const bavW = bavTransitWeight(bavBindu);
    const binduCombined = Math.sqrt(Math.max(0.001, savW.mult * bavW.mult));

    natal.forEach((np) => {
      const distance = angularDistance(tp.absoluteDegree, np.absoluteDegree);
      const hit = triggerAspect(distance);
      if (!hit) return;
      const dashaBoost = focusLords.has(tp.name) || focusLords.has(np.name) ? 0.18 : 0;
      const base = Math.max(0, 1 - hit.orb / 3.5);
      let score = Math.min(1, base + dashaBoost);
      score *= binduCombined;
      triggers.push({
        transitPlanet: tp.name,
        natalPlanet: np.name,
        aspectType: hit.aspectType,
        orb: hit.orb,
        triggerScore: Number(score.toFixed(3)),
        dashaLinked: dashaBoost > 0,
        pratyantarLinked: Boolean(currentPraty && tp.name === currentPraty),
        transitHouseFromAsc: house,
        sarvashtakavargaHousePoints: savBindu,
        savTransitTone: savW.tone,
        bhinnaAshtakavargaPoints: bavW.bindu,
        bavTransitTone: bavW.tone,
        binduBlendWeight: Number(binduCombined.toFixed(3))
      });
    });
  });

  return triggers.sort((a, b) => b.triggerScore - a.triggerScore).slice(0, 18);
}

function buildCriticalEventWindows(transit, dasha, planetHouseScores, sav) {
  const pratyLord = dasha?.currentPratyantar?.pratyantarLord;
  const out = [];
  if (!pratyLord || !transit?.planets?.length) return out;

  for (const tp of transit.planets) {
    const h = tp.houseFromNatalAsc;
    const bav = bavBinduForPlanetHouse(planetHouseScores, tp.name, h);
    const strong = Number.isFinite(bav) && bav >= BAV_TRANSIT_STRONG;
    if (tp.name === pratyLord && strong) {
      out.push({
        transitPlanet: tp.name,
        occupiedHouse: h,
        bhinnaAshtakavargaPoints: bav,
        pratyantarLord: pratyLord,
        sarvashtakavargaHousePoints: sarvaBinduForHouse(sav, h),
        label: 'critical_event_window',
        note:
          'Active Vimshottari pratyantar lord matches this transiting graha with elevated BAV bindu in the occupied house — heightened attention to timing themes, not a guaranteed outer event.'
      });
    }
  }
  return out;
}

function confluenceFromContext(triggers = [], context = {}) {
  const dashaLinked = triggers.filter((t) => t.dashaLinked).length;
  const pratyLinked = triggers.filter((t) => t.pratyantarLinked).length;
  const triggerPeak = triggers[0]?.triggerScore || 0;
  const softenedHits = triggers.filter((t) => t.savTransitTone === 'softened').length;
  const thinBavHits = triggers.filter((t) => t.bavTransitTone === 'bav_thin').length;
  const savSoftPenalty = softenedHits > 0 ? Math.min(0.14, softenedHits * 0.035) : 0;
  const bavThinPenalty = thinBavHits > 0 ? Math.min(0.1, thinBavHits * 0.025) : 0;
  const luckLevel = context?.ashtakavarga?.luckOpportunity?.level || 'moderate';
  const luckScore = luckLevel === 'high' ? 0.18 : luckLevel === 'moderate' ? 0.1 : 0.04;
  const support = (context?.argala?.support || []).length;
  const obstacles = (context?.argala?.obstacles || []).length;
  const argalaScore = support + obstacles > 0 ? Math.max(-0.12, Math.min(0.12, (support - obstacles) / 200)) : 0;
  const dashaScore = Math.min(0.22, dashaLinked * 0.03);
  const pratyBoost = Math.min(0.08, pratyLinked * 0.02);
  const final = Math.max(
    0,
    Math.min(
      1,
      triggerPeak * 0.5 +
        dashaScore +
        pratyBoost +
        luckScore +
        argalaScore -
        savSoftPenalty -
        bavThinPenalty
    )
  );
  return {
    score: Number(final.toFixed(3)),
    level: final >= 0.72 ? 'high' : final >= 0.45 ? 'moderate' : 'low',
    ingredients: {
      peakTriggerScore: Number(triggerPeak.toFixed(3)),
      dashaLinkedCount: dashaLinked,
      pratyantarLinkedTriggers: pratyLinked,
      luckLevel,
      argalaBias: Number(argalaScore.toFixed(3)),
      savSoftenedTransitAspects: softenedHits,
      sarvaSoftPenalty: Number(savSoftPenalty.toFixed(3)),
      bavThinTransitAspects: thinBavHits,
      bavThinPenalty: Number(bavThinPenalty.toFixed(3)),
      criticalEventWindows: (context?.criticalEventWindows || []).length
    }
  };
}

function strengthFromSavHouseTone(baseStrength, house, sav) {
  const bindu = sarvaBinduForHouse(sav, house);
  const tone = savTransitWeight(bindu).tone;
  if (tone === 'softened' && baseStrength === 'high') return 'moderate';
  if (tone === 'softened' && baseStrength === 'moderate') return 'low';
  return baseStrength;
}

function buildTransitWindows(chartPayload, dasha, context = {}) {
  const transit = chartPayload?.transitsNow || null;
  const sav = context?.ashtakavarga?.sarvashtakavarga || null;
  const planetHouseScores = context?.ashtakavarga?.planetHouseScores || null;
  if (!transit?.planets) {
    return {
      generatedAt: null,
      windows: [],
      caveat: 'Transit windows unavailable in this chart payload.'
    };
  }

  const moonNatal = byName(chartPayload.planets, 'Moon');
  const saturnTransit = byName(transit.planets, 'Saturn');
  const jupiterTransit = byName(transit.planets, 'Jupiter');
  const rahuTransit = byName(transit.planets, 'Rahu');
  const currentDasha = dasha?.currentDasha?.planet || 'current cycle';
  const currentAntar = dasha?.currentAntardasha?.antarLord || null;

  const savSnapshots = [];

  const windows = [];
  if (saturnTransit && moonNatal) {
    const h = saturnTransit.houseFromNatalAsc;
    const bindu = sarvaBinduForHouse(sav, h);
    const tone = savTransitWeight(bindu).tone;
    const baseStr = [1, 4, 7, 10].includes(h) ? 'high' : 'moderate';
    savSnapshots.push({ graha: 'Saturn', house: h, sarvashtakavargaHousePoints: bindu, savTransitTone: tone });
    windows.push({
      area: 'discipline_and_pressure',
      strength: strengthFromSavHouseTone(baseStr, h, sav),
      observation: `Transit Saturn in house ${h} (whole-sign from natal asc); Sarvashtakavarga bindu for this house ~${
        bindu != null ? bindu : 'n/a'
      } — ${tone === 'softened' ? 'thin SAV here softens how much “benefic structure” delivers.' : tone === 'golden_window' ? 'dense SAV here can amplify tangible outcomes when discipline is applied.' : 'average reinforcement.'}`,
      timing: `Active during ${currentDasha}${currentAntar ? ` / ${currentAntar}` : ''} with Saturn-style duty themes.`
    });
  }
  if (jupiterTransit) {
    const h = jupiterTransit.houseFromNatalAsc;
    const bindu = sarvaBinduForHouse(sav, h);
    const tone = savTransitWeight(bindu).tone;
    const baseStr = [2, 5, 9, 11].includes(h) ? 'high' : 'moderate';
    savSnapshots.push({ graha: 'Jupiter', house: h, sarvashtakavargaHousePoints: bindu, savTransitTone: tone });
    windows.push({
      area: 'growth_and_support',
      strength: strengthFromSavHouseTone(baseStr, h, sav),
      observation: `Transit Jupiter in house ${h}; house SAV ~${bindu != null ? bindu : 'n/a'} (${tone}). ${
        tone === 'softened'
          ? 'Even supportive transits under-deliver when this house’s bindu stack is low.'
          : tone === 'golden_window'
            ? 'Strong bindu band: growth themes can feel unusually “available” this season.'
            : ''
      }`,
      timing: `Growth windows are more actionable when aligned with ${currentDasha} priorities.`
    });
  }
  if (rahuTransit) {
    const h = rahuTransit.houseFromNatalAsc;
    const bindu = sarvaBinduForHouse(sav, h);
    const tone = savTransitWeight(bindu).tone;
    const baseStr = [1, 3, 7, 10].includes(h) ? 'high' : 'moderate';
    savSnapshots.push({ graha: 'Rahu', house: h, sarvashtakavargaHousePoints: bindu, savTransitTone: tone });
    windows.push({
      area: 'change_and_reorientation',
      strength: strengthFromSavHouseTone(baseStr, h, sav),
      observation: `Transit Rahu in house ${h}; house SAV ~${bindu != null ? bindu : 'n/a'} (${tone}).`,
      timing: `Directional volatility may increase in ${currentDasha}${currentAntar ? ` / ${currentAntar}` : ''} periods.`
    });
  }

  const criticalEventWindows = buildCriticalEventWindows(transit, dasha, planetHouseScores, sav);

  const triggers = buildTransitTriggers(chartPayload, transit, dasha, sav, planetHouseScores);
  const confluence = confluenceFromContext(triggers, { ...context, criticalEventWindows });

  return {
    generatedAt: transit.generatedAt,
    transitHouseNote: transit.transitHouseNote || null,
    windows,
    triggers,
    confluence,
    criticalEventWindows,
    bavTransitLayer: {
      strongMinimumBindu: BAV_TRANSIT_STRONG,
      note:
        'Trigger scores blend geometric mean of SAV (house collective) and BAV (transit graha in that house) multipliers; pratyantar lord alignment adds a small dasha-family boost.'
    },
    sarvaTransitLayer: {
      softThreshold: SAV_TRANSIT_SOFT,
      goldenMinimum: SAV_TRANSIT_GOLDEN,
      houseSnapshots: savSnapshots,
      note:
        'Transit planets are weighted against Sarvashtakavarga house density; low-bindu houses soften “good transit” narratives unless other factors dominate.'
    },
    caveat:
      'Transit windows are probabilistic timing hints; they are not deterministic event guarantees.'
  };
}

module.exports = {
  buildTransitWindows
};


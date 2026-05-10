/**
 * Career / wealth domain layer — maps 10th & 11th houses, their lords, dasha, and structural indices.
 * Outputs compact numeric meters + structured insight cards (no long prose).
 */

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function meterFromScore(totalScore, fallback = 50) {
  if (!Number.isFinite(totalScore)) return fallback;
  return Math.max(0, Math.min(100, Math.round(50 + totalScore * 1.22)));
}

function planetStrengthRow(strength, planetName) {
  return (strength?.scores || []).find((s) => s.planet === planetName) || null;
}

function houseRow(houseLords, n) {
  return (houseLords?.houses || []).find((h) => h.house === n) || null;
}

function netForceFor(houseNetForce, houseNum) {
  const row = (houseNetForce?.houses || []).find((h) => h.house === houseNum);
  return row?.netForce != null ? clamp01(row.netForce) : 0.5;
}

function careerRelevanceForMaha(planet, tenthLord, eleventhLord) {
  let r = 38;
  if (planet === tenthLord || planet === eleventhLord) r += 34;
  if (['Saturn', 'Jupiter', 'Mercury', 'Sun'].includes(planet)) r += 18;
  if (planet === 'Mars' || planet === 'Rahu') r += 8;
  return Math.min(100, r);
}

function buildCareerWealthDomain(chartPayload, fullBrain) {
  const houseLords = fullBrain.houseLords;
  const strength = fullBrain.strength;
  const dasha = fullBrain.dasha;
  const houseNetForce = fullBrain.houseNetForce;
  const transitWindows = fullBrain.transitWindows;

  const h1 = houseRow(houseLords, 1);
  const h10 = houseRow(houseLords, 10);
  const h11 = houseRow(houseLords, 11);

  const lagnaLord = h1?.lord || null;
  const tenthLord = h10?.lord || null;
  const eleventhLord = h11?.lord || null;

  const lagnaLordRow = lagnaLord ? planetStrengthRow(strength, lagnaLord) : null;
  const tenthLordRow = tenthLord ? planetStrengthRow(strength, tenthLord) : null;
  const eleventhLordRow = eleventhLord ? planetStrengthRow(strength, eleventhLord) : null;

  const h1nf = netForceFor(houseNetForce, 1);
  const h10nf = netForceFor(houseNetForce, 10);
  const h11nf = netForceFor(houseNetForce, 11);

  const lagnaStrength = Math.round(
    0.52 * meterFromScore(lagnaLordRow?.totalScore, 50) + 0.48 * (h1nf * 100)
  );

  let careerPoints = Math.round(
    0.26 * meterFromScore(tenthLordRow?.totalScore, 50) +
      0.26 * meterFromScore(eleventhLordRow?.totalScore, 50) +
      0.24 * (h10nf * 100) +
      0.24 * (h11nf * 100)
  );

  const md = dasha?.currentDasha?.planet;
  const ad = dasha?.currentAntardasha?.antarLord;
  let dashaAlignScore = 0;
  const dashaNotes = [];
  if (md && (md === tenthLord || md === eleventhLord)) {
    dashaAlignScore += 10;
    dashaNotes.push(`Mahādasha ${md} matches career-axis lordship.`);
  }
  if (ad && (ad === tenthLord || ad === eleventhLord)) {
    dashaAlignScore += 6;
    dashaNotes.push(`Antardaśā ${ad} ties to 10th/11th lord themes.`);
  }
  careerPoints = Math.max(0, Math.min(100, careerPoints + Math.round(dashaAlignScore * 0.5)));

  const conf = transitWindows?.confluence;
  const transitCareerHint =
    conf?.score != null
      ? `Transit confluence ${conf.score}${conf.level ? ` (${conf.level})` : ''} — use as timing context, not a guarantee.`
      : null;

  const timeline = Array.isArray(dasha?.timeline) ? dasha.timeline : [];
  const strip = timeline.slice(0, 16).map((seg, index) => ({
    index,
    mahaLord: seg.planet,
    startDateApprox: seg.startDateApprox,
    endDateApprox: seg.endDateApprox,
    startAge: seg.startAge,
    endAge: seg.endAge,
    careerRelevance: careerRelevanceForMaha(seg.planet, tenthLord, eleventhLord),
    themeLine: seg.likelyFocus || null
  }));

  const previewVisible = 4;
  const permissionModel = {
    tier: 'value_first_preview',
    visibleMahadashaBars: previewVisible,
    note:
      'Full mahādasha detail stays in your chart data; this strip highlights career-relevant emphasis first.'
  };

  const tenthPlacement = h10?.lordPlacement || null;
  const eleventhPlacement = h11?.lordPlacement || null;

  const insightCards = [
    {
      id: 'house10',
      title: '10th · Karma & visibility',
      badge: h10?.sign || '—',
      lines: [
        `Lord ${tenthLord || '—'} → house ${tenthPlacement?.house ?? '—'} (${tenthPlacement?.sign || '—'})`,
        tenthLordRow
          ? `Structural score ${Math.round(tenthLordRow.totalScore * 10) / 10} (${tenthLordRow.strengthLabel})`
          : 'Lord strength pending.'
      ],
      tone: 'gold'
    },
    {
      id: 'house11',
      title: '11th · Gains & network',
      badge: h11?.sign || '—',
      lines: [
        `Lord ${eleventhLord || '—'} → house ${eleventhPlacement?.house ?? '—'} (${eleventhPlacement?.sign || '—'})`,
        eleventhLordRow
          ? `Structural score ${Math.round(eleventhLordRow.totalScore * 10) / 10} (${eleventhLordRow.strengthLabel})`
          : 'Lord strength pending.'
      ],
      tone: 'cream'
    },
    {
      id: 'dasha_now',
      title: 'Daśā · Current focus',
      badge: md || '—',
      lines: [
        md && ad ? `Active: ${md} / ${ad}` : md ? `Mahādasha: ${md}` : 'Daśā window unavailable.',
        dashaNotes[0] || 'Career-axis overlap adds emphasis when daśā matches 10th/11th lords.'
      ],
      tone: 'ivory'
    }
  ];

  return {
    domain: 'career_wealth',
    version: 1,
    caveat:
      'Career/wealth indices blend lord strength, house reinforcement (net-force), and daśā overlap — patterns for reflection, not fixed outcomes.',
    meters: {
      lagnaStrength,
      careerPoints,
      dashaCareerAlignment: Math.min(100, Math.round(dashaAlignScore * 5.2)),
      lagnaBlend: 'Lagna lord structural score + 1st-house reinforcement index.',
      careerBlend: '10th/11th lords + 10/11 house reinforcement + modest daśā overlap boost.'
    },
    houses: {
      tenth: {
        sign: h10?.sign ?? null,
        lord: tenthLord,
        lordHouse: tenthPlacement?.house ?? null,
        lordSign: tenthPlacement?.sign ?? null,
        netForce: h10nf
      },
      eleventh: {
        sign: h11?.sign ?? null,
        lord: eleventhLord,
        lordHouse: eleventhPlacement?.house ?? null,
        lordSign: eleventhPlacement?.sign ?? null,
        netForce: h11nf
      },
      lagnaLord: lagnaLord,
      lagnaLordStrengthScore: lagnaLordRow?.totalScore ?? null
    },
    dasha: {
      currentMahadasha: md ?? null,
      currentAntardasha: ad ?? null,
      tenthLord,
      eleventhLord,
      alignmentNotes: dashaNotes,
      transitContext: transitCareerHint
    },
    vimshottariCareerStrip: strip,
    permissionModel,
    insightCards
  };
}

module.exports = {
  buildCareerWealthDomain
};

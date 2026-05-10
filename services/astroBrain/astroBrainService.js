const { analyzeGrahas } = require('./grahaAnalysisEngine');
const { buildHousePolicyMatrix } = require('./housePolicyMatrix');
const { computeShadbala } = require('./shadbalaEngine');
const { buildAshtakavarga } = require('./ashtakavargaEngine');
const { buildPanchanga } = require('./panchangaEngine');
const { scoreGrahas } = require('./strengthScoringEngine');
const { analyzeHouseLords, enrichGrahaFunctionalRoles } = require('./houseLordEngine');
const { detectYogas } = require('./yogaDetectionEngine');
const { detectAspects } = require('./aspectEngine');
const { detectGrahaDrishti } = require('./drishtiEngine');
const { generateDashaTimeline } = require('./dashaEngine');
const { buildDivisionalSignals } = require('./divisionalChartEngine');
const { buildTransitWindows } = require('./transitWindowEngine');
const { arbitrateSignals } = require('./conflictArbitrationEngine');
const { buildCharaKarakas } = require('./charaKarakaEngine');
const { buildPlanetStateLayer } = require('./planetStateEngine');
const { detectArgala } = require('./argalaEngine');
const { synthesizePatterns } = require('./patternSynthesisEngine');
const { detectInteractionPatterns } = require('./interactionPatternEngine');
const { buildCausalInsights } = require('./causalInsightEngine');
const { buildFutureSections } = require('./futureDomainEngine');
const { applyClaimGuardrails } = require('./claimGuardrailEngine');
const { buildHouseNetForce } = require('./houseNetForceEngine');
const {
  applyImpactToCausalInsights,
  applyImpactToFutureSections,
  applyImpactToPatterns
} = require('./impactScoringEngine');

/**
 * Structured “mini astrologer brain” — JSON only, no final prose reports.
 * @param {object} chartPayload — output shape of generateBirthChart (includes planets, houseCusps, birthDateAD, …)
 */
function generateAstroBrain(chartPayload) {
  const grahaProfiles = analyzeGrahas(chartPayload);
  const housePolicy = buildHousePolicyMatrix();
  const panchanga = buildPanchanga(chartPayload);
  const ashtakavarga = buildAshtakavarga(grahaProfiles);
  const shadbala = computeShadbala(grahaProfiles, chartPayload);
  const divisional = buildDivisionalSignals(grahaProfiles);
  const strength = scoreGrahas(grahaProfiles, chartPayload, shadbala, ashtakavarga, divisional);
  const houseLords = analyzeHouseLords(chartPayload, grahaProfiles, strength);
  enrichGrahaFunctionalRoles(grahaProfiles, houseLords);
  const aspects = detectAspects(chartPayload.planets || []);
  const drishti = detectGrahaDrishti(grahaProfiles);
  const yogas = detectYogas(grahaProfiles, houseLords);
  const interactions = detectInteractionPatterns(
    grahaProfiles,
    strength,
    houseLords,
    aspects.aspects,
    drishti.drishtiLinks
  );
  const dasha = generateDashaTimeline(chartPayload);
  const charaKarakas = buildCharaKarakas(grahaProfiles);
  const planetState = buildPlanetStateLayer(chartPayload.planets || []);
  const argala = detectArgala(grahaProfiles);
  const transitWindows = buildTransitWindows(chartPayload, dasha, {
    ashtakavarga,
    argala
  });
  const arbitration = arbitrateSignals({ strength, ashtakavarga, shadbala, argala, planetState });
  const patternsBase = synthesizePatterns(
    grahaProfiles,
    strength,
    houseLords,
    yogas,
    dasha,
    charaKarakas,
    planetState,
    argala,
    divisional,
    transitWindows
  );
  const houseNetForce = buildHouseNetForce({
    planets: chartPayload.planets || [],
    shadbala,
    sarvashtakavarga: ashtakavarga?.sarvashtakavarga || {},
    argala
  });
  let causalInsights = buildCausalInsights(
    { ...chartPayload, grahaProfiles },
    strength,
    houseLords,
    dasha,
    interactions.interactionPatterns,
    drishti.drishtiLinks
  );
  let futureSections = buildFutureSections(
    grahaProfiles,
    strength,
    houseLords,
    interactions,
    dasha,
    patternsBase,
    drishti.drishtiLinks,
    divisional,
    transitWindows,
    ashtakavarga
  );
  causalInsights = applyImpactToCausalInsights(causalInsights);
  futureSections = applyImpactToFutureSections(futureSections);
  const patterns = applyImpactToPatterns(patternsBase);
  const guarded = applyClaimGuardrails({
    causalInsights,
    futureSections,
    patterns,
    strength,
    arbitration
  });

  return {
    grahaProfiles,
    strength,
    houseLords,
    aspects,
    drishti,
    yogas,
    interactions,
    dasha,
    housePolicy,
    panchanga,
    ashtakavarga,
    shadbala,
    charaKarakas,
    planetState,
    argala,
    arbitration,
    divisional,
    transitWindows,
    timeCalibration: chartPayload.timeCalibration || null,
    patterns: guarded.patterns,
    causalInsights: guarded.causalInsights,
    futureSections: guarded.futureSections,
    guardrailMeta: guarded.guardrailMeta,
    houseNetForce
  };
}

/** Public timeline: keep antardaśā rows; replace nested pratyantar arrays with counts to limit payload size. */
function slimVimshottariTimelineForApi(timeline) {
  return (timeline || []).slice(0, 72).map((seg) => ({
    planet: seg.planet,
    startAge: seg.startAge,
    endAge: seg.endAge,
    startDateApprox: seg.startDateApprox,
    endDateApprox: seg.endDateApprox,
    theme: seg.theme,
    likelyFocus: seg.likelyFocus,
    caution: seg.caution,
    antardasha: (seg.antardasha || []).map((a) => ({
      mahaLord: a.mahaLord,
      antarLord: a.antarLord,
      startAge: a.startAge,
      endAge: a.endAge,
      startDateApprox: a.startDateApprox,
      endDateApprox: a.endDateApprox,
      pratyantarCount: Array.isArray(a.pratyantar) ? a.pratyantar.length : 0
    }))
  }));
}

/**
 * Full internal mirror (used for debug builds and tests).
 */
function buildAstroBrainFullPayload(full) {
  return {
    dominantPlanets: full.strength.dominantPlanets,
    challengedPlanets: full.strength.challengedPlanets,
    yogas: full.yogas.yogas,
    interactionPatterns: full.interactions.interactionPatterns,
    aspects: full.aspects.aspects,
    drishti: full.drishti.drishtiLinks,
    currentDasha: full.dasha.currentDasha,
    currentAntardasha: full.dasha.currentAntardasha,
    currentPratyantar: full.dasha.currentPratyantar,
    vimshottariTimeline: Array.isArray(full.dasha.timeline)
      ? slimVimshottariTimelineForApi(full.dasha.timeline)
      : [],
    timeCalibration: full.timeCalibration,
    housePolicy: full.housePolicy,
    panchanga: full.panchanga,
    ashtakavarga: full.ashtakavarga,
    shadbala: full.shadbala,
    charaKarakas: full.charaKarakas,
    planetState: full.planetState,
    argala: full.argala,
    arbitration: full.arbitration,
    divisional: full.divisional,
    transitWindows: full.transitWindows,
    corePatterns: full.patterns,
    causalInsights: full.causalInsights,
    futureSections: full.futureSections,
    guardrailMeta: full.guardrailMeta,
    houseNetForce: full.houseNetForce,
    methodology:
      'GrahaPath uses calculated planetary positions, nakshatra padas, aspects, graha drishti, dasha timing, and strength indicators to generate interpretations.',
    debug: {
      timeCalibration: full.timeCalibration,
      currentPratyantar: full.dasha.currentPratyantar,
      vimshottariTimelineSample: Array.isArray(full.dasha.timeline) ? full.dasha.timeline.slice(0, 4) : [],
      grahaProfiles: full.grahaProfiles,
      houseLords: full.houseLords,
      drishti: full.drishti.drishtiLinks,
      divisional: full.divisional,
      ashtakavarga: full.ashtakavarga,
      charaKarakas: full.charaKarakas,
      planetState: full.planetState,
      argala: full.argala,
      arbitration: full.arbitration,
      shadbala: full.shadbala,
      houseNetForce: full.houseNetForce
    }
  };
}

function slimAshtakavargaPublic(av) {
  if (!av || typeof av !== 'object') return av;
  const { contributorBreakdown, ...rest } = av;
  return rest;
}

/** Transit slice without long prose windows — scores and bindu columns only. */
function slimTransitWindowsPublic(tw) {
  if (!tw || typeof tw !== 'object') return tw;
  return {
    generatedAt: tw.generatedAt,
    transitHouseNote: tw.transitHouseNote,
    confluence: tw.confluence,
    triggers: (tw.triggers || []).slice(0, 14),
    criticalEventWindows: tw.criticalEventWindows || [],
    sarvaTransitLayer: tw.sarvaTransitLayer,
    bavTransitLayer: tw.bavTransitLayer,
    caveat: tw.caveat
  };
}

function extractNumericSummary(full) {
  const tw = full.transitWindows || {};
  const ce = tw.criticalEventWindows || [];
  const pat = full.patterns || {};
  const sav = full.ashtakavarga?.luckOpportunity;

  return {
    payloadKind: 'summary',
    timeCertaintyScore: full.timeCalibration?.timeCertaintyScore ?? null,
    transitHouseDisagreementCount: full.timeCalibration?.components?.transitHouseDisagreementCount ?? null,
    transitPlanetsCompared: full.timeCalibration?.components?.transitPlanetsCompared ?? null,
    transitHouseAgreementRatio: full.timeCalibration?.components?.transitHouseAgreementRatio ?? null,
    confluenceScore: tw.confluence?.score ?? null,
    confluenceLevel: tw.confluence?.level ?? null,
    criticalEventWindowsCount: ce.length,
    currentMahadashaPlanet: full.dasha?.currentDasha?.planet ?? null,
    currentAntardashaLord: full.dasha?.currentAntardasha?.antarLord ?? null,
    currentPratyantarLord: full.dasha?.currentPratyantar?.pratyantarLord ?? null,
    savKeyHouseAverage: sav?.averageScore ?? null,
    savLuckLevel: sav?.level ?? null,
    patternPresence: {
      innerOuterTension: Boolean(pat.innerOuterTensionPattern),
      underlyingPatterns: Boolean(pat.underlyingPatterns),
      criticalTiming: Boolean(pat.criticalEventTimingPattern)
    },
    houseNetForceByHouse: (full.houseNetForce?.houses || []).map((h) => ({
      house: h.house,
      netForce: h.netForce
    }))
  };
}

/**
 * Default `/generate-chart` payload: compact metrics + no duplicate debug blob / prose layers.
 */
function buildAstroBrainPublicPayload(full) {
  const payload = buildAstroBrainFullPayload(full);
  delete payload.debug;
  delete payload.methodology;
  delete payload.corePatterns;
  return {
    ...payload,
    ashtakavarga: slimAshtakavargaPublic(payload.ashtakavarga),
    transitWindows: slimTransitWindowsPublic(payload.transitWindows),
    summary: extractNumericSummary(full)
  };
}

/**
 * `includeDebug: true` / `debugChart`: full narrative + complete nested vimshottari (pratyantar), duplicate debug.
 */
function buildAstroBrainDebugPayload(full) {
  const base = buildAstroBrainFullPayload(full);
  return {
    ...base,
    payloadKind: 'debug_full',
    summary: extractNumericSummary(full),
    vimshottariTimelineFull: Array.isArray(full.dasha.timeline) ? full.dasha.timeline : [],
    methodology: `${base.methodology} Debug payload includes full vimshottariTimelineFull with nested pratyantar rows.`
  };
}

module.exports = {
  generateAstroBrain,
  buildAstroBrainApiPayload: buildAstroBrainPublicPayload,
  buildAstroBrainFullPayload,
  buildAstroBrainPublicPayload,
  buildAstroBrainDebugPayload
};

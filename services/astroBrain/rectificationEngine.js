const { buildTransitSnapshotAtUtc } = require('../astrologyService');
const {
  resolveLifeEventAnchorDate,
  pickEventRule,
  normalizeEventCategory,
  resolveEventImpact
} = require('../timeRectificationService');

const VERIFY_AGGREGATE_MIN = Number(process.env.LIFE_EVENT_VERIFY_AGG_MIN || 0.62);
const VERIFY_MIN_EVENTS = Number(process.env.LIFE_EVENT_VERIFY_MIN_EVENTS || 2);
const MISMATCH_AGGREGATE_MAX = Number(process.env.LIFE_EVENT_MISMATCH_AGG_MAX || 0.32);
const MISMATCH_MIN_EVENTS = Number(process.env.LIFE_EVENT_MISMATCH_MIN_EVENTS || 2);

function extractSiderealBhavaCusps(chart) {
  const rows = chart?.bhavaChalit?.siderealCusps;
  if (!Array.isArray(rows) || rows.length < 12) return null;
  const sorted = [...rows].sort((a, b) => (a.house || 0) - (b.house || 0));
  const degrees = sorted.map((r) => Number(r.degree)).filter((d) => Number.isFinite(d));
  return degrees.length === 12 ? degrees : null;
}

function dateInMahadashaSegment(eventTime, seg) {
  if (!seg?.startDateApprox || !seg?.endDateApprox) return false;
  const t = eventTime.getTime();
  const s = new Date(`${seg.startDateApprox}T12:00:00.000Z`).getTime();
  const e = new Date(`${seg.endDateApprox}T12:00:00.000Z`).getTime();
  return Number.isFinite(t) && Number.isFinite(s) && Number.isFinite(e) && t >= s && t <= e;
}

function findDashaAtDate(timeline, eventDate) {
  if (!eventDate || !Array.isArray(timeline)) return null;
  for (const seg of timeline) {
    if (!dateInMahadashaSegment(eventDate, seg)) continue;
    let antar = null;
    for (const a of seg.antardasha || []) {
      if (dateInMahadashaSegment(eventDate, a)) {
        antar = a;
        break;
      }
    }
    return { mahadasha: seg, antardasha: antar };
  }
  return null;
}

function mapHouseLords(chart) {
  const hl = chart?.astroBrain?.debug?.houseLords || chart?.astroBrain?.houseLords;
  const out = {};
  (hl?.houses || []).forEach((h) => {
    out[h.house] = h?.lord || null;
  });
  return out;
}

function dashaHouseLordOverlap(rule, dashaAt, chart) {
  const lordByHouse = mapHouseLords(chart);
  const md = dashaAt?.mahadasha?.planet;
  const ad = dashaAt?.antardasha?.antarLord || null;
  let bonus = 0;
  for (const h of rule.houses) {
    const L = lordByHouse[h];
    if (!L) continue;
    if (L === md) bonus += 0.18;
    if (ad && L === ad) bonus += 0.14;
  }
  return Math.min(0.35, bonus);
}

function transitHouseScore(rule, transitSnapshot) {
  const houseSet = new Set(rule.houses);
  let hits = 0;
  const considered = new Set();
  for (const name of rule.planets) {
    if (considered.has(name)) continue;
    considered.add(name);
    const row = (transitSnapshot?.planets || []).find((p) => p.name === name);
    if (row && houseSet.has(row.houseFromNatalAsc)) hits += 1;
  }
  if (!rule.planets.length) return 0;
  return Math.min(1, (hits / rule.planets.length) * 1.25);
}

function scoreOneEvent(evt, chart, transitSnapshot, dashaAt) {
  const rule = pickEventRule(evt);
  const dashaPlanetScore = (() => {
    if (!dashaAt?.mahadasha) return 0;
    const md = dashaAt.mahadasha.planet;
    const ad = dashaAt.antardasha?.antarLord || null;
    let s = 0;
    if (md && rule.planets.includes(md)) s += 0.38;
    if (ad && rule.planets.includes(ad)) s += 0.32;
    return s;
  })();
  const houseLordBonus = dashaAt ? dashaHouseLordOverlap(rule, dashaAt, chart) : 0;
  const dashaPart = Math.min(1, dashaPlanetScore + houseLordBonus);
  const transitPart = transitSnapshot ? transitHouseScore(rule, transitSnapshot) : 0;
  const combined = 0.48 * dashaPart + 0.42 * transitPart + 0.1 * Math.min(1, dashaPart > 0 && transitPart > 0 ? 1 : 0.35);
  return {
    timeAccuracyMatch: Number(combined.toFixed(3)),
    dashaPart: Number(dashaPart.toFixed(3)),
    transitPart: Number(transitPart.toFixed(3)),
    mahadashaLord: dashaAt?.mahadasha?.planet || null,
    antarLord: dashaAt?.antardasha?.antarLord || null,
    category: normalizeEventCategory(evt)
  };
}

/**
 * Compares dated life events to Vimshottari windows at each event + sidereal transits (bhāva-chalit when cusps exist).
 * Feeds verification badge + optional PQ adjustment (see predictionQualityService).
 */
async function buildLifeEventVerification(chart, lifeEvents = []) {
  const timeline = chart?.astroBrain?.vimshottariTimeline || [];
  const asc = chart?.ascendantAbsoluteDegree;
  if (!Number.isFinite(asc) || !lifeEvents.length) {
    return null;
  }

  const rows = [];
  let weightedSum = 0;
  let weightMass = 0;
  let validCount = 0;

  for (const evt of lifeEvents) {
    const anchor = resolveLifeEventAnchorDate(evt);
    const impact = resolveEventImpact(evt);
    if (!anchor) {
      rows.push({
        type: evt?.type || 'unknown',
        category: normalizeEventCategory(evt),
        anchor: null,
        timeAccuracyMatch: null,
        note: 'Need YYYY-MM-DD or YYYY-MM for this row.'
      });
      continue;
    }

    validCount += 1;
    const iso = anchor.toISOString();
    let transitSnapshot = null;
    try {
      transitSnapshot = await buildTransitSnapshotAtUtc(iso, asc, {
        siderealBhavaCusps: extractSiderealBhavaCusps(chart)
      });
    } catch {
      transitSnapshot = null;
    }

    const dashaAt = timeline.length ? findDashaAtDate(timeline, anchor) : null;
    const scored = scoreOneEvent(evt, chart, transitSnapshot, dashaAt);

    weightedSum += impact.weight * scored.timeAccuracyMatch;
    weightMass += impact.weight;

    rows.push({
      type: evt?.type || 'unknown',
      category: scored.category,
      anchor: iso.slice(0, 10),
      anchorKind: /^\d{4}-\d{2}-\d{2}$/.test(String(evt?.date || '').trim())
        ? 'day'
        : /^\d{4}-\d{2}$/.test(String(evt?.yearMonth || '').trim())
          ? 'month'
          : 'day',
      timeAccuracyMatch: scored.timeAccuracyMatch,
      dashaPart: scored.dashaPart,
      transitPart: scored.transitPart,
      mahadashaLord: scored.mahadashaLord,
      antarLord: scored.antarLord,
      impact: impact.label,
      transitGeneratedAt: transitSnapshot?.generatedAt || null
    });
  }

  const aggregate01 = weightMass > 0 ? weightedSum / weightMass : 0;
  const strongRows = rows.filter((r) => r.timeAccuracyMatch != null && r.timeAccuracyMatch >= 0.52);

  let verificationBadge = 'none';
  if (validCount >= VERIFY_MIN_EVENTS && aggregate01 >= VERIFY_AGGREGATE_MIN) {
    verificationBadge = 'verified';
  } else if (validCount >= 1 && aggregate01 >= 0.45) {
    verificationBadge = 'partial';
  }

  let softMismatch = false;
  if (validCount >= MISMATCH_MIN_EVENTS && aggregate01 <= MISMATCH_AGGREGATE_MAX) {
    softMismatch = true;
    verificationBadge = 'weak';
  }

  if (validCount === 0) {
    return null;
  }

  return {
    model: 'rectification_engine_v1_dasha_transit',
    validEventCount: validCount,
    aggregateScore01: Number(aggregate01.toFixed(3)),
    aggregateScore100: Math.round(aggregate01 * 100),
    verificationBadge,
    softMismatch,
    caveat:
      'Event verification uses approximate Vimshottari date bands and whole-sign transits from natal ascendant; it supports screening, not forensic rectification.',
    events: rows,
    matchedStrongCount: strongRows.length,
    thresholds: {
      verifyAggregateMin: VERIFY_AGGREGATE_MIN,
      verifyMinEvents: VERIFY_MIN_EVENTS,
      mismatchAggregateMax: MISMATCH_AGGREGATE_MAX,
      mismatchMinEvents: MISMATCH_MIN_EVENTS
    }
  };
}

module.exports = {
  buildLifeEventVerification
};

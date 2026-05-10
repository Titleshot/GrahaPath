const { DateTime } = require('luxon');
const { generateDashaTimeline } = require('../astroBrain/dashaEngine');

function parseIsoDate(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const dt = DateTime.fromISO(value, { setZone: true });
  return dt.isValid ? dt : null;
}

function yearsBetween(now, end) {
  if (!now || !end || !now.isValid || !end.isValid) return null;
  const years = end.diff(now, 'years').years;
  if (!Number.isFinite(years)) return null;
  return Math.max(0, Math.round(years * 100) / 100);
}

function fromAstroBrain(chart, now) {
  const ab = chart?.astroBrain;
  const snap = chart?.dashaSnapshot;
  const md = ab?.currentDasha;
  const ad = ab?.currentAntardasha;
  if (!md || !ad) {
    if (!snap?.mahaDasha || !snap?.antarDasha) return null;
    const snapEnd = parseIsoDate(snap.endDate);
    return {
      mahaDasha: snap.mahaDasha || null,
      antarDasha: snap.antarDasha || null,
      startDate: snap.startDate || null,
      endDate: snap.endDate || null,
      yearsRemaining: yearsBetween(now, snapEnd),
      source: 'dasha_snapshot'
    };
  }

  const start = parseIsoDate(ad.startDateApprox) || parseIsoDate(md.startDateApprox);
  const end = parseIsoDate(ad.endDateApprox) || parseIsoDate(md.endDateApprox);

  return {
    mahaDasha: md.planet || null,
    antarDasha: ad.antarLord || null,
    startDate: ad.startDateApprox || md.startDateApprox || null,
    endDate: ad.endDateApprox || md.endDateApprox || null,
    yearsRemaining: yearsBetween(now, end),
    source: 'astroBrain'
  };
}

function findCurrentFromTimeline(timeline, now) {
  if (!Array.isArray(timeline) || !timeline.length) return { maha: null, antar: null, next: null };
  const nowMs = now.toMillis();
  for (let i = 0; i < timeline.length; i += 1) {
    const seg = timeline[i];
    const ms = parseIsoDate(seg.startDateApprox)?.toMillis();
    const me = parseIsoDate(seg.endDateApprox)?.toMillis();
    if (!Number.isFinite(ms) || !Number.isFinite(me)) continue;
    if (nowMs >= ms && nowMs <= me) {
      const antars = Array.isArray(seg.antardasha) ? seg.antardasha : [];
      let activeAntar = antars[0] || null;
      for (const a of antars) {
        const as = parseIsoDate(a.startDateApprox)?.toMillis();
        const ae = parseIsoDate(a.endDateApprox)?.toMillis();
        if (Number.isFinite(as) && Number.isFinite(ae) && nowMs >= as && nowMs <= ae) {
          activeAntar = a;
          break;
        }
      }
      return { maha: seg, antar: activeAntar, next: timeline[i + 1] || null };
    }
  }
  const last = timeline[timeline.length - 1] || null;
  return { maha: last, antar: last?.antardasha?.[last.antardasha.length - 1] || null, next: null };
}

function fromEngine(chart, now) {
  const timelineData = generateDashaTimeline(chart || {});
  const timeline = Array.isArray(timelineData?.timeline) ? timelineData.timeline : [];
  const active = findCurrentFromTimeline(timeline, now);
  if (!active.maha) return null;

  const end = parseIsoDate(active.antar?.endDateApprox || active.maha.endDateApprox);

  return {
    mahaDasha: active.maha.planet || null,
    antarDasha: active.antar?.antarLord || null,
    startDate: active.antar?.startDateApprox || active.maha.startDateApprox || null,
    endDate: active.antar?.endDateApprox || active.maha.endDateApprox || null,
    yearsRemaining: yearsBetween(now, end),
    source: 'vimshottari_engine',
    nextMahaDasha: active.next?.planet || null
  };
}

function calculateCurrentDasha(chart, options = {}) {
  const now = options.now ? DateTime.fromISO(String(options.now), { setZone: true }) : DateTime.now();
  const base = fromAstroBrain(chart, now) || fromEngine(chart, now);
  if (!base) {
    return {
      mahaDasha: null,
      antarDasha: null,
      startDate: null,
      endDate: null,
      yearsRemaining: null,
      source: 'unavailable'
    };
  }
  return base;
}

module.exports = {
  calculateCurrentDasha
};

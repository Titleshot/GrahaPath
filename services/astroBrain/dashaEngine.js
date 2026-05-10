const { DateTime } = require('luxon');
const {
  NAKSHATRA_NAMES,
  NAKSHATRA_DEGREE,
  VIMSHOTTARI_ORDER,
  VIMSHOTTARI_YEARS
} = require('./constants');

const THEME = {
  Ketu: {
    theme: 'detachment, spiritualization, separation, internalization',
    likelyFocus: 'inner work, endings, skill refinement',
    caution: 'Avoid fear-based predictions; pace change gently.'
  },
  Venus: {
    theme: 'relationships, comfort, art, pleasure, material growth',
    likelyFocus: 'values, harmony, creative balance',
    caution: 'Attachment patterns may need honest review.'
  },
  Sun: {
    theme: 'identity, authority, father, visibility',
    likelyFocus: 'confidence, leadership, health of ego habits',
    caution: 'Burnout risk if visibility is forced.'
  },
  Moon: {
    theme: 'mind, emotion, home, inner changes',
    likelyFocus: 'security, routines, emotional honesty',
    caution: 'Mood cycles are normal; not a medical label.'
  },
  Mars: {
    theme: 'action, competition, courage, conflict',
    likelyFocus: 'boundaries, exercise, decisive projects',
    caution: 'Impulsivity may spike; channel energy safely.'
  },
  Rahu: {
    theme: 'ambition, foreign or unusual paths, obsession, rapid growth or confusion',
    likelyFocus: 'strategy, ethics, containment of cravings',
    caution: 'Confusion is possible; avoid “guaranteed rise” language.'
  },
  Jupiter: {
    theme: 'wisdom, education, expansion, guidance',
    likelyFocus: 'learning, mentors, meaning-making',
    caution: 'Overpromising or overextension may appear.'
  },
  Saturn: {
    theme: 'responsibility, delay, discipline, karma',
    likelyFocus: 'systems, patience, long arcs',
    caution: 'Shame spirals are not required by the chart.'
  },
  Mercury: {
    theme: 'learning, business, communication, analysis',
    likelyFocus: 'writing, commerce, skill-building',
    caution: 'Overthinking may need breaks and sleep hygiene.'
  }
};

function nakshatraIndexFromLongitude(siderealLongitude) {
  const norm = ((siderealLongitude % 360) + 360) % 360;
  return Math.min(NAKSHATRA_NAMES.length - 1, Math.floor(norm / NAKSHATRA_DEGREE));
}

function startingLordFromNakshatraIndex(index) {
  return VIMSHOTTARI_ORDER[index % 9];
}

function nextLord(planet) {
  const i = VIMSHOTTARI_ORDER.indexOf(planet);
  return VIMSHOTTARI_ORDER[(i + 1) % 9];
}

function antardashaSequence(mahaLord) {
  const start = VIMSHOTTARI_ORDER.indexOf(mahaLord);
  if (start < 0) {
    return VIMSHOTTARI_ORDER;
  }
  return [...VIMSHOTTARI_ORDER.slice(start), ...VIMSHOTTARI_ORDER.slice(0, start)];
}

/** Mean tropical year in ms — stable segment boundaries (avoids rounded-day drift). */
const MS_PER_YEAR = 365.2425 * 86400000;

/**
 * Classical antar length in mahadasha M: (years(M) * years(antar)) / 120.
 */
function antarYearsInMaha(mahaBlockYears, antarLord) {
  return (mahaBlockYears * VIMSHOTTARI_YEARS[antarLord]) / 120;
}

/**
 * Pratyantar in antar A: (antarYears × pratyLordYears) / 120. Same sub-sequence rule as antar-in-maha.
 */
function buildPratyantarForAntarWindow(antarLord, antarStartDt, antarYearsFull, clipStart, clipEnd) {
  const sequence = antardashaSequence(antarLord);
  const pieces = [];
  let cursor = antarStartDt;

  for (const pratyLord of sequence) {
    const py = (antarYearsFull * VIMSHOTTARI_YEARS[pratyLord]) / 120;
    const pratyEnd = cursor.plus({ milliseconds: py * MS_PER_YEAR });
    const segS = cursor > clipStart ? cursor : clipStart;
    const segE = pratyEnd < clipEnd ? pratyEnd : clipEnd;
    if (segS.toMillis() < segE.toMillis()) {
      pieces.push({
        pratyantarLord: pratyLord,
        startDateApprox: segS.toISODate(),
        endDateApprox: segE.toISODate(),
        caveat: 'Pratyantar proportion (praty years = antarYears × lordYears / 120), clipped to visible antar window.'
      });
    }
    cursor = pratyEnd;
    if (cursor.toMillis() >= clipEnd.toMillis()) break;
  }

  return pieces;
}

/**
 * Full 9-antardasha cycle for a mahadasha block starting at startDt (used from exact maha start).
 */
function buildAntardashaFull(mahaLord, mahaBlockYears, startDt, startAge) {
  const sequence = antardashaSequence(mahaLord);
  const segments = [];
  let cursor = startDt;
  let age = startAge;

  sequence.forEach((antarLord) => {
    const years = antarYearsInMaha(mahaBlockYears, antarLord);
    const end = cursor.plus({ milliseconds: years * MS_PER_YEAR });
    const endAge = age + years;
    const pratyantar = buildPratyantarForAntarWindow(antarLord, cursor, years, cursor, end);
    segments.push({
      mahaLord,
      antarLord,
      startAge: round2(age),
      endAge: round2(endAge),
      startDateApprox: cursor.toISODate(),
      endDateApprox: end.toISODate(),
      caveat: 'Antardasha from Vimshottari proportion (antar years = mahaYears × lordYears / 120).',
      pratyantar
    });
    cursor = end;
    age = endAge;
  });

  return segments;
}

/**
 * Antardashas from birth forward within the *first* mahadasha only (clips anything before birth).
 * mahaStartDt = absolute start of this mahadasha; birthDt inside [mahaStart, mahaStart + fullMahaYears].
 */
function buildAntardashaFromBirthInFirstMaha(mahaLord, birthDt, balanceYearsRemaining) {
  const fullY = VIMSHOTTARI_YEARS[mahaLord];
  const elapsed = fullY - balanceYearsRemaining;
  const mahaStartDt = birthDt.minus({ milliseconds: elapsed * MS_PER_YEAR });
  const mahaEndDt = mahaStartDt.plus({ milliseconds: fullY * MS_PER_YEAR });
  const sequence = antardashaSequence(mahaLord);
  const segments = [];
  let t = mahaStartDt;

  const ageAt = (dt) => round2(dt.diff(birthDt, 'years').years);

  for (let i = 0; i < 9; i += 1) {
    const antarLord = sequence[i];
    const years = antarYearsInMaha(fullY, antarLord);
    const tEnd = t.plus({ milliseconds: years * MS_PER_YEAR });
    const segStart = t > birthDt ? t : birthDt;
    const segEnd = tEnd < mahaEndDt ? tEnd : mahaEndDt;
    if (segStart.toMillis() < segEnd.toMillis()) {
      const pratyantar = buildPratyantarForAntarWindow(antarLord, t, years, segStart, segEnd);
      segments.push({
        mahaLord,
        antarLord,
        startAge: ageAt(segStart),
        endAge: ageAt(segEnd),
        startDateApprox: segStart.toISODate(),
        endDateApprox: segEnd.toISODate(),
        caveat:
          'Antardasha segment clipped to birth-forward arc within first mahadasha (skips antars already elapsed before birth).',
        pratyantar
      });
    }
    t = tEnd;
    if (t.toMillis() >= mahaEndDt.toMillis()) break;
  }

  return segments;
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

function generateDashaTimeline(chartPayload) {
  const moon = (chartPayload.planets || []).find((p) => p.name === 'Moon');
  const birthAd = chartPayload.birthDateAD;
  const localIso = chartPayload.localDateTime;

  if (!moon || moon.nakshatra == null || moon.absoluteDegree == null || !birthAd) {
    return {
      caveat: 'Basic Vimshottari calculation; refine later with antardasha and exact balance tables.',
      startingDasha: null,
      timeline: [],
      currentDasha: null,
      currentAntardasha: null,
      currentPratyantar: null,
      note: 'Not enough lunar data for dasha timeline.'
    };
  }

  const nakIndex = nakshatraIndexFromLongitude(moon.absoluteDegree);
  const nakName = moon.nakshatra || NAKSHATRA_NAMES[nakIndex];
  const startLord = startingLordFromNakshatraIndex(nakIndex);
  const startDeg = nakIndex * NAKSHATRA_DEGREE;
  const progress = (moon.absoluteDegree - startDeg) / NAKSHATRA_DEGREE;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const balanceYearsAtBirth = (1 - clampedProgress) * VIMSHOTTARI_YEARS[startLord];

  const birthDt = localIso
    ? DateTime.fromISO(localIso, { setZone: true })
    : DateTime.fromISO(`${birthAd}T00:00:00`, { zone: 'utc' });

  const timeline = [];
  let ageCursor = 0;
  let dateCursor = birthDt;
  let lord = startLord;
  let remaining = balanceYearsAtBirth;

  const pushSegment = (planet, yearsThis, startAge, startDate, isFirstMahaFromBirth) => {
    const th = THEME[planet] || THEME.Sun;
    const endDate = startDate.plus({ milliseconds: yearsThis * MS_PER_YEAR });
    const endAge = startAge + yearsThis;
    const antardasha = isFirstMahaFromBirth
      ? buildAntardashaFromBirthInFirstMaha(planet, birthDt, yearsThis)
      : buildAntardashaFull(planet, yearsThis, startDate, startAge);
    timeline.push({
      planet,
      startAge: round2(startAge),
      endAge: round2(endAge),
      startDateApprox: startDate.toISODate(),
      endDateApprox: endDate.toISODate(),
      theme: th.theme,
      likelyFocus: th.likelyFocus,
      caution: th.caution,
      antardasha
    });
    return { endDate, endAge };
  };

  let guard = 0;
  while (ageCursor < 90 && guard < 80) {
    guard += 1;
    const yearsThis = lord === startLord && timeline.length === 0 ? remaining : VIMSHOTTARI_YEARS[lord];
    const isFirst = lord === startLord && timeline.length === 0;
    const { endDate, endAge } = pushSegment(lord, yearsThis, ageCursor, dateCursor, isFirst);
    ageCursor = endAge;
    dateCursor = endDate;
    lord = nextLord(lord);
  }

  const now = DateTime.now();
  let currentDasha = timeline[0] || null;
  let currentAntardasha = null;
  for (const seg of timeline) {
    const s = DateTime.fromISO(seg.startDateApprox);
    const e = DateTime.fromISO(seg.endDateApprox);
    if (now >= s && now <= e) {
      currentDasha = { ...seg, note: 'Current mahadasha by computed Vimshottari date window.' };
      currentAntardasha =
        seg.antardasha.find((a) => {
          const as = DateTime.fromISO(a.startDateApprox);
          const ae = DateTime.fromISO(a.endDateApprox);
          return now >= as && now <= ae;
        }) || seg.antardasha[0] || null;
      break;
    }
  }
  const last = timeline[timeline.length - 1];
  if (last && now > DateTime.fromISO(last.endDateApprox)) {
    currentDasha = { ...last, note: 'Birth date is before generated window end; refine timeline for older ages (MVP).' };
    currentAntardasha = last.antardasha?.[last.antardasha.length - 1] || null;
  }

  let currentPratyantar = null;
  if (currentAntardasha && Array.isArray(currentAntardasha.pratyantar)) {
    for (const pr of currentAntardasha.pratyantar) {
      const ps = DateTime.fromISO(pr.startDateApprox);
      const pe = DateTime.fromISO(pr.endDateApprox);
      if (now >= ps && now <= pe) {
        currentPratyantar = {
          ...pr,
          note: 'Current pratyantar by date window within active antardasha.'
        };
        break;
      }
    }
  }

  return {
    caveat:
      'Vimshottari mahadasha uses fixed-year blocks with MS-per-year boundaries; antar and pratyantar follow (parent×lord)/120 within each parent segment. First mahadasha antars are clipped to birth-forward arc.',
    startingDasha: {
      planet: startLord,
      nakshatra: nakName,
      balanceYearsAtBirth: round2(balanceYearsAtBirth),
      reasoning: `Moon in ${nakName} begins ${startLord} mahadasha with approximate balance from lunar progress within nakshatra.`
    },
    timeline,
    currentDasha,
    currentAntardasha,
    currentPratyantar
  };
}

module.exports = {
  generateDashaTimeline,
  nakshatraIndexFromLongitude,
  startingLordFromNakshatraIndex
};

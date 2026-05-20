import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ChartIdentityStrip from './ChartIdentityStrip';
import KundaliWheel from './KundaliWheel';
import LifePhaseValidation from './LifePhaseValidation';
import ValidationResult from './ValidationResult';
import ChartGrahaChat from './ChartGrahaChat';
import { getClientFingerprint } from '../lib/clientFingerprint';
import { apiFetch, withApiBase } from '../lib/apiBase';

const API_LIFE_PHASES = withApiBase('/api/life-phase-validation');

const SIGN_LORD = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter'
};

function byName(chart, name) {
  return (chart?.planets || []).find((p) => p?.name === name) || null;
}

function signTone(sign) {
  const fire = new Set(['Aries', 'Leo', 'Sagittarius']);
  const earth = new Set(['Taurus', 'Virgo', 'Capricorn']);
  const air = new Set(['Gemini', 'Libra', 'Aquarius']);
  const water = new Set(['Cancer', 'Scorpio', 'Pisces']);
  if (fire.has(sign)) return 'direct, expressive reactions';
  if (earth.has(sign)) return 'practical, controlled responses';
  if (air.has(sign)) return 'mental processing and social scanning';
  if (water.has(sign)) return 'deep emotional processing and sensitivity';
  return 'mixed emotional responses';
}

function outerStyle(sign) {
  const fire = new Set(['Aries', 'Leo', 'Sagittarius']);
  const earth = new Set(['Taurus', 'Virgo', 'Capricorn']);
  const air = new Set(['Gemini', 'Libra', 'Aquarius']);
  const water = new Set(['Cancer', 'Scorpio', 'Pisces']);
  if (fire.has(sign)) return 'direct and visible';
  if (earth.has(sign)) return 'steady and practical';
  if (air.has(sign)) return 'curious and conversational';
  if (water.has(sign)) return 'protective and intuitive';
  return 'adaptive';
}

function buildPhase014(chart) {
  const moon = byName(chart, 'Moon');
  const saturn = byName(chart, 'Saturn');
  const ketu = byName(chart, 'Ketu');
  const moonTone = signTone(moon?.sign);
  const moonHouse = moon?.house ? `Moon in house ${moon.house}` : 'Moon pattern';
  const saturnChild = saturn?.house && [1, 4, 8, 12].includes(saturn.house);
  const ketuChild = ketu?.house && [1, 4, 8, 12].includes(ketu.house);

  const line2 = saturnChild
    ? 'Early responsibility may have appeared sooner than expected, shaping emotional restraint.'
    : ketuChild
      ? 'You may have felt inwardly different early, learning self-protection before full expression.'
      : 'Early conditioning likely rewarded adaptation over emotional display.';

  return `${moonHouse} suggests childhood coping through ${moonTone}. ${line2} This phase often forms your baseline trust-and-safety style with family and close environments.`;
}

function buildPhase1524(chart) {
  const asc = chart?.ascendant;
  const ascLordName = SIGN_LORD[asc] || null;
  const ascLord = ascLordName ? byName(chart, ascLordName) : null;
  const rahu = byName(chart, 'Rahu');
  const mars = byName(chart, 'Mars');
  const rahuPush = rahu?.house && [1, 3, 7, 10, 11].includes(rahu.house);
  const marsPush = mars?.house && [1, 3, 6, 10].includes(mars.house);

  return `${ascLordName || 'Ascendant'}-led identity formation likely intensified in this phase${
    ascLord?.house ? ` through house ${ascLord.house} priorities` : ''
  }. ${
    rahuPush
      ? 'Rahu influence suggests experimentation, social comparison, and fast role changes.'
      : 'Identity experimentation and social positioning likely became central themes.'
  } ${
    marsPush
      ? 'Mars pressure may have pushed visible action before full emotional certainty.'
      : 'This period often tested emotional independence alongside ambition.'
  } Many people with a similar pattern report trying multiple versions of themselves in study, work, or relationships before a more stable identity starts to settle.`;
}

function buildPhase25Present(chart) {
  const saturn = byName(chart, 'Saturn');
  const jupiter = byName(chart, 'Jupiter');
  const md = chart?.astroBrain?.currentDasha?.planet || chart?.astroBrain?.summary?.currentMahadashaPlanet || null;
  const ad =
    chart?.astroBrain?.currentAntardasha?.antarLord || chart?.astroBrain?.summary?.currentAntardashaLord || null;
  const saturnCareer = saturn?.house && [10, 11, 6].includes(saturn.house);
  const jupiterGrowth = jupiter?.house && [1, 5, 9, 10, 11].includes(jupiter.house);
  const dashaLine = md
    ? `Current dasha tone (${md}${ad ? ` / ${ad}` : ''}) is active now.`
    : 'Current timing requires dasha calculation; this phase is based on visible chart structure.';

  return `${
    saturnCareer
      ? 'Saturn maturity themes now emphasize career accountability and long-horizon decisions.'
      : 'This phase emphasizes stabilizing direction, boundaries, and consequence-aware decisions.'
  } ${
    jupiterGrowth
      ? 'Jupiter support suggests growth opens when purpose and skill-building align.'
      : 'Progress tends to come from sustained structure rather than quick momentum.'
  } ${dashaLine} The broader theme is less about instant outcomes and more about compounding progress through consistency, stronger priorities, and better alignment between responsibility and meaning.`;
}

function fallbackPhases(chart) {
  return ['0–14', '15–24', '25–Present'].map((range, idx) => ({
    id: `phase-${idx + 1}`,
    ageRange: range,
    title:
      range === '0–14'
        ? 'Childhood (0–14)'
        : range === '15–24'
          ? 'Youth & Emerging Identity (15–24)'
          : 'Adult & Career Focus (25–Present)',
    paragraphs: [phaseText(chart, range)],
    validationOptions: [
      { label: 'This matches me', value: 'match' },
      { label: 'Partially', value: 'partial' },
      { label: 'Not really', value: 'no' }
    ]
  }));
}

function fallbackCoreInsight(chart) {
  const lagna = chart?.ascendant || 'your ascendant';
  const moon = chart?.moonSign || 'your Moon';
  const moonHouse = chart?.planets?.find((p) => p.name === 'Moon')?.house;
  return `You tend to appear ${outerStyle(lagna)} through ${lagna}, while your internal pattern through ${moon} processes life more deeply. In day-to-day life, this can look like staying composed outside while internally reviewing what was said or felt. This repeats when emotional certainty is incomplete, especially with Moon linked to house ${moonHouse || 'key social/emotional themes'}.`;
}

function phaseText(chart, range) {
  if (range === '0–14') {
    return buildPhase014(chart);
  }
  if (range === '15–24') {
    return buildPhase1524(chart);
  }
  return buildPhase25Present(chart);
}

function extendPhaseTitle(title, ageRange) {
  const raw = String(title || '').trim();
  const compact = raw.toLowerCase().replace(/\s+/g, ' ');
  const range = String(ageRange || '').trim();

  if (compact === 'childhood (0-14)' || compact === 'childhood (0–14)' || range === '0–14') {
    return 'Childhood (0–14)';
  }
  if (
    compact === 'youth & emerging identity (15-24)' ||
    compact === 'youth & emerging identity (15–24)' ||
    range === '15–24'
  ) {
    return 'Youth & Emerging Identity (15–24)';
  }
  if (
    compact === 'adult & career focus (25-present)' ||
    compact === 'adult & career focus (25–present)' ||
    range === '25–Present'
  ) {
    return 'Adult & Career Focus (25–Present)';
  }

  return raw || 'Life Phase';
}

export default function DemoExperience({ chart }) {
  const [responses, setResponses] = useState({});
  const [aiPhases, setAiPhases] = useState([]);
  const [aiCoreInsight, setAiCoreInsight] = useState('');
  const [aiCoreReason, setAiCoreReason] = useState('');
  const [phaseLoading, setPhaseLoading] = useState(false);
  const phases = useMemo(() => (aiPhases.length ? aiPhases : fallbackPhases(chart)), [aiPhases, chart]);

  useEffect(() => {
    if (!chart) return;
    let cancelled = false;
    setPhaseLoading(true);
    setAiPhases([]);
    setAiCoreInsight('');
    setAiCoreReason('');
    apiFetch(API_LIFE_PHASES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gp-client-fp': getClientFingerprint(),
        'x-gp-demo-premium': 'true'
      },
      body: JSON.stringify({
        chart,
        message: 'Generate dynamic chart-specific life phase validation JSON.'
      })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `Phase generation failed (${res.status})`);
        const raw = String(data?.text || '').trim();
        let parsed = {};
        try {
          parsed = JSON.parse(raw);
        } catch (error) {
          // Handle non-JSON responses
          parsed = { phases: [], coreInsight: { text: '', astroReason: '' } };
        }
        const list = Array.isArray(parsed?.phases) ? parsed.phases : [];
        const insightText = String(parsed?.coreInsight?.text || '').trim();
        const insightReason = String(parsed?.coreInsight?.astroReason || '').trim();
        if (!list.length) return;
        const mapped = list.slice(0, 3).map((item, idx) => ({
          id: `phase-${idx + 1}`,
          ageRange: item?.ageRange || ['0–14', '15–24', '25–Present'][idx],
          title: extendPhaseTitle(item?.title || `Phase ${idx + 1}`, item?.ageRange),
          paragraphs: [String(item?.shortText || '').trim()].filter(Boolean),
          astroReason: String(item?.astroReason || '').trim(),
          validationOptions: [
            { label: 'This matches me', value: 'match' },
            { label: 'Partially', value: 'partial' },
            { label: 'Not really', value: 'no' }
          ]
        }));
        if (!cancelled && mapped.every((x) => x.paragraphs.length > 0)) {
          setAiPhases(mapped);
          if (insightText) setAiCoreInsight(insightText);
          if (insightReason) setAiCoreReason(insightReason);
        }
      })
      .catch(() => {
        // fallback remains chart-driven local synthesis
      })
      .finally(() => {
        if (!cancelled) setPhaseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chart]);

  return (
    <div className="flex flex-col gap-6">
      <ChartIdentityStrip chart={chart} forceDeepData />

      <section id="gp-wheel" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gold/10 pb-2">
          <h2 className="text-xs uppercase tracking-[0.32em] text-gold/70">Interactive kundali wheel</h2>
          <p className="text-[11px] text-ivory/42">Tap planets for full placement cards</p>
        </div>
        <KundaliWheel chart={chart} forceDeepData mode="paid" />
      </section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gold/20 bg-black/25 p-5">
        <p className="text-xs uppercase tracking-[0.26em] text-gold/70">This Is What Defines You</p>
        <p className="mt-3 text-sm leading-relaxed text-cream/80">{aiCoreInsight || fallbackCoreInsight(chart)}</p>
        {aiCoreReason && <p className="mt-2 text-[11px] text-gold-200/75">Astro reason: {aiCoreReason}</p>}
      </motion.section>

      <ChartGrahaChat chart={chart} forceUnlocked initialInsights={50} />

      <LifePhaseValidation
        phases={phases}
        responses={responses}
        onSelect={(id, value) => setResponses((prev) => ({ ...prev, [id]: value }))}
        isValidating={phaseLoading}
      />
      {Object.keys(responses).length === phases.length ? <ValidationResult phases={phases} responses={responses} /> : null}
    </div>
  );
}

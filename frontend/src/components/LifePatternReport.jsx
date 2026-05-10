import { motion } from 'framer-motion';
import { getNakshatraDisplay, getRashiDisplay } from '../data/vedicNames';

const SECTION_ORDER = [
  'Personality Core',
  'Emotional Pattern',
  'Life Direction',
  'Strengths',
  'Internal Challenges'
];

function planetByName(chart, planetName) {
  return chart?.planets?.find((planet) => planet.name === planetName);
}

function interpretationFor(chart, planetName) {
  return (
    planetByName(chart, planetName)?.interpretation ||
    chart?.interpretations?.find((interpretation) => interpretation.planet === planetName)
  );
}

function planetsInHouses(chart, houses) {
  return (chart?.planets || []).filter((planet) => houses.includes(planet.house));
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function joinHuman(values) {
  const cleanValues = uniqueValues(values);

  if (cleanValues.length <= 1) {
    return cleanValues[0] || '';
  }

  return `${cleanValues.slice(0, -1).join(', ')} and ${cleanValues.at(-1)}`;
}

function planetSignal(chart, planetName) {
  const planet = planetByName(chart, planetName);

  return {
    planet,
    interpretation: planet?.interpretation || interpretationFor(chart, planetName)
  };
}

function strongestInterpretations(chart, limit = 3) {
  return (chart?.planets || [])
    .map((planet) => planet.interpretation)
    .filter(Boolean)
    .slice(0, limit);
}

function buildPersonalityCore(chart) {
  const { planet: sunPlanet, interpretation: sun } = planetSignal(chart, 'Sun');
  const { interpretation: moon } = planetSignal(chart, 'Moon');
  const coreStrengths = joinHuman([sun?.strength, moon?.strength]);
  const coreTension = joinHuman([sun?.challenge, moon?.challenge]);

  return {
    title: 'Personality Core',
    signal: `Ascendant ${getRashiDisplay(chart.ascendant)} · Sun sign ${getRashiDisplay(chart.sunSign)}`,
    body: `You may notice a soft contrast between how you meet the world through ${chart.ascendant} and how your confidence moves through ${sunPlanet?.sign || chart.sunSign}. This pattern often shows up as ${coreStrengths || 'quiet self-trust'}, with growth coming from not letting ${coreTension || 'inner pressure'} define your choices.`,
    highlights: [sun?.strength, sun?.challenge].filter(Boolean).slice(0, 2)
  };
}

function buildEmotionalPattern(chart) {
  const { planet: moonPlanet, interpretation: moon } = planetSignal(chart, 'Moon');
  const { interpretation: venus } = planetSignal(chart, 'Venus');
  const emotionalGift = joinHuman([moon?.strength, venus?.strength]);
  const emotionalEdge = joinHuman([moon?.challenge, venus?.challenge]);

  return {
    title: 'Emotional Pattern',
    signal: `Moon sign ${getRashiDisplay(chart.moonSign)}${moonPlanet ? ` · Nakshatra ${getNakshatraDisplay(moonPlanet.nakshatra)}` : ''}`,
    body: `There may be phases where your emotions need space, honesty, and a wider meaning before they settle. This can make you deeply responsive, but when stretched it may show up as ${emotionalEdge || 'restlessness or sensitivity'}; the medicine is returning to ${emotionalGift || 'emotional clarity'}.`,
    highlights: [moon?.strength, moon?.challenge].filter(Boolean).slice(0, 2)
  };
}

function buildLifeDirection(chart) {
  const directionalPlanet =
    planetsInHouses(chart, [10, 9, 11])[0] || planetByName(chart, 'Jupiter') || planetByName(chart, 'Saturn');
  const insight = directionalPlanet?.interpretation;

  return {
    title: 'Life Direction',
    signal: directionalPlanet
      ? `${directionalPlanet.name} · House ${directionalPlanet.house} · ${getRashiDisplay(directionalPlanet.sign)}`
      : `${chart.ayanamsa} ${chart.houseSystem}`,
    body: directionalPlanet
      ? `At times, your path may become clearer through lived effort rather than instant certainty. You may notice progress opening when you trust ${insight?.strength || 'your strongest placement'} while staying patient with ${insight?.challenge || 'the parts of life that take time to mature'}.`
      : 'There is a tendency for direction to become clearer when you follow the strongest repeated signals in the chart rather than forcing a fixed identity too early.',
    highlights: [insight?.strength, insight?.challenge].filter(Boolean).slice(0, 2)
  };
}

function buildStrengths(chart) {
  const strengths = strongestInterpretations(chart, 5).map((interpretation) => interpretation.strength);
  const challenges = strongestInterpretations(chart, 3).map((interpretation) => interpretation.challenge);

  return {
    title: 'Strengths',
    signal: uniqueValues(strengths).join(' · '),
    body: `Your strongest signals point toward ${joinHuman(strengths) || 'steady inner capacity'}. At times, these gifts may become most visible after moving through ${joinHuman(challenges) || 'pressure'}, which can make your growth feel earned rather than accidental.`,
    highlights: uniqueValues(strengths).slice(0, 2)
  };
}

function buildInternalChallenges(chart) {
  const challenges = strongestInterpretations(chart, 5).map((interpretation) => interpretation.challenge);
  const strengths = strongestInterpretations(chart, 4).map((interpretation) => interpretation.strength);

  return {
    title: 'Internal Challenges',
    signal: uniqueValues(challenges).join(' · '),
    body: `You may notice recurring pressure around ${joinHuman(challenges) || 'old emotional patterns'}. This does not define you; it points to where ${joinHuman(strengths) || 'patience and self-trust'} can become stronger when you respond with awareness instead of self-judgment.`,
    highlights: uniqueValues(challenges).slice(0, 2)
  };
}

function buildReportSections(chart) {
  if (!chart) {
    return [];
  }

  const sectionBuilders = {
    'Personality Core': buildPersonalityCore,
    'Emotional Pattern': buildEmotionalPattern,
    'Life Direction': buildLifeDirection,
    Strengths: buildStrengths,
    'Internal Challenges': buildInternalChallenges
  };

  return SECTION_ORDER.map((sectionName) => sectionBuilders[sectionName](chart));
}

function alignmentScore(chart) {
  const score = Number(chart?.predictionQuality?.overallQuality?.score);
  if (Number.isFinite(score) && score > 0) return Math.max(0, Math.min(100, Math.round(score)));
  const level = String(chart?.accuracy?.confidenceLevel || '').toLowerCase();
  if (level.includes('high')) return 84;
  if (level.includes('medium')) return 69;
  return 58;
}

function alignmentLabel(score) {
  if (score >= 82) return 'High';
  if (score >= 68) return 'Moderate';
  return 'Developing';
}

function signalBadges(chart) {
  const raw = Array.isArray(chart?.astroBrain?.dominantPlanets) ? chart.astroBrain.dominantPlanets : [];
  const names = raw
    .map((x) => (typeof x === 'string' ? x : x?.planet || x?.name))
    .filter(Boolean)
    .slice(0, 3);
  const badges = [];
  if (chart?.ascendant) badges.push(`${chart.ascendant} Lagna`);
  if (chart?.moonSign) badges.push(`${chart.moonSign} Moon`);
  if (names.length) badges.push(...names.map((p) => `${p} emphasis`));
  return uniqueValues(badges).slice(0, 5);
}

export default function LifePatternReport({ chart }) {
  const sections = buildReportSections(chart);
  const score = alignmentScore(chart);
  const badges = signalBadges(chart);

  if (!chart) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="glass-panel overflow-hidden rounded-[2rem] border border-gold-300/10 bg-black/20 p-5 sm:p-6"
    >
      <div className="mb-4 flex flex-col gap-3 border-b border-gold-300/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gold-300/55">Secondary depth</p>
          <h2 className="mt-3 font-serif text-2xl text-gold-100/95 sm:text-3xl">Detailed Pattern Breakdown</h2>
        </div>
        <div className="min-w-[210px] rounded-2xl border border-emerald-300/20 bg-emerald-400/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/70">Pattern Resonance</p>
          <p className="mt-1 text-sm font-semibold text-emerald-100">
            {score}% <span className="text-xs font-normal text-emerald-100/70">({alignmentLabel(score)})</span>
          </p>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-gold-300/20 bg-gold-300/5 px-3 py-1 text-[11px] text-cream/75"
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {sections.map((section, index) => (
          <motion.article
            key={section.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 1) * 0.08, duration: 0.35 }}
            className="rounded-3xl border border-gold-300/15 bg-black/25 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-gold-300/60">
                  {section.title}
                </p>
                <p className="mt-2 text-sm text-gold-100/75">{section.signal}</p>
              </div>
              {section.highlights.length > 0 && (
                <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                  {section.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full border border-gold-300/20 bg-gold-300/5 px-3 py-1 text-xs text-cream/70"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-3 text-sm leading-6 text-cream/78">{section.body}</p>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}

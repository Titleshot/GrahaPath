import { motion } from 'framer-motion';

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

function sentenceFromReportLine(reportLine) {
  if (!reportLine) {
    return '';
  }

  return reportLine.replace(/\.$/, '');
}

function buildPersonalityCore(chart) {
  const sun = interpretationFor(chart, 'Sun');
  const sunPlanet = planetByName(chart, 'Sun');

  return {
    title: 'Personality Core',
    signal: `Ascendant ${chart.ascendant} · Sun in ${chart.sunSign}`,
    body: `With ${chart.ascendant} rising and the Sun placed in ${sunPlanet?.sign || chart.sunSign}, you may notice that your outer presence and inner confidence work through ${sun?.theme || 'your solar pattern'}. ${sentenceFromReportLine(sun?.reportLine)}.`,
    highlights: [sun?.strength, sun?.challenge].filter(Boolean)
  };
}

function buildEmotionalPattern(chart) {
  const moon = interpretationFor(chart, 'Moon');
  const moonPlanet = planetByName(chart, 'Moon');

  return {
    title: 'Emotional Pattern',
    signal: `Moon in ${chart.moonSign}${moonPlanet ? ` · House ${moonPlanet.house}` : ''}`,
    body: `Your Moon pattern often suggests an emotional life shaped by ${moon?.psychological || 'the Moon placement shown in this chart'}. There may be phases where ${moon?.challenge || 'inner sensitivity'} becomes the doorway to stronger ${moon?.strength || 'emotional awareness'}.`,
    highlights: [moon?.strength, moon?.challenge].filter(Boolean)
  };
}

function buildLifeDirection(chart) {
  const directionalPlanet =
    planetsInHouses(chart, [10, 9, 11])[0] || planetByName(chart, 'Jupiter') || planetByName(chart, 'Saturn');
  const insight = directionalPlanet?.interpretation;

  return {
    title: 'Life Direction',
    signal: directionalPlanet
      ? `${directionalPlanet.name} · House ${directionalPlanet.house} · ${directionalPlanet.sign}`
      : `${chart.ayanamsa} ${chart.houseSystem}`,
    body: directionalPlanet
      ? `This pattern often suggests that your direction develops through ${insight?.theme || directionalPlanet.name}. ${sentenceFromReportLine(insight?.reportLine)}. You may notice the path becoming clearer when you lean into ${insight?.strength || 'the placement strength'} without forcing certainty too early.`
      : 'This pattern often suggests that direction becomes clearer through the strongest planet placements returned in this chart.',
    highlights: [insight?.strength, insight?.challenge].filter(Boolean)
  };
}

function buildStrengths(chart) {
  const strengths = (chart.interpretations || [])
    .map((interpretation) => interpretation.strength)
    .filter(Boolean)
    .slice(0, 4);
  const preview = chart.lifePatternPreview?.[0];

  return {
    title: 'Strengths',
    signal: strengths.join(' · '),
    body: `Your strongest available signals point toward ${strengths.join(', ')}. ${preview ? sentenceFromReportLine(preview) : 'These qualities may become more visible when you work with the chart placements consciously.'}.`,
    highlights: strengths
  };
}

function buildInternalChallenges(chart) {
  const challenges = (chart.interpretations || [])
    .map((interpretation) => interpretation.challenge)
    .filter(Boolean)
    .slice(0, 4);
  const saturn = interpretationFor(chart, 'Saturn');

  return {
    title: 'Internal Challenges',
    signal: challenges.join(' · '),
    body: `The chart does not describe a fixed fate, but it does show growth edges. You may notice recurring pressure around ${challenges.join(', ')}. ${saturn?.reportLine ? sentenceFromReportLine(saturn.reportLine) : 'This pattern may ask for patience, emotional honesty, and repeated effort'}.`,
    highlights: challenges
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

export default function LifePatternReport({ chart }) {
  const sections = buildReportSections(chart);

  if (!chart) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="glass-panel overflow-hidden rounded-[2rem] p-5 sm:p-6"
    >
      <div className="mb-6 flex flex-col gap-3 border-b border-gold-300/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gold-300/70">
            Based on your planetary placements
          </p>
          <h2 className="mt-3 font-serif text-3xl text-gold-100">Life Pattern Report</h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-cream/55">
          Concise preview generated from your ascendant, luminaries, planet houses, signs, and
          interpretation signals.
        </p>
      </div>

      <div className="grid gap-4">
        {sections.map((section, index) => (
          <motion.article
            key={section.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.35 }}
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
            <p className="mt-4 text-sm leading-7 text-cream/78">{section.body}</p>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}

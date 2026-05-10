import { motion } from 'framer-motion';

const SECTION_ORDER = [
  'futureLifeDirection',
  'earningsCareerPotential',
  'relationshipEmotionalPattern',
  'healthEnergyTendencies',
  'personalizedRemedies'
];

function confidenceTone(confidence) {
  if (confidence === 'strong') return 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100';
  if (confidence === 'moderate') return 'border-gold-300/30 bg-gold-300/10 text-gold-100';
  return 'border-amber-300/30 bg-amber-300/10 text-amber-100';
}

export default function FutureTeaser({ futureSections }) {
  const sections = SECTION_ORDER.map((key) => futureSections?.[key]).filter(Boolean);

  if (!sections.length) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-panel rounded-[2rem] p-5 sm:p-6"
    >
      <div className="border-b border-gold-300/15 pb-5">
        <p className="text-xs uppercase tracking-[0.35em] text-gold-300/70">Future analysis</p>
        <h2 className="mt-3 font-serif text-3xl text-gold-100">Your Future Pattern Is Ready</h2>
        <p className="mt-3 text-sm leading-relaxed text-cream/65">
          These sections are generated from your chart signals, interaction patterns, and current dasha timing.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-1">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-gold-300/15 bg-black/30 p-4 backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gold-100">{section.title}</h3>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${confidenceTone(
                  section.confidence
                )}`}
              >
                {section.confidence || 'possible'}
              </span>
            </div>
            {section.observation && (
              <p className="mt-3 text-sm leading-relaxed text-cream/78">{section.observation}</p>
            )}
            {section.cause && (
              <p className="mt-2 text-xs leading-relaxed text-gold-100/75">
                <span className="uppercase tracking-[0.16em] text-gold-300/70">Cause:</span> {section.cause}
              </p>
            )}
            {section.timing && (
              <p className="mt-2 text-xs leading-relaxed text-cream/70">
                <span className="uppercase tracking-[0.16em] text-gold-300/70">Timing:</span> {section.timing}
              </p>
            )}
            {section.action && (
              <p className="mt-2 text-xs leading-relaxed text-cream/70">
                <span className="uppercase tracking-[0.16em] text-gold-300/70">Action:</span> {section.action}
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  );
}

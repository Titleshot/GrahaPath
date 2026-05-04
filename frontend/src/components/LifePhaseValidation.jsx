import { motion } from 'framer-motion';

const responseStyles = {
  match: 'border-emerald-300/35 bg-emerald-300/10 text-emerald-100',
  partial: 'border-gold-300/35 bg-gold-300/10 text-gold-100',
  no: 'border-red-300/30 bg-red-300/10 text-red-100'
};

export default function LifePhaseValidation({ phases = [], responses = {}, result, onSelect }) {
  if (!phases.length) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="glass-panel rounded-[2rem] p-5 sm:p-6"
    >
      <div className="mb-5 border-b border-gold-300/15 pb-5">
        <p className="text-xs uppercase tracking-[0.34em] text-gold-300/70">
          Past Pattern Validation
        </p>
        <h2 className="mt-3 font-serif text-3xl text-gold-100">Your Life Phases</h2>
        <p className="mt-3 text-sm leading-6 text-cream/58">
          Mark what resonates. Your responses help estimate how strongly your past aligns with
          the calculated life pattern.
        </p>
      </div>

      <div className="grid gap-4">
        {phases.map((phase, index) => (
          <motion.article
            key={phase.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className="rounded-3xl border border-gold-300/15 bg-black/25 p-5"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-gold-300/60">{phase.ageRange}</p>
            <h3 className="mt-2 font-serif text-xl text-gold-100">{phase.title}</h3>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-cream/74">
              {phase.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {phase.validationOptions.map((option) => {
                const selected = responses[phase.id] === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSelect(phase.id, option.value)}
                    className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                      selected
                        ? responseStyles[option.value]
                        : 'border-gold-300/12 bg-black/20 text-cream/60 hover:border-gold-300/30 hover:text-gold-100'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </motion.article>
        ))}
      </div>

      {result && (
        <div className="mt-5 rounded-3xl border border-gold-300/20 bg-gold-300/8 p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-gold-300/70">
            Alignment Score
          </p>
          <p className="mt-2 font-serif text-3xl text-gold-100">{result.alignmentScore}%</p>
          <p className="mt-3 text-sm leading-6 text-cream/75">{result.transitionBlock}</p>
          <button
            type="button"
            className="mt-4 rounded-2xl border border-gold-300/45 bg-gold-gradient px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-glow"
          >
            {result.cta}
          </button>
        </div>
      )}
    </motion.section>
  );
}

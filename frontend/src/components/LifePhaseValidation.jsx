import { motion } from 'framer-motion';

const responseStyles = {
  match: 'border-gold-300/45 bg-gold-300/12 text-gold-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  partial: 'border-gold-300/45 bg-gold-300/12 text-gold-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  no: 'border-gold-300/45 bg-gold-300/12 text-gold-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
};

const responseIdle =
  'border-gold-300/12 bg-black/20 text-cream/60 hover:border-gold-300/35 hover:bg-gold-300/5 hover:text-gold-100';

export default function LifePhaseValidation({ phases = [], responses = {}, onSelect, isValidating }) {
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
        <p className="text-xs uppercase tracking-[0.34em] text-gold-300/70">Past Pattern Validation</p>
        <h2 className="mt-3 font-serif text-3xl text-gold-100">Your Life Phases</h2>
        <p className="mt-3 text-sm leading-[1.6] text-cream/58">
          Mark what resonates. Your responses help estimate how strongly your past aligns with the calculated life
          pattern.
        </p>
      </div>

      {isValidating && (
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-gold-300/60">Saving your responses…</p>
      )}

      <div className="grid gap-4">
        {phases.map((phase, index) => (
          <motion.article
            key={phase.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className="mx-auto w-full max-w-[480px] rounded-3xl border border-gold-300/15 bg-black/25 p-5"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-gold-300/60">{phase.ageRange}</p>
            <h3 className="mt-2 font-serif text-xl text-gold-100">{phase.title}</h3>
            <div className="mt-4 grid gap-3 text-sm leading-[1.6] text-cream/74">
              {phase.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {phase.astroReason && (
                <p className="text-[11px] text-gold-200/75">Astro reason: {phase.astroReason}</p>
              )}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {phase.validationOptions.map((option) => {
                const selected = responses[phase.id] === option.value;

                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => onSelect(phase.id, option.value)}
                    whileTap={{ scale: 0.96 }}
                    animate={
                      selected
                        ? { scale: [1, 1.06, 1], y: [0, -1, 0] }
                        : { scale: 1, y: 0 }
                    }
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className={`w-full rounded-2xl border px-3 py-3 text-left text-xs font-semibold transition sm:text-center ${
                      selected ? responseStyles[option.value] : responseIdle
                    }`}
                  >
                    {option.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}

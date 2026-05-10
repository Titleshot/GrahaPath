import { motion } from 'framer-motion';

const LOCKED_CARDS = [
  'Current Life Timing',
  'Career Direction',
  'Emotional Blueprint',
  'Wealth & Pressure Patterns',
  'Relationship Style',
  'Personalized Remedies',
  'Deep Logic Mode'
];

export default function LockedPreview({ onUnlock }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-gold/20 bg-black/25 p-5"
    >
      <h3 className="font-serif text-2xl text-gold">Your deeper chart intelligence is locked.</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {LOCKED_CARDS.map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-gold/20 bg-black/35 px-4 py-3 text-sm text-cream/80 blur-[0.45px] transition hover:border-gold/45"
          >
            <span className="mr-2">🔒</span>
            {label}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onUnlock}
        className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-gold/65 bg-gold/90 px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold"
      >
        Unlock Full Life Decode
      </button>
    </motion.section>
  );
}

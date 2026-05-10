import { motion } from 'framer-motion';
import { computePastPatternMatchPercent } from '../lib/validationMatchScore';

function tierMessage(score) {
  if (score >= 70) {
    return 'Strong alignment detected. Your future sections are ready to unlock.';
  }
  if (score >= 40) {
    return 'Partial alignment detected. Your future sections will focus on the strongest matching signals.';
  }
  return 'Your chart may need more precise birth time or date verification.';
}

export default function ValidationResult({ phases = [], responses = {} }) {
  const score = computePastPatternMatchPercent(responses, phases);

  if (score == null) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel rounded-[2rem] p-5 sm:p-6"
    >
      <p className="text-xs uppercase tracking-[0.32em] text-gold-300/70">Your Past Pattern Match</p>
      <p className="mt-2 font-serif text-3xl text-gold-100 sm:text-4xl">{score}% alignment detected</p>
      <p className="mt-4 text-sm leading-relaxed text-cream/72">
        Your past patterns show strong alignment with your calculated chart.
      </p>
      <p className="mt-4 rounded-2xl border border-gold-300/20 bg-gold-300/8 px-4 py-3 text-sm leading-relaxed text-gold-100/85">
        {tierMessage(score)}
      </p>
    </motion.section>
  );
}

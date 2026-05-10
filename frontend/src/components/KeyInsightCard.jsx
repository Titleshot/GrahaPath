import { motion } from 'framer-motion';
import { buildKeyInsight } from '../lib/chartKeyInsight';

export default function KeyInsightCard({ chart }) {
  if (!chart) {
    return null;
  }

  const causalTop = chart?.astroBrain?.causalInsights?.insights?.[0] || null;
  const body = causalTop
    ? `${causalTop.observation} ${causalTop.effect}`
    : buildKeyInsight(chart);
  const reason = causalTop?.cause || null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel rounded-[2rem] p-5 sm:p-6"
    >
      <p className="text-xs uppercase tracking-[0.32em] text-gold-300/70">Key insight about you</p>
      <h2 className="mt-3 font-serif text-2xl text-gold-100 sm:text-3xl">This Is What Defines You</h2>
      <p className="mt-2 text-sm leading-relaxed text-cream/60">
        Based on your ascendant, Moon pattern, Saturn pressure points, and strongest interpretation signals.
      </p>
      <p className="mt-5 text-sm leading-relaxed text-cream/85 sm:text-base">{body}</p>
      {reason && (
        <p className="mt-3 text-xs leading-relaxed text-gold-100/78">
          <span className="uppercase tracking-[0.16em] text-gold-300/70">Reason:</span> {reason}
        </p>
      )}
    </motion.section>
  );
}

import { motion } from 'framer-motion';

export default function UnlockPreview({ paywall, alignment }) {
  if (!paywall) {
    return null;
  }

  const alignmentScore = alignment?.alignmentScore ?? alignment?.score;
  const alignmentMessage = alignment?.message || `${alignment?.alignmentLevel || 'pending'} alignment`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-panel rounded-[2rem] p-5 sm:p-6"
    >
      <div className="border-b border-gold-300/15 pb-5">
        <p className="text-xs uppercase tracking-[0.35em] text-gold-300/70">Future Unlock</p>
        <h2 className="mt-3 font-serif text-3xl text-gold-100">{paywall.headline}</h2>
        <p className="mt-3 text-sm leading-6 text-cream/65">{paywall.subtext}</p>
        {alignment && Number.isFinite(alignmentScore) && (
          <p className="mt-4 rounded-2xl border border-gold-300/15 bg-gold-300/5 px-4 py-3 text-sm text-gold-100/80">
            Alignment score: {alignmentScore}% - {alignmentMessage}
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {paywall.features.map((feature) => (
          <div key={feature.title} className="rounded-2xl border border-gold-300/12 bg-black/25 p-4">
            <h3 className="text-sm font-semibold text-gold-100">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-cream/62">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {paywall.plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-3xl border p-4 ${
              plan.recommended
                ? 'border-gold-300/35 bg-gold-300/10'
                : 'border-gold-300/12 bg-black/25'
            }`}
          >
            {plan.recommended && (
              <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-gold-300/80">
                Recommended
              </p>
            )}
            <div className="flex items-end justify-between gap-3">
              <h3 className="font-serif text-xl text-gold-100">{plan.name}</h3>
              <p className="text-lg font-semibold text-cream">{plan.price}</p>
            </div>
            <ul className="mt-3 grid gap-2 text-sm text-cream/62">
              {plan.includes.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-5 w-full rounded-2xl border border-gold-300/50 bg-gold-gradient px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-black shadow-glow"
      >
        {paywall.cta}
      </button>
      <p className="mt-3 text-center text-xs text-cream/50">{paywall.trustLine}</p>
    </motion.section>
  );
}

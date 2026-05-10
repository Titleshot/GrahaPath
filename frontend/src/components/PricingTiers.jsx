const DISPLAY_BY_ID = {
  basic: { name: 'Quick Direction', highlight: false },
  full: { name: 'Full Life Decode', highlight: true },
  premium: { name: 'Deep Transformation Plan', highlight: false }
};

export default function PricingTiers({ paywall }) {
  if (!paywall?.plans?.length) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-panel rounded-[2rem] p-5 sm:p-6"
    >
      <div className="mb-6 border-b border-gold-300/15 pb-5">
        <p className="text-xs uppercase tracking-[0.35em] text-gold-300/70">Choose your depth</p>
        <h2 className="mt-3 font-serif text-3xl text-gold-100">Unlock your full chart</h2>
        <p className="mt-3 text-sm leading-relaxed text-cream/60">
          One-time payment. No subscription. Pick the level that matches how deeply you want to go.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3 md:items-stretch">
        {paywall.plans.map((plan) => {
          const meta = DISPLAY_BY_ID[plan.id] || { name: plan.name, highlight: plan.recommended };
          const isFeatured = meta.highlight === true;

          return (
            <div
              key={plan.id || plan.name}
              className={`relative flex flex-col rounded-3xl border p-5 transition ${
                isFeatured
                  ? 'z-[1] scale-[1.02] border-gold-300/50 bg-gold-300/12 shadow-[0_0_40px_rgba(212,175,55,0.12)] md:-my-1 md:py-7'
                  : 'border-gold-300/12 bg-black/25'
              }`}
            >
              {meta.badge && (
                <p className="mb-2 text-center text-[10px] uppercase tracking-[0.28em] text-gold-300">
                  {meta.badge}
                </p>
              )}
              <div className="flex flex-1 flex-col gap-2">
                <h3 className="font-serif text-lg text-gold-100 sm:text-xl">{meta.name}</h3>
                <p className="text-xl font-semibold text-cream sm:text-2xl">{plan.price}</p>
              </div>
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm leading-relaxed text-cream/65">
                {(plan.includes || []).map((item) => (
                  <li key={item}>— {item}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="mt-6 w-full rounded-2xl border border-gold-300/50 bg-gold-gradient px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-black shadow-glow"
      >
        {paywall.cta}
      </button>
      <p className="mt-3 text-center text-xs leading-relaxed text-cream/50">{paywall.trustLine}</p>
    </motion.section>
  );
}

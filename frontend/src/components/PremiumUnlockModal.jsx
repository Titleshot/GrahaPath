import { motion, AnimatePresence } from 'framer-motion';

export default function PremiumUnlockModal({ open, onClose, onUnlock }) {
  const paymentMethods = [
    { id: 'card', label: 'Card' },
    { id: 'esewa', label: 'eSewa' },
    { id: 'khalti', label: 'Khalti' }
  ];
  const matchedSignals = [
    'emotional processing patterns',
    'internal vs external tension',
    'recurring thought patterns',
    'current pressure themes'
  ];
  const lockedInsights = [
    'Why certain emotional patterns keep repeating',
    'Your strongest career growth cycle',
    'Hidden self-sabotage tendencies',
    'Relationship attachment style',
    'Wealth growth vs pressure patterns',
    'Current planetary timing phase',
    'Personalized alignment remedies',
    'Deep Logic Mode (exact chart reasoning)'
  ];
  const quickDirectionFeatures = [
    'GrahaPath AI Access',
    'Personalized Chart Guidance',
    'Timing & Pattern Insights',
    'Career, Relationship & Emotional Guidance'
  ];
  const fullDecodeFeatures = [
    'All features from Quick Direction',
    'Longer GrahaPath Exploration'
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md px-4 py-6 sm:px-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl border border-amber-300/25 bg-gradient-to-br from-[#040513]/95 via-[#07041a]/95 to-black/95 p-4 shadow-[0_22px_80px_rgba(0,0,0,0.85)] sm:p-5 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute left-1/2 top-7 h-56 w-56 -translate-x-1/2 rounded-full border border-amber-200/15 opacity-40 animate-spin [animation-duration:18s]" />
              <div className="absolute left-1/2 top-11 h-40 w-40 -translate-x-1/2 rounded-full border border-amber-300/20 opacity-45 animate-spin [animation-direction:reverse] [animation-duration:12s]" />
              <div className="absolute left-1/2 top-24 h-20 w-20 -translate-x-1/2 rounded-full bg-amber-400/20 blur-2xl" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-200/35 bg-black/40 text-xs text-amber-100/80 hover:border-amber-100/80 hover:text-amber-50"
              aria-label="Close premium unlock"
            >
              ✕
            </button>

            <section className="relative mb-5 rounded-2xl border border-amber-200/20 bg-black/25 p-4 text-center sm:p-5">
              <p className="text-[10px] uppercase tracking-[0.32em] text-amber-200/75">GrahaPath Premium</p>
              <h2 className="mt-1 font-serif text-xl text-amber-100 sm:text-2xl md:text-3xl">
                Your chart is only partially decoded.
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-[11px] leading-relaxed text-amber-50/75 sm:text-xs">
                You have already seen the surface patterns. The deeper layers reveal why patterns repeat, which
                phase your life is entering, and where your strongest growth and pressure points exist.
              </p>
              <div className="mx-auto mt-3 max-w-2xl rounded-xl border border-amber-200/20 bg-black/35 px-3 py-2 text-[10px] text-amber-100/70 blur-[0.6px] sm:text-[11px]">
                Locked report preview behind this screen
              </div>
            </section>

            <section className="mb-4 rounded-2xl border border-amber-200/20 bg-black/30 p-3 sm:p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-amber-200/70 sm:text-[11px]">
                You have already matched
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {matchedSignals.map((item) => (
                  <p
                    key={item}
                    className="rounded-xl border border-emerald-200/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-100/85"
                  >
                    ✓ {item}
                  </p>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-amber-100/75 sm:text-xs">
                The deeper analysis unlocks what your chart is really trying to teach you.
              </p>
            </section>

            <section className="mb-4 rounded-2xl border border-amber-200/20 bg-black/30 p-3 sm:p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-amber-200/70 sm:text-[11px]">
                Locked Insight Preview
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {lockedInsights.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-amber-200/20 bg-gradient-to-r from-black/60 to-[#100d1b]/70 px-3 py-2 text-xs text-amber-100/75 blur-[0.35px]"
                  >
                    🔒 {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-4 rounded-2xl border border-amber-200/20 bg-black/30 p-3 sm:p-4">
              <h3 className="font-serif text-lg text-amber-100">Built from your exact chart structure</h3>
              <p className="mt-2 text-[11px] leading-relaxed text-amber-50/75 sm:text-xs">
                GrahaPath analyzes Ascendant structure, Moon psychology, house-lord patterns, dasha timing cycles,
                planetary interactions, and nakshatra layers to generate your personalized pattern map.
              </p>
            </section>

            <section className="mb-4 rounded-2xl border border-amber-200/20 bg-black/35 p-3 sm:p-4">
              <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-amber-200/70 sm:text-[11px]">
                Choose Payment Method
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-amber-300/35 bg-gradient-to-r from-black/50 to-[#120a1f]/65 px-3 py-2 text-xs font-medium text-amber-100 transition hover:border-amber-200/65 hover:bg-black/70"
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
              <div className="flex flex-1 flex-col justify-between rounded-2xl border border-amber-200/25 bg-white/5 p-3 shadow-inner shadow-black/40 sm:p-4">
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-amber-200/75">Quick Direction</p>
                  <p className="font-serif text-xl text-amber-100 sm:text-2xl">$4.99</p>
                  <p className="text-[10px] text-amber-100/75 sm:text-[11px]">12 GrahaPath Insights</p>
                  <p className="text-[10px] text-amber-100/70 sm:text-[11px]">
                    Perfect for focused clarity and exploration.
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[10px] leading-snug text-amber-50/70 sm:text-[11px]">
                    {quickDirectionFeatures.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUnlock?.('curiosity');
                  }}
                  className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center rounded-2xl border border-amber-300/70 bg-amber-500/80 px-3 py-2 text-[11px] font-semibold text-black shadow-[0_0_22px_rgba(251,191,36,0.45)] transition hover:bg-amber-400 sm:text-xs"
                >
                  Unlock Quick Decode
                </button>
              </div>

              <div className="relative flex flex-1 flex-col justify-between rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-500/18 via-amber-400/10 to-amber-200/12 p-3 shadow-[0_0_28px_rgba(251,191,36,0.45)] ring-1 ring-amber-300/40 sm:p-4 md:scale-[1.02]">
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-amber-100/90">Full Life Decode</p>
                  <p className="font-serif text-xl text-amber-50 sm:text-2xl">$14.99</p>
                  <p className="text-[10px] text-amber-100/80 sm:text-[11px]">50 GrahaPath Insights</p>
                  <p className="text-[10px] text-amber-100/75 sm:text-[11px]">
                    For deeper and longer chart exploration.
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[10px] leading-snug text-amber-50/80 sm:text-[11px]">
                    {fullDecodeFeatures.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUnlock?.('master');
                  }}
                  className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center rounded-2xl border border-amber-200/70 bg-amber-300/90 px-3 py-2 text-[11px] font-semibold text-black shadow-[0_0_26px_rgba(251,191,36,0.7)] transition hover:bg-amber-200 sm:text-xs"
                >
                  Unlock Full Life Decode
                </button>
              </div>
            </div>

            <section className="mt-4 rounded-2xl border border-amber-200/20 bg-black/30 p-3 sm:p-4">
              <p className="text-[11px] leading-relaxed text-amber-50/75 sm:text-xs">
                This is not fortune telling. GrahaPath analyzes recurring psychological, emotional, and timing
                patterns from your birth chart to help you understand your current life direction.
              </p>
            </section>

            <section className="mt-4 text-center">
              <p className="font-serif text-lg text-amber-100 sm:text-xl">
                You have already seen the surface. The deeper patterns are waiting.
              </p>
              <button
                type="button"
                onClick={() => onUnlock?.('master')}
                className="mt-3 inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-300/90 px-5 py-2 text-xs font-semibold text-black shadow-[0_0_26px_rgba(251,191,36,0.65)] transition hover:bg-amber-200"
              >
                Continue Your Decode
              </button>
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

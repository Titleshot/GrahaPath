import { AnimatePresence, motion } from 'framer-motion';

export default function PlanetInsightCard({ planet, onClose }) {
  return (
    <AnimatePresence>
      {planet && (
        <motion.aside
          initial={{ opacity: 0, x: 28, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 28, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="glass-card fixed inset-x-4 bottom-4 z-30 mx-auto max-w-xl rounded-3xl p-6 shadow-gold md:sticky md:top-6 md:mx-0"
        >
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-4 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60 transition hover:border-gold-300/50 hover:text-gold-200"
            >
              Close
            </button>
          )}

          <div className="pr-20">
            <p className="text-xs uppercase tracking-[0.35em] text-gold-200/70">
              Planet Insight
            </p>
            <h2 className="mt-2 flex items-center gap-3 font-serif text-3xl text-gold-100">
              <span>{planet.symbol}</span>
              {planet.name}
            </h2>
            <p className="mt-2 text-sm text-white/65">
              {planet.sign} - House {planet.house} - {planet.nakshatra}
            </p>
          </div>

          <div className="mt-6 grid gap-4 text-sm text-white/75">
            <Insight label="Theme" value={planet.interpretation?.theme} />
            <Insight label="Psychological" value={planet.interpretation?.psychological} />
            <Insight label="Strength" value={planet.interpretation?.strength} />
            <Insight label="Challenge" value={planet.interpretation?.challenge} />
          </div>

          <div className="mt-6 rounded-2xl border border-gold-300/20 bg-gold-300/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-gold-200/70">Report Line</p>
            <p className="mt-2 text-base leading-relaxed text-white">
              {planet.interpretation?.reportLine}
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Insight({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-gold-200/60">{label}</p>
      <p className="mt-1 leading-relaxed">{value || 'Interpretation pending.'}</p>
    </div>
  );
}

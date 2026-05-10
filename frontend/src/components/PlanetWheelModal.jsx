import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getNakshatraDisplay, getRashiDisplay } from '../data/vedicNames';
import DeepDataEphemerisLock from './DeepDataEphemerisLock';

function InsightRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-gold/10 bg-black/25 p-3 sm:border-0 sm:bg-transparent sm:p-0">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold-200/55">{label}</p>
      <p className="mt-1 text-[15px] leading-7 text-ivory/90 sm:text-sm sm:leading-relaxed">{value}</p>
    </div>
  );
}

const HOUSE_HINT = {
  1: 'Self, vitality, body',
  2: 'Values, resources, speech',
  3: 'Siblings, skills, courage',
  4: 'Home, mother, inner ground',
  5: 'Creativity, children, intelligence',
  6: 'Health, service, obstacles',
  7: 'Partnership, marriage, contracts',
  8: 'Transformation, shared resources',
  9: 'Dharma, father, higher learning',
  10: 'Career, reputation, karma',
  11: 'Gains, networks, income',
  12: 'Losses, liberation, retreat'
};

/**
 * Responsive planet detail: bottom sheet on small screens, centered dialog on md+.
 */
export default function PlanetWheelModal({ planet, onClose, ephemerisUnlocked = true, basicMode = false }) {
  useEffect(() => {
    if (!planet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [planet, onClose]);

  if (typeof document === 'undefined') return null;

  const interp = planet?.interpretation;
  const houseText = planet?.house ? HOUSE_HINT[planet.house] : null;

  return createPortal(
    <AnimatePresence>
      {planet && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Close chart detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="planet-modal-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-[101] flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-[1.75rem] border border-gold/20 border-b-0 bg-gradient-to-b from-[#121018] via-[#0a0810] to-black shadow-2xl shadow-violet-950/40 sm:max-h-[min(85vh,680px)] sm:rounded-3xl sm:border-b"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 justify-center pt-3 sm:pt-2">
              <span className="h-1 w-10 rounded-full bg-gold/25 sm:hidden" aria-hidden />
            </div>

            <div className="overflow-y-auto overscroll-contain px-4 pb-10 pt-4 sm:px-7 sm:pb-7 sm:pt-5">
              <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-gold/10 bg-[#0b0911]/95 px-4 pb-3 pt-1 backdrop-blur sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0">
                <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-violet-300/70">Placement</p>
                  <h2 id="planet-modal-title" className="mt-2 flex items-center gap-2 font-serif text-[1.75rem] leading-tight text-gold sm:text-3xl">
                    <span className="text-3xl leading-none" aria-hidden>
                      {planet.symbol}
                    </span>
                    {planet.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-full border border-gold/25 bg-black/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] text-gold/80 transition hover:border-gold/45 hover:text-gold"
                >
                  Close
                </button>
              </div>
              </div>

              <div className="mt-4 grid gap-2 rounded-2xl border border-gold/12 bg-black/35 px-4 py-3 text-[15px] leading-7 text-cream/90 sm:text-sm sm:leading-6">
                <p>
                  <span className="text-gold-200/60">Sign · </span>
                  {getRashiDisplay(planet.sign)}
                </p>
                <p>
                  <span className="text-gold-200/60">Whole-sign house · </span>
                  {planet.house != null ? `H${planet.house}` : '—'}
                  {houseText ? <span className="text-ivory/45"> — {houseText}</span> : null}
                </p>
                {ephemerisUnlocked && (planet.nakshatra || planet.absoluteDegree != null) ? (
                  <>
                    <p>
                      <span className="text-gold-200/60">Nakṣatra · </span>
                      {getNakshatraDisplay(planet.nakshatra)}
                    </p>
                    {planet.absoluteDegree != null && (
                      <p className="font-mono text-xs leading-6 text-ivory/60">
                        Longitude {Number(planet.absoluteDegree).toFixed(2)}° (sidereal)
                      </p>
                    )}
                  </>
                ) : null}
              </div>

              {!ephemerisUnlocked ? (
                <div className="mt-4">
                  <DeepDataEphemerisLock />
                </div>
              ) : null}

              {!basicMode && (interp?.theme || interp?.psychological || interp?.strength || interp?.challenge) && (
                <div className="mt-6 space-y-4 border-t border-gold/10 pt-6">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gold/55">Insight</p>
                  <div className="grid gap-3 sm:gap-4">
                    <InsightRow label="Theme" value={interp?.theme} />
                    <InsightRow label="Psychological" value={interp?.psychological} />
                    <InsightRow label="Strength" value={interp?.strength} />
                    <InsightRow label="Challenge" value={interp?.challenge} />
                  </div>
                </div>
              )}

              {!basicMode && interp?.reportLine && (
                <div className="mt-6 rounded-2xl border border-gold/15 bg-gold/[0.06] p-4">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-gold-200/65">Summary</p>
                  <p className="mt-2 text-[15px] leading-7 text-ivory/90 sm:text-sm sm:leading-relaxed">{interp.reportLine}</p>
                </div>
              )}

              {!basicMode &&
                !interp?.reportLine &&
                !interp?.theme &&
                !interp?.psychological &&
                !interp?.strength &&
                !interp?.challenge && (
                  <p className="mt-6 text-sm leading-relaxed text-ivory/50">
                    Structured interpretation lines will appear here when the GrahaPath interpretation layer supplies
                    them for this graha.
                  </p>
                )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

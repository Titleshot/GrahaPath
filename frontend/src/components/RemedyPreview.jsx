import { motion } from 'framer-motion';

export default function RemedyPreview({ remedies = [] }) {
  if (!remedies.length) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel rounded-[2rem] p-5 sm:p-6"
    >
      <div className="mb-5 border-b border-gold-300/15 pb-4">
        <p className="text-xs uppercase tracking-[0.35em] text-gold-300/70">Remedy Preview</p>
        <h2 className="mt-2 font-serif text-2xl text-gold-100">Alignment Practices</h2>
        <p className="mt-2 text-sm leading-6 text-cream/58">
          Remedies are shown as alignment support, not as promises or guarantees.
        </p>
      </div>

      <div className="grid gap-4">
        {remedies.map((remedy, index) => (
          <motion.article
            key={remedy.planet}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="rounded-3xl border border-gold-300/15 bg-black/25 p-5"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-gold-300/60">
              {remedy.planet} Alignment
            </p>
            <p className="mt-3 text-sm leading-6 text-cream/78">{remedy.problem}</p>
            <p className="mt-3 text-sm leading-6 text-cream/58">{remedy.logic}</p>

            <div className="mt-4 grid gap-3 rounded-2xl border border-gold-300/10 bg-gold-300/5 p-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gold-200/60">Mantra</p>
                <p className="mt-1 text-gold-100">{remedy.remedy.mantra}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gold-200/60">Behavior</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-cream/72">
                  {remedy.remedy.behaviorAlignment.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gold-200/60">Action</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-cream/72">
                  {remedy.remedy.practicalAction.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}

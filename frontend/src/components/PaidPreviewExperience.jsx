import { motion } from 'framer-motion';
import ChartIdentityStrip from './ChartIdentityStrip';
import KundaliWheel from './KundaliWheel';
import ChartGrahaChat from './ChartGrahaChat';

const CATEGORIES = [
  'Decode My Nature',
  'Career Alignment',
  'Current Life Timing',
  'Emotional Patterns',
  'Relationship Style',
  'Wealth Potential',
  'Hidden Strengths',
  'Remedies',
  'Deep Logic Mode'
];

const FULL_SECTIONS = [
  'Dominant Life Pattern',
  'Emotional Processing Style',
  'Current Activation Phase',
  'Career Alignment',
  'Wealth & Risk Pattern',
  'Relationship Pattern',
  'Hidden Strengths',
  'Blind Spots',
  'Personalized Remedies'
];

function simpleMeaning(label) {
  return `This section connects your placements to practical, present-life behavior and decision patterns.`;
}

export default function PaidPreviewExperience({ chart }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-emerald-300/30 bg-emerald-400/8 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">Full Life Decode Unlocked</p>
        <p className="mt-2 text-sm text-emerald-100/85">Your deeper chart layers are now visible.</p>
      </section>

      <ChartIdentityStrip chart={chart} forceDeepData />
      <KundaliWheel chart={chart} forceDeepData mode="paid" />

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gold/20 bg-black/25 p-5">
        <h3 className="font-serif text-2xl text-gold">Ask GrahaPath AI</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((label) => (
            <span key={label} className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs text-gold-100/90">
              {label}
            </span>
          ))}
        </div>
      </motion.section>

      <ChartGrahaChat chart={chart} forceUnlocked />

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gold/20 bg-black/25 p-5">
        <h3 className="font-serif text-2xl text-gold">Full Life Decode</h3>
        <div className="mt-4 grid gap-3">
          {FULL_SECTIONS.map((label) => (
            <article key={label} className="rounded-2xl border border-gold/18 bg-black/30 p-4">
              <p className="text-sm font-semibold text-gold-100">{label}</p>
              <p className="mt-2 text-sm text-cream/80">{simpleMeaning(label)}</p>
              <div className="mt-3 grid gap-2 text-xs text-ivory/75 sm:grid-cols-3">
                <p><span className="text-gold/70">Insight:</span> Pattern appears in repeated life contexts.</p>
                <p><span className="text-gold/70">Why:</span> Activation from houses + dasha timing.</p>
                <p><span className="text-gold/70">Chart evidence:</span> Placements and inter-planet links.</p>
              </div>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gold/20 bg-black/25 p-5">
        <h3 className="font-serif text-2xl text-gold">Top 3 Remedy Paths</h3>
        <div className="mt-4 grid gap-3">
          {[
            { planet: 'Moon', pattern: 'emotional overload', mantra: 'Om Som Somaya Namah', behavior: 'gentle evening routine', action: '20-min no-screen cool-down' },
            { planet: 'Saturn', pattern: 'pressure/fear loops', mantra: 'Om Sham Shanicharaya Namah', behavior: 'structured weekly planning', action: '3-priority system every Sunday' },
            { planet: 'Mercury', pattern: 'overthinking cycles', mantra: 'Om Bum Budhaya Namah', behavior: 'decision journaling', action: 'write options + choose in 10 mins' }
          ].map((item) => (
            <article key={item.planet} className="rounded-2xl border border-gold/18 bg-black/30 p-4 text-sm text-cream/80">
              <p className="font-semibold text-gold-100">{item.planet}</p>
              <p className="mt-1">Pattern: {item.pattern}</p>
              <p>Mantra: {item.mantra}</p>
              <p>Behavior: {item.behavior}</p>
              <p>Practical action: {item.action}</p>
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs text-ivory/55">
          Guidance supports self-understanding and routines; it does not replace medical, legal, or mental-health care.
        </p>
      </motion.section>
    </div>
  );
}

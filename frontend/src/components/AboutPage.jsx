import { motion } from 'framer-motion';

const sectionImages = {
  section1: new URL('../../Section 1 image.webp', import.meta.url),
  section2: new URL('../../Section 2 image.webp', import.meta.url),
  section3: new URL('../../Section 3 image.webp', import.meta.url),
  section4: new URL('../../Section 4 image.webp', import.meta.url),
  section5: new URL('../../Section 5 image.webp', import.meta.url),
  section6: new URL('../../Section 6 image.webp', import.meta.url)
};

const sectionBlockClass =
  "grid gap-10 lg:items-center lg:gap-12 [content-visibility:auto] [contain-intrinsic-size:900px]";

function AboutImage({ src, alt, eager = false }) {
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'auto'}
      className="h-full w-full object-cover"
    />
  );
}

export default function AboutPage({ onBack, onNavigate } = {}) {
  const handleBackClick = (e) => {
    e.preventDefault();
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign('/');
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-void text-ivory">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.1),transparent_28%)]" />
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col gap-4 border-b border-gold/20 pb-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-gold/70 sm:tracking-[0.55em]">About the experience</p>
            <h1 className="mt-3 max-w-3xl font-serif text-3xl text-gold sm:text-5xl lg:text-6xl">
              a cinematic philosophical journey.
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-ivory/80">
            <button
              onClick={handleBackClick}
              className="rounded-full border border-gold/20 bg-black/30 px-4 py-2 text-gold transition hover:border-gold/40 hover:bg-black/50"
            >
              Back
            </button>
          </div>
        </motion.header>

        <article className="space-y-24">
          <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.22em] text-gold/70 sm:tracking-[0.55em]">Section 1 — Hero</p>
              <h2 className="font-serif text-3xl text-gold sm:text-5xl">Before humanity built machines, we looked toward the sky.</h2>
              <div className="space-y-4 text-sm leading-relaxed text-ivory/80 sm:text-base">
                <p>
                  Across civilizations, humans observed the movements of stars, planets, lunar cycles, and eclipses —
                  searching for patterns in time, emotion, nature, and human experience.
                </p>
                <p>
                  What began as observation slowly evolved into symbolic systems of meaning, timing, and reflection.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-gold/15 bg-black/20 shadow-2xl shadow-black/25">
              <AboutImage src={sectionImages.section1} alt="Digital observatory inspired illustration" eager />
            </div>
          </section>

          <section className={`${sectionBlockClass} lg:grid-cols-[0.95fr_1.05fr]`}>
            <div className="order-2 lg:order-1">
              <div className="overflow-hidden rounded-[2rem] border border-gold/15 bg-black/20 shadow-2xl shadow-black/25">
                <AboutImage src={sectionImages.section2} alt="Ancient sky observers" />
              </div>
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <p className="text-xs uppercase tracking-[0.22em] text-gold/70 sm:tracking-[0.55em]">Section 2 — The first pattern seekers</p>
              <h2 className="font-serif text-3xl text-gold sm:text-5xl">The first pattern seekers.</h2>
              <div className="space-y-4 text-sm leading-relaxed text-ivory/80 sm:text-base">
                <p>
                  Long before modern calendars and digital clocks, ancient cultures relied on the sky to understand rhythm and change.
                </p>
                <p>
                  The Moon guided agricultural cycles.
                  The Sun marked seasons.
                  Planetary movements became reference points for navigation, rituals, timing, and introspection.
                </p>
                <p>
                  Across regions, different civilizations began developing systems to map celestial movement into symbolic frameworks of life.
                </p>
              </div>
            </div>
          </section>

          <section className={`${sectionBlockClass} lg:grid-cols-[1.1fr_0.9fr]`}>
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.22em] text-gold/70 sm:tracking-[0.55em]">Section 3 — Vedic astrology & nakshatras</p>
              <h2 className="font-serif text-3xl text-gold sm:text-5xl">Mapping the cosmos into meaning.</h2>
              <div className="space-y-4 text-sm leading-relaxed text-ivory/80 sm:text-base">
                <p>
                  In the Vedic tradition, planetary movement was not viewed merely as astronomy, but as a symbolic language connected to timing, tendencies, cycles, and human psychology.
                </p>
                <p>
                  Nakshatras, planetary placements, dashas, and house systems became tools for interpreting patterns — not as rigid fate, but as frameworks for reflection and awareness.
                </p>
                <p>
                  These systems evolved over centuries through observation, calculation, oral transmission, and philosophical interpretation.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-gold/15 bg-black/20 shadow-2xl shadow-black/25">
              <AboutImage src={sectionImages.section3} alt="Celestial map with symbolic overlays" />
            </div>
          </section>

          <section className={`${sectionBlockClass} lg:grid-cols-[0.95fr_1.05fr]`}>
            <div className="order-2 lg:order-1">
              <div className="overflow-hidden rounded-[2rem] border border-gold/15 bg-black/20 shadow-2xl shadow-black/25">
                <AboutImage src={sectionImages.section4} alt="Modern intelligence interface with celestial pattern" />
              </div>
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <p className="text-xs uppercase tracking-[0.22em] text-gold/70 sm:tracking-[0.55em]">Section 4 — From observation to intelligence</p>
              <h2 className="font-serif text-3xl text-gold sm:text-5xl">From celestial observation to conversational intelligence.</h2>
              <div className="space-y-4 text-sm leading-relaxed text-ivory/80 sm:text-base">
                <p>
                  GrahaPath was created to reimagine how people interact with astrological systems in the modern age.
                </p>
                <p>
                  Instead of static reports and difficult terminology, GrahaPath transforms chart interpretation into a conversational experience — combining traditional calculation systems with AI-assisted interaction.
                </p>
                <p>
                  The goal is not to replace tradition, but to make exploration more accessible, interactive, and reflective.
                </p>
              </div>
            </div>
          </section>

          <section className={`${sectionBlockClass} lg:grid-cols-[1.1fr_0.9fr]`}>
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.22em] text-gold/70 sm:tracking-[0.55em]">Section 5 — Philosophy</p>
              <h2 className="font-serif text-3xl text-gold sm:text-5xl">GrahaPath is built for reflection, not certainty.</h2>
              <div className="space-y-4 text-sm leading-relaxed text-ivory/80 sm:text-base">
                <p>
                  Astrology has historically been used as a symbolic tool for understanding cycles, tendencies, timing, and self-reflection.
                </p>
                <p>
                  GrahaPath does not claim absolute certainty or guaranteed outcomes.
                </p>
                <p>
                  Instead, it is designed as a space for exploration — where ancient symbolic systems and modern AI interaction come together to help users think more deeply about themselves, their timing, and their patterns.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-gold/15 bg-black/20 shadow-2xl shadow-black/25">
              <AboutImage src={sectionImages.section5} alt="Quiet reflective scene under celestial sky" />
            </div>
          </section>

          <section className={`${sectionBlockClass} lg:grid-cols-[0.95fr_1.05fr]`}>
            <div className="order-2 lg:order-1">
              <div className="overflow-hidden rounded-[2rem] border border-gold/15 bg-black/20 shadow-2xl shadow-black/25">
                <AboutImage src={sectionImages.section6} alt="Final closing celestial reflection image" />
              </div>
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <p className="text-xs uppercase tracking-[0.22em] text-gold/70 sm:tracking-[0.55em]">Section 6 — Final closing</p>
              <h2 className="font-serif text-3xl text-gold sm:text-5xl">The sky was humanity’s first mirror.</h2>
              <div className="space-y-4 text-sm leading-relaxed text-ivory/80 sm:text-base">
                <p>
                  For thousands of years, humans searched the cosmos not only to understand the universe — but to understand themselves.
                </p>
                <p>
                  GrahaPath continues that journey through a modern interface built for reflection, curiosity, and deeper exploration.
                </p>
              </div>
            </div>
          </section>
          <div className="mt-16 flex justify-center">
            <a
              href="/"
              onClick={(e) => {
                if (typeof onNavigate === 'function') {
                  e.preventDefault();
                  onNavigate('/');
                }
              }}
              className="rounded-full border border-gold/20 bg-black/30 px-6 py-3 text-sm font-medium uppercase tracking-[0.25em] text-gold transition hover:border-gold/40 hover:bg-black/50"
            >
              Return to chart
            </a>
          </div>
        </article>
      </div>
    </main>
  );
}

/**
 * Shows one unlocked remedy teaser; paid flow would reveal the remainder.
 */

/**
 * @param {{
 *   preview: {
 *     planet: string,
 *     title: string,
 *     pattern: string,
 *     logic: string,
 *     mantra: { text: string, count: number, day: string },
 *     behavior: string[],
 *     practicalAction: string,
 *     disclaimer: string,
 *   } | null,
 *   lockedCount?: number,
 * }} props
 */
export default function RemedyPreview({ preview, lockedCount = 0 }) {
  if (!preview) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-black/35 p-5 shadow-glass backdrop-blur-md md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base text-gold-glow md:text-lg">
          Remedy preview · {preview.planet}
        </h3>
        <span className="rounded-full border border-gold/35 bg-gold/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
          Complimentary excerpt
        </span>
      </div>

      <h4 className="mt-3 text-sm font-medium text-zinc-100 md:text-base">
        {preview.title}
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{preview.pattern}</p>
      <p className="mt-3 text-xs leading-relaxed text-zinc-500 md:text-sm">
        {preview.logic}
      </p>

      <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/60 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Mantra rhythm (tradition-aligned)
        </p>
        <p className="mt-2 font-display text-lg text-gold">{preview.mantra?.text}</p>
        <p className="mt-2 text-xs text-zinc-400">
          Often practiced {preview.mantra?.count ?? 108} times on{" "}
          <span className="text-zinc-300">{preview.mantra?.day}</span> — adjust kindly to
          what feels workable.
        </p>
      </div>

      <div className="mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Behaviors that may reinforce the rhythm
        </p>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-300">
          {(preview.behavior || []).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>

      <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-zinc-300">
        <span className="text-gold/90">Practice idea · </span>
        {preview.practicalAction}
      </p>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">{preview.disclaimer}</p>

      {lockedCount > 0 ? (
        <div className="relative mt-6 overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-black/55 to-zinc-900/40 px-4 py-4 md:py-5">
          <div
            className="pointer-events-none absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-hidden
          />
          <p className="relative text-center text-sm text-zinc-300">
            Unlock the full Remedy &amp; Alignment Plan for all personalized practices.
          </p>
          <p className="relative mt-1 text-center text-xs text-zinc-500">
            {lockedCount} additional practice pathway{lockedCount !== 1 ? "s" : ""} tailored to
            your chart stay reserved for full access.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-zinc-500">
          Remedy excerpts may expand later as your membership grows — still not a substitute
          for professional care.
        </p>
      )}
    </div>
  );
}

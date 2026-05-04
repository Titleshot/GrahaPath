import { useEffect, useMemo, useState } from "react";

const defaultOptions = ["This matches me", "Partially", "Not really"];

/**
 * @param {{ keyInsight?: string, phases?: Array<{ title: string, ageRange: string, text: string, planetaryBasis: string, validationOptions?: string[] }>, onSelectionsChange?: (record: Record<number, string>) => void }} props
 */
export default function LifePhases({ keyInsight, phases = [], onSelectionsChange }) {
  const [selections, setSelections] = useState({});

  const optionsByPhase = useMemo(() => {
    return phases.map(
      (p) =>
        Array.isArray(p.validationOptions) && p.validationOptions.length
          ? p.validationOptions
          : defaultOptions
    );
  }, [phases]);

  const allPhasesAnswered =
    phases.length > 0 &&
    phases.every((_, idx) => Object.prototype.hasOwnProperty.call(selections, idx));

  const setChoice = (phaseIndex, label) => {
    setSelections((prev) => ({ ...prev, [phaseIndex]: label }));
  };

  useEffect(() => {
    onSelectionsChange?.(selections);
  }, [selections, onSelectionsChange]);

  return (
    <section className="mx-auto max-w-3xl space-y-10">
      {keyInsight ? (
        <div className="rounded-2xl border border-gold/25 bg-zinc-900/40 p-6 shadow-glass backdrop-blur-md md:p-8">
          <h2 className="font-display text-lg text-gold md:text-xl">
            Key Insight About You
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-200 md:text-base whitespace-pre-line">
            {keyInsight}
          </p>
        </div>
      ) : null}

      <div className="space-y-6">
        {phases.map((phase, idx) => (
          <article
            key={`${phase.title}-${idx}`}
            className="rounded-2xl border border-white/10 bg-zinc-900/35 p-5 shadow-glass backdrop-blur-md md:p-7"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <h3 className="font-display text-base text-gold-glow md:text-lg">
                {phase.title}
              </h3>
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                {phase.ageRange}
              </span>
            </div>

            <div className="mt-4 text-sm leading-relaxed text-zinc-200 md:text-[0.95rem] whitespace-pre-line">
              {phase.text}
            </div>

            <p className="mt-5 text-xs leading-snug text-zinc-500">
              <span className="text-zinc-600">Based on</span>{" "}
              <span className="text-zinc-400">{phase.planetaryBasis}</span>
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              {optionsByPhase[idx].map((label) => {
                const selected = selections[idx] === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setChoice(idx, label)}
                    className={[
                      "rounded-full border px-4 py-2 text-xs font-medium transition-all md:text-sm",
                      selected
                        ? "border-gold bg-gold/20 text-gold-glow ring-1 ring-gold/50"
                        : "border-white/15 bg-black/30 text-zinc-300 hover:border-gold/35 hover:text-zinc-100",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      {allPhasesAnswered ? (
        <p className="text-center text-sm text-gold/90 md:text-base">
          Your responses help refine your future analysis.
        </p>
      ) : null}
    </section>
  );
}

import { useState } from "react";
import RemedyPreview from "./RemedyPreview.jsx";

const PRICE_TIERS = [
  { id: "basic", label: "Basic", price: "₹99", recommended: false },
  { id: "full", label: "Full Analysis", price: "₹299", recommended: true },
  { id: "premium", label: "Premium Guidance", price: "₹999", recommended: false },
];

/**
 * @param {{ teaser?: { title: string, subtitle: string, lockedSections: Array<{ title: string, teaser: string }>, cta: string } | null, remedyPreview?: object | null, remediesLockedCount?: number }} props
 */
export default function FutureUnlock({ teaser, remedyPreview = null, remediesLockedCount = 0 }) {
  const [selectedTier, setSelectedTier] = useState("full");

  if (!teaser || !teaser.title) {
    return null;
  }

  const handleCta = () => {
    /* Payment integration placeholder */
  };

  return (
    <section className="mx-auto mt-14 max-w-3xl space-y-8 pb-16">
      <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-b from-zinc-900/80 to-black/60 p-6 shadow-glass backdrop-blur-xl md:p-10">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/10 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/90">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            Premium
          </div>
          <h2 className="font-display text-xl text-gold-glow md:text-2xl">
            {teaser.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 md:text-base">
            {teaser.subtitle}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {Array.isArray(teaser.lockedSections) &&
          teaser.lockedSections.map((sec) => (
            <article
              key={sec.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 p-5 shadow-glass backdrop-blur-md md:p-6"
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40 opacity-80"
                aria-hidden
              />
              <div className="relative flex gap-4">
                <div
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-black/50 text-gold"
                  aria-hidden
                >
                  <svg
                    className="h-5 w-5 opacity-90"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <title>Locked</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm text-gold md:text-base">
                    {sec.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400 md:text-sm">
                    {sec.teaser}
                  </p>
                </div>
              </div>
            </article>
          ))}
      </div>

      {remedyPreview ? (
        <RemedyPreview preview={remedyPreview} lockedCount={remediesLockedCount} />
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-zinc-900/35 p-5 shadow-glass backdrop-blur-md md:p-7">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-zinc-500">
          Choose your plan
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {PRICE_TIERS.map((tier) => {
            const active = selectedTier === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTier(tier.id)}
                className={[
                  "relative flex flex-col items-center rounded-xl border px-3 py-4 text-center transition-all",
                  active
                    ? "border-gold bg-gold/15 ring-1 ring-gold/40"
                    : "border-white/10 bg-black/25 hover:border-gold/25",
                ].join(" ")}
              >
                {tier.recommended ? (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/40 bg-zinc-950 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gold">
                    Recommended
                  </span>
                ) : null}
                <span className="text-lg font-semibold text-gold-glow md:text-xl">
                  {tier.price}
                </span>
                <span className="mt-1 text-xs text-zinc-400">{tier.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleCta}
          className="mt-8 w-full rounded-full border border-gold/50 bg-gradient-to-r from-gold/25 via-gold/15 to-gold/25 py-3.5 text-sm font-semibold text-gold-glow shadow-[0_0_24px_rgba(201,162,39,0.15)] transition hover:border-gold/70 hover:from-gold/35 hover:to-gold/35"
        >
          {teaser.cta || "Unlock My Full Analysis"}
        </button>
        <p className="mt-3 text-center text-[11px] text-zinc-600">
          Checkout coming soon — no charge today.
        </p>
      </div>
    </section>
  );
}

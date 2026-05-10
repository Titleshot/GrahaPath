/**
 * Visual gate for ephemeris-grade fields on the basic (free) tier.
 * Server already redacts JSON; this blocks casual screenshots of any leftover UI.
 */
export default function DeepDataEphemerisLock({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-gold/15 bg-black/40 ${className}`}
      role="note"
    >
      <div
        className="select-none px-4 py-6 text-center text-[11px] leading-relaxed text-ivory/35 blur-[9px]"
        aria-hidden
      >
        Rohini · 4th pada · 24.18° · Mars dr̥ṣṭi → …
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/65 px-3 py-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold/55">Deep ephemeris</p>
        <p className="text-xs leading-relaxed text-cream/88">
          Nakṣatra, exact degrees, aspects &amp; dr̥ṣṭi stay inside GrahaPath on the basic view — so chart data
          isn&apos;t easy to paste into other AIs for instant readings.
        </p>
        <p className="text-[10px] text-ivory/45">Full technical tables unlock with paid / full access.</p>
      </div>
    </div>
  );
}

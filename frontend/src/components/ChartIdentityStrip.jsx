import { useState } from 'react';
import { getNakshatraDisplay, getRashiDisplay } from '../data/vedicNames';
import { hasDeepChartData } from '../lib/chartAccess';

function moonNakshatra(chart) {
  return chart?.planets?.find((planet) => planet.name === 'Moon')?.nakshatra;
}

const ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces'
];

function signFromAbsoluteDegree(degree) {
  const n = Number(degree);
  if (!Number.isFinite(n)) return null;
  const norm = ((n % 360) + 360) % 360;
  return ZODIAC_SIGNS[Math.floor(norm / 30)] || null;
}

function ChartFact({ label, value }) {
  return (
    <div className="rounded-2xl border border-gold-300/10 bg-black/25 px-3 py-2">
      <span className="block text-[10px] uppercase tracking-[0.22em] text-gold-300/55">{label}</span>
      <span className="mt-1 block text-cream/78">{value}</span>
    </div>
  );
}

function formatCoord(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(6);
}

function formatAdDateLong(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatBsDateLong(date) {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  const monthNames = [
    'Baisakh',
    'Jestha',
    'Ashadh',
    'Shrawan',
    'Bhadra',
    'Ashwin',
    'Kartik',
    'Mangsir',
    'Poush',
    'Magh',
    'Falgun',
    'Chaitra'
  ];
  return `${year} ${monthNames[Number(month) - 1] || month} ${day}`;
}

/** Mahā → antar → pratyantar from full astroBrain or slim summary. */
function vimshottariSnapshotParts(chart) {
  const ab = chart?.astroBrain;
  if (!ab) return null;
  const sum = ab.summary;
  const maha = ab.currentDasha?.planet ?? sum?.currentMahadashaPlanet ?? null;
  const antar = ab.currentAntardasha?.antarLord ?? sum?.currentAntardashaLord ?? null;
  const praty = ab.currentPratyantar?.pratyantarLord ?? sum?.currentPratyantarLord ?? null;
  if (!maha && !antar) return null;
  return { maha, antar, praty };
}

function ChartBirthDate({ chart }) {
  return (
    <div className="mt-3 rounded-2xl border border-gold-300/10 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-[0.28em] text-gold-300/55">Birth date</p>
      <div className="mt-2 grid gap-1 text-sm text-ivory/68">
        <p>AD: {formatAdDateLong(chart.birthDateAD)}</p>
        {chart.birthDateBS && <p>BS: {formatBsDateLong(chart.birthDateBS)}</p>}
      </div>
    </div>
  );
}

/**
 * First block after “Calculate my chart” — trust + orientation only.
 */
export default function ChartIdentityStrip({ chart, forceDeepData = false, anchorId = 'chart-calculated-start' }) {
  if (!chart) return null;
  const [showSystemComparison, setShowSystemComparison] = useState(false);
  const [showCalculationDebug, setShowCalculationDebug] = useState(false);

  const deepOk = hasDeepChartData(chart, forceDeepData);
  const vimParts = deepOk ? vimshottariSnapshotParts(chart) : null;
  const vimshottariLine =
    vimParts && [vimParts.maha, vimParts.antar, vimParts.praty].filter(Boolean).join(' → ');

  const ayanamsaDegree = Number(chart?.ayanamsaDegree);
  const siderealAscAbs = Number(chart?.ascendantAbsoluteDegree);
  const moonAbsolute = Number(chart?.planets?.find((p) => p.name === 'Moon')?.absoluteDegree);
  const tropicalAsc =
    Number.isFinite(ayanamsaDegree) && Number.isFinite(siderealAscAbs)
      ? signFromAbsoluteDegree(siderealAscAbs + ayanamsaDegree)
      : null;
  const tropicalMoon =
    Number.isFinite(ayanamsaDegree) && Number.isFinite(moonAbsolute)
      ? signFromAbsoluteDegree(moonAbsolute + ayanamsaDegree)
      : null;

  return (
    <header
      id={anchorId}
      className="rounded-3xl border border-gold/20 bg-gradient-to-br from-black/50 to-black/25 p-5 shadow-lg shadow-black/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.42em] text-emerald-300/90">
            Chart calculated
          </p>
          <h2 className="mt-1.5 break-words font-serif text-2xl text-gold sm:text-3xl">{chart.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ivory/68">
            <span className="text-cream/85">{chart.place}</span>
            <span className="text-ivory/35"> · </span>
            <span className="font-mono text-[13px] text-ivory/75">{chart.localDateTime}</span>
          </p>
          <p className="mt-1.5 text-xs text-ivory/48">
            {chart.ayanamsa} sidereal · {chart.houseSystem || 'Whole sign'}
          </p>
        </div>
      </div>

      {vimshottariLine && (
        <div className="mt-4 rounded-2xl border border-gold/18 bg-black/40 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold/60">Vimśottari · now</p>
          <p className="mt-1.5 font-mono text-[13px] leading-snug text-cream/92">{vimshottariLine}</p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-ivory/42">
            Mahādasha → antardaśā → pratyantar (from Moon nakṣatra and balance at birth).
          </p>
        </div>
      )}
      {!vimshottariLine && !deepOk && (
        <div className="mt-4 rounded-2xl border border-gold/18 bg-black/40 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold/60">Vimśottari · timing</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ivory/55">
            Mahādasha / antardaśā snapshots are withheld on the basic chart so dense timing isn&apos;t trivially
            screenshot for use in other chatbots. They ship with full ephemeris access.
          </p>
        </div>
      )}

      {chart.accuracy && (
        <div className="mt-4 rounded-2xl border border-gold-300/15 bg-gold-300/6 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold-200/75">
            Precision · {chart.accuracy.confidenceLevel}
          </p>
          <p className="mt-1 text-xs text-cream/78">
            {chart.accuracy.analysisMode === 'full'
              ? 'Full analysis mode'
              : 'Moon-based reduced precision mode'}
          </p>
          {Array.isArray(chart.accuracy.accuracyNotes) && chart.accuracy.accuracyNotes[0] && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-cream/60">{chart.accuracy.accuracyNotes[0]}</p>
          )}
        </div>
      )}

      <ChartBirthDate chart={chart} />

      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <ChartFact label="Lagna" value={getRashiDisplay(chart.ascendant)} />
        <ChartFact label="Moon Rashi" value={getRashiDisplay(chart.moonSign)} />
        <ChartFact label="Sun Rashi" value={getRashiDisplay(chart.sunSign)} />
        <ChartFact
          label="Moon Nakshatra"
          value={getNakshatraDisplay(moonNakshatra(chart))}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-gold/18 bg-black/35 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold/70">Deep Logic: System Comparison</p>
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gold/35 text-[10px] text-gold/80"
              title="Sidereal accounts for the Earth's precession (Ayanamsa), making it more star-accurate, while Tropical is season-based. GrahaPath uses Sidereal for its core intelligence."
              aria-label="System comparison explanation"
            >
              ?
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSystemComparison((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
              showSystemComparison ? 'border-gold/70 bg-gold/20' : 'border-gold/30 bg-black/40'
            }`}
            aria-label="Toggle system comparison"
            aria-pressed={showSystemComparison}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-gold shadow transition ${
                showSystemComparison ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {showSystemComparison && (
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-gold/16 bg-black/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/65">Sidereal (Lahiri)</p>
              <p className="mt-1 text-cream/85">Lagna: {getRashiDisplay(chart.ascendant)}</p>
              <p className="text-cream/85">Moon: {getRashiDisplay(chart.moonSign)}</p>
            </div>
            <div className="rounded-xl border border-gold/16 bg-black/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/65">Tropical</p>
              <p className="mt-1 text-cream/85">Lagna: {getRashiDisplay(tropicalAsc || '—')}</p>
              <p className="text-cream/85">Moon: {getRashiDisplay(tropicalMoon || '—')}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-300/18 bg-emerald-500/5 px-3 py-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/75">Why this is personalized</p>
        <div className="mt-2 grid gap-1 text-[11px] text-emerald-100/80 sm:grid-cols-2">
          <p>✓ exact coordinates + timezone context</p>
          <p>✓ Lahiri sidereal calculation pipeline</p>
          <p>✓ house placements + graha relations</p>
          <p>✓ current timing cycle context</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-blue-300/20 bg-blue-500/5 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-blue-200/80">Calculation Debug</p>
            <p className="mt-1 text-[11px] text-ivory/52">Transparent calculation inputs and engine settings.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCalculationDebug((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
              showCalculationDebug ? 'border-blue-300/70 bg-blue-300/20' : 'border-blue-300/30 bg-black/35'
            }`}
            aria-label="Toggle calculation debug panel"
            aria-pressed={showCalculationDebug}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-blue-200 shadow transition ${
                showCalculationDebug ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {showCalculationDebug && (
          <div className="mt-3 grid gap-3 text-[11px] text-cream/82 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-200/20 bg-black/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-200/75">Inputs Used</p>
              <p className="mt-1.5">AD Date: {chart.birthDateAD || '—'}</p>
              <p>Local DateTime: {chart.localDateTime || '—'}</p>
              <p>Timezone: {chart.timezone || '—'}</p>
              <p>UTC DateTime: {chart.utcDateTime || '—'}</p>
              <p>
                Coordinates: {formatCoord(chart?.location?.latitude)}, {formatCoord(chart?.location?.longitude)}
              </p>
            </div>

            <div className="rounded-xl border border-blue-200/20 bg-black/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-200/75">Engine Settings</p>
              <p>Ephemeris: {chart?.calculationNotes?.ephemeris || 'Swiss Ephemeris'}</p>
              <p>Zodiac: {chart?.calculationNotes?.zodiac || chart?.ayanamsa || 'Sidereal'}</p>
              <p>
                Ayanamsa: {chart?.calculationNotes?.ayanamsa || chart?.ayanamsa || 'Lahiri'}{' '}
                {Number.isFinite(Number(chart?.ayanamsaDegree))
                  ? `(${Number(chart.ayanamsaDegree).toFixed(6)}°)`
                  : ''}
              </p>
              <p>House System: {chart?.calculationNotes?.houseSystem || chart?.houseSystem || 'Whole Sign'}</p>
              <p>Node Type: {chart?.calculationNotes?.nodeType || chart?.nodeType || 'True Node'}</p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-gold-100/45">
        {deepOk
          ? 'Traditional labels mirror classical naming; positions come from the same calculation pipeline.'
          : 'Basic view shows rāśi / whole-sign houses only. Nakṣatra, exact degrees, aspects & dr̥ṣṭi stay server-side until full access.'}
      </p>
    </header>
  );
}

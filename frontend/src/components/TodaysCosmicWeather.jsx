import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { buildDailyGrahaWeather } from '../lib/dailyGrahaWeather';
import { withApiBase } from '../lib/apiBase';

function levelMeta(value) {
  const v = String(value || '').toLowerCase();
  if (v.includes('high') || v.includes('elevated') || v.includes('strong')) return { icon: '🔴', tone: 'text-rose-200' };
  if (v.includes('low') || v.includes('calm')) return { icon: '🟢', tone: 'text-emerald-200' };
  return { icon: '🟡', tone: 'text-amber-200' };
}

function levelPercent(value) {
  const v = String(value || '').toLowerCase();
  if (v.includes('high') || v.includes('elevated') || v.includes('volatile') || v.includes('strong')) return 86;
  if (v.includes('low') || v.includes('calm') || v.includes('stable') || v.includes('grounded')) return 42;
  return 64;
}

function StatRow({ label, value, reason }) {
  const meta = levelMeta(value);
  const pct = levelPercent(value);
  return (
    <div className="rounded-xl border border-gold/18 bg-black/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60">{label}</p>
      <p className={`mt-1 text-sm ${meta.tone}`}>
        {meta.icon} {value}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gold/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold/50 via-amber-300/60 to-rose-300/70 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      {reason && <p className="mt-2 text-[11px] leading-relaxed text-ivory/68">Astro reason: {reason}</p>}
    </div>
  );
}

export default function TodaysCosmicWeather({ chart }) {
  if (!chart) return null;
  const [weather, setWeather] = useState(() => buildDailyGrahaWeather(chart));
  const [loadedTransit, setLoadedTransit] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(withApiBase('/api/daily-weather'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.dailyGrahaWeather) return;
        if (!cancelled) {
          setWeather((prev) => ({ ...prev, ...data.dailyGrahaWeather }));
          setLoadedTransit(true);
        }
      })
      .catch(() => {
        // keep local fallback weather
      });
    return () => {
      cancelled = true;
    };
  }, [chart?.utcDateTime, chart?.ascendant, chart?.moonSign]);
  const timezone = chart?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone
  }).format(new Date());
  const personName = chart?.name || 'User';
  const place = chart?.place || chart?.location?.displayName || 'your chart location';

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-br from-[#090812] via-black/95 to-[#120b1f] p-5 shadow-[0_0_35px_rgba(212,175,55,0.15)]"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gold/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-violet-500/15 blur-3xl" />

      <div className="relative">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Today&apos;s Cosmic Weather</p>
        <p className="mt-1 text-sm text-ivory/80">{formattedDate}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-sm text-ivory/75">Live Timing Layer · Refreshes daily</p>
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] text-gold-100">
            Daily Cycle
          </span>
          {loadedTransit && (
            <span className="rounded-full border border-emerald-300/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-100">
              Live Transit Layer
            </span>
          )}
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] text-gold-100">
            Current Graha Climate
          </span>
        </div>
        <p className="mt-1 text-xs text-ivory/65">For: {personName}</p>
        <p className="text-xs text-ivory/65">Birth chart anchored to: {place}</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-gold/35 bg-gradient-to-r from-gold/15 to-black/20 px-3 py-3 shadow-[0_0_25px_rgba(212,175,55,0.18)] sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold/70">Today&apos;s Primary Pattern</p>
            <p className="mt-1 text-base font-semibold text-gold-100">{weather.primaryPattern}</p>
          </div>
          <div className="rounded-xl border border-gold/18 bg-black/30 px-3 py-3 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60">Big Three Guidance</p>
            <p className="mt-2 text-xs leading-relaxed text-cream/88">{weather?.bigThreeSummary?.lagna}</p>
            <p className="mt-1 text-xs leading-relaxed text-cream/88">{weather?.bigThreeSummary?.moon}</p>
            <p className="mt-1 text-xs leading-relaxed text-cream/88">{weather?.bigThreeSummary?.sun}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <StatRow label="Mental Clarity" value={weather?.energyScores?.mentalClarity || weather.communicationClarity} reason={weather.communicationClarityReason} />
          <StatRow label="Social Energy" value={weather?.energyScores?.socialEnergy || 'Moderate'} />
          <StatRow label="Luck Factor" value={weather?.energyScores?.luckFactor || 'Medium'} />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-gold/18 bg-black/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60">Best Action Window</p>
            <p className="mt-1 text-sm text-cream/88">
              {weather.bestActionWindow} <span className="text-ivory/65">({weather.bestActionWindowRange})</span>
            </p>
            <p className="mt-1 text-xs text-ivory/70">{weather.bestActionWindowHint}</p>
          </div>
          <StatRow label="Avoid Today" value={weather.avoidToday} reason={weather.microRemedy || weather.avoidTodayMicroRemedy} />
        </div>

        <div className="mt-4 rounded-2xl border border-gold/18 bg-black/30 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60">Why This Is Happening (House Influence)</p>
          <p className="mt-1 text-sm leading-relaxed text-cream/88">Career/Wealth: {weather?.houseInfluence?.careerWealth}</p>
          <p className="mt-1 text-sm leading-relaxed text-cream/88">Relationship: {weather?.houseInfluence?.relationship}</p>
        </div>

        <div className="mt-3 rounded-2xl border border-gold/18 bg-black/30 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60">Timing Summary</p>
          <p className="mt-1 text-sm leading-relaxed text-cream/88">{weather.timingSummary}</p>
        </div>

        {Array.isArray(weather.alerts) && weather.alerts.length > 0 && (
          <div className="mt-3 rounded-2xl border border-gold/18 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60">Graha Alerts</p>
            <div className="mt-1 grid gap-1 text-sm text-cream/88">
              <p>⚠ {weather.alerts[0]}</p>
            </div>
          </div>
        )}

        <div className="mt-3 rounded-2xl border border-gold/18 bg-black/30 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60">Tomorrow Shift Preview</p>
          <p className="mt-1 text-sm leading-relaxed text-cream/88">Tomorrow: {weather.tomorrowShift}</p>
        </div>
        <p className="mt-3 text-xs text-ivory/58">
          This daily layer refreshes every 24 hours based on your chart and current timing cycle.
        </p>
      </div>
    </motion.section>
  );
}

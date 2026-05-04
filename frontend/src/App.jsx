import { useCallback, useEffect, useMemo, useState } from "react";
import FutureUnlock from "./components/FutureUnlock.jsx";
import LifePhases from "./components/LifePhases.jsx";

export default function App() {
  const [chart, setChart] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phaseSelections, setPhaseSelections] = useState({});

  const loadChart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${base}/generate-chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setChart(data);
    } catch (e) {
      setError(e.message || "Request failed");
      setChart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const chartSessionKey = useMemo(() => {
    if (!chart) return "none";
    return [chart.sunSign, chart.moonSign, chart.ascendant, chart.planets?.length]
      .filter((x) => x != null)
      .join("-");
  }, [chart]);

  useEffect(() => {
    if (!chart) return;
    setPhaseSelections({});
  }, [chartSessionKey, chart]);

  const allPhasesAnswered = useMemo(() => {
    const phases = chart?.lifePhases;
    if (!Array.isArray(phases) || phases.length === 0) return false;
    return phases.every((_, idx) =>
      Object.prototype.hasOwnProperty.call(phaseSelections, idx)
    );
  }, [chart?.lifePhases, phaseSelections]);

  return (
    <div className="min-h-screen px-4 py-10 md:px-8">
      <header className="mx-auto max-w-3xl text-center mb-10">
        <h1 className="font-display text-2xl md:text-3xl text-gold-glow tracking-tight">
          GrahaPath
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Life phases & key insight preview
        </p>
        <button
          type="button"
          onClick={loadChart}
          disabled={loading}
          className="mt-6 rounded-full border border-gold/40 bg-gold/10 px-6 py-2 text-sm font-medium text-gold hover:bg-gold/20 disabled:opacity-50 transition-colors"
        >
          {loading ? "Loading…" : "Load chart"}
        </button>
        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </header>

      {chart && (chart.keyInsight || chart.lifePhases) ? (
        <>
          <LifePhases
            key={chartSessionKey}
            keyInsight={chart.keyInsight}
            phases={chart.lifePhases}
            onSelectionsChange={setPhaseSelections}
          />
          {allPhasesAnswered && chart.futureTeaser ? (
            <FutureUnlock
              teaser={chart.futureTeaser}
              remedyPreview={chart.remediesPreview}
              remediesLockedCount={chart.remediesLockedCount ?? 0}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * Brain outputs for the chart response.
 * Normal `/generate-chart`: backend sends `astroBrain.summary` (numbers-only dashboard).
 * `debugChart` / full payload: narrative layers still available when summary is absent.
 */
export default function ChartBrainInsights({ chart }) {
  const pq = chart?.predictionQuality;
  const mapping = chart?.remedyMapping;
  const rect = chart?.timeRectification;
  const offsetCmp = rect?.offsetComparison;
  const lev = chart?.lifeEventVerification;
  const lifeEventHint = chart?.predictionQuality?.lifeEventRectificationHint;
  const hnf = chart?.astroBrain?.houseNetForce;
  const summary = chart?.astroBrain?.summary;
  const summaryMode = summary?.payloadKind === 'summary';

  const vibe = chart?.astroBrain?.panchanga?.birthVibe;
  const innerOuter = chart?.astroBrain?.corePatterns?.innerOuterTensionPattern;
  const underlying = chart?.astroBrain?.corePatterns?.underlyingPatterns;
  const criticalTiming = chart?.astroBrain?.corePatterns?.criticalEventTimingPattern;
  const timeCal = chart?.timeCalibration || chart?.astroBrain?.timeCalibration;

  const savMetrics = pq?.ashtakavargaSavScore?.metrics;
  const houseNetSorted = [...(hnf?.houses || [])].sort((a, b) => (b?.netForce || 0) - (a?.netForce || 0));
  const topHouses = houseNetSorted.slice(0, 3);
  const lowHouses = houseNetSorted.slice(-3).reverse();

  const rectSummary = rect?.suggestion && !offsetCmp;

  const showAnything =
    summary ||
    pq ||
    mapping ||
    offsetCmp ||
    rectSummary ||
    (!summaryMode && vibe) ||
    (!summaryMode && innerOuter) ||
    (!summaryMode && underlying) ||
    (!summaryMode && criticalTiming) ||
    (!summaryMode && timeCal?.timeCertaintyScore != null) ||
    (!summaryMode && hnf?.houses?.length) ||
    (lev && lev.validEventCount > 0) ||
    lifeEventHint;

  if (!showAnything) return null;

  return (
    <div className="flex flex-col gap-4">
      {summaryMode && summary && (
        <section className="rounded-3xl border border-gold/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Summary (numbers)</p>
          <div className="mt-4 grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-b border-gold/10 py-1.5">
              <span className="text-ivory/50">Time certainty</span>
              <span className="font-mono text-gold">{summary.timeCertaintyScore ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-gold/10 py-1.5">
              <span className="text-ivory/50">Transit WS vs bhāva Δ</span>
              <span className="font-mono text-cream/85">
                {summary.transitHouseDisagreementCount ?? '—'} / {summary.transitPlanetsCompared ?? '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-gold/10 py-1.5">
              <span className="text-ivory/50">Transit agreement ratio</span>
              <span className="font-mono text-cream/85">
                {summary.transitHouseAgreementRatio != null ? summary.transitHouseAgreementRatio : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-gold/10 py-1.5">
              <span className="text-ivory/50">Confluence</span>
              <span className="font-mono text-cream/85">
                {summary.confluenceScore ?? '—'} ({summary.confluenceLevel ?? '—'})
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-gold/10 py-1.5">
              <span className="text-ivory/50">Critical windows</span>
              <span className="font-mono text-cream/85">{summary.criticalEventWindowsCount ?? 0}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-gold/10 py-1.5">
              <span className="text-ivory/50">Mahā / Antara / Pratyantara</span>
              <span className="text-right font-mono text-[12px] text-cream/85">
                {summary.currentMahadashaPlanet ?? '—'} · {summary.currentAntardashaLord ?? '—'} ·{' '}
                {summary.currentPratyantarLord ?? '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-gold/10 py-1.5">
              <span className="text-ivory/50">SAV key avg / luck</span>
              <span className="font-mono text-cream/85">
                {summary.savKeyHouseAverage ?? '—'} / {summary.savLuckLevel ?? '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-gold/10 py-1.5">
              <span className="text-ivory/50">Pattern flags</span>
              <span className="text-right font-mono text-[11px] text-cream/75">
                D1/D9 tension {summary.patternPresence?.innerOuterTension ? '1' : '0'} · underlying{' '}
                {summary.patternPresence?.underlyingPatterns ? '1' : '0'} · critical{' '}
                {summary.patternPresence?.criticalTiming ? '1' : '0'}
              </span>
            </div>
          </div>

          {pq?.overallQuality && (
            <div className="mt-4 flex flex-wrap items-baseline gap-4 border-t border-gold/10 pt-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gold-300/50">Prediction quality</span>
              <span className="font-serif text-2xl text-gold">{pq.overallQuality.score}</span>
              <span className="text-xs text-ivory/45">overall</span>
              {pq.ashtakavargaSavScore?.score != null && (
                <>
                  <span className="text-ivory/35">·</span>
                  <span className="text-xs text-ivory/55">SAV layer</span>
                  <span className="font-mono text-gold/90">{pq.ashtakavargaSavScore.score}</span>
                </>
              )}
            </div>
          )}

          {savMetrics && (
            <p className="mt-2 font-mono text-[11px] text-gold-100/65">
              SAV spread {savMetrics.savSpread} · key avg {savMetrics.keyHouseAverage} · CV{' '}
              {savMetrics.savCoefficientOfVariation}
            </p>
          )}

          {Array.isArray(summary.houseNetForceByHouse) && summary.houseNetForceByHouse.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold-300/45">House blend (12)</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                {summary.houseNetForceByHouse.map((row) => (
                  <span
                    key={row.house}
                    className="rounded-md border border-gold/15 bg-black/30 px-2 py-0.5 font-mono text-cream/80"
                  >
                    {row.house}:{row.netForce}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {!summaryMode && vibe && (
        <section className="rounded-3xl border border-gold/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">{vibe.headline || 'Birth-moment tone'}</p>
          {vibe.elements?.tithi?.name && (
            <p className="mt-2 text-[11px] text-gold-200/60">
              Tithi {vibe.elements.tithi.name}
              {vibe.elements.nakshatra?.name ? ` · Nakshatra ${vibe.elements.nakshatra.name}` : ''}
              {vibe.elements.yoga?.name ? ` · Yoga ${vibe.elements.yoga.name}` : ''}
              {vibe.elements.vara?.name ? ` · ${vibe.elements.vara.name}` : ''}
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-ivory/75">{vibe.summary}</p>
          {vibe.caveat && (
            <p className="mt-3 text-[11px] leading-relaxed text-gold-100/45">{vibe.caveat}</p>
          )}
        </section>
      )}

      {!summaryMode && timeCal?.timeCertaintyScore != null && (
        <section className="rounded-3xl border border-gold/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Time certainty</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="font-serif text-3xl text-gold">{timeCal.timeCertaintyScore}</span>
            <span className="text-xs text-ivory/55">composite (0–100)</span>
          </div>
          {timeCal.components?.transitHouseDisagreementCount != null && (
            <p className="mt-2 text-[11px] leading-relaxed text-cream/68">
              Whole-sign vs bhāva transit house mismatches: {timeCal.components.transitHouseDisagreementCount} /{' '}
              {timeCal.components.transitPlanetsCompared || '—'} sampled grahas
              {Number.isFinite(timeCal.components.transitHouseAgreementRatio)
                ? ` · agreement ratio ${timeCal.components.transitHouseAgreementRatio}`
                : ''}
            </p>
          )}
          {timeCal.wholeSignVsBhava?.interpretation && (
            <p className="mt-2 text-[11px] leading-relaxed text-ivory/50">{timeCal.wholeSignVsBhava.interpretation}</p>
          )}
        </section>
      )}

      {!summaryMode && criticalTiming && (
        <section className="rounded-3xl border border-rose-300/20 bg-rose-950/20 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-200/80">Critical timing window</p>
          <p className="mt-2 text-sm leading-relaxed text-ivory/80">{criticalTiming.summary}</p>
          {Array.isArray(criticalTiming.evidence) && criticalTiming.evidence.length > 0 && (
            <ul className="mt-3 list-inside list-disc text-[12px] text-cream/70">
              {criticalTiming.evidence.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {criticalTiming.challenge && (
            <p className="mt-2 text-[11px] text-ivory/50">{criticalTiming.challenge}</p>
          )}
        </section>
      )}

      {!summaryMode && pq?.overallQuality && (
        <section className="rounded-3xl border border-gold/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Prediction quality</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="font-serif text-3xl text-gold">{pq.overallQuality.score}</span>
            <span className="text-xs text-ivory/55">overall (0–100)</span>
          </div>
          {pq.ashtakavargaSavScore != null && (
            <div className="mt-3 rounded-2xl border border-gold-300/10 bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold-300/55">
                SAV structural layer · {pq.ashtakavargaSavScore.score ?? '—'}
              </p>
              {pq.ashtakavargaSavScore.note && (
                <p className="mt-1 text-[11px] leading-relaxed text-cream/65">{pq.ashtakavargaSavScore.note}</p>
              )}
            </div>
          )}
          <p className="mt-2 text-[11px] text-ivory/45">{pq.overallQuality.note}</p>
        </section>
      )}

      {lev && Number.isFinite(lev.aggregateScore100) && lev.validEventCount > 0 && (
        <section className="rounded-3xl border border-gold/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Life-event verification</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs text-ivory/55">
              Index {lev.aggregateScore100}/100 · {lev.validEventCount} event{lev.validEventCount === 1 ? '' : 's'} ·{' '}
              {lev.verificationBadge}
            </span>
          </div>
          {lev.caveat && !summaryMode && (
            <p className="mt-2 text-[10px] leading-relaxed text-ivory/45">{lev.caveat}</p>
          )}
          {lifeEventHint && (
            <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-100/85">
              {lifeEventHint}
            </p>
          )}
        </section>
      )}

      {!summaryMode && innerOuter && (
        <section className="rounded-3xl border border-gold/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Inner vs outer (D1 / D9)</p>
          <span className="mt-1 inline-block rounded-full border border-gold-300/25 bg-gold-300/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-gold-100/80">
            {innerOuter.impactLevel || 'pattern'}
          </span>
          <p className="mt-3 text-sm leading-relaxed text-ivory/75">{innerOuter.summary}</p>
          {innerOuter.conflictBridge && (
            <p className="mt-3 text-[12px] leading-relaxed text-gold-100/70">{innerOuter.conflictBridge}</p>
          )}
          {Array.isArray(innerOuter.evidence) && innerOuter.evidence.length > 0 && (
            <ul className="mt-3 list-inside list-disc text-[12px] text-cream/65">
              {innerOuter.evidence.slice(0, 6).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!summaryMode && underlying && (
        <section className="rounded-3xl border border-gold/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Underlying patterns</p>
          <p className="mt-3 text-sm leading-relaxed text-ivory/75">{underlying.summary}</p>
          {Array.isArray(underlying.evidence) && underlying.evidence.length > 0 && (
            <ul className="mt-3 list-inside list-disc text-[12px] text-cream/68">
              {underlying.evidence.slice(0, 10).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {underlying.challenge && (
            <p className="mt-3 text-[11px] leading-relaxed text-ivory/50">{underlying.challenge}</p>
          )}
        </section>
      )}

      {!summaryMode && hnf?.houses?.length > 0 && (
        <section className="rounded-3xl border border-gold/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">House blend index (SAV + Bala + Argala)</p>
          <p className="mt-2 text-[11px] leading-relaxed text-ivory/55">{hnf.caveat}</p>
          <div className="mt-3 grid gap-2 text-[12px] text-cream/72 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold-300/50">Stronger blend</p>
              <ul className="mt-1 list-inside list-decimal">
                {topHouses.map((h) => (
                  <li key={h.house}>
                    House {h.house}: {h.netForce}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold-300/50">Softer blend</p>
              <ul className="mt-1 list-inside list-decimal">
                {lowHouses.map((h) => (
                  <li key={h.house}>
                    House {h.house}: {h.netForce}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {offsetCmp && (
        <section className="rounded-3xl border border-gold/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Birth-time check (±20 min)</p>
          <p className={`mt-2 text-sm ${summaryMode ? 'font-mono text-ivory/80' : 'leading-relaxed text-ivory/72'}`}>
            {summaryMode && offsetCmp.confidenceGate
              ? `Gate ${offsetCmp.confidenceGate.status}${
                  Number.isFinite(offsetCmp.confidenceGate.observedDelta)
                    ? ` · Δ ${offsetCmp.confidenceGate.observedDelta}`
                    : ''
                }`
              : offsetCmp.recommendation}
          </p>
          {!summaryMode && offsetCmp.confidenceGate && (
            <p className="mt-2 text-[11px] text-cream/55">
              Gate: {offsetCmp.confidenceGate.status}
              {Number.isFinite(offsetCmp.confidenceGate.observedDelta)
                ? ` · Δ vs baseline ${offsetCmp.confidenceGate.observedDelta}`
                : ''}
            </p>
          )}
        </section>
      )}

      {rectSummary && (
        <section className="rounded-3xl border border-gold/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Rectification</p>
          <p className={`mt-2 ${summaryMode ? 'font-mono text-[12px] text-ivory/75' : 'text-sm leading-relaxed text-ivory/72'}`}>
            {summaryMode ? rect?.suggestion?.status || '—' : rect?.suggestion?.note}
          </p>
          {!summaryMode && (
            <p className="mt-2 text-[11px] text-cream/55">
              Add dated life events in the form to unlock ±20 minute offset comparison and stronger birth-time testing.
            </p>
          )}
        </section>
      )}

      {!summaryMode && mapping && (mapping.fromShadbala?.length > 0 || mapping.fromWeakestSavHouses?.length > 0) && (
        <section className="rounded-3xl border border-gold/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Actionable alignment hints</p>
          <p className="mt-2 text-sm leading-relaxed text-ivory/72">
            Based on softer Shadbala signals and lower Sarvashtakavarga reinforcement in specific houses—not
            prescriptions or outcomes.
          </p>

          {mapping.fromShadbala?.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold-300/55">From structural Bala</p>
              {mapping.fromShadbala.map((row) => (
                <div
                  key={`sb-${row.planet}`}
                  className="rounded-2xl border border-gold-300/10 bg-black/20 px-3 py-3 text-sm text-cream/78"
                >
                  <p className="font-medium text-gold">{row.planet}</p>
                  {row.behavioralFocus?.behaviors?.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-[13px] leading-relaxed text-ivory/70">
                      {row.behavioralFocus.behaviors.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {row.behavioralFocus?.practicalActions?.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-[13px] leading-relaxed text-ivory/65">
                      {row.behavioralFocus.practicalActions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {mapping.fromWeakestSavHouses?.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold-300/55">From lowest SAV houses</p>
              {mapping.fromWeakestSavHouses.map((row) => (
                <div
                  key={`sav-${row.house}`}
                  className="rounded-2xl border border-gold-300/10 bg-black/20 px-3 py-3 text-sm text-cream/78"
                >
                  <p className="font-medium text-gold">
                    House {row.house}
                    {row.signLordUsed ? ` · ${row.signLordUsed}` : ''}
                  </p>
                  {row.note && <p className="mt-2 text-[13px] leading-relaxed text-ivory/68">{row.note}</p>}
                  {row.behavioralFocus?.behaviors?.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-[13px] leading-relaxed text-ivory/70">
                      {row.behavioralFocus.behaviors.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {mapping.synthesis && (
            <p className="mt-4 text-[13px] leading-relaxed text-ivory/65">{mapping.synthesis}</p>
          )}
          {mapping.caveat && (
            <p className="mt-3 text-[11px] leading-relaxed text-gold-100/45">{mapping.caveat}</p>
          )}
        </section>
      )}
    </div>
  );
}

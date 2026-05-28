import ChartIdentityStrip from './ChartIdentityStrip';
import KundaliWheel from './KundaliWheel';
import ChartGrahaChat from './ChartGrahaChat';

export default function PaidUnlockedExperience({
  chart,
  selectedTier = 'full',
  premiumEmail = '',
  remainingInsights = null,
  sessionChatMode = false
}) {
  const isQuick = selectedTier === 'quick';
  const fallbackInsights = isQuick ? 12 : 50;
  const initialInsights =
    typeof remainingInsights === 'number' && Number.isFinite(remainingInsights)
      ? Math.max(0, Math.trunc(remainingInsights))
      : fallbackInsights;
  const premiumLabel = `${initialInsights} Insights Left`;
  return (
    <div id="paid-unlocked-section" className="flex flex-col gap-6">
      <section className="rounded-3xl border border-emerald-300/30 bg-emerald-400/8 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">Full Life Decode Unlocked</p>
        <p className="mt-2 text-sm text-emerald-100/85">Your deeper chart layers are now visible.</p>
      </section>

      <ChartIdentityStrip chart={chart} forceDeepData />
      <KundaliWheel chart={chart} forceDeepData mode="paid" />

      {isQuick ? (
        <>
          <ChartGrahaChat
            chart={chart}
            forceUnlocked
            premiumLabel={premiumLabel}
            premiumEmail={premiumEmail}
            initialInsights={initialInsights}
            sessionChatMode={sessionChatMode}
          />
        </>
      ) : (
        <>
          <ChartGrahaChat
            chart={chart}
            forceUnlocked
            premiumLabel={premiumLabel}
            premiumEmail={premiumEmail}
            initialInsights={initialInsights}
            sessionChatMode={sessionChatMode}
          />
        </>
      )}
    </div>
  );
}

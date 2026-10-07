import { useMemo, useState } from 'react';
import { formatNatalDump } from '../lib/formatNatalDump';

export default function ChartNatalDump({ chart }) {
  const text = useMemo(() => formatNatalDump(chart), [chart]);
  const [copied, setCopied] = useState(false);
  const missingDeep = /degree —|abs —|pada —|not in this payload/i.test(text);

  async function copyDump() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!chart?.planets?.length) return null;

  return (
    <section className="rounded-3xl border border-gold/25 bg-black/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold/70">Natal extract</p>
          <p className="mt-1 text-sm text-ivory/70">
            Your placements in one block — lagna, planets, dasha, yogas.
          </p>
        </div>
        <button
          type="button"
          onClick={copyDump}
          className="rounded-full border border-gold/45 bg-gold/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold transition hover:bg-gold/25"
        >
          {copied ? 'Copied' : 'Copy all'}
        </button>
      </div>
      {missingDeep ? (
        <p className="mt-3 text-[11px] leading-relaxed text-amber-200/80">
          Some rows show dashes until a fresh chart is generated after the API deploy (exact longitude is stored as natalCore).
        </p>
      ) : null}
      <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-gold/15 bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-ivory/85">
        {text}
      </pre>
    </section>
  );
}

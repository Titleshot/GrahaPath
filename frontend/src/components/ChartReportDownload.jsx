import { useState } from 'react';
import { apiFetch, withApiBase } from '../lib/apiBase';

const REPORT_URL = withApiBase('/api/generate-chart-report');

export default function ChartReportDownload({ chart, compact = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function downloadReport() {
    if (!chart?.planets?.length) return;
    setError('');
    setBusy(true);
    try {
      const res = await apiFetch(REPORT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gp-demo-premium': 'true'
        },
        body: JSON.stringify({ chart })
      });
      const contentType = String(res.headers.get('content-type') || '');
      if (!res.ok || !contentType.includes('pdf')) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || data?.details?.[0] || `Report failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const safe = String(chart.name || 'chart').replace(/[^\w\-]+/g, '_').slice(0, 40);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GrahaPath-Report-${safe || 'chart'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || 'Could not download the chart report.');
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={downloadReport}
          disabled={busy || !chart?.planets?.length}
          className="rounded-full border border-gold/50 bg-gold/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold transition hover:bg-gold/30 disabled:opacity-50"
        >
          {busy ? 'Preparing PDF…' : 'Download PDF report'}
        </button>
        {error ? <p className="max-w-[220px] text-right text-[10px] text-red-200/90">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gold/25 bg-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-gold/70">Full chart report</p>
      <p className="mt-2 text-sm leading-relaxed text-ivory/72">
        Download a 20+ page PDF of this kundali — wheel picture, grahas, houses, dasha, and explanations.
        Built from the calculated chart (no ChatGPT / Gemini call).
      </p>
      <button
        type="button"
        onClick={downloadReport}
        disabled={busy || !chart?.planets?.length}
        className="mt-4 rounded-xl border border-gold/45 bg-gold/15 px-4 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold/22 disabled:opacity-50"
      >
        {busy ? 'Preparing PDF…' : 'Download 20–25 page PDF'}
      </button>
      {error ? (
        <p className="mt-3 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</p>
      ) : null}
    </div>
  );
}

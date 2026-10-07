import { useMemo, useState } from 'react';
import { apiFetch, withApiBase } from '../lib/apiBase';
import { toReportChart } from '../lib/reportChartPayload';

const REPORT_URL = import.meta.env.DEV ? withApiBase('/api/generate-chart-report') : '/api/chart-pdf';

function planet(chart, name) {
  return (chart?.planets || []).find((x) => x?.name === name) || null;
}

function occupants(chart, house) {
  return (chart?.planets || []).filter((p) => Number(p.house) === house).map((p) => p.name);
}

function natalLabel(chart) {
  const lagna = chart?.ascendant || '—';
  const moon = chart?.moonSign || '—';
  const tenth = occupants(chart, 10).join('+') || 'empty';
  const sun = planet(chart, 'Sun');
  const sat = planet(chart, 'Saturn');
  return `${lagna} लग्न · Moon ${moon} · 10th ${tenth} · Sun H${sun?.house || '—'} · Sat H${sat?.house || '—'}`;
}

function composeSteps(chart) {
  const moon = planet(chart, 'Moon');
  const sat = planet(chart, 'Saturn');
  const dasha =
    chart?.astroBrain?.currentDasha?.planet ||
    chart?.dashaSnapshot?.mahaDasha ||
    chart?.astroBrain?.summary?.currentMahadashaPlanet;
  const tenth = occupants(chart, 10).join(', ') || 'empty 10th';
  return [
    `यो कुण्डली पढ्दै: ${chart?.ascendant || '—'} लग्न`,
    `चन्द्रमा ${chart?.moonSign || '—'} · भाव ${moon?.house || '—'}`,
    `दशम भाव: ${tenth}`,
    sat ? `शनि भाव ${sat.house} · ${sat.sign}` : 'शनि स्थिति जोड्दै',
    dasha ? `चलिरहेको दशा: ${dasha}` : 'ग्रह–भावबाट समय पढ्दै',
    '३५+ पृष्ठ यसै कुण्डलीबाट लेख्दै…'
  ];
}

export default function ChartReportDownload({ chart, compact = false }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const label = useMemo(() => natalLabel(chart), [chart]);

  async function downloadReport() {
    if (!chart?.planets?.length) return;
    setError('');
    setBusy(true);
    const steps = composeSteps(chart);
    setStatus(steps[0]);
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setStatus(steps[Math.min(step, steps.length - 1)]);
    }, 850);
    try {
      const natal = toReportChart(chart);
      const url = `${REPORT_URL}${REPORT_URL.includes('?') ? '&' : '?'}t=${Date.now()}`;
      const res = await apiFetch(url, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'x-gp-demo-premium': 'true'
        },
        body: JSON.stringify({ chart: natal })
      });
      const contentType = String(res.headers.get('content-type') || '');
      if (!res.ok || !contentType.includes('pdf')) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || data?.details?.[0] || `Report failed (${res.status})`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const stamp = [natal.name, natal.ascendant, natal.moonSign].filter(Boolean).join('-');
      const safe = String(stamp || 'chart').replace(/[^\w\-]+/g, '_').slice(0, 48);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `GrahaPath-Report-${safe || 'chart'}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err?.message || 'Could not download the chart report.');
    } finally {
      window.clearInterval(timer);
      setBusy(false);
      setStatus('');
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
          {busy ? 'Writing this kundali…' : 'Download PDF report'}
        </button>
        <p className="max-w-[280px] text-right text-[10px] leading-snug text-ivory/55">
          {busy ? status : label}
        </p>
        {error ? <p className="max-w-[220px] text-right text-[10px] text-red-200/90">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gold/25 bg-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-gold/70">Full chart report</p>
      <p className="mt-2 text-sm leading-relaxed text-ivory/72">
        PDF ChatGPT होइन। स्क्रिनको यही कुण्डली — लग्न, भाव, दशा — बाट ३५+ पृष्ठ लेखिन्छ। गणना पहिले नै भइसकेकाले छिटो निस्कन्छ।
      </p>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-gold/80">{busy ? status : label}</p>
      <button
        type="button"
        onClick={downloadReport}
        disabled={busy || !chart?.planets?.length}
        className="mt-4 rounded-xl border border-gold/45 bg-gold/15 px-4 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold/22 disabled:opacity-50"
      >
        {busy ? 'यो कुण्डलीबाट लेख्दै…' : 'Download महाभविष्यफल PDF'}
      </button>
      {error ? (
        <p className="mt-3 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</p>
      ) : null}
    </div>
  );
}

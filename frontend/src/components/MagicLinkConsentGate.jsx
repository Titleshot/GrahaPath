import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiFetch, withApiBase } from '../lib/apiBase';
import { buildLegalAcceptancePayload } from '../lib/legalVersions';

const VIEW_TOKEN_API_PREFIX = withApiBase('/api/view');

export default function MagicLinkConsentGate({ accessToken, onRedeemed, onCancel }) {
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [legalDocType, setLegalDocType] = useState(null);

  async function openChart() {
    if (!legalAccepted) return;
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch(`${VIEW_TOKEN_API_PREFIX}/${encodeURIComponent(accessToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildLegalAcceptancePayload())
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Could not open chart (${res.status})`);
      }
      onRedeemed?.(data);
    } catch (err) {
      setError(err?.message || 'Could not open your chart link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="relative min-h-screen overflow-x-hidden bg-void text-ivory">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.08),transparent_28%)]" />
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[560px] items-center px-4 py-8">
          <section className="w-full rounded-3xl border border-gold/25 bg-onyx/80 p-6 shadow-2xl shadow-black/50">
            <p className="text-xs uppercase tracking-[0.34em] text-gold/70">GrahaPath Private Chart</p>
            <h1 className="mt-3 font-serif text-2xl text-gold">Before you continue</h1>
            <p className="mt-2 text-sm leading-relaxed text-ivory/75">
              This secure link opens a personal chart prepared for you. Please read and accept our policies before
              viewing chart data or using GrahaPath AI chat.
            </p>
            <p className="mt-2 text-xs text-ivory/50">
              The first open can take up to a minute while the server wakes up. Please keep this page open.
            </p>

            <label className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ivory/75">
              <input
                type="checkbox"
                className="mt-[2px] h-4 w-4 shrink-0 accent-amber-400"
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
              />
              <span>
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={() => setLegalDocType('terms')}
                  className="text-gold underline-offset-2 hover:underline"
                >
                  Terms &amp; Conditions
                </button>
                ,{' '}
                <button
                  type="button"
                  onClick={() => setLegalDocType('privacy')}
                  className="text-gold underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </button>
                , and{' '}
                <button
                  type="button"
                  onClick={() => setLegalDocType('disclaimer')}
                  className="text-gold underline-offset-2 hover:underline"
                >
                  Disclaimer
                </button>
                . I understand readings are interpretive guidance, not guaranteed predictions or professional advice.
              </span>
            </label>

            <button
              type="button"
              disabled={!legalAccepted || loading}
              onClick={openChart}
              className="mt-4 w-full rounded-xl border border-gold/45 bg-gold/15 px-4 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Opening your chart (please wait)…' : 'Accept and open my chart'}
            </button>

            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="mt-3 w-full text-center text-xs text-ivory/55 underline-offset-2 hover:text-ivory/80 hover:underline"
              >
                Cancel
              </button>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {error}
              </p>
            ) : null}
          </section>
        </div>
      </main>

      <AnimatePresence>
        {legalDocType ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 px-4 py-6"
            onClick={() => setLegalDocType(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-full max-w-4xl overflow-hidden rounded-2xl border border-gold/30 bg-black shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gold/20 px-4 py-3">
                <p className="text-sm font-semibold text-gold">
                  {legalDocType === 'terms'
                    ? 'Terms & Conditions'
                    : legalDocType === 'privacy'
                      ? 'Privacy Policy'
                      : 'Disclaimer'}
                </p>
                <button
                  type="button"
                  onClick={() => setLegalDocType(null)}
                  className="rounded-md border border-gold/30 px-2 py-1 text-xs text-gold hover:border-gold/60"
                >
                  Close
                </button>
              </div>
              <iframe
                title={`legal-${legalDocType}`}
                src={`/${legalDocType}?embedded=1`}
                className="h-[75vh] w-full bg-black"
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { apiFetch, withApiBase } from '../lib/apiBase';
import { useLanguage } from '../lib/i18n.jsx';

const CREATE_URL = withApiBase('/api/premium/fonepay/create');
const STATUS_URL = withApiBase('/api/premium/fonepay/status');
const POLL_MS = 4000;
const GIVE_UP_MS = 10 * 60 * 1000;

function formatNpr(amount) {
  return `NPR ${Number(amount).toLocaleString('en-IN')}`;
}

/**
 * Fonepay "Checkout by Fonepay" QR: creates the payment on the backend, shows the QR to scan
 * from any Nepali bank/wallet app, then polls until Fonepay reports success.
 * onPaid() is called once the backend has recorded the payment (premium is then restorable by email).
 */
export default function FonepayPanel({ email, plan, onPaid, onCancel }) {
  const { t } = useLanguage();
  const canvasRef = useRef(null);
  const [state, setState] = useState({ phase: 'creating', amount: null, referenceLabel: '', qrString: '', message: '' });

  // 1) create the payment + QR
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(CREATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, plan })
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data?.qrString) {
          setState((s) => ({ ...s, phase: 'error', message: data?.message || t('fonepay.createFailed') }));
          return;
        }
        setState({
          phase: 'waiting',
          amount: data.amount,
          referenceLabel: data.referenceLabel,
          qrString: data.qrString,
          message: ''
        });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, phase: 'error', message: t('fonepay.createFailed') }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, plan]);

  // 2) draw the QR
  useEffect(() => {
    if (state.phase !== 'waiting' || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, state.qrString, { width: 232, margin: 2, errorCorrectionLevel: 'M' }).catch(() => {
      setState((s) => ({ ...s, phase: 'error', message: t('fonepay.qrFailed') }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.qrString]);

  // 3) poll for payment
  useEffect(() => {
    if (state.phase !== 'waiting' || !state.referenceLabel) return undefined;
    let stopped = false;
    const startedAt = Date.now();
    const timer = window.setInterval(async () => {
      if (stopped) return;
      if (Date.now() - startedAt > GIVE_UP_MS) {
        stopped = true;
        window.clearInterval(timer);
        setState((s) => ({ ...s, phase: 'expired', message: t('fonepay.expired') }));
        return;
      }
      try {
        const res = await apiFetch(STATUS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, referenceLabel: state.referenceLabel })
        });
        const data = await res.json().catch(() => ({}));
        if (stopped) return;
        if (data?.status === 'success') {
          stopped = true;
          window.clearInterval(timer);
          setState((s) => ({ ...s, phase: 'paid' }));
          onPaid?.();
        } else if (data?.status === 'underpaid') {
          stopped = true;
          window.clearInterval(timer);
          setState((s) => ({ ...s, phase: 'error', message: t('fonepay.underpaid') }));
        }
      } catch {
        // transient network error: keep polling
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.referenceLabel]);

  return (
    <div className="mt-4 rounded-2xl border border-gold/30 bg-black/35 p-4 text-center" aria-live="polite">
      {state.phase === 'creating' ? <p className="py-6 text-sm text-ivory/75">{t('fonepay.creating')}</p> : null}

      {state.phase === 'waiting' ? (
        <>
          <p className="text-xs uppercase tracking-[0.2em] text-gold/70">{t('fonepay.scanTitle')}</p>
          <p className="mt-1 font-serif text-2xl text-gold">{formatNpr(state.amount)}</p>
          <div className="mx-auto mt-3 inline-block rounded-2xl bg-white p-2 shadow">
            <canvas ref={canvasRef} width="232" height="232" aria-label="Fonepay QR" />
          </div>
          <ol className="mx-auto mt-3 max-w-xs space-y-1 text-left text-xs leading-relaxed text-ivory/75">
            <li>1. {t('fonepay.step1')}</li>
            <li>2. {t('fonepay.step2')}</li>
            <li>3. {t('fonepay.step3')}</li>
          </ol>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-ivory/65">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
            {t('fonepay.waiting')}
          </p>
          <p className="mt-1 text-[10px] text-ivory/45">Ref: {state.referenceLabel}</p>
        </>
      ) : null}

      {state.phase === 'paid' ? <p className="py-4 text-sm text-emerald-300">{t('fonepay.paid')}</p> : null}

      {state.phase === 'error' || state.phase === 'expired' ? (
        <p className="py-3 text-sm text-red-300">{state.message}</p>
      ) : null}

      {state.phase !== 'paid' ? (
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 rounded-full border border-gold/40 px-4 py-2 text-xs font-semibold text-gold transition hover:bg-gold/10"
        >
          {state.phase === 'error' || state.phase === 'expired' ? t('fonepay.back') : t('fonepay.cancel')}
        </button>
      ) : null}
    </div>
  );
}

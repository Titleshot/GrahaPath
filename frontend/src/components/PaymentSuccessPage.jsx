import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const KOFI_PENDING_KEY = 'grahapath:kofi-pending';

function planLabel(plan) {
  return String(plan || '').toLowerCase() === 'quick' ? 'Quick Direction' : 'Full Life Decode';
}

function readPendingFromStorage() {
  try {
    const raw = window.localStorage.getItem(KOFI_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const email = String(parsed?.email || '')
      .trim()
      .toLowerCase();
    if (!email) return null;
    const plan = parsed?.plan === 'quick' ? 'quick' : 'full';
    return { email, plan };
  } catch {
    return null;
  }
}

/** Dedicated return URL after Ko-fi (or pasted success link). Polls restore while webhooks finalize. */
export default function PaymentSuccessPage({ onNavigate, restorePremiumNow, savePendingKofiRestore }) {
  const [phase, setPhase] = useState('checking'); // checking | unlocked | retry | missing_email
  const [banner, setBanner] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [resolvedPlan, setResolvedPlan] = useState('');
  const [attempt, setAttempt] = useState(0);
  const restoreStartedRef = useRef(false);

  const fromQuery = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search || '');
    const email = String(params.get('email') || '')
      .trim()
      .toLowerCase();
    const rawPlan = String(params.get('plan') || '').toLowerCase();
    const plan = rawPlan === 'quick' ? 'quick' : rawPlan === 'full' ? 'full' : '';
    return email ? { email, plan: plan || 'full' } : null;
  }, []);

  const initialEmail = fromQuery?.email || readPendingFromStorage()?.email || '';
  const initialPlan = fromQuery?.plan || readPendingFromStorage()?.plan || 'full';

  const runRestoreCycle = useCallback(
    async (email, chosenPlanHint) => {
      const normalized = String(email || '')
        .trim()
        .toLowerCase();
      if (!normalized) {
        setPhase('missing_email');
        setBanner('Add the email you used at checkout so we can unlock your plan.');
        return;
      }
      setPhase('checking');
      setBanner('Confirming your payment with GrahaPath… This usually takes a few seconds.');
      setResolvedPlan(planLabel(chosenPlanHint));

      const maxAttempts = 10;
      const baseDelayMs = 1800;
      let lastMessage = '';

      for (let i = 0; i < maxAttempts; i += 1) {
        setAttempt(i + 1);
        try {
          const result = await restorePremiumNow(normalized, { quiet: true });
          const p = result?.plan === 'quick' ? 'quick' : 'full';
          setResolvedPlan(planLabel(p));
          setPhase('unlocked');
          setBanner(
            `You're unlocked on ${planLabel(p)}. The email ${normalized} now has premium access in this browser.`
          );
          return;
        } catch (err) {
          lastMessage = err?.message || 'Still waiting for your payment to register.';
          if (i < maxAttempts - 1) {
            const delay = Math.min(12000, baseDelayMs + i * 600);
            setBanner(`${lastMessage} Retrying (${i + 2}/${maxAttempts})…`);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }

      setPhase('retry');
      setBanner(
        lastMessage ||
          'We could not confirm premium yet. If you just paid, wait a moment and try again — Ko-fi notifies us via webhook.'
      );
    },
    [restorePremiumNow]
  );

  useEffect(() => {
    try {
      if (fromQuery && fromQuery.email) {
        window.localStorage.setItem(
          KOFI_PENDING_KEY,
          JSON.stringify({
            email: fromQuery.email,
            plan: fromQuery.plan || 'full',
            startedAt: Date.now()
          })
        );
        savePendingKofiRestore?.({
          email: fromQuery.email,
          plan: fromQuery.plan || 'full',
          startedAt: Date.now()
        });
      }
    } catch {
      /* ignore */
    }
  }, [fromQuery, savePendingKofiRestore]);

  useEffect(() => {
    if (restoreStartedRef.current) return;
    restoreStartedRef.current = true;
    window.scrollTo(0, 0);
    if (initialEmail) {
      setEmailInput(initialEmail);
      void runRestoreCycle(initialEmail, initialPlan);
    } else {
      setPhase('missing_email');
      setBanner('Enter the email you used at Ko-fi so we can connect your premium access.');
    }
  }, [initialEmail, initialPlan, runRestoreCycle]);

  function handleContinueHome() {
    onNavigate('/');
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-void text-ivory">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.1),transparent_28%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-gold/25 bg-black/55 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-gold/70">GrahaPath</p>
          <h1 className="mt-3 font-serif text-2xl text-gold sm:text-3xl">Payment received</h1>
          <p className="mt-3 text-sm leading-relaxed text-ivory/75">
            {phase === 'unlocked'
              ? 'Your premium access is active. Continue to your chart below.'
              : phase === 'missing_email'
                ? 'Tell us which email you paid with so we can unlock the right GrahaPath plan.'
                : 'Hang tight while we activate your unlock. Most payments confirm within seconds.'}
          </p>

          {banner || phase === 'checking' ? (
            <div className="mt-5 rounded-2xl border border-gold/15 bg-black/35 px-4 py-3 text-sm text-ivory/80">
              {phase === 'checking' ? (
                <p className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
                  {banner || 'Checking your account…'}
                </p>
              ) : (
                <p className={phase === 'unlocked' ? 'text-emerald-200/95' : 'text-amber-100/90'}>{banner}</p>
              )}
              {phase === 'checking' && attempt > 0 ? (
                <p className="mt-2 text-xs text-ivory/45">Attempt {attempt} — webhooks can take a short moment.</p>
              ) : null}
            </div>
          ) : null}

          {phase === 'missing_email' ? (
            <div className="mt-6 space-y-3">
              <label className="block text-xs text-ivory/70">
                Email used at Ko-fi
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-gold/30 bg-black/45 px-3 py-2 text-sm text-ivory outline-none focus:border-gold/60"
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  runRestoreCycle(emailInput.trim(), initialPlan === 'quick' ? 'quick' : 'full')
                }
                className="w-full rounded-2xl border border-gold/70 bg-gold px-4 py-3 text-sm font-semibold text-black transition hover:bg-gold-300"
              >
                Unlock my access
              </button>
            </div>
          ) : null}

          {phase === 'retry' ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => runRestoreCycle(emailInput.trim() || initialEmail, initialPlan)}
                className="flex-1 rounded-2xl border border-gold/60 bg-gold/15 px-4 py-3 text-sm font-semibold text-gold transition hover:bg-gold/25"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={handleContinueHome}
                className="flex-1 rounded-2xl border border-gold/35 bg-black/40 px-4 py-3 text-sm font-medium text-ivory transition hover:border-gold/50"
              >
                Open GrahaPath home
              </button>
            </div>
          ) : null}

          {phase === 'unlocked' ? (
            <div className="mt-6 space-y-3">
              {resolvedPlan ? (
                <p className="text-center text-xs uppercase tracking-[0.2em] text-gold/60">Plan: {resolvedPlan}</p>
              ) : null}
              <button
                type="button"
                onClick={handleContinueHome}
                className="w-full rounded-2xl border border-gold/70 bg-gold px-4 py-3 text-sm font-semibold text-black transition hover:bg-gold-300"
              >
                Continue to my chart
              </button>
            </div>
          ) : null}

          {phase === 'checking' ? (
            <button
              type="button"
              onClick={handleContinueHome}
              className="mt-6 w-full rounded-2xl border border-gold/25 bg-black/30 px-4 py-2.5 text-xs text-ivory/70 transition hover:border-gold/40"
            >
              Open GrahaPath in another tab while we finish
            </button>
          ) : null}
        </motion.div>
      </div>
    </main>
  );
}

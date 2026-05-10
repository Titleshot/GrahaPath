import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const LAST_PREMIUM_EMAIL_KEY = 'grahapath:last-premium-email';

export default function PaymentPreviewModal({
  open,
  onClose,
  onSimulateSuccess,
  onRestorePremium,
  checkoutRetryMode = false
}) {
  const quickDirectionFeatures = [
    'GrahaPath AI Access',
    'Personalized Chart Guidance',
    'Timing & Pattern Insights',
    'Career, Relationship & Emotional Guidance'
  ];
  const fullLifeDecodeFeatures = [
    'All features from Quick Direction',
    'Longer GrahaPath Exploration'
  ];
  const [selectedTier, setSelectedTier] = useState('full');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [email, setEmail] = useState('');
  const [restoreEmail, setRestoreEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [legalDocType, setLegalDocType] = useState(null);

  useEffect(() => {
    if (open) {
      setLegalAccepted(false);
      setStatusMessage('');
      setErrorMessage('');
      try {
        const saved = String(window.localStorage.getItem(LAST_PREMIUM_EMAIL_KEY) || '').trim();
        if (saved && !email.trim()) {
          setEmail(saved);
        }
      } catch {
        // Ignore localStorage access failures.
      }
    }
  }, [open, email]);

  useEffect(() => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    try {
      window.localStorage.setItem(LAST_PREMIUM_EMAIL_KEY, normalizedEmail);
    } catch {
      // Ignore localStorage access failures.
    }
  }, [email]);

  async function handleCheckoutSubmit() {
    setErrorMessage('');
    setStatusMessage('');
    setIsSaving(true);
    try {
      await onSimulateSuccess?.({
        tier: selectedTier,
        email: email.trim()
      });
      setStatusMessage('Redirecting to secure checkout...');
    } catch (error) {
      setErrorMessage(error.message || 'Could not save premium access.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-gold/25 bg-gradient-to-br from-[#080710] via-[#090613] to-black p-5 shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.32em] text-gold/70">Unlock Full Life Decode</p>
            <h3 className="mt-2 font-serif text-2xl text-gold">Choose your unlock tier</h3>
            {checkoutRetryMode ? (
              <div className="mt-3 rounded-xl border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                <p>Your previous checkout was cancelled. You can quickly restart below.</p>
                <button
                  type="button"
                  disabled={!legalAccepted || !email.trim() || isSaving}
                  onClick={handleCheckoutSubmit}
                  className="mt-2 rounded-full border border-amber-300/55 bg-amber-300/10 px-3 py-1.5 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Opening checkout...' : 'Retry checkout now'}
                </button>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedTier('quick')}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedTier === 'quick'
                    ? 'border-gold/60 bg-gold/10'
                    : 'border-gold/20 bg-black/35'
                }`}
              >
                <p className="text-sm uppercase tracking-[0.2em] text-gold/70">Quick Direction</p>
                <p className="mt-1 font-serif text-2xl text-gold-100">$4.99</p>
                <p className="mt-1 text-xs text-gold-100/85">12 GrahaPath Insights</p>
                <ul className="mt-2 space-y-1.5 text-xs text-ivory/75">
                  {quickDirectionFeatures.map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <span className="mt-[1px] text-gold/90 drop-shadow-[0_0_6px_rgba(255,215,120,0.35)]">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ivory/65">Perfect for focused clarity and exploration.</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier('full')}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedTier === 'full'
                    ? 'border-gold/70 bg-gold/15'
                    : 'border-gold/25 bg-black/35'
                }`}
              >
                <p className="text-sm uppercase tracking-[0.2em] text-gold-100">Full Life Decode</p>
                <p className="mt-1 font-serif text-2xl text-gold">$14.99</p>
                <p className="mt-1 text-xs text-gold-100/90">50 GrahaPath Insights</p>
                <ul className="mt-2 space-y-1.5 text-xs text-ivory/80">
                  {fullLifeDecodeFeatures.map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <span className="mt-[1px] text-gold drop-shadow-[0_0_6px_rgba(255,215,120,0.4)]">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ivory/65">For deeper and longer chart exploration.</p>
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-gold/20 bg-black/35 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gold/70">Checkout & save premium access</p>
              <p className="mt-2 text-[11px] leading-snug text-ivory/55">
                If checkout opens Ko-fi, use this same email on Ko-fi, then tap <span className="text-gold-200">Restore Premium</span> here
                after payment (webhooks may take a few seconds).
              </p>
              <label className="mt-3 block text-xs text-ivory/75">
                Email (required)
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-gold/30 bg-black/45 px-3 py-2 text-sm text-ivory outline-none focus:border-gold/60"
                />
              </label>
            </div>

            <label className="mt-3 flex items-start gap-2 text-xs text-ivory/70">
              <input
                type="checkbox"
                className="mt-[2px] h-4 w-4 accent-amber-400"
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
              />
              <span>
                I agree to the{' '}
                <a
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    setLegalDocType('terms');
                  }}
                  className="text-gold hover:underline"
                >
                  Terms
                </a>,{' '}
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    setLegalDocType('privacy');
                  }}
                  className="text-gold hover:underline"
                >
                  Privacy Policy
                </a>, and{' '}
                <a
                  href="/disclaimer"
                  onClick={(e) => {
                    e.preventDefault();
                    setLegalDocType('disclaimer');
                  }}
                  className="text-gold hover:underline"
                >
                  Disclaimer
                </a>.
              </span>
            </label>
            <button
              type="button"
              disabled={!legalAccepted || !email.trim() || isSaving}
              onClick={handleCheckoutSubmit}
              className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-gold/70 bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Opening secure checkout...' : 'Continue to Secure Checkout'}
            </button>
            <div className="mt-4 rounded-2xl border border-gold/20 bg-black/35 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gold/70">Restore Premium Access</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={restoreEmail}
                  onChange={(e) => setRestoreEmail(e.target.value)}
                  placeholder="Enter your purchase email"
                  className="w-full rounded-xl border border-gold/30 bg-black/45 px-3 py-2 text-sm text-ivory outline-none focus:border-gold/60"
                />
                <button
                  type="button"
                  disabled={!restoreEmail.trim() || isRestoring}
                  onClick={async () => {
                    setErrorMessage('');
                    setStatusMessage('');
                    setIsRestoring(true);
                    try {
                      const result = await onRestorePremium?.(restoreEmail.trim());
                      setStatusMessage(result?.message || 'Premium restored successfully.');
                    } catch (error) {
                      setErrorMessage(error.message || 'Restore failed for this email.');
                    } finally {
                      setIsRestoring(false);
                    }
                  }}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-gold/60 bg-gold/90 px-4 py-2 text-xs font-semibold text-black transition hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRestoring ? 'Restoring...' : 'Restore Access'}
                </button>
              </div>
            </div>
            {statusMessage ? <p className="mt-3 text-center text-xs text-emerald-300">{statusMessage}</p> : null}
            {errorMessage ? <p className="mt-3 text-center text-xs text-red-300">{errorMessage}</p> : null}
          </motion.div>
        </motion.div>
      )}
      {legalDocType && (
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
      )}
    </AnimatePresence>
  );
}

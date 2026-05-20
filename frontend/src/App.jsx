import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BirthDetailsForm from './components/BirthDetailsForm';
import LoadingSequence from './components/LoadingSequence';
import DemoExperience from './components/DemoExperience';
import PaidUnlockedExperience from './components/PaidUnlockedExperience';
import PaymentPreviewModal from './components/PaymentPreviewModal';
import PaymentSuccessPage from './components/PaymentSuccessPage';
import LegalPage from './components/LegalPage';
import AboutPage from './components/AboutPage';
import { getClientFingerprint } from './lib/clientFingerprint';
import { API_BASE, apiFetch, withApiBase } from './lib/apiBase';
import { initAnalytics, trackEvent, trackPageView } from './lib/analytics';
import { 
  generateChartFingerprint, 
  hasChartUsedDemo, 
  markChartAsUsedDemo, 
  getStoredChartData,
  storeChartData 
} from './lib/chartFingerprint';

const API_URL = withApiBase('/api/generate-chart');
const PREMIUM_CHECKOUT_URL = withApiBase('/api/premium/checkout-session');
const PREMIUM_RESTORE_URL = withApiBase('/api/premium/restore');
const KOFI_PENDING_KEY = 'grahapath:kofi-pending';

/** Vercel/static hosts have no `/api` proxy unless you set API base URL at build time. */
const showProdApiMisconfig =
  typeof import.meta !== 'undefined' &&
  import.meta.env.PROD &&
  String(API_BASE || '').trim().length === 0;

function normalizeAdDate(displayDate) {
  const match = /^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/.exec(displayDate.trim());

  if (!match) {
    throw new Error('Enter date as DD / MM / YYYY.');
  }

  const [, day, month, year] = match;
  const isoDate = `${year}-${month}-${day}`;
  const parsedDate = new Date(`${isoDate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() + 1 !== Number(month) ||
    parsedDate.getUTCDate() !== Number(day)
  ) {
    throw new Error('Enter a valid English birth date.');
  }

  return isoDate;
}

/** Prefer server `details[]`, then message/error; always include HTTP status when present. */
function formatGenerateChartFailure(response, data) {
  const status = response?.status;
  const fromDetails = Array.isArray(data?.details)
    ? data.details.map(String).find((s) => s.trim().length > 0)
    : typeof data?.details === 'string'
      ? data.details
      : '';
  const primary =
    fromDetails ||
    (typeof data?.message === 'string' && data.message.trim()) ||
    (typeof data?.error === 'string' && data.error.trim()) ||
    '';
  if (primary && status) return `${primary} (HTTP ${status})`;
  if (primary) return primary;
  if (status) return `Chart request failed (HTTP ${status}${response.statusText ? `: ${response.statusText}` : ''}).`;
  return 'Chart generation failed.';
}

function normalizeBirthTime(displayTime) {
  const match = /^(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)$/i.exec(displayTime.trim());

  if (!match) {
    throw new Error('Enter time as HH : MM AM/PM.');
  }

  const [, rawHour, rawMinute, meridiem] = match;
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    throw new Error('Enter a valid birth time.');
  }

  const normalizedHour = meridiem.toUpperCase() === 'PM' ? (hour % 12) + 12 : hour % 12;

  return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function App() {
  const [routePath, setRoutePath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  // Lightweight client-side routing (no react-router) so navigation
  // keeps app state + restores scroll on back/forward.
  useEffect(() => {
    const onPopState = (event) => {
      const nextPath = window.location.pathname || '/';
      setRoutePath(nextPath);

      const scrollY = Number(event?.state?.scrollY);
      if (!Number.isNaN(scrollY)) {
        window.requestAnimationFrame(() => {
          window.scrollTo(0, Math.max(0, scrollY));
        });
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(routePath || '/');
  }, [routePath]);

  const navigateTo = (path) => {
    if (typeof window === 'undefined') return;
    const next = path || '/';
    if (next === routePath) return;

    // Save current scroll position onto current history entry.
    try {
      const currentState = window.history.state || {};
      window.history.replaceState({ ...currentState, scrollY: window.scrollY }, '', window.location.pathname);
    } catch {
      // ignore
    }

    // Push new entry with baseline scroll.
    try {
      window.history.pushState({ scrollY: 0 }, '', next);
    } catch {
      window.location.assign(next);
      return;
    }

    setRoutePath(next);
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  };

  const handleBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    navigateTo('/');
  };

  const [formData, setFormData] = useState({
    name: '',
    dateType: 'AD',
    date: '',
    dateDisplay: '',
    bsDate: {
      year: '2053',
      month: '12',
      day: '19',
    },
    timeParts: {
      hour: '04',
      minute: '30',
      meridiem: 'AM',
    },
    place: '',
    location: null,
    lifeEvents: [],
    lifeEventsExpanded: false,
  });
  const [chart, setChart] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [paidUnlocked, setPaidUnlocked] = useState(false);
  const [selectedTier, setSelectedTier] = useState('full');
  const [premiumEmail, setPremiumEmail] = useState('');
  const [premiumInsights, setPremiumInsights] = useState(null);
  const [showPaymentPreview, setShowPaymentPreview] = useState(false);
  const [demoUsed, setDemoUsed] = useState(false);
  const [chartFingerprint, setChartFingerprint] = useState(null);
  const [shareStatus, setShareStatus] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [premiumStatus, setPremiumStatus] = useState('');
  const [premiumStatusTone, setPremiumStatusTone] = useState('success');
  const [checkoutRetryMode, setCheckoutRetryMode] = useState(false);
  const [pendingKofiRestore, setPendingKofiRestore] = useState(null);
  const [isAutoRestoringKofi, setIsAutoRestoringKofi] = useState(false);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (!chart) return;
    
    // Mark demo as used when chart is first displayed (but not paid)
    if (chartFingerprint && !demoUsed && !paidUnlocked) {
      markChartAsUsedDemo(chartFingerprint);
    }
    
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    let attempts = 0;
    let timeoutId;

    const scrollToChartStart = () => {
      if (cancelled) return;
      const anchor = document.getElementById('chart-calculated-start');
      if (anchor) {
        anchor.scrollIntoView({
          behavior: reduced ? 'auto' : 'smooth',
          block: 'start'
        });
        return;
      }
      attempts += 1;
      if (attempts < 8) {
        timeoutId = window.setTimeout(scrollToChartStart, 80);
      } else {
        resultsRef.current?.scrollIntoView({
          behavior: reduced ? 'auto' : 'smooth',
          block: 'start'
        });
      }
    };

    timeoutId = window.setTimeout(scrollToChartStart, 60);

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [chart]);

  useEffect(() => {
    if (!error || chart) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'nearest'
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [error, chart]);

  function handleFormChange(event) {
    const { name, value } = event.target;

    if (name.startsWith('bsDate.')) {
      const field = name.split('.')[1];
      setFormData((current) => ({
        ...current,
        bsDate: {
          ...current.bsDate,
          [field]: value,
        },
      }));
      return;
    }

    if (name.startsWith('timeParts.')) {
      const field = name.split('.')[1];
      setFormData((current) => ({
        ...current,
        timeParts: {
          ...current.timeParts,
          [field]: value,
        },
      }));
      return;
    }

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleGenerateChart(event) {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setChart(null);
    setPaidUnlocked(false);
    setSelectedTier('full');
    setPremiumEmail('');
    setPremiumInsights(null);

    let chartRequestTimer;
    try {
      const payload = {
        name: formData.name,
        dateType: formData.dateType,
        date: formData.dateType === 'AD' ? normalizeAdDate(formData.dateDisplay || '') : '',
        bsDate: {
          year: Number(formData.bsDate.year),
          month: Number(formData.bsDate.month),
          day: Number(formData.bsDate.day),
        },
        time: normalizeBirthTime(
          `${formData.timeParts.hour} : ${formData.timeParts.minute} ${formData.timeParts.meridiem}`
        ),
        place: formData.place,
        ...(formData.location
          ? {
              location: {
                latitude: Number(formData.location.latitude),
                longitude: Number(formData.location.longitude),
                ...(formData.location.displayName
                  ? { displayName: formData.location.displayName }
                  : {})
              }
            }
          : {}),
      };

      const lifeEvents = (formData.lifeEvents || [])
        .map((evt) => {
          const type = String(evt.type || 'other').trim() || 'other';
          const note = String(evt.note || '').trim();
          const impact = String(evt.impact || '').trim();
          const precision = evt.datePrecision === 'monthYear' ? 'monthYear' : 'exact';

          if (precision === 'monthYear') {
            const y = Number(String(evt.approxYear || '').replace(/\D/g, '').slice(0, 4));
            const m = Number(evt.approxMonth);
            if (y >= 1800 && y <= 2200 && m >= 1 && m <= 12) {
              const yearMonth = `${y}-${String(m).padStart(2, '0')}`;
              return { yearMonth, type, note, impact };
            }
            return null;
          }

          const date = String(evt.date || '').trim();
          return { date, type, note, impact };
        })
        .filter(Boolean)
        .filter((evt) =>
          evt.yearMonth
            ? /^\d{4}-\d{2}$/.test(evt.yearMonth)
            : /^\d{4}-\d{2}-\d{2}$/.test(evt.date || '')
        )
        .map((evt) => {
          const out = evt.yearMonth
            ? { yearMonth: evt.yearMonth, type: evt.type, note: evt.note || undefined }
            : { date: evt.date, type: evt.type, note: evt.note || undefined };
          if (evt.impact && ['major', 'high', 'standard', 'minor', 'micro'].includes(evt.impact)) {
            out.impact = evt.impact;
          }
          return out;
        });
      if (lifeEvents.length > 0) {
        payload.lifeEvents = lifeEvents;
      }

      const chartAbort = new AbortController();
      chartRequestTimer = window.setTimeout(() => chartAbort.abort(), 120000);

      const response = await apiFetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gp-client-fp': getClientFingerprint(),
          'x-gp-demo-premium': 'true'
        },
        body: JSON.stringify(payload),
        signal: chartAbort.signal
      });

      const responseText = await response.text();
      let data = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (error) {
        // Handle non-JSON responses like "Not found"
        data = { error: responseText, message: responseText };
      }

      if (!response.ok) {
        throw new Error(formatGenerateChartFailure(response, data));
      }

      // Generate chart fingerprint for demo protection
      const birthData = {
        date: formData.dateType === 'AD' ? formData.dateDisplay : `${formData.bsDate.day}/${formData.bsDate.month}/${formData.bsDate.year}`,
        time: `${formData.timeParts.hour}:${formData.timeParts.minute} ${formData.timeParts.meridiem}`,
        place: formData.place
      };
      
      const fingerprint = await generateChartFingerprint(birthData);
      setChartFingerprint(fingerprint);

      // Check if this chart has already used demo
      const hasUsedDemo = hasChartUsedDemo(fingerprint);
      setDemoUsed(hasUsedDemo);

      if (!hasUsedDemo) {
        // First time demo - store chart data
        storeChartData(fingerprint, data);
      } else {
        // Demo already used - restore previous data if available
        const storedData = getStoredChartData(fingerprint);
        if (storedData) {
          data = storedData;
        }
      }

      setChart(data);
      trackEvent('chart_generated', {
        date_type: String(formData.dateType || 'AD').toLowerCase(),
        has_location: Boolean(formData.location),
        has_life_events: Array.isArray(payload.lifeEvents) && payload.lifeEvents.length > 0
      });
    } catch (requestError) {
      const aborted = typeof requestError?.name === 'string' && requestError.name === 'AbortError';
      const raw = aborted
        ? import.meta.env.DEV
          ? 'Chart request timed out (2 min). Check the terminal running the API (npm run dev).'
          : 'Chart request timed out (2 min). The chart service may be busy or still waking up — try again in a moment.'
        : typeof requestError?.message === 'string'
          ? requestError.message
          : String(requestError || '');
      const netHint =
        !aborted &&
        /failed to fetch|networkerror|load failed|ecconnrefused|network request failed/i.test(raw)
          ? import.meta.env.DEV
            ? ' Start the API from the GrahaPath repo root (npm run dev). Open the site with the frontend dev server; leave VITE_API_BASE_URL unset so /api is proxied.'
            : ' Usually: Vercel must build with VITE_API_BASE_URL set to your API (e.g. https://grahapath-api.onrender.com), and Render must list this site in FRONTEND_ORIGIN — then redeploy. Cold start can also cause a short delay; retry once.'
          : '';
      setError(raw + netHint);
    } finally {
      if (chartRequestTimer) window.clearTimeout(chartRequestTimer);
      setIsLoading(false);
    }
  }

  function handleLocationSelect(location) {
    setFormData((current) => ({
      ...current,
      location
    }));
  }

  function handleLifeEventsToggle() {
    setFormData((current) => ({
      ...current,
      lifeEventsExpanded: !current.lifeEventsExpanded
    }));
  }

  function handleLifeEventAdd() {
    setFormData((current) => {
      const list = current.lifeEvents || [];
      if (list.length >= 8) return current;
      return {
        ...current,
        lifeEvents: [
          ...list,
          { date: '', datePrecision: 'exact', approxYear: '', approxMonth: '', type: 'career', note: '', impact: '' }
        ],
        lifeEventsExpanded: true
      };
    });
  }

  function handleLifeEventRemove(index) {
    setFormData((current) => ({
      ...current,
      lifeEvents: (current.lifeEvents || []).filter((_, i) => i !== index)
    }));
  }

  function handleLifeEventFieldChange(index, field, value) {
    setFormData((current) => {
      const list = [...(current.lifeEvents || [])];
      if (!list[index]) return current;
      list[index] = { ...list[index], [field]: value };
      return { ...current, lifeEvents: list };
    });
  }

  async function handleShareLink() {
    const href = typeof window !== 'undefined' ? window.location.href : '';
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      setShareStatus('Link copied. You can now share this page.');
    } catch {
      setShareStatus('Could not copy automatically. Please copy from your address bar.');
    }
    window.setTimeout(() => setShareStatus(''), 2600);
  }

  function buildFeedbackMailto() {
    const subject = 'GrahaPath Feedback';
    const lines = [
      'Hi GrahaPath team,',
      '',
      'I would like to share feedback on my experience:',
      '',
      '- What worked well:',
      '- What could be improved:',
      '',
      `Page: ${typeof window !== 'undefined' ? window.location.href : ''}`,
      `Chart profile: ${chart?.profileHash || 'N/A'}`,
      `Ascendant: ${chart?.ascendant || 'N/A'}`,
      `Moon sign: ${chart?.moonSign || 'N/A'}`,
      '',
      'Thank you.'
    ];
    return `mailto:radheradhe742@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      lines.join('\n')
    )}`;
  }

  function buildContactMailto() {
    return 'mailto:radheradhe742@proton.me?subject=GrahaPath%20Support%20Request';
  }

  function sanitizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function savePendingKofiRestore(nextPending) {
    setPendingKofiRestore(nextPending || null);
    try {
      if (nextPending) {
        window.localStorage.setItem(KOFI_PENDING_KEY, JSON.stringify(nextPending));
      } else {
        window.localStorage.removeItem(KOFI_PENDING_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }

  function applyPremiumRestoreResult(data, fallbackEmail) {
    const plan = data?.premium?.plan === 'quick' ? 'quick' : 'full';
    setSelectedTier(plan);
    setPaidUnlocked(true);
    setPremiumEmail(sanitizeEmail(data?.premium?.email || fallbackEmail || ''));
    const nextInsights = Number(data?.premium?.remainingInsights ?? data?.premium?.remaining_insights);
    setPremiumInsights(Number.isFinite(nextInsights) ? nextInsights : plan === 'quick' ? 12 : 50);
    const restoredFingerprint = data?.premium?.chartFingerprint || data?.premium?.chart_fingerprint || null;
    if (restoredFingerprint) {
      setChartFingerprint(restoredFingerprint);
    }
    if (data?.chart && typeof data.chart === 'object') {
      setChart(data.chart);
      return 'Premium restored with your saved chart.';
    }
    if (chart) {
      return 'Premium restored successfully.';
    }
    return 'Premium restored. Your access is active—generate your chart to view unlocked insights.';
  }

  async function restorePremiumNow(email, { quiet = false } = {}) {
    const normalizedEmail = sanitizeEmail(email);
    if (!normalizedEmail) {
      throw new Error('Email is required to restore premium.');
    }
    const response = await apiFetch(PREMIUM_RESTORE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        chartFingerprint: chartFingerprint || null
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || 'No premium access found for this email.');
    }
    const message = applyPremiumRestoreResult(data, normalizedEmail);
    const plan = data?.premium?.plan === 'quick' ? 'quick' : 'full';
    trackEvent('unlock_success', {
      method: 'restore',
      plan,
      source: quiet ? 'background' : 'manual',
      has_chart: Boolean(data?.chart && typeof data.chart === 'object')
    });
    savePendingKofiRestore(null);
    if (!quiet) {
      setPremiumStatusTone('success');
      setPremiumStatus(`Premium unlocked for ${normalizedEmail}. ${message}`);
      window.setTimeout(() => setPremiumStatus(''), 7000);
    }
    return { message, plan };
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(KOFI_PENDING_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const email = sanitizeEmail(parsed?.email);
      if (!email) return;
      const plan = parsed?.plan === 'quick' ? 'quick' : 'full';
      setPendingKofiRestore({
        email,
        plan,
        startedAt: Number(parsed?.startedAt) || Date.now()
      });
    } catch {
      // ignore malformed localStorage payload
    }
  }, []);

  useEffect(() => {
    if (!pendingKofiRestore?.email) return;
    if (paidUnlocked) return;

    const startedAt = Number(pendingKofiRestore.startedAt) || 0;
    const TEN_MINUTES = 10 * 60 * 1000;
    if (startedAt && Date.now() - startedAt > TEN_MINUTES) {
      savePendingKofiRestore(null);
      return;
    }

    if (!premiumStatus) {
      setPremiumStatusTone('success');
      setPremiumStatus(
        `After completing payment on Ko-fi, click "Unlock my access" below to activate your premium.`
      );
    }
  }, [pendingKofiRestore, paidUnlocked, premiumStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (routePath !== '/') return;
    const params = new URLSearchParams(window.location.search || '');
    const autoRestore = params.get('premium_auto_restore');
    const status = params.get('premium_status');
    const email = sanitizeEmail(params.get('premium_email'));
    if (autoRestore !== '1' || status !== 'success' || !email) return;

    let cancelled = false;
    const runAutoRestore = async () => {
      try {
        setPremiumStatus('Finalizing your premium access...');
        const response = await apiFetch(PREMIUM_RESTORE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            chartFingerprint: chartFingerprint || null
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.message || 'Could not restore premium after checkout.');
        }
        if (cancelled) return;
        setPremiumStatus(applyPremiumRestoreResult(data, email));
      } catch (restoreError) {
        if (cancelled) return;
        setPremiumStatus(
          restoreError?.message ||
            'Payment received. Please click "Unlock my access" once if auto-unlock did not complete.'
        );
      } finally {
        if (cancelled) return;
        window.setTimeout(() => setPremiumStatus(''), 6000);
      }
    };

    runAutoRestore();
    params.delete('premium_auto_restore');
    params.delete('premium_status');
    params.delete('premium_email');
    const nextSearch = params.toString();
    const cleanUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || ''}`;
    window.history.replaceState(window.history.state || {}, '', cleanUrl);

    return () => {
      cancelled = true;
    };
  }, [routePath, chartFingerprint]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (routePath !== '/') return;
    const params = new URLSearchParams(window.location.search || '');
    const status = String(params.get('premium_status') || '').toLowerCase();
    if (status !== 'cancelled') return;

    setPremiumStatusTone('warning');
    setCheckoutRetryMode(true);
    setPremiumStatus('Checkout was cancelled. Your current access remains unchanged.');
    window.setTimeout(() => setPremiumStatus(''), 5000);

    params.delete('premium_status');
    params.delete('premium_email');
    const nextSearch = params.toString();
    const cleanUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || ''}`;
    window.history.replaceState(window.history.state || {}, '', cleanUrl);
  }, [routePath]);

  const hasMeaningfulRightPanel = isLoading || Boolean(chart) || Boolean(error);

  if (routePath === '/terms') {
    return <LegalPage type="terms" onBack={handleBack} onNavigate={navigateTo} />;
  }
  if (routePath === '/privacy') {
    return <LegalPage type="privacy" onBack={handleBack} onNavigate={navigateTo} />;
  }
  if (routePath === '/disclaimer') {
    return <LegalPage type="disclaimer" onBack={handleBack} onNavigate={navigateTo} />;
  }
  if (routePath === '/about') {
    return <AboutPage onBack={handleBack} onNavigate={navigateTo} />;
  }
  if (routePath === '/payment-success') {
    return (
      <PaymentSuccessPage
        onNavigate={navigateTo}
        restorePremiumNow={restorePremiumNow}
        savePendingKofiRestore={savePendingKofiRestore}
      />
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-void text-ivory">
      {showProdApiMisconfig ? (
        <div
          role="alert"
          className="sticky top-0 z-[100] border-b border-amber-500/55 bg-amber-950/95 px-4 py-3 text-center text-sm text-amber-100 shadow-lg shadow-black/30"
        >
          This deployed build does not target the GrahaPath API (
          <code className="rounded bg-black/35 px-1.5 py-0.5 text-xs">VITE_API_BASE_URL</code> is unset).
          Charts and checkout need your Render/backend URL — set{' '}
          <code className="rounded bg-black/35 px-1.5 py-0.5 text-xs">VITE_API_BASE_URL</code>
          {' '}in Vercel (Production + Preview), redeploy, and allow your site origin on the API{' '}
          (<code className="rounded bg-black/35 px-1.5 py-0.5 text-xs">FRONTEND_ORIGIN</code>
          ).
        </div>
      ) : null}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.1),transparent_28%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-4 py-6 sm:px-6 sm:py-8">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-6 border-b border-gold/20 pb-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-gold/70 sm:tracking-[0.55em]">GrahaPath</p>
            <h1 className="mt-3 font-serif text-2xl text-gold sm:text-4xl lg:text-[3.1rem]">
              Your Kundali. Explained Clearly.
            </h1>
          </div>
          <div className="flex flex-col gap-3">
            <p className="max-w-xl text-sm leading-relaxed text-ivory/70">
              GrahaPath decodes your planetary alignment to reveal clear life patterns—validating your past,
              guiding your future, and offering personalized remedies.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gold/80">
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/about');
                }}
                className="rounded-full border border-gold/20 bg-black/30 px-4 py-2 transition hover:border-gold/40 hover:bg-black/50"
              >
                Explore the experience
              </a>
              <button
                onClick={() => setShowPaymentPreview(true)}
                className="rounded-full border border-gold/20 bg-black/30 px-4 py-2 transition hover:border-gold/40 hover:bg-black/50"
              >
                Unlock my access
              </button>
            </div>
          </div>
        </motion.header>
        {premiumStatus ? (
          <div
            className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm ${
              premiumStatusTone === 'warning'
                ? 'border border-amber-400/35 bg-amber-500/10 text-amber-100'
                : 'border border-emerald-400/35 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            <p>{premiumStatus}</p>
            <div className="flex flex-wrap items-center gap-2">
              {pendingKofiRestore?.email && !paidUnlocked ? (
                <button
                  type="button"
                  disabled={isAutoRestoringKofi}
                  onClick={async () => {
                    setPremiumStatusTone('success');
                    setIsAutoRestoringKofi(true);
                    setPremiumStatus('Checking your payment and unlocking premium...');
                    try {
                      await restorePremiumNow(pendingKofiRestore.email, { quiet: false });
                    } catch (error) {
                      setPremiumStatusTone('warning');
                      setPremiumStatus(
                        error?.message ||
                          'Payment may still be processing. Please wait a few seconds and try again.'
                      );
                    } finally {
                      setIsAutoRestoringKofi(false);
                    }
                  }}
                  className="rounded-full border border-emerald-300/55 bg-emerald-300/10 px-4 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isAutoRestoringKofi ? 'Unlocking...' : `Unlock my access for ${pendingKofiRestore.email}`}
                </button>
              ) : null}
              {premiumStatusTone === 'warning' ? (
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutRetryMode(true);
                    setShowPaymentPreview(true);
                  }}
                  className="rounded-full border border-amber-300/55 bg-amber-300/10 px-4 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/20"
                >
                  Try checkout again
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <section
          className={`grid flex-1 gap-6 ${
            hasMeaningfulRightPanel
              ? '2xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)] 2xl:items-start 2xl:gap-7'
              : 'grid-cols-1'
          }`}
        >
          <div
            className={`relative z-50 min-w-0 overflow-visible ${
              hasMeaningfulRightPanel ? '' : 'mx-auto w-full max-w-[900px]'
            }`}
          >
            <BirthDetailsForm
              formData={formData}
              onChange={handleFormChange}
              onSubmit={handleGenerateChart}
              isLoading={isLoading}
              onLocationSelect={handleLocationSelect}
              onLifeEventsToggle={handleLifeEventsToggle}
              onLifeEventAdd={handleLifeEventAdd}
              onLifeEventRemove={handleLifeEventRemove}
              onLifeEventFieldChange={handleLifeEventFieldChange}
              demoUsed={demoUsed}
              onRestorePremium={() => setShowPaymentPreview(true)}
            />
          </div>

          {hasMeaningfulRightPanel ? (
            <div
              ref={resultsRef}
              className="min-h-[500px] min-w-0 overflow-x-hidden scroll-mt-4 rounded-[2rem] border border-gold/20 bg-onyx/70 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl sm:min-h-[560px] sm:p-5 lg:min-h-[720px] lg:p-7"
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <LoadingSequence key="loading" isLoading={isLoading} />
                ) : chart ? (
                  <motion.div
                    key="chart"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex flex-col gap-6"
                  >
                    {error && (
                      <p className="rounded-2xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {error}
                      </p>
                    )}
                    {paidUnlocked ? (
                      <PaidUnlockedExperience
                        chart={chart}
                        selectedTier={selectedTier}
                        premiumEmail={premiumEmail}
                        remainingInsights={premiumInsights}
                      />
                    ) : demoUsed ? (
                      <motion.div
                        key="demo-used"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="flex flex-col gap-6"
                      >
                        <div className="rounded-2xl border border-gold/20 bg-black/30 p-6 text-center">
                          <p className="text-sm text-gold/80 mb-4">
                            This chart has already completed its free exploration.
                          </p>
                          <p className="text-xs text-ivory/60 mb-6">
                            Your previous insights are still available below. For deeper analysis and additional layers, consider unlocking the full experience.
                          </p>
                          <button
                            onClick={() => setShowPaymentPreview(true)}
                            className="rounded-full border border-gold/30 bg-gold/10 px-6 py-3 text-sm font-medium text-gold transition hover:border-gold/50 hover:bg-gold/20"
                          >
                            Unlock Full Analysis
                          </button>
                        </div>
                        <DemoExperience chart={chart} onUnlock={() => setShowPaymentPreview(true)} />
                      </motion.div>
                    ) : (
                      <DemoExperience chart={chart} onUnlock={() => setShowPaymentPreview(true)} />
                    )}
                    <section className="rounded-2xl border border-gold/18 bg-black/25 p-4 sm:p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-gold/70">Continue the experience</p>
                      <h3 className="mt-2 font-serif text-xl text-gold-100">Share or leave feedback</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ivory/70">
                        If this reading resonated, share the page with someone who might value it. You can also send
                        feedback to help us improve the GrahaPath experience.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleShareLink}
                          className="rounded-full border border-gold/35 bg-gold/10 px-5 py-2 text-sm font-medium text-gold transition hover:border-gold/55 hover:bg-gold/20"
                        >
                          Share this link
                        </button>
                        <a
                          href={buildFeedbackMailto()}
                          onClick={() => {
                            setFeedbackStatus(
                              'If your email app does not open, please email radheradhe742@proton.me directly.'
                            );
                            window.setTimeout(() => setFeedbackStatus(''), 5000);
                          }}
                          className="rounded-full border border-gold/35 bg-black/30 px-5 py-2 text-sm font-medium text-gold transition hover:border-gold/55 hover:bg-black/45"
                        >
                          Provide feedback
                        </a>
                        <a
                          href={buildContactMailto()}
                          onClick={() => {
                            setFeedbackStatus(
                              'If your email app does not open, please email radheradhe742@proton.me directly.'
                            );
                            window.setTimeout(() => setFeedbackStatus(''), 5000);
                          }}
                          className="inline-flex items-center rounded-full border border-gold/35 bg-black/30 px-5 py-2 text-sm font-medium text-gold transition hover:border-gold/55 hover:bg-black/45"
                        >
                          Contact us
                        </a>
                      </div>
                      {shareStatus ? <p className="mt-3 text-xs text-emerald-300">{shareStatus}</p> : null}
                      {feedbackStatus ? <p className="mt-1 text-xs text-ivory/65">{feedbackStatus}</p> : null}
                    </section>
                  </motion.div>
                ) : error ? (
                  <motion.div
                    key="chart-error"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-4 rounded-[1.25rem] border border-red-400/35 bg-red-950/40 p-6 text-left sm:p-8"
                  >
                    <p className="text-xs uppercase tracking-[0.28em] text-red-200/80">Chart could not be displayed</p>
                    <p className="font-serif text-xl text-cream">{error}</p>
                    {import.meta.env.DEV ? (
                      <p className="text-sm leading-relaxed text-ivory/75">
                        Local dev: run the API from the repo root (<span className="font-mono text-xs text-gold-200/90">npm run dev</span>
                        ), then the frontend app dev server. Leave{' '}
                        <span className="font-mono text-xs">VITE_API_BASE_URL</span> unset so <span className="font-mono text-xs">/api</span>{' '}
                        is proxied.
                      </p>
                    ) : (
                      <p className="text-sm leading-relaxed text-ivory/75">
                        If the error includes <span className="font-mono text-xs">Failed to fetch</span>, the browser
                        never reached the chart API — use Vercel{' '}
                        <span className="font-mono text-xs">VITE_API_BASE_URL</span> and Render{' '}
                        <span className="font-mono text-xs">FRONTEND_ORIGIN</span> as described in the line above.
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-fallback"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative z-0 flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-dashed border-gold/20 bg-black/20 p-8 text-center"
                  >
                    <div className="relative z-10 max-w-xl">
                      <p className="text-xs uppercase tracking-[0.45em] text-gold/60">Awaiting Birth Details</p>
                      <h2 className="mt-4 font-serif text-3xl text-gold sm:text-4xl">
                        Your Kundali. Explained Clearly.
                      </h2>
                      <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ivory/65">
                        Enter your birth details for precise calculations, then walk through past validation before
                        future direction and remedies.
                      </p>
                      <div className="mx-auto mt-6 grid max-w-md gap-3 text-left text-sm text-ivory/72">
                        {[
                          'Based on real astronomical data',
                          'Uses Lahiri Ayanamsa',
                          'Every insight is linked to your planetary placements'
                        ].map((line) => (
                          <div key={line} className="rounded-2xl border border-gold/10 bg-black/25 px-4 py-3">
                            <span className="mr-2 text-gold-300">✓</span>
                            {line}
                          </div>
                        ))}
                      </div>
                      <p className="mt-6 text-xs uppercase tracking-[0.28em] text-gold-200/70">
                        Clickable chart. Explainable insights. No guesswork.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div
              ref={resultsRef}
              className="mx-auto min-h-[420px] w-full max-w-[900px] min-w-0 overflow-x-hidden scroll-mt-4 rounded-[2rem] border border-gold/20 bg-onyx/70 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6"
            >
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative z-0 flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-dashed border-gold/20 bg-black/20 p-8 text-center"
              >
                <svg
                  viewBox="0 0 300 300"
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 opacity-[0.09] blur-[1px]"
                >
                  <circle cx="150" cy="150" r="132" fill="none" stroke="#d9a441" strokeWidth="1.2" />
                  <circle cx="150" cy="150" r="82" fill="none" stroke="#d9a441" strokeWidth="0.7" />
                  <circle cx="150" cy="150" r="34" fill="none" stroke="#d9a441" strokeWidth="0.6" />
                  {Array.from({ length: 12 }, (_item, index) => {
                    const angle = (index * 30 - 90) * (Math.PI / 180);
                    const inner = {
                      x: 150 + 28 * Math.cos(angle),
                      y: 150 + 28 * Math.sin(angle)
                    };
                    const outer = {
                      x: 150 + 132 * Math.cos(angle),
                      y: 150 + 132 * Math.sin(angle)
                    };

                    return (
                      <line
                        key={index}
                        x1={inner.x}
                        y1={inner.y}
                        x2={outer.x}
                        y2={outer.y}
                        stroke="#d9a441"
                        strokeWidth="0.65"
                      />
                    );
                  })}
                </svg>

                <div className="relative z-10 max-w-xl">
                  <p className="text-xs uppercase tracking-[0.45em] text-gold/60">Awaiting Birth Details</p>
                  <h2 className="mt-4 font-serif text-3xl text-gold sm:text-4xl">
                    Your Kundali. Explained Clearly.
                  </h2>
                  <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ivory/65">
                    Enter your birth details for precise calculations, then walk through past validation before
                    future direction and remedies.
                  </p>

                  <div className="mx-auto mt-6 grid max-w-md gap-3 text-left text-sm text-ivory/72">
                    {[
                      'Based on real astronomical data',
                      'Uses Lahiri Ayanamsa',
                      'Every insight is linked to your planetary placements'
                    ].map((line) => (
                      <div
                        key={line}
                        className="rounded-2xl border border-gold/10 bg-black/25 px-4 py-3"
                      >
                        <span className="mr-2 text-gold-300">✓</span>
                        {line}
                      </div>
                    ))}
                  </div>

                  <p className="mt-6 text-xs uppercase tracking-[0.28em] text-gold-200/70">
                    Clickable chart. Explainable insights. No guesswork.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </section>
      </div>
      <PaymentPreviewModal
        open={showPaymentPreview}
        onClose={() => setShowPaymentPreview(false)}
        checkoutRetryMode={checkoutRetryMode}
        onSimulateSuccess={async ({ tier, email }) => {
          setPremiumStatusTone('success');
          setCheckoutRetryMode(false);
          const normalizedTier = tier === 'quick' ? 'quick' : 'full';
          const response = await apiFetch(PREMIUM_CHECKOUT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              chartId: chart?.profileHash || null,
              chartFingerprint: chartFingerprint || null,
              plan: normalizedTier,
              successUrl:
                typeof window !== 'undefined'
                  ? `${window.location.origin}/payment-success?email=${encodeURIComponent(
                      sanitizeEmail(email)
                    )}&plan=${encodeURIComponent(normalizedTier)}`
                  : '',
              cancelUrl:
                typeof window !== 'undefined'
                  ? `${window.location.origin}/?premium_status=cancelled&premium_email=${encodeURIComponent(
                      sanitizeEmail(email)
                    )}`
                  : ''
            })
          });
          let data;
          try {
            data = await response.json();
          } catch (error) {
            data = { message: 'Invalid response from server' };
          }
          if (!response.ok) {
            throw new Error(data?.message || 'Could not start checkout.');
          }
          trackEvent('checkout_started', {
            plan: normalizedTier,
            provider: String(data?.provider || 'unknown').toLowerCase()
          });
          const checkoutUrl = String(data?.checkoutUrl || '').trim();
          if (!checkoutUrl) {
            throw new Error('Checkout URL missing from server response.');
          }
          const provider = String(data?.provider || 'kofi').toLowerCase();
          if (typeof window !== 'undefined' && provider === 'kofi') {
            const normalizedEmail = sanitizeEmail(email);
            const pending = {
              email: normalizedEmail,
              plan: normalizedTier,
              startedAt: Date.now()
            };
            savePendingKofiRestore(pending);
            window.setTimeout(() => setPremiumStatus(''), 25000);
            setPremiumStatusTone('success');
            setPremiumStatus(
              `Ko-fi opened in a new tab. After paying, open ${window.location.origin}/payment-success — or return here and use "Unlock my access for ${normalizedEmail}".`
            );
            setShowPaymentPreview(false);
            window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
            return;
          }
          if (typeof window !== 'undefined') {
            window.location.href = checkoutUrl;
          }
        }}
        onRestorePremium={async (email) => {
          setPremiumStatusTone('success');
          setCheckoutRetryMode(false);
          trackEvent('restore_clicked', {
            source: 'payment_modal',
            has_chart_fingerprint: Boolean(chartFingerprint)
          });
          const message = (await restorePremiumNow(email, { quiet: true }))?.message;
          setShowPaymentPreview(false);
          window.setTimeout(() => {
            document.getElementById('paid-unlocked-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 120);
          return { message };
        }}
        suggestedRestoreEmail={pendingKofiRestore?.email || ''}
      />
      <footer className="relative z-10 mx-auto mt-4 w-full max-w-[1400px] px-4 pb-8 text-center text-xs text-ivory/55 sm:px-6 lg:px-10">
        <a
          className="hover:text-gold"
          href="/about"
          onClick={(e) => {
            e.preventDefault();
            navigateTo('/about');
          }}
        >
          About
        </a>
        <span className="mx-2">·</span>
        <a
          className="hover:text-gold"
          href="/terms"
          onClick={(e) => {
            e.preventDefault();
            navigateTo('/terms');
          }}
        >
          Terms
        </a>
        <span className="mx-2">·</span>
        <a
          className="hover:text-gold"
          href="/privacy"
          onClick={(e) => {
            e.preventDefault();
            navigateTo('/privacy');
          }}
        >
          Privacy
        </a>
        <span className="mx-2">·</span>
        <a
          className="hover:text-gold"
          href="/disclaimer"
          onClick={(e) => {
            e.preventDefault();
            navigateTo('/disclaimer');
          }}
        >
          Disclaimer
        </a>
        <span className="mx-2">·</span>
        <a
          className="hover:text-gold"
          href={buildContactMailto()}
          onClick={() => {
            setFeedbackStatus('If your email app does not open, please email radheradhe742@proton.me directly.');
            window.setTimeout(() => setFeedbackStatus(''), 5000);
          }}
        >
          Contact
        </a>
      </footer>
    </main>
  );
}


import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getClientFingerprint } from '../lib/clientFingerprint';
import PremiumUnlockModal from './PremiumUnlockModal';
import { readPremiumDemoUnlock, writePremiumDemoUnlock } from '../lib/chartAccess';
import { apiFetch, withApiBase } from '../lib/apiBase';
import { MAGIC_LINK_TOPUP_COPY, SUPPORT_EMAIL } from '../lib/supportContact';

const API_CHAT_V2 = withApiBase('/api/chat-v2');
const API_CHAT_SESSION = withApiBase('/api/v1/chat-query');
const AUTO_GREETING_ENABLED =
  (import.meta.env.VITE_GRAHAPATH_AUTO_GREETING ?? (import.meta.env.DEV ? 'false' : 'true')) === 'true';

function prettifyAssistantText(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';

  // If model emits inline dash-points in one paragraph, split them for readability.
  const normalizedBullets = text
    .replace(/\s-\s(?=[A-Z0-9])/g, '\n- ')
    .replace(/:\s-\s/g, ':\n- ');

  // Add breathing room between dense sentences in longer assistant blocks.
  if (normalizedBullets.length > 280 && !normalizedBullets.includes('\n\n')) {
    return normalizedBullets.replace(/\. (?=[A-Z])/g, '.\n\n');
  }
  return normalizedBullets;
}

function sessionChatStorageKey(chartKey) {
  const key = String(chartKey || '').trim();
  return key ? `gp_session_chat_${key}` : '';
}

function readStoredSessionMessages(chartKey) {
  if (typeof window === 'undefined') return null;
  const storageKey = sessionChatStorageKey(chartKey);
  if (!storageKey) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
    );
  } catch {
    return null;
  }
}

function buildSessionWelcomeText(chart) {
  const lagna = chart?.ascendant || 'your';
  const moon = chart?.moonSign || 'chart';
  return `Your ${lagna}-${moon} chart is active. Ask about career timing, relationships, dasha, or what feels most pressing right now.`;
}

/**

 * GrahaPath AI chat — below the wheel.
 */
export default function ChartGrahaChat({
  chart,
  onPremiumUnlock,
  forceUnlocked = false,
  premiumLabel = '',
  premiumEmail = '',
  initialInsights = null,
  teaserMode = false,
  teaserQuestionLimit = 2,
  onTeaserLock,
  sessionChatMode = false,
  onInsightsChange = null
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [greetingLoading, setGreetingLoading] = useState(false);
  const [insightsLeft, setInsightsLeft] = useState(teaserMode ? teaserQuestionLimit : 3);
  const [insightPulse, setInsightPulse] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumDemoUnlocked, setPremiumDemoUnlocked] = useState(false);
  const [challengeState, setChallengeState] = useState(null);
  const [challengeToken, setChallengeToken] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const turnstileContainerRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const greetingLoadedKeyRef = useRef('');
  const chartKey = chart?.utcDateTime || chart?.localDateTime || '';

  const applyAssistantGreeting = useCallback((content) => {
    setMessages((prev) => {
      if (prev.some((m) => m.role === 'user')) return prev;
      const text = String(content || '').trim();
      if (!text) return prev;
      return [{ role: 'assistant', content: text }];
    });
  }, []);

  useEffect(() => {
    if (!sessionChatMode || !chartKey) return;
    if (messages.length === 0) return;
    const storageKey = sessionChatStorageKey(chartKey);
    if (!storageKey) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore quota / private mode errors
    }
  }, [messages, sessionChatMode, chartKey]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);
  const hasBoundedUnlockBudget =
    sessionChatMode ||
    ((forceUnlocked || premiumDemoUnlocked) &&
      Number.isFinite(Number(initialInsights)) &&
      Number(initialInsights) < 900 &&
      String(premiumEmail || '').trim().length === 0);
  const magicLinkInsightsExhausted = sessionChatMode && insightsLeft <= 0;
  const showInsightsCounter =
    sessionChatMode || hasBoundedUnlockBudget || (insightsLeft > 0 && insightsLeft < 900);
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  const applyInsightsLeft = useCallback(
    (next) => {
      const normalized = Math.max(0, Math.trunc(Number(next)));
      setInsightsLeft(normalized);
      if (typeof onInsightsChange === 'function') {
        onInsightsChange(normalized);
      }
    },
    [onInsightsChange]
  );

  const applyInsightsDelta = useCallback(
    (delta) => {
      setInsightsLeft((prev) => {
        const normalized = Math.max(0, Math.trunc(prev + Number(delta)));
        if (typeof onInsightsChange === 'function') {
          onInsightsChange(normalized);
        }
        return normalized;
      });
    },
    [onInsightsChange]
  );

  const applyServerRemainingInsights = useCallback(
    (remaining) => {
      if (!Number.isFinite(Number(remaining))) return;
      const normalized = Math.max(0, Math.trunc(Number(remaining)));
      if ((sessionChatMode || hasBoundedUnlockBudget) && normalized >= 900) {
        applyInsightsDelta(-1);
        return;
      }
      if (!sessionChatMode && !hasBoundedUnlockBudget && normalized >= 900) {
        return;
      }
      applyInsightsLeft(normalized);
    },
    [sessionChatMode, hasBoundedUnlockBudget, applyInsightsDelta, applyInsightsLeft]
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages, greetingLoading, scrollToBottom]);

  useEffect(() => {
    if (!insightPulse) return;
    const id = setTimeout(() => setInsightPulse(false), 450);
    return () => clearTimeout(id);
  }, [insightPulse]);

  useEffect(() => {
    if (!challengeState?.required || challengeState.provider !== 'turnstile' || !challengeState.siteKey) return;
    let cancelled = false;

    function renderWidget() {
      if (cancelled) return;
      if (!window.turnstile || !turnstileContainerRef.current) return;
      if (turnstileWidgetIdRef.current != null) return;
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: challengeState.siteKey,
        theme: 'dark',
        callback: (token) => {
          setChallengeToken(String(token || ''));
        },
        'expired-callback': () => {
          setChallengeToken('');
        },
        'error-callback': () => {
          setChallengeToken('');
        }
      });
    }

    if (window.turnstile) {
      renderWidget();
      return () => {
        cancelled = true;
      };
    }

    const src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    const existing = Array.from(document.querySelectorAll('script')).find((s) => s.src === src);
    const onLoad = () => renderWidget();
    if (existing) {
      existing.addEventListener('load', onLoad);
    } else {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', onLoad);
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (existing) existing.removeEventListener('load', onLoad);
    };
  }, [challengeState]);

  useEffect(() => {
    setPremiumDemoUnlocked(forceUnlocked || readPremiumDemoUnlock());
  }, [chartKey, forceUnlocked]);

  useEffect(() => {
    if (typeof initialInsights === 'number' && Number.isFinite(initialInsights)) {
      const seed = Math.max(0, Math.trunc(initialInsights));
      if (seed < 900) {
        applyInsightsLeft(seed);
        return;
      }
    }
    if (sessionChatMode) {
      applyInsightsLeft(55);
      return;
    }
    applyInsightsLeft(teaserMode ? teaserQuestionLimit : 3);
  }, [chartKey, teaserMode, teaserQuestionLimit, sessionChatMode, initialInsights, applyInsightsLeft]);

  useEffect(() => {
    if (!chart || !chartKey) return;
    const loadKey = `${chartKey}::${sessionChatMode ? 'session' : 'std'}`;
    if (greetingLoadedKeyRef.current === loadKey) return;
    greetingLoadedKeyRef.current = loadKey;

    setInput('');

    if (sessionChatMode && typeof initialInsights === 'number' && initialInsights <= 0) {
      const lagna = chart?.ascendant || 'your';
      const moon = chart?.moonSign || 'chart';
      setMessages([
        {
          role: 'assistant',
          content: `Your assigned ${lagna}-${moon} chart is loaded, but your AI insights for this link are used up. ${MAGIC_LINK_TOPUP_COPY}`
        }
      ]);
      setGreetingLoading(false);
      return () => {};
    }

    if (sessionChatMode) {
      const stored = readStoredSessionMessages(chartKey);
      if (stored?.length) {
        setMessages(stored);
        setGreetingLoading(false);
        return () => {};
      }
      setMessages([]);
      applyAssistantGreeting(buildSessionWelcomeText(chart));
      setGreetingLoading(false);
      return () => {};
    }

    setMessages([]);

    let cancelled = false;
    if (!AUTO_GREETING_ENABLED) {
      applyAssistantGreeting(
        `Your ${chart?.ascendant || 'your'}-${chart?.moonSign || 'chart'} chart pattern is active. You can now ask about career timing, emotional cycles, relationships, mental patterns, or life direction.`
      );
      setGreetingLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setGreetingLoading(true);

    const userPlan = forceUnlocked || premiumDemoUnlocked ? 'full' : 'free';
    apiFetch(API_CHAT_V2, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gp-client-fp': getClientFingerprint(),
        'x-gp-demo-premium':
          hasBoundedUnlockBudget
            ? 'false'
            : forceUnlocked || premiumDemoUnlocked
              ? 'true'
              : 'false',
        ...(chart?.sessionToken ? { 'x-gp-session': chart.sessionToken } : {})
      },
      body: JSON.stringify({
        chart,
        mode: 'greeting',
        userPlan,
        premiumEmail: premiumEmail || undefined,
        conversationHistory: []
      })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          const hint = import.meta.env.DEV ? `Greeting failed (${res.status}). Is the API dev server running?` : `Greeting failed (${res.status}).`;
          throw new Error(data.message || hint);
        }
        const text =
          typeof data.answer === 'string' && data.answer.trim()
            ? data.answer.trim()
            : 'Your chart is ready. Ask about houses, daśā timing, or career structure.';
        applyAssistantGreeting(text);
        if (typeof data.remainingInsights === 'number') {
          applyServerRemainingInsights(data.remainingInsights);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const detail =
            typeof err?.message === 'string' && err.message.trim().length > 0
              ? err.message
              : import.meta.env.DEV
                ? 'Network error — is the GrahaPath API dev server running?'
                : 'Network error — check your connection or try again in a moment.';
          applyAssistantGreeting(`GrahaPath AI greeting: ${detail}`);
        }
      })
      .finally(() => {
        if (!cancelled) setGreetingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    chartKey,
    chart,
    sessionChatMode,
    initialInsights,
    forceUnlocked,
    premiumDemoUnlocked,
    premiumEmail,
    hasBoundedUnlockBudget,
    applyAssistantGreeting,
    applyServerRemainingInsights
  ]);

  async function sendChat(mode = 'message') {
    const lockedInTeaser = teaserMode && !forceUnlocked && insightsLeft <= 0 && mode !== 'greeting';
    if (lockedInTeaser) {
      onTeaserLock?.();
      return;
    }
    if (sessionChatMode && insightsLeft <= 0 && mode !== 'greeting') {
      return;
    }
    if (!(forceUnlocked || premiumDemoUnlocked) && !teaserMode && insightsLeft <= 0 && mode !== 'greeting') {
      setShowPremiumModal(true);
      return;
    }
    const raw = input.trim();
    const text =
      mode === 'daily_transit'
        ? raw || 'Give me today-focused transit guidance with Moon priority, dasha context, and practical action.'
        : raw;
    if (!text || !chart || sending) return;

    setSending(true);
    setInput('');

    const userMsg = { role: 'user', content: text };
    const historyForApi = messages.filter((m) => m.role === 'user' || m.role === 'assistant');

    setMessages((prev) => [...prev, userMsg]);

    const userPlan = forceUnlocked || premiumDemoUnlocked ? 'full' : teaserMode ? 'free' : 'free';

    try {
      const endpoint = sessionChatMode ? API_CHAT_SESSION : API_CHAT_V2;
      const payload = sessionChatMode
        ? {
            message: text,
            conversationHistory: historyForApi
          }
        : {
            chart,
            message: text,
            userPlan,
            premiumEmail: premiumEmail || undefined,
            conversationHistory: historyForApi,
            surfaceMode: mode === 'daily_transit' ? 'daily_transit' : 'message',
            challengeToken: challengeToken || undefined
          };
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gp-client-fp': getClientFingerprint(),
          'x-gp-demo-premium':
          sessionChatMode || hasBoundedUnlockBudget
            ? 'false'
            : forceUnlocked || premiumDemoUnlocked
              ? 'true'
              : 'false',
          ...(challengeToken ? { 'x-gp-turnstile-token': challengeToken } : {}),
          ...(chart?.sessionToken ? { 'x-gp-session': chart.sessionToken } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === 'ChallengeRequired') {
          setChallengeState({
            required: true,
            provider: String(data?.challenge?.provider || 'none'),
            siteKey: String(data?.challenge?.siteKey || '').trim(),
            reasons: Array.isArray(data?.challenge?.reasons) ? data.challenge.reasons : []
          });
        }
        if (data?.error === 'InsightsExhausted' || res.status === 402) {
          applyInsightsLeft(0);
          const exhaustedCopy =
            typeof data.message === 'string' && data.message.trim()
              ? data.message.trim()
              : MAGIC_LINK_TOPUP_COPY;
          setMessages((prev) => [...prev, { role: 'assistant', content: exhaustedCopy }]);
          return;
        }
        if (sessionChatMode && (res.status === 401 || data?.error === 'Unauthorized')) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                'Your chart session expired. Close this tab and open the full magic link URL your astrologer sent you again (the link that contains /view/).'
            }
          ]);
          return;
        }
        throw new Error(data.message || `Chat failed (${res.status})`);
      }
      setChallengeState(null);
      setChallengeToken('');
      if (window.turnstile && turnstileWidgetIdRef.current != null) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch {
          // ignore widget cleanup failures
        }
        turnstileWidgetIdRef.current = null;
      }
      const reply = typeof data.answer === 'string' ? data.answer.trim() : '';
      setMessages((prev) => [...prev, { role: 'assistant', content: prettifyAssistantText(reply || '…') }]);
      if (typeof data.remainingInsights === 'number') {
        applyServerRemainingInsights(data.remainingInsights);
      } else if (sessionChatMode || hasBoundedUnlockBudget) {
        applyInsightsDelta(-1);
      } else if (!forceUnlocked && !premiumDemoUnlocked) {
        applyInsightsDelta(-1);
      }
      setInsightPulse(true);
    } catch (err) {
      const detail =
        typeof err?.message === 'string' && err.message.trim().length > 0
          ? err.message
          : 'Could not reach GrahaPath AI. Check your connection or try again shortly.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: detail
        }
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    await sendChat('message');
  }

  async function handleDailyTransit() {
    await sendChat('daily_transit');
  }

  if (!chart) return null;

  return (
    <div
      id="gp-chat"
      className="scroll-mt-24 rounded-3xl border border-indigo-400/25 bg-gradient-to-b from-slate-950/85 via-[#0a0812] to-black/95 p-4 shadow-[0_0_0_1px_rgba(99,102,241,0.18),0_26px_70px_rgba(0,0,0,0.55)] sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300/70 sm:tracking-[0.38em]">GrahaPath AI</p>
          <h3 className="mt-1 font-serif text-lg text-cream sm:text-xl">Ask your chart</h3>
          <p className="mt-1 text-[11px] text-ivory/45">GrahaPath AI can make mistakes. Verify important details.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-[11px] text-ivory/45">{teaserMode ? 'Free demo teaser mode' : 'Live Chart Intelligence'}</p>
          {showInsightsCounter ? (
            <div
              className={`inline-flex items-center gap-1 rounded-full border border-gold/35 bg-white/5 px-3 py-1 text-[11px] font-medium text-gold-100 shadow-sm backdrop-blur-md transition ${
                insightPulse ? 'ring-2 ring-amber-300/60 shadow-[0_0_18px_rgba(251,191,36,0.45)] scale-[1.03]' : ''
              }`}
              onClick={() => {
                if (sessionChatMode) return;
                if (teaserMode) onTeaserLock?.();
                else setShowPremiumModal(true);
              }}
              role={sessionChatMode ? undefined : 'button'}
              tabIndex={sessionChatMode ? undefined : 0}
              onKeyDown={(e) => {
                if (sessionChatMode) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (teaserMode) onTeaserLock?.();
                  else setShowPremiumModal(true);
                }
              }}
            >
              <span aria-hidden>🌟</span>
              <span className="text-[11px] leading-none">{`${insightsLeft} Insights Left`}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`max-h-[min(420px,50vh)] space-y-3 overflow-y-auto overscroll-contain pr-1 transition sm:max-h-[min(480px,55vh)] ${
          teaserMode && !forceUnlocked && insightsLeft <= 0 ? 'blur-[1.2px] opacity-70' : ''
        }`}
      >
        {greetingLoading && messages.length === 0 && (
          <p className="text-sm text-ivory/50">Preparing your summary…</p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={`${i}-${m.role}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[85%] ${
                  m.role === 'user'
                    ? 'border border-indigo-400/25 bg-indigo-950/50 text-cream'
                    : 'border border-gold/15 bg-black/45 text-ivory/88'
                }`}
              >
                <span className="whitespace-pre-wrap">
                  {m.role === 'assistant' ? prettifyAssistantText(m.content) : m.content}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {sending && (
          <p className="text-xs italic text-ivory/40">GrahaPath AI is thinking…</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-5 flex min-w-0 flex-col gap-3">
        {challengeState?.required ? (
          <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-3 text-xs text-amber-100">
            <p className="font-semibold">Quick security check required</p>
            <p className="mt-1">
              Please complete this one-time check to continue chatting.
              {Array.isArray(challengeState.reasons) && challengeState.reasons.length > 0
                ? ` (${challengeState.reasons.join(', ')})`
                : ''}
            </p>
            {challengeState.provider === 'turnstile' && challengeState.siteKey ? (
              <div className="mt-2">
                <div ref={turnstileContainerRef} />
                <p className="mt-1 text-[11px] text-amber-100/80">
                  {challengeToken ? 'Verified. You can send your message now.' : 'Waiting for verification...'}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-amber-100/80">
                Challenge provider is not configured fully on server.
              </p>
            )}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            ref={textareaRef}
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Ask about career timing, houses, or dasha…"
            disabled={
              sending ||
              (greetingLoading && !sessionChatMode) ||
              magicLinkInsightsExhausted ||
              (teaserMode && !forceUnlocked && insightsLeft <= 0)
            }
            className="min-h-[88px] max-h-[200px] flex-1 resize-y overflow-y-auto rounded-2xl border border-blue-400/30 bg-black/55 px-4 py-3 text-sm leading-relaxed text-cream outline-none placeholder:text-ivory/35 focus:border-violet-400/55 focus:ring-1 focus:ring-violet-500/35 disabled:opacity-50"
            aria-label="Chat message"
          />
          <button
            type="submit"
            disabled={
              sending ||
              (greetingLoading && !sessionChatMode) ||
              !input.trim() ||
              magicLinkInsightsExhausted ||
              (teaserMode && !forceUnlocked && insightsLeft <= 0) ||
              Boolean(challengeState?.required && challengeState.provider === 'turnstile' && !challengeToken)
            }
            className="min-h-[48px] rounded-2xl border border-amber-400/45 bg-gradient-to-r from-amber-900/45 to-violet-900/40 px-6 py-2 text-sm font-medium text-gold transition hover:border-gold/60 disabled:opacity-40 sm:w-auto"
          >
            Send
          </button>
        </div>
      </form>

      {magicLinkInsightsExhausted ? (
        <div className="mt-4 rounded-2xl border border-amber-300/35 bg-amber-950/45 p-5">
          <p className="text-sm font-semibold text-amber-100">Your AI insights for this chart are used up</p>
          <p className="mt-2 text-sm leading-relaxed text-ivory/80">{MAGIC_LINK_TOPUP_COPY}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('GrahaPath magic link top-up')}`}
            className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-xl border border-gold/55 bg-gold/15 px-5 py-2.5 text-sm font-medium text-gold transition hover:bg-gold/25"
          >
            Email {SUPPORT_EMAIL}
          </a>
          <p className="mt-3 text-xs text-ivory/50">
            Your chart view remains available; only new AI questions need a top-up from your astrologer or support.
          </p>
        </div>
      ) : null}

      {teaserMode && !forceUnlocked && insightsLeft <= 0 && (
        <div className="mt-4 rounded-2xl border border-gold/30 bg-black/55 p-5 text-center">
          <p className="text-sm leading-relaxed text-gold-100">
            Your chart contains deeper timing layers, emotional blueprints, and life-phase patterns waiting underneath.
          </p>
          <p className="mt-2 text-xs text-ivory-100/50">
            Explore detailed planetary reasoning, activation windows, and ongoing conversational analysis.
          </p>
          <button
            type="button"
            onClick={() => onTeaserLock?.()}
            className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-xl border border-gold/60 bg-gold/90 px-5 py-2.5 text-xs font-semibold tracking-wide text-black transition hover:bg-gold"
          >
            Explore Full Life Decode
          </button>
        </div>
      )}

      <PremiumUnlockModal
        open={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUnlock={(tier) => {
          if (tier === 'master') {
            setInsightsLeft(30);
          } else if (tier === 'curiosity') {
            setInsightsLeft(10);
          }
          writePremiumDemoUnlock(true);
          setPremiumDemoUnlocked(true);
          onPremiumUnlock?.(tier);
          setInsightPulse(true);
          setShowPremiumModal(false);
        }}
      />
    </div>
  );
}

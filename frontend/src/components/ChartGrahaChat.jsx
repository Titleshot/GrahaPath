import { useCallback, useEffect, useRef, useState } from 'react';
import { getClientFingerprint } from '../lib/clientFingerprint';
import PremiumUnlockModal from './PremiumUnlockModal';
import { readPremiumDemoUnlock, writePremiumDemoUnlock } from '../lib/chartAccess';
import { apiFetch, withApiBase } from '../lib/apiBase';
import { MAGIC_LINK_TOPUP_COPY, SUPPORT_EMAIL } from '../lib/supportContact';

const API_CHAT_V2 = withApiBase('/api/chat-v2');

function prettifyAssistantText(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const normalizedBullets = text
    .replace(/\s-\s(?=[A-Z0-9])/g, '\n- ')
    .replace(/:\s-\s/g, ':\n- ');
  if (normalizedBullets.length > 280 && !normalizedBullets.includes('\n\n')) {
    return normalizedBullets.replace(/\. (?=[A-Z])/g, '.\n\n');
  }
  return normalizedBullets;
}

function chatStorageKey(persistKey) {
  const key = String(persistKey || '').trim();
  return key ? `gp_chat_${key}` : '';
}

function readStoredMessages(persistKey) {
  if (typeof window === 'undefined') return null;
  const storageKey = chatStorageKey(persistKey);
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

function writeStoredMessages(persistKey, messages) {
  if (typeof window === 'undefined') return;
  const storageKey = chatStorageKey(persistKey);
  if (!storageKey || !messages?.length) return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

function buildWelcomeMessage(chart, sessionChatMode) {
  if (sessionChatMode) {
    const lagna = chart?.ascendant || 'your';
    const moon = chart?.moonSign || 'chart';
    return `Your ${lagna}-${moon} chart is ready. Ask about career, relationships, dasha, or timing.`;
  }
  return 'Ask your chart below — career, timing, relationships, houses, or dasha.';
}

/**
 * GrahaPath AI chat — below the wheel.
 */
export default function ChartGrahaChat({
  chart,
  onPremiumUnlock,
  forceUnlocked = false,
  premiumEmail = '',
  initialInsights = null,
  teaserMode = false,
  teaserQuestionLimit = 2,
  onTeaserLock,
  sessionChatMode = false,
  sessionProfileId = '',
  onInsightsChange = null
}) {
  const chartKey = chart?.utcDateTime || chart?.localDateTime || '';
  const persistKey = String(sessionProfileId || chartKey || '').trim();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
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
  const chatInitRef = useRef('');

  /** Only magic-link clients use server-side profile insight quota on chat-v2. */
  const hasBoundedUnlockBudget = sessionChatMode;
  const magicLinkInsightsExhausted = sessionChatMode && insightsLeft <= 0;
  const showInsightsCounter =
    sessionChatMode ||
    ((forceUnlocked || premiumDemoUnlocked) &&
      Number.isFinite(Number(initialInsights)) &&
      Number(initialInsights) < 900) ||
    (insightsLeft > 0 && insightsLeft < 900);

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

  const persistMessages = useCallback(
    (next) => {
      if (persistKey) writeStoredMessages(persistKey, next);
    },
    [persistKey]
  );

  const setMessagesPersisted = useCallback(
    (updater) => {
      setMessages((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persistMessages(next);
        return next;
      });
    },
    [persistMessages]
  );

  useEffect(() => {
    setPremiumDemoUnlocked(forceUnlocked || readPremiumDemoUnlock());
  }, [persistKey, forceUnlocked]);

  useEffect(() => {
    if (typeof initialInsights === 'number' && Number.isFinite(initialInsights)) {
      const seed = Math.max(0, Math.trunc(initialInsights));
      if (seed < 900) {
        setInsightsLeft(seed);
        return;
      }
    }
    if (sessionChatMode) {
      setInsightsLeft(55);
      return;
    }
    setInsightsLeft(teaserMode ? teaserQuestionLimit : 3);
  }, [persistKey, teaserMode, teaserQuestionLimit, sessionChatMode, initialInsights]);

  useEffect(() => {
    if (!chart || !persistKey) return;
    const loadKey = `${persistKey}::${sessionChatMode ? 'session' : 'paid'}`;
    if (chatInitRef.current === loadKey) return;
    chatInitRef.current = loadKey;

    if (sessionChatMode && typeof initialInsights === 'number' && initialInsights <= 0) {
      const lagna = chart?.ascendant || 'your';
      const moon = chart?.moonSign || 'chart';
      const exhausted = [
        {
          role: 'assistant',
          content: `Your ${lagna}-${moon} chart is loaded, but your AI insights for this link are used up. ${MAGIC_LINK_TOPUP_COPY}`
        }
      ];
      setMessages(exhausted);
      persistMessages(exhausted);
      return;
    }

    const stored = readStoredMessages(persistKey);
    if (stored?.length) {
      setMessages(stored);
      return;
    }

    const welcome = [{ role: 'assistant', content: buildWelcomeMessage(chart, sessionChatMode) }];
    setMessages(welcome);
    persistMessages(welcome);
  }, [chart, persistKey, sessionChatMode, initialInsights, persistMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

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
        callback: (token) => setChallengeToken(String(token || '')),
        'expired-callback': () => setChallengeToken(''),
        'error-callback': () => setChallengeToken('')
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

  async function sendChat(mode = 'message') {
    if (teaserMode && !forceUnlocked && insightsLeft <= 0 && mode !== 'greeting') {
      onTeaserLock?.();
      return;
    }
    if (sessionChatMode && insightsLeft <= 0) return;
    if (!(forceUnlocked || premiumDemoUnlocked) && !teaserMode && insightsLeft <= 0) {
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

    const historyForApi = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
    const userMsg = { role: 'user', content: text };
    setMessagesPersisted((prev) => [...prev, userMsg]);

    const userPlan = forceUnlocked || premiumDemoUnlocked ? 'full' : 'free';

    try {
      const payload = {
        chart,
        message: text,
        userPlan: sessionChatMode || forceUnlocked || premiumDemoUnlocked ? 'full' : userPlan,
        premiumEmail: premiumEmail || undefined,
        conversationHistory: historyForApi,
        surfaceMode: mode === 'daily_transit' ? 'daily_transit' : 'message',
        challengeToken: challengeToken || undefined
      };

      const res = await apiFetch(API_CHAT_V2, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gp-client-fp': getClientFingerprint(),
          'x-gp-demo-premium': sessionChatMode ? 'false' : forceUnlocked || premiumDemoUnlocked ? 'true' : 'false',
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
          setMessagesPersisted((prev) => [...prev, { role: 'assistant', content: exhaustedCopy }]);
          return;
        }
        if (sessionChatMode && (res.status === 401 || data?.error === 'Unauthorized')) {
          setMessagesPersisted((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                'Session expired — open your full magic link again (the URL with /view/ in it).'
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
          // ignore
        }
        turnstileWidgetIdRef.current = null;
      }

      const reply = typeof data.answer === 'string' ? data.answer.trim() : '';
      setMessagesPersisted((prev) => [
        ...prev,
        { role: 'assistant', content: prettifyAssistantText(reply || 'No reply received. Try again.') }
      ]);

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
          : 'Could not reach GrahaPath AI. Check your connection or try again.';
      setMessagesPersisted((prev) => [...prev, { role: 'assistant', content: detail }]);
    } finally {
      setSending(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    await sendChat('message');
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
            >
              <span aria-hidden>🌟</span>
              <span className="text-[11px] leading-none">{`${insightsLeft} Insights Left`}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`max-h-[min(420px,50vh)] space-y-3 overflow-y-auto overscroll-contain pr-1 sm:max-h-[min(480px,55vh)] ${
          teaserMode && !forceUnlocked && insightsLeft <= 0 ? 'blur-[1.2px] opacity-70' : ''
        }`}
      >
        {messages.map((m, i) => (
          <div key={`msg-${i}-${m.role}-${String(m.content).slice(0, 24)}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
          </div>
        ))}
        {sending ? (
          <p className="text-sm text-amber-200/80">GrahaPath AI is thinking… (first reply can take up to a minute)</p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-5 flex min-w-0 flex-col gap-3">
        {challengeState?.required ? (
          <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-3 text-xs text-amber-100">
            <p className="font-semibold">Quick security check required</p>
            {challengeState.provider === 'turnstile' && challengeState.siteKey ? (
              <div className="mt-2">
                <div ref={turnstileContainerRef} />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Ask about career, relationships, dasha…"
            disabled={sending || magicLinkInsightsExhausted || (teaserMode && !forceUnlocked && insightsLeft <= 0)}
            className="min-h-[72px] max-h-[160px] flex-1 resize-y overflow-y-auto rounded-2xl border border-blue-400/30 bg-black/55 px-4 py-3 text-sm leading-relaxed text-cream outline-none placeholder:text-ivory/35 focus:border-violet-400/55 disabled:opacity-50"
            aria-label="Chat message"
          />
          <button
            type="submit"
            disabled={
              sending ||
              !input.trim() ||
              magicLinkInsightsExhausted ||
              (teaserMode && !forceUnlocked && insightsLeft <= 0) ||
              Boolean(challengeState?.required && challengeState.provider === 'turnstile' && !challengeToken)
            }
            className="min-h-[44px] rounded-2xl border border-amber-400/45 bg-gradient-to-r from-amber-900/45 to-violet-900/40 px-6 py-2 text-sm font-medium text-gold transition hover:border-gold/60 disabled:opacity-40 sm:w-auto"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <p className="text-[11px] text-ivory/40">Enter to send · Shift+Enter for new line</p>
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
        </div>
      ) : null}

      {teaserMode && !forceUnlocked && insightsLeft <= 0 ? (
        <div className="mt-4 rounded-2xl border border-gold/30 bg-black/55 p-5 text-center">
          <button
            type="button"
            onClick={() => onTeaserLock?.()}
            className="mt-2 inline-flex min-h-[40px] items-center justify-center rounded-xl border border-gold/60 bg-gold/90 px-5 py-2.5 text-xs font-semibold text-black"
          >
            Explore Full Life Decode
          </button>
        </div>
      ) : null}

      <PremiumUnlockModal
        open={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUnlock={(tier) => {
          if (tier === 'master') setInsightsLeft(30);
          else if (tier === 'curiosity') setInsightsLeft(10);
          writePremiumDemoUnlock(true);
          setPremiumDemoUnlocked(true);
          onPremiumUnlock?.(tier);
          setShowPremiumModal(false);
        }}
      />
    </div>
  );
}

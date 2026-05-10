import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getClientFingerprint } from '../lib/clientFingerprint';
import PremiumUnlockModal from './PremiumUnlockModal';
import { readPremiumDemoUnlock, writePremiumDemoUnlock } from '../lib/chartAccess';
import { withApiBase } from '../lib/apiBase';

const API_CHAT_V2 = withApiBase('/api/chat-v2');
const AUTO_GREETING_ENABLED =
  (import.meta.env.VITE_GRAHAPATH_AUTO_GREETING ?? (import.meta.env.DEV ? 'false' : 'true')) === 'true';
const DAILY_FOCUS_PROMPTS = [
  'What does today suggest for me?',
  'What energy should I avoid today?',
  'What timing feels strongest today?',
  'What emotional pattern is active today?',
  'What should I focus on today?'
];

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

function topPlanetName(chart) {
  const list = Array.isArray(chart?.astroBrain?.dominantPlanets) ? chart.astroBrain.dominantPlanets : [];
  const first = list[0];
  if (typeof first === 'string') return first;
  return first?.planet || first?.name || null;
}

function buildSuggestedPrompts(chart) {
  const lagna = chart?.ascendant || 'your chart';
  const moon = chart?.moonSign || 'your moon pattern';
  const dominant = topPlanetName(chart);
  const p1 = lagna === 'Gemini' ? 'Why do I mentally replay conversations?' : 'What is my recurring mental loop pattern?';
  const p2 = moon === 'Scorpio' ? 'Why do I hide emotional intensity outwardly?' : 'Why do I process emotions differently than others expect?';
  const p3 = dominant ? `How is ${dominant} shaping my current life direction?` : 'Why do I feel pressure around direction lately?';
  const p4 = `What type of work suits my ${lagna} chart structure?`;
  return [p1, p2, p3, p4];
}

function buildContextualPrompts(chart, messages) {
  const base = buildSuggestedPrompts(chart);
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === 'user')?.content || '';
  const t = String(lastUser).toLowerCase();
  if (!t) return base;
  if (/overthink|replay|conversation|communication|social/.test(t)) {
    return [
      'Why do I mentally replay social interactions?',
      'Is this linked to emotional trust issues?',
      'Why do I withdraw after excitement?',
      'What communication style reduces this loop?'
    ];
  }
  if (/career|job|work|direction|purpose/.test(t)) {
    return [
      'What career pattern is repeating for me?',
      'Where am I over-pushing vs under-trusting?',
      'How should I make my next career decision?',
      'What timing pressure is active right now?'
    ];
  }
  if (/relationship|love|partner|attachment/.test(t)) {
    return [
      'What relationship trigger repeats for me?',
      'Why do I open up slowly then pull back?',
      'What emotional pattern affects my bonding style?',
      'What should I communicate more clearly?'
    ];
  }
  return base;
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
  onTeaserLock
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
  const turnstileContainerRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const suggestedPrompts = useMemo(() => {
    if (forceUnlocked && !teaserMode) return DAILY_FOCUS_PROMPTS;
    return buildContextualPrompts(chart, messages);
  }, [chart, messages, forceUnlocked, teaserMode]);
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

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

  const chartKey = chart?.utcDateTime || chart?.localDateTime || '';

  useEffect(() => {
    setPremiumDemoUnlocked(forceUnlocked || readPremiumDemoUnlock());
  }, [chartKey, forceUnlocked]);

  useEffect(() => {
    if (typeof initialInsights === 'number' && Number.isFinite(initialInsights)) {
      setInsightsLeft(Math.max(0, Math.trunc(initialInsights)));
      return;
    }
    setInsightsLeft(teaserMode ? teaserQuestionLimit : forceUnlocked ? 999 : 3);
  }, [chartKey, teaserMode, teaserQuestionLimit, forceUnlocked, initialInsights]);

  useEffect(() => {
    if (!chart) return;
    setMessages([]);
    setInput('');

    let cancelled = false;
    if (!AUTO_GREETING_ENABLED) {
      const lagna = chart?.ascendant || 'your';
      const moon = chart?.moonSign || 'chart';
      setMessages([
        {
          role: 'assistant',
          content: `Your ${lagna}-${moon} chart pattern is active. You can now ask about career timing, emotional cycles, relationships, mental patterns, or life direction.`
        }
      ]);
      setGreetingLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setGreetingLoading(true);

    const userPlan = forceUnlocked || premiumDemoUnlocked ? 'full' : 'free';
    fetch(API_CHAT_V2, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gp-client-fp': getClientFingerprint(),
        'x-gp-demo-premium': forceUnlocked || premiumDemoUnlocked ? 'true' : 'false'
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
          throw new Error(data.message || `Greeting failed (${res.status}). Is the backend on port 3000?`);
        }
        const text =
          typeof data.answer === 'string' && data.answer.trim()
            ? data.answer.trim()
            : 'Your chart is ready. Ask about houses, daśā timing, or career structure.';
        setMessages([{ role: 'assistant', content: text }]);
        if (typeof data.remainingInsights === 'number' && !forceUnlocked && !premiumDemoUnlocked) {
          const remaining = Math.max(0, data.remainingInsights);
          setInsightsLeft(teaserMode ? Math.min(teaserQuestionLimit, remaining) : remaining);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const detail =
            typeof err?.message === 'string' && err.message.trim().length > 0
              ? err.message
              : 'Network error — is the GrahaPath server running on port 3000?';
          setMessages([
            {
              role: 'assistant',
              content: `GrahaPath AI greeting: ${detail}`
            }
          ]);
        }
      })
      .finally(() => {
        if (!cancelled) setGreetingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chartKey, chart]);

  async function sendChat(mode = 'message') {
    const lockedInTeaser = teaserMode && !forceUnlocked && insightsLeft <= 0 && mode !== 'greeting';
    if (lockedInTeaser) {
      onTeaserLock?.();
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
      const res = await fetch(API_CHAT_V2, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gp-client-fp': getClientFingerprint(),
          'x-gp-demo-premium': forceUnlocked || premiumDemoUnlocked ? 'true' : 'false',
          ...(challengeToken ? { 'x-gp-turnstile-token': challengeToken } : {})
        },
        body: JSON.stringify({
          chart,
          message: text,
          userPlan,
          premiumEmail: premiumEmail || undefined,
          conversationHistory: historyForApi,
          surfaceMode: mode === 'daily_transit' ? 'daily_transit' : 'message',
          challengeToken: challengeToken || undefined
        })
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
        setInsightsLeft(Math.max(0, data.remainingInsights));
      } else if (!forceUnlocked && !premiumDemoUnlocked) {
        setInsightsLeft((prev) => (prev > 0 ? prev - 1 : 0));
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
      className="scroll-mt-24 rounded-3xl border border-indigo-400/25 bg-gradient-to-b from-slate-950/85 via-[#0a0812] to-black/95 p-5 shadow-[0_0_0_1px_rgba(99,102,241,0.18),0_26px_70px_rgba(0,0,0,0.55)] sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300/70 sm:tracking-[0.38em]">GrahaPath AI</p>
          <h3 className="mt-1 font-serif text-lg text-cream sm:text-xl">Ask your chart</h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-[11px] text-ivory/45">{teaserMode ? 'Free demo teaser mode' : 'Live Chart Intelligence'}</p>
          <div
            className={`inline-flex items-center gap-1 rounded-full border border-gold/35 bg-white/5 px-3 py-1 text-[11px] font-medium text-gold-100 shadow-sm backdrop-blur-md transition ${
              insightPulse ? 'ring-2 ring-amber-300/60 shadow-[0_0_18px_rgba(251,191,36,0.45)] scale-[1.03]' : ''
            }`}
            onClick={() => (teaserMode ? onTeaserLock?.() : setShowPremiumModal(true))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (teaserMode) onTeaserLock?.();
                else setShowPremiumModal(true);
              }
            }}
          >
            <span aria-hidden>🌟</span>
            <span className="text-[11px] leading-none">
              {`${insightsLeft} Insights Left`}
            </span>
          </div>
        </div>
      </div>

      <div
        className={`${teaserMode ? 'max-h-[min(360px,46vh)]' : 'max-h-[min(500px,58vh)]'} space-y-3 overflow-y-auto pr-1 transition ${
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
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              disabled={sending || greetingLoading}
              className="rounded-full border border-indigo-300/30 bg-indigo-500/10 px-3 py-1 text-[11px] text-indigo-100/85 transition hover:border-indigo-200/50 hover:bg-indigo-500/20 disabled:opacity-45"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about career timing, houses, or dasha…"
            disabled={sending || greetingLoading || (teaserMode && !forceUnlocked && insightsLeft <= 0)}
            className="min-h-[48px] flex-1 rounded-2xl border border-blue-400/30 bg-black/55 px-4 text-sm text-cream outline-none placeholder:text-ivory/35 focus:border-violet-400/55 focus:ring-1 focus:ring-violet-500/35 disabled:opacity-50"
            aria-label="Chat message"
          />
          <button
            type="submit"
            disabled={
              sending ||
              greetingLoading ||
              !input.trim() ||
              (teaserMode && !forceUnlocked && insightsLeft <= 0) ||
              Boolean(challengeState?.required && challengeState.provider === 'turnstile' && !challengeToken)
            }
            className="min-h-[48px] rounded-2xl border border-amber-400/45 bg-gradient-to-r from-amber-900/45 to-violet-900/40 px-6 py-2 text-sm font-medium text-gold transition hover:border-gold/60 disabled:opacity-40 sm:w-auto"
          >
            Send
          </button>
        </div>
      </form>

      {teaserMode && !forceUnlocked && insightsLeft <= 0 && (
        <div className="mt-4 rounded-2xl border border-gold/30 bg-black/55 p-4">
          <p className="text-sm text-gold-100">Your chart has deeper active layers waiting to unlock.</p>
          <button
            type="button"
            onClick={() => onTeaserLock?.()}
            className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-xl border border-gold/60 bg-gold/90 px-4 py-2 text-xs font-semibold text-black transition hover:bg-gold"
          >
            Unlock Full Life Decode
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

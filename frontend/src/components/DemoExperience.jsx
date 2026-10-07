import { motion } from 'framer-motion';
import ChartIdentityStrip from './ChartIdentityStrip';
import KundaliWheel from './KundaliWheel';
import ChartGrahaChat from './ChartGrahaChat';
import { useLanguage } from '../lib/i18n.jsx';
import { rashiNames } from '../data/vedicNames';

const SIGN_ELEMENT = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water'
};

const OUTER_STYLE = {
  en: { fire: 'direct and visible', earth: 'steady and practical', air: 'curious and conversational', water: 'protective and intuitive', other: 'adaptive' },
  ne: { fire: 'प्रत्यक्ष र प्रभावशाली', earth: 'स्थिर र व्यावहारिक', air: 'जिज्ञासु र बोलिचालीमा खुला', water: 'संवेदनशील र अन्तर्ज्ञानी', other: 'लचिलो' }
};

const toDevanagariDigits = (n) => String(n).replace(/\d/g, (d) => '०१२३४५६७८९'[d]);

function signLabel(sign, lang) {
  if (!sign) return '';
  if (lang === 'ne') return rashiNames[sign]?.devanagari || sign;
  return sign;
}

function fallbackCoreInsight(chart, lang) {
  const lagna = chart?.ascendant;
  const moon = chart?.moonSign;
  const moonHouse = chart?.planets?.find((p) => p.name === 'Moon')?.house;
  const style = (OUTER_STYLE[lang] || OUTER_STYLE.en)[SIGN_ELEMENT[lagna] || 'other'];

  if (lang === 'ne') {
    const lagnaText = lagna ? `${signLabel(lagna, lang)} लग्नको` : 'तपाईंको लग्नको';
    const moonText = moon ? `${signLabel(moon, lang)} राशिले` : 'तपाईंको चन्द्र राशिले';
    const houseText = moonHouse ? `चन्द्रमा ${toDevanagariDigits(moonHouse)} औं भावसँग जोडिएकोले` : 'चन्द्रमाको स्थितिले';
    return [
      `तपाईं बाहिरबाट ${lagnaText} कारण ${style} देखिनुहुन्छ, तर भित्री स्वभाव चाहिँ ${moonText} जीवनलाई अझ गहिरोसँग बुझ्छ।`,
      `दैनिक जीवनमा यो यस्तो देखिन सक्छ: बाहिर शान्त रहने, तर भित्र-भित्र के भनियो वा के महसुस भयो भनेर फेरि सोचिरहने।`,
      `भावनात्मक रूपमा कुरा स्पष्ट नभएको बेला यो बानी दोहोरिन्छ, विशेष गरी ${houseText}।`
    ];
  }

  const lagnaText = lagna || 'your ascendant';
  const moonText = moon || 'your Moon';
  return [
    `You tend to appear ${style} through ${lagnaText}, while your internal pattern through ${moonText} processes life more deeply.`,
    'In day-to-day life, this can look like staying composed outside while internally reviewing what was said or felt.',
    `This repeats when emotional certainty is incomplete, especially with Moon linked to house ${moonHouse || 'key social/emotional themes'}.`
  ];
}

export default function DemoExperience({
  chart,
  sessionChatMode = false,
  sessionProfileId = '',
  remainingInsights = null,
  onInsightsChange = null,
  onUnlock = null
}) {
  const { t, lang } = useLanguage();
  const insightParagraphs = fallbackCoreInsight(chart, lang);
  return (
    <div className="flex flex-col gap-8">
      <ChartIdentityStrip chart={chart} forceDeepData />

      <section id="gp-wheel" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gold/10 pb-2">
          <h2 className="text-xs uppercase tracking-[0.32em] text-gold/70">{t('wheel.title')}</h2>
          <p className="text-[11px] text-ivory/42">{t('wheel.hint')}</p>
        </div>
        <KundaliWheel chart={chart} forceDeepData mode="paid" />
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-gold/20 bg-black/25 px-5 py-6 sm:px-7 sm:py-7"
      >
        <h2 className="text-xs uppercase tracking-[0.26em] text-gold/70">{t('snapshot.title')}</h2>
        <div className="mt-4 space-y-3 text-[15px] leading-8 text-cream/85">
          {insightParagraphs.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="mt-5 border-t border-gold/10 pt-4 text-xs leading-6 text-ivory/55">{t('snapshot.note')}</p>
      </motion.section>

      {sessionChatMode ? (
        <>
          <ChartGrahaChat
            chart={chart}
            forceUnlocked
            initialInsights={
              typeof remainingInsights === 'number' && Number.isFinite(remainingInsights)
                ? Math.max(0, Math.trunc(remainingInsights))
                : 55
            }
            sessionChatMode={sessionChatMode}
            sessionProfileId={sessionProfileId}
            onInsightsChange={onInsightsChange}
          />
        </>
      ) : (
        // Free visitors get a real, working chat capped at the backend's own free-message
        // limit (3) instead of a payment-only locked card -- teaserMode already handles the
        // blur + unlock prompt once that limit is hit, it just was never wired in here.
        <ChartGrahaChat chart={chart} teaserMode teaserQuestionLimit={3} onTeaserLock={onUnlock} />
      )}
    </div>
  );
}

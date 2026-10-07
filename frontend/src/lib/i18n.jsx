import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LANG_KEY = 'gp_lang';

// Nepali covers the highest-traffic screens a visitor actually reads before
// paying (hero, birth-details form, chart summary/results). AI-generated
// reading text and deep debug/engineering panels stay English -- translating
// those would mean re-prompting the backend's Gemini/OpenAI calls in Nepali,
// a separate change from this frontend-only pass.
const translations = {
  en: {
    'brand.tagline': 'Your Kundali. Explained Clearly.',
    'brand.subtitle':
      'GrahaPath decodes your planetary alignment to reveal clear life patterns—validating your past, guiding your future, and offering personalized remedies.',
    'nav.explore': 'Explore the experience',
    'nav.unlock': 'Unlock my access',

    'form.eyebrow': 'Birth Details',
    'form.title': 'Enter Your Birth Details',
    'form.subtitle': 'Tap date, time, and city — we calculate your chart, show a short reading, and keep the deeper layers locked until you unlock.',
    'form.name': 'Name',
    'form.namePlaceholder': 'Your name',
    'form.dateType.ad': 'AD (English)',
    'form.dateType.bs': 'BS (Nepali)',
    'form.birthDate': 'Birth Date',
    'form.birthTime': 'Birth Time',
    'form.timeUnknown': 'Time unknown? Use 12:00 PM',
    'form.timeHelper': 'Exact time gives a precise Lagna. If unknown, noon is a workable start.',
    'form.birthPlace': 'Birth Place',
    'form.placePlaceholder': 'City, Country',
    'form.placeHelper': 'Tap a Nepal city, or type any city and pick it from the list.',
    'form.timezoneNote': 'Timezone is auto-calculated from selected coordinates.',
    'form.submit': 'Calculate My Chart',
    'form.alreadyPaid': 'Already paid before?',

    'results.chartCalculated': 'Chart calculated',
    'results.vimshottariNow': 'Vimśottari · now',
    'results.precision': 'Precision',
    'results.lagna': 'Lagna',
    'results.moonRashi': 'Moon Rashi',
    'results.sunRashi': 'Sun Rashi',
    'results.moonNakshatra': 'Moon Nakshatra',
    'results.whyPersonalized': 'Why this is personalized',
    'results.calcDebug': 'Calculation Debug',

    'wheel.title': 'Interactive Kundali Wheel',
    'wheel.hint': 'Tap planets for full placement cards',
    'wheel.ascendant': 'Ascendant',

    'snapshot.title': 'A little about you',
    'snapshot.note': 'This is a short snapshot from your placements. Chat, timing, career, remedies, and the full decode unlock with payment.',

    'chat.title': 'GrahaPath AI',
    'chat.subtitle': 'Ask your chart',
    'chat.placeholder': 'Ask about career, relationships, dasha…',
    'chat.send': 'Send',
    'chat.disclaimer': 'GrahaPath AI can make mistakes. Verify important details.',
    'chat.modeTeaser': 'Free demo teaser mode',
    'chat.modeLive': 'Live Chart Intelligence',
    'chat.insightsLeft': 'Insights Left',
    'chat.sending': 'Sending…',
    'chat.enterHint': 'Enter to send · Shift+Enter for new line',
    'chat.welcome': 'Ask your chart below — career, timing, relationships, houses, or dasha.'
  },
  ne: {
    'brand.tagline': 'तपाईंको कुण्डली। स्पष्ट व्याख्या।',
    'brand.subtitle':
      'ग्रहपथले तपाईंको ग्रह-स्थिति विश्लेषण गरेर जीवनको ढाँचा देखाउँछ — तपाईंको विगत प्रमाणित गर्दै, भविष्यको मार्गदर्शन गर्दै, र व्यक्तिगत उपाय सुझाउँदै।',
    'nav.explore': 'अनुभव हेर्नुहोस्',
    'nav.unlock': 'पहुँच अनलक गर्नुहोस्',

    'form.eyebrow': 'जन्म विवरण',
    'form.title': 'आफ्नो जन्म विवरण भर्नुहोस्',
    'form.subtitle': 'मिति, समय, र स्थान राख्नुहोस् — हामी तपाईंको कुण्डली गणना गर्छौं, छोटो विश्लेषण देखाउँछौं, र थप गहिरो जानकारी अनलक नगरेसम्म बन्द राख्छौं।',
    'form.name': 'नाम',
    'form.namePlaceholder': 'तपाईंको नाम',
    'form.dateType.ad': 'ईस्वी (अंग्रेजी)',
    'form.dateType.bs': 'बिक्रम सम्वत् (नेपाली)',
    'form.birthDate': 'जन्म मिति',
    'form.birthTime': 'जन्म समय',
    'form.timeUnknown': 'समय थाहा छैन? दिउँसो १२:०० प्रयोग गर्नुहोस्',
    'form.timeHelper': 'ठ्याक्कै समयले सटीक लग्न दिन्छ। थाहा नभए, मध्यान्ह एउटा राम्रो सुरुवात हो।',
    'form.birthPlace': 'जन्म स्थान',
    'form.placePlaceholder': 'शहर, देश',
    'form.placeHelper': 'नेपालको कुनै शहर छान्नुहोस्, वा जुनसुकै शहर टाइप गरेर सूचीबाट छान्नुहोस्।',
    'form.timezoneNote': 'छानिएको स्थानको आधारमा समय क्षेत्र स्वतः गणना हुन्छ।',
    'form.submit': 'मेरो कुण्डली गणना गर्नुहोस्',
    'form.alreadyPaid': 'पहिले नै तिरिसक्नुभयो?',

    'results.chartCalculated': 'कुण्डली तयार भयो',
    'results.vimshottariNow': 'विंशोत्तरी · हाल',
    'results.precision': 'सटीकता',
    'results.lagna': 'लग्न',
    'results.moonRashi': 'चन्द्र राशि',
    'results.sunRashi': 'सूर्य राशि',
    'results.moonNakshatra': 'चन्द्र नक्षत्र',
    'results.whyPersonalized': 'यो किन व्यक्तिगत हो',
    'results.calcDebug': 'गणना विवरण',

    'wheel.title': 'अन्तरक्रियात्मक कुण्डली चक्र',
    'wheel.hint': 'पूर्ण विवरणको लागि ग्रहमा थिच्नुहोस्',
    'wheel.ascendant': 'लग्न',

    'snapshot.title': 'तपाईंको बारेमा केही कुरा',
    'snapshot.note': 'यो तपाईंको ग्रह-स्थितिबाट तयार पारिएको छोटो झलक हो। च्याट, समय, करियर, उपाय र पूर्ण व्याख्या भुक्तानी गरेपछि खुल्छ।',

    'chat.title': 'ग्रहपथ एआई',
    'chat.subtitle': 'आफ्नो कुण्डलीलाई सोध्नुहोस्',
    'chat.placeholder': 'करियर, सम्बन्ध, दशा बारे सोध्नुहोस्…',
    'chat.send': 'पठाउनुहोस्',
    'chat.disclaimer': 'ग्रहपथ एआईले गल्ती गर्न सक्छ। महत्त्वपूर्ण कुरा आफैं जाँच गर्नुहोस्।',
    'chat.modeTeaser': 'निःशुल्क डेमो झलक',
    'chat.modeLive': 'प्रत्यक्ष कुण्डली विश्लेषण',
    'chat.insightsLeft': 'इन्साइट बाँकी',
    'chat.sending': 'पठाउँदै…',
    'chat.enterHint': 'पठाउन Enter · नयाँ लाइनका लागि Shift+Enter',
    'chat.welcome': 'तल आफ्नो कुण्डलीलाई सोध्नुहोस् — करियर, समय, सम्बन्ध, भाव वा दशा बारे।'
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(LANG_KEY);
      return stored === 'ne' ? 'ne' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore storage failures (private browsing etc.)
    }
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(next) {
    setLangState(next === 'ne' ? 'ne' : 'en');
  }

  const value = useMemo(() => {
    function t(key) {
      return translations[lang]?.[key] ?? translations.en[key] ?? key;
    }
    return { lang, setLang, t };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}

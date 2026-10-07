import { useEffect, useRef, useState } from 'react';
import { apiFetch, withApiBase } from '../lib/apiBase';
import { useLanguage } from '../lib/i18n.jsx';
import { rashiNames, nakshatraNames } from '../data/vedicNames';

const MILAN_URL = withApiBase('/api/kundali-milan');
const SUGGEST_URL = withApiBase('/api/place-suggestions');

const TEXT = {
  en: {
    back: 'Back',
    eyebrow: 'Kundali Milan',
    title: 'Check marriage compatibility',
    subtitle: 'Enter both birth details. We compare the two Moon placements with the classical 36-point Ashtakoota method.',
    groom: 'Groom',
    bride: 'Bride',
    name: 'Name (optional)',
    dateAd: 'AD (English)',
    dateBs: 'BS (Nepali)',
    birthDate: 'Birth date',
    year: 'Year',
    month: 'Month',
    day: 'Day',
    birthTime: 'Birth time',
    timeUnknown: "I don't know the time (use 12:00 noon)",
    place: 'Birth place',
    placeHint: 'Write city and country, e.g. "Pokhara, Nepal"',
    submit: 'Match the kundalis',
    loading: 'Calculating…',
    fillAll: 'Please fill date, time and place for both people.',
    failed: 'Could not calculate. Please check the details and try again.',
    scoreOf: 'out of 36',
    verdict: {
      excellent: 'Excellent match',
      good: 'Good match',
      average: 'Acceptable match',
      low: 'Needs careful consideration'
    },
    verdictNote: {
      excellent: 'Very high agreement across the eight areas.',
      good: 'Good agreement overall. Small differences are normal.',
      average: 'Workable, but a few areas need understanding and effort.',
      low: 'Several areas do not align. Talk to a trusted astrologer before deciding.'
    },
    breakdown: 'The eight areas',
    doshas: 'Special checks',
    nadiTitle: 'Nadi dosha',
    bhakootTitle: 'Bhakoot dosha',
    none: 'Not present',
    present: 'Present',
    cancelled: 'Present, but classical cancellation applies',
    manglik: 'Mangal (Manglik) check',
    manglikBoth: 'Both are Manglik, which classically balances each other.',
    manglikNone: 'Neither person is Manglik.',
    manglikOne: 'Only one person is Manglik. Many families ask an astrologer about remedies.',
    manglikUnknown: 'Could not be determined.',
    groomIs: 'Groom',
    brideIs: 'Bride',
    yes: 'Manglik',
    no: 'Not Manglik',
    moon: 'Moon',
    pada: 'Pada',
    lagna: 'Lagna',
    disclaimer:
      'This is a guide, not a final verdict. Real matching also considers the whole chart, dashas and family wisdom. Please consult a trusted astrologer for important decisions.',
    again: 'Match another pair',
    kootas: {
      varna: ['Varna', 'Work style and ego'],
      vashya: ['Vashya', 'Mutual attraction and influence'],
      tara: ['Tara', 'Health and shared luck'],
      yoni: ['Yoni', 'Natural and physical harmony'],
      grahaMaitri: ['Graha Maitri', 'Mental closeness and friendship'],
      gana: ['Gana', 'Temperament'],
      bhakoot: ['Bhakoot', 'Love, family and prosperity'],
      nadi: ['Nadi', 'Health and children']
    },
    months: ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra']
  },
  ne: {
    back: 'पछाडि',
    eyebrow: 'कुण्डली मिलान',
    title: 'विवाह मिलान हेर्नुहोस्',
    subtitle: 'दुवैको जन्म विवरण राख्नुहोस्। हामी दुवैको चन्द्र स्थितिलाई परम्परागत ३६ गुणको अष्टकूट विधिले तुलना गर्छौं।',
    groom: 'वर',
    bride: 'वधू',
    name: 'नाम (ऐच्छिक)',
    dateAd: 'ईस्वी (अंग्रेजी)',
    dateBs: 'बिक्रम सम्वत् (नेपाली)',
    birthDate: 'जन्म मिति',
    year: 'साल',
    month: 'महिना',
    day: 'गते',
    birthTime: 'जन्म समय',
    timeUnknown: 'समय थाहा छैन (दिउँसो १२:०० मान्नुहोस्)',
    place: 'जन्म स्थान',
    placeHint: 'शहर र देश लेख्नुहोस्, जस्तै "Pokhara, Nepal"',
    submit: 'कुण्डली मिलाउनुहोस्',
    loading: 'गणना गर्दै…',
    fillAll: 'कृपया दुवैको मिति, समय र स्थान भर्नुहोस्।',
    failed: 'गणना गर्न सकिएन। विवरण जाँचेर फेरि प्रयास गर्नुहोस्।',
    scoreOf: '३६ मध्ये',
    verdict: {
      excellent: 'उत्कृष्ट मिलान',
      good: 'राम्रो मिलान',
      average: 'स्वीकार्य मिलान',
      low: 'ध्यानपूर्वक विचार गर्नुपर्ने'
    },
    verdictNote: {
      excellent: 'आठै क्षेत्रमा धेरै राम्रो तालमेल छ।',
      good: 'समग्रमा राम्रो तालमेल छ। साना भिन्नता सामान्य हुन्।',
      average: 'चल्न सक्छ, तर केही क्षेत्रमा बुझाइ र प्रयास चाहिन्छ।',
      low: 'धेरै क्षेत्रमा मेल खाँदैन। निर्णय गर्नुअघि भरपर्दो ज्योतिषीसँग सल्लाह गर्नुहोस्।'
    },
    breakdown: 'आठ क्षेत्र',
    doshas: 'विशेष जाँच',
    nadiTitle: 'नाडी दोष',
    bhakootTitle: 'भकूट दोष',
    none: 'छैन',
    present: 'छ',
    cancelled: 'छ, तर शास्त्रीय परिहार लागू हुन्छ',
    manglik: 'मंगल (मांगलिक) जाँच',
    manglikBoth: 'दुवै मांगलिक छन्, जसले परम्परागत रूपमा एकअर्कालाई सन्तुलन गर्छ।',
    manglikNone: 'कोही पनि मांगलिक छैनन्।',
    manglikOne: 'एक जना मात्र मांगलिक हुनुहुन्छ। धेरै परिवारले यसमा ज्योतिषीसँग उपाय सोध्छन्।',
    manglikUnknown: 'निर्धारण गर्न सकिएन।',
    groomIs: 'वर',
    brideIs: 'वधू',
    yes: 'मांगलिक',
    no: 'मांगलिक होइन',
    moon: 'चन्द्र',
    pada: 'पद',
    lagna: 'लग्न',
    disclaimer:
      'यो मार्गदर्शन मात्र हो, अन्तिम निर्णय होइन। वास्तविक मिलानमा पूरै कुण्डली, दशा र पारिवारिक अनुभव पनि हेरिन्छ। महत्त्वपूर्ण निर्णयका लागि भरपर्दो ज्योतिषीसँग सल्लाह गर्नुहोस्।',
    again: 'अर्को जोडी मिलाउनुहोस्',
    kootas: {
      varna: ['वर्ण', 'कार्यशैली र अहंकार'],
      vashya: ['वश्य', 'आपसी आकर्षण र प्रभाव'],
      tara: ['तारा', 'स्वास्थ्य र साझा भाग्य'],
      yoni: ['योनि', 'स्वाभाविक र शारीरिक तालमेल'],
      grahaMaitri: ['ग्रह मैत्री', 'मानसिक निकटता र मित्रता'],
      gana: ['गण', 'स्वभाव'],
      bhakoot: ['भकूट', 'प्रेम, परिवार र समृद्धि'],
      nadi: ['नाडी', 'स्वास्थ्य र सन्तान']
    },
    months: ['बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'आश्विन', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र']
  }
};

const QUICK_CITIES = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Biratnagar', 'Birgunj', 'Butwal', 'Dharan'];

function emptyPerson() {
  return {
    name: '',
    dateType: 'AD',
    date: '',
    bs: { year: '', month: '', day: '' },
    time: '',
    timeUnknown: false,
    place: ''
  };
}

function personIsComplete(p) {
  const dateOk = p.dateType === 'AD' ? Boolean(p.date) : Boolean(p.bs.year && p.bs.month && p.bs.day);
  const timeOk = p.timeUnknown || Boolean(p.time);
  return dateOk && timeOk && p.place.trim().length > 1;
}

function toPayload(p, fallbackName) {
  return {
    name: p.name.trim() || fallbackName,
    dateType: p.dateType,
    ...(p.dateType === 'AD'
      ? { date: p.date }
      : { bsDate: { year: Number(p.bs.year), month: Number(p.bs.month), day: Number(p.bs.day) } }),
    ...(p.timeUnknown ? { timeUnknown: true, time: '12:00' } : { time: p.time }),
    place: p.place.trim()
  };
}

const fieldClass =
  'mt-1 w-full min-h-[46px] rounded-xl border border-gold/30 bg-black/45 px-3 py-2 text-base text-ivory outline-none focus:border-gold/60';

function PlaceInput({ value, onChange, tx }) {
  const [suggestions, setSuggestions] = useState([]);
  const listId = useRef(`places-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await apiFetch(`${SUGGEST_URL}?q=${encodeURIComponent(q)}`, { method: 'GET' });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(data?.suggestions)) {
          setSuggestions(data.suggestions.map((s) => s.displayName).filter(Boolean).slice(0, 6));
        }
      } catch {
        // suggestions are optional
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  return (
    <div>
      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK_CITIES.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => onChange(`${city}, Nepal`)}
            className="rounded-full border border-gold/30 px-3 py-1.5 text-xs text-gold transition hover:bg-gold/10"
          >
            {city}
          </button>
        ))}
      </div>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pokhara, Nepal"
        autoComplete="off"
        className={fieldClass}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <p className="mt-1 text-[11px] text-ivory/55">{tx.placeHint}</p>
    </div>
  );
}

function PersonCard({ title, person, onChange, tx }) {
  const set = (patch) => onChange({ ...person, ...patch });
  return (
    <section className="rounded-3xl border border-gold/25 bg-black/30 p-4 sm:p-5">
      <h2 className="font-serif text-xl text-gold">{title}</h2>

      <label className="mt-3 block text-sm text-ivory/80">
        {tx.name}
        <input type="text" value={person.name} onChange={(e) => set({ name: e.target.value })} className={fieldClass} />
      </label>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-ivory/80">{tx.birthDate}</span>
        <div className="inline-flex overflow-hidden rounded-full border border-gold/40 text-xs font-semibold" role="group">
          {['AD', 'BS'].map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={person.dateType === type}
              onClick={() => set({ dateType: type })}
              className={`px-3 py-2 transition ${person.dateType === type ? 'bg-gold-300/30 text-gold-100' : 'text-ivory/70'}`}
            >
              {type === 'AD' ? tx.dateAd : tx.dateBs}
            </button>
          ))}
        </div>
      </div>

      {person.dateType === 'AD' ? (
        <input
          type="date"
          value={person.date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => set({ date: e.target.value })}
          className={fieldClass}
          aria-label={tx.birthDate}
        />
      ) : (
        <div className="mt-1 grid grid-cols-3 gap-2">
          <input
            type="number"
            inputMode="numeric"
            min="1950"
            max="2100"
            placeholder={`${tx.year} (2050)`}
            value={person.bs.year}
            onChange={(e) => set({ bs: { ...person.bs, year: e.target.value } })}
            className={fieldClass}
            aria-label={tx.year}
          />
          <select
            value={person.bs.month}
            onChange={(e) => set({ bs: { ...person.bs, month: e.target.value } })}
            className={fieldClass}
            aria-label={tx.month}
          >
            <option value="">{tx.month}</option>
            {tx.months.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={person.bs.day}
            onChange={(e) => set({ bs: { ...person.bs, day: e.target.value } })}
            className={fieldClass}
            aria-label={tx.day}
          >
            <option value="">{tx.day}</option>
            {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4">
        <span className="text-sm text-ivory/80">{tx.birthTime}</span>
        <input
          type="time"
          value={person.time}
          disabled={person.timeUnknown}
          onChange={(e) => set({ time: e.target.value })}
          className={`${fieldClass} disabled:opacity-50`}
          aria-label={tx.birthTime}
        />
        <label className="mt-2 flex items-center gap-2 text-xs text-ivory/70">
          <input
            type="checkbox"
            className="h-4 w-4 accent-amber-400"
            checked={person.timeUnknown}
            onChange={(e) => set({ timeUnknown: e.target.checked })}
          />
          {tx.timeUnknown}
        </label>
      </div>

      <div className="mt-4">
        <span className="text-sm text-ivory/80">{tx.place}</span>
        <PlaceInput value={person.place} onChange={(place) => set({ place })} tx={tx} />
      </div>
    </section>
  );
}

function ScoreRing({ total, max, label }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, total / max));
  return (
    <div className="relative mx-auto h-40 w-40" role="img" aria-label={`${total} / ${max}`}>
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(185,133,35,0.2)" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#b98523"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-4xl text-gold">{Number.isInteger(total) ? total : total.toFixed(1)}</span>
        <span className="text-xs text-ivory/70">{label}</span>
      </div>
    </div>
  );
}

function localSign(sign, lang) {
  if (lang === 'ne') return rashiNames[sign]?.devanagari || sign;
  return sign;
}

function localNak(nak, lang) {
  if (lang === 'ne') return nakshatraNames[nak] || nak;
  return nak;
}

function PersonSummary({ title, person, tx, lang }) {
  return (
    <div className="rounded-2xl border border-gold/20 bg-black/25 p-3 text-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-gold/70">{title}</p>
      {person.name && person.name !== 'Groom' && person.name !== 'Bride' ? (
        <p className="mt-1 font-semibold text-ivory">{person.name}</p>
      ) : null}
      <p className="mt-1 text-ivory/80">
        {tx.moon}: {localSign(person.moonSign, lang)} · {localNak(person.nakshatra, lang)}
        {person.pada ? ` · ${tx.pada} ${person.pada}` : ''}
      </p>
      <p className="text-ivory/70">
        {tx.lagna}: {localSign(person.lagna, lang)}
      </p>
    </div>
  );
}

function Results({ result, tx, lang, onAgain }) {
  const nadiState = result.doshas.nadi;
  const bhakootState = result.doshas.bhakoot;
  const stateText = (s) => (s === 'none' ? tx.none : s === 'cancelled' ? tx.cancelled : tx.present);
  const stateTone = (s) => (s === 'none' ? 'text-emerald-300' : s === 'cancelled' ? 'text-amber-200' : 'text-red-300');

  const m = result.manglik;
  const manglikText =
    m.status === 'both' ? tx.manglikBoth : m.status === 'none' ? tx.manglikNone : m.status === 'one' ? tx.manglikOne : tx.manglikUnknown;

  return (
    <div className="space-y-5" aria-live="polite">
      <section className="rounded-3xl border border-gold/30 bg-black/30 p-5 text-center">
        <ScoreRing total={result.total} max={result.max} label={tx.scoreOf} />
        <h2 className="mt-3 font-serif text-2xl text-gold">{tx.verdict[result.verdict]}</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ivory/80">{tx.verdictNote[result.verdict]}</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <PersonSummary title={tx.groomIs} person={result.groom} tx={tx} lang={lang} />
        <PersonSummary title={tx.brideIs} person={result.bride} tx={tx} lang={lang} />
      </div>

      <section className="rounded-3xl border border-gold/20 bg-black/25 p-4 sm:p-5">
        <h3 className="text-xs uppercase tracking-[0.22em] text-gold/80">{tx.breakdown}</h3>
        <ul className="mt-3 space-y-3">
          {result.kootas.map((k) => {
            const [name, meaning] = tx.kootas[k.id] || [k.id, ''];
            const pct = k.max ? (k.score / k.max) * 100 : 0;
            return (
              <li key={k.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <span className="text-sm font-semibold text-ivory">{name}</span>
                    <span className="ml-2 text-xs text-ivory/65">{meaning}</span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gold">
                    {Number.isInteger(k.score) ? k.score : k.score.toFixed(1)} / {k.max}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gold/15" aria-hidden="true">
                  <div className="h-full rounded-full bg-gold-400" style={{ width: `${pct}%`, background: '#b98523' }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-3xl border border-gold/20 bg-black/25 p-4 sm:p-5">
        <h3 className="text-xs uppercase tracking-[0.22em] text-gold/80">{tx.doshas}</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ivory/85">{tx.nadiTitle}</dt>
            <dd className={`text-right font-semibold ${stateTone(nadiState)}`}>{stateText(nadiState)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ivory/85">{tx.bhakootTitle}</dt>
            <dd className={`text-right font-semibold ${stateTone(bhakootState)}`}>{stateText(bhakootState)}</dd>
          </div>
          <div className="border-t border-gold/15 pt-2">
            <dt className="text-ivory/85">{tx.manglik}</dt>
            <dd className="mt-1 text-ivory/75">{manglikText}</dd>
            {m.groom.known && m.bride.known ? (
              <p className="mt-1 text-xs text-ivory/60">
                {tx.groomIs}: {m.groom.manglik ? tx.yes : tx.no} · {tx.brideIs}: {m.bride.manglik ? tx.yes : tx.no}
              </p>
            ) : null}
          </div>
        </dl>
      </section>

      <p className="text-xs leading-relaxed text-ivory/60">{tx.disclaimer}</p>

      <button
        type="button"
        onClick={onAgain}
        className="inline-flex min-h-[46px] w-full items-center justify-center rounded-2xl border border-gold/50 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10"
      >
        {tx.again}
      </button>
    </div>
  );
}

export default function KundaliMilanPage({ onBack }) {
  const { lang } = useLanguage();
  const tx = TEXT[lang] || TEXT.en;
  const [groom, setGroom] = useState(emptyPerson);
  const [bride, setBride] = useState(emptyPerson);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const topRef = useRef(null);

  const ready = personIsComplete(groom) && personIsComplete(bride);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!ready) {
      setError(tx.fillAll);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(MILAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groom: toPayload(groom, 'Groom'), bride: toPayload(bride, 'Bride') })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = Array.isArray(data?.details) && data.details.length ? data.details.join(' ') : data?.error;
        setError(detail || tx.failed);
        return;
      }
      setResult(data);
      window.setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch {
      setError(tx.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-clip bg-void text-ivory">
      <div className="relative z-10 mx-auto w-full max-w-[860px] px-4 py-6 sm:px-6 sm:py-8">
        <div ref={topRef} className="scroll-mt-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-gold/30 px-4 py-2 text-sm text-gold transition hover:bg-gold/10"
          >
            ← {tx.back}
          </button>
          <p className="mt-5 text-xs uppercase tracking-[0.3em] text-gold/80">{tx.eyebrow}</p>
          <h1 className="mt-2 font-serif text-2xl text-gold sm:text-4xl">{tx.title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ivory/80">{tx.subtitle}</p>
        </div>

        {result ? (
          <div className="mt-6">
            <Results
              result={result}
              tx={tx}
              lang={lang}
              onAgain={() => {
                setResult(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <PersonCard title={tx.groom} person={groom} onChange={setGroom} tx={tx} />
            <PersonCard title={tx.bride} person={bride} onChange={setBride} tx={tx} />
            {error ? (
              <p role="alert" className="rounded-xl border border-red-400/40 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-gold/70 bg-gold px-4 py-3 text-base font-semibold text-black transition hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? tx.loading : tx.submit}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

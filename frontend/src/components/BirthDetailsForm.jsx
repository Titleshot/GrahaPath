import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch, withApiBase } from '../lib/apiBase';
import { fetchOpenMeteoPlaceSuggestions } from '../lib/openMeteoGeocode';
import { useLanguage } from '../lib/i18n.jsx';

const inputClass =
  'w-full rounded-2xl border border-gold-400/20 bg-black/40 px-4 py-3 text-sm text-ivory-100 outline-none transition placeholder:text-ivory-100/30 focus:border-gold-300/70 focus:ring-2 focus:ring-gold-400/20';
const helperClass = 'text-xs leading-5 text-ivory-100/45';
const labelClass = 'text-xs uppercase tracking-[0.22em] text-ivory-100/50';

const hourOptions = Array.from({ length: 12 }, (_item, index) => String(index + 1).padStart(2, '0'));
const minuteOptions = Array.from({ length: 60 }, (_item, index) => String(index).padStart(2, '0'));
const PLACE_SUGGEST_URL = withApiBase('/api/place-suggestions');

const LIFE_EVENT_TYPES = [
  ['career', 'Career'],
  ['job', 'Job'],
  ['marriage', 'Marriage'],
  ['relationship', 'Relationship'],
  ['breakup', 'Breakup'],
  ['health', 'Health'],
  ['relocation', 'Relocation'],
  ['education', 'Education'],
  ['travel', 'Travel'],
  ['finance', 'Finance'],
  ['loss', 'Loss'],
  ['child', 'Child / family'],
  ['family', 'Family'],
  ['accident', 'Accident / crisis'],
  ['other', 'Other']
];

const IMPACT_OPTIONS = [
  ['', 'Auto'],
  ['major', 'Major'],
  ['high', 'High'],
  ['standard', 'Standard'],
  ['minor', 'Minor'],
  ['micro', 'Micro']
];

const GREG_MONTHS = [
  [1, 'Jan'],
  [2, 'Feb'],
  [3, 'Mar'],
  [4, 'Apr'],
  [5, 'May'],
  [6, 'Jun'],
  [7, 'Jul'],
  [8, 'Aug'],
  [9, 'Sep'],
  [10, 'Oct'],
  [11, 'Nov'],
  [12, 'Dec']
];

const BS_MONTHS = [
  [1, 'Baisakh'],
  [2, 'Jestha'],
  [3, 'Asar'],
  [4, 'Shrawan'],
  [5, 'Bhadra'],
  [6, 'Aswin'],
  [7, 'Kartik'],
  [8, 'Mangsir'],
  [9, 'Poush'],
  [10, 'Magh'],
  [11, 'Falgun'],
  [12, 'Chaitra']
];

const BS_YEARS = Array.from({ length: 2082 - 1990 + 1 }, (_item, index) => String(2082 - index));
const AD_YEARS = Array.from({ length: 2026 - 1900 + 1 }, (_item, index) => String(2026 - index));
const DAY_OPTIONS = Array.from({ length: 31 }, (_item, index) => String(index + 1).padStart(2, '0'));

const NEPAL_PLACE_CHIPS = [
  { displayName: 'Kathmandu, Nepal', latitude: 27.7172, longitude: 85.324 },
  { displayName: 'Lalitpur, Nepal', latitude: 27.6588, longitude: 85.3247 },
  { displayName: 'Bhaktapur, Nepal', latitude: 27.671, longitude: 85.4298 },
  { displayName: 'Pokhara, Nepal', latitude: 28.2096, longitude: 83.9856 },
  { displayName: 'Bharatpur, Nepal', latitude: 27.6706, longitude: 84.4389 },
  { displayName: 'Biratnagar, Nepal', latitude: 26.4525, longitude: 87.2718 },
  { displayName: 'Birgunj, Nepal', latitude: 27.0104, longitude: 84.877 },
  { displayName: 'Butwal, Nepal', latitude: 27.7006, longitude: 83.4482 },
  { displayName: 'Dharan, Nepal', latitude: 26.8145, longitude: 87.2797 },
  { displayName: 'Nepalgunj, Nepal', latitude: 28.05, longitude: 81.6167 }
];

const selectClass = `${inputClass} appearance-none`;

function formatAdDisplay(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);

  return parts.join(' / ');
}

function formatTimeDisplay(value) {
  const normalized = value.toUpperCase().replace(/[^0-9APM]/g, '').slice(0, 6);
  const numeric = normalized.replace(/[APM]/g, '').slice(0, 4);
  const meridiem = normalized.includes('P') ? 'PM' : normalized.includes('A') ? 'AM' : '';
  const timeParts = [numeric.slice(0, 2), numeric.slice(2, 4)].filter(Boolean);

  return `${timeParts.join(' : ')}${meridiem ? ` ${meridiem}` : ''}`;
}

function formatSelectedTime(timeParts) {
  return `${timeParts.hour || 'HH'} : ${timeParts.minute || 'MM'} ${timeParts.meridiem || 'AM/PM'}`;
}

function parseAdDisplay(display) {
  const match = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/.exec(String(display || '').trim());
  if (!match) return { day: '', month: '', year: '' };
  return {
    day: String(match[1]).padStart(2, '0'),
    month: String(match[2]).padStart(2, '0'),
    year: match[3]
  };
}

function toAdDisplay(day, month, year) {
  if (!day || !month || !year) return '';
  return `${String(day).padStart(2, '0')} / ${String(month).padStart(2, '0')} / ${year}`;
}


function BirthDetailsForm({
  formData,
  onChange,
  onSubmit,
  isLoading,
  onLocationSelect,
  onLifeEventsToggle,
  onLifeEventAdd,
  onLifeEventRemove,
  onLifeEventFieldChange,
  demoUsed,
  onRestorePremium
}) {
  const { t } = useLanguage();
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [placeSuggestError, setPlaceSuggestError] = useState('');
  const [isPlaceFocused, setIsPlaceFocused] = useState(false);
  const placeAbortRef = useRef(null);
  const placeCacheRef = useRef(new Map());
  const timeParts = formData.timeParts || { hour: '', minute: '', meridiem: 'AM' };
  const dateType = formData.dateType === 'BS' ? 'BS' : 'AD';
  // Local state, not derived fresh from formData.dateDisplay every render: toAdDisplay
  // returns '' until day/month/year are ALL set, so deriving straight from the parent
  // string would wipe out a partial selection (pick Day, it reverts to blank) the
  // instant you pick just one part.
  const [adParts, setAdParts] = useState(() => parseAdDisplay(formData.dateDisplay));
  useEffect(() => {
    const parsed = parseAdDisplay(formData.dateDisplay);
    if (parsed.day && parsed.month && parsed.year) {
      setAdParts(parsed);
    }
  }, [formData.dateDisplay]);
  const selectedLocation = formData.location || null;
  const lifeEvents = formData.lifeEvents || [];
  const lifeEventsExpanded = Boolean(formData.lifeEventsExpanded);
  // V1: intentionally hide “Significant life events” to reduce onboarding friction.
  const showLifeEvents = false;

  const showSuggestions = isPlaceFocused && placeSuggestions.length > 0;

  const placeHelperText = useMemo(() => {
    if (selectedLocation?.displayName) {
      return `Selected: ${selectedLocation.displayName} (${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)})`;
    }
    if (isSearchingPlaces) {
      return 'Searching places...';
    }
    return t('form.placeHelper');
  }, [isSearchingPlaces, selectedLocation, t]);

  function handleAdDateChange(event) {
    onChange({
      target: {
        name: 'dateDisplay',
        value: formatAdDisplay(event.target.value)
      }
    });
  }

  function handleDateTypeChange(nextType) {
    onChange({
      target: {
        name: 'dateType',
        value: nextType
      }
    });
  }

  function handleAdPartChange(field, value) {
    const next = { ...adParts, [field]: value };
    setAdParts(next);
    onChange({
      target: {
        name: 'dateDisplay',
        value: toAdDisplay(next.day, next.month, next.year)
      }
    });
  }

  function handleBsPartChange(field, value) {
    onChange({
      target: {
        name: `bsDate.${field}`,
        value
      }
    });
  }

  function handleUnknownTime() {
    const nextTimeParts = { hour: '12', minute: '00', meridiem: 'PM' };
    onChange({
      target: {
        name: 'timeParts',
        value: nextTimeParts
      }
    });
    onChange({
      target: {
        name: 'timeDisplay',
        value: formatSelectedTime(nextTimeParts)
      }
    });
  }

  function handleTimeChange(event) {
    onChange({
      target: {
        name: 'timeDisplay',
        value: formatTimeDisplay(event.target.value)
      }
    });
  }

  function handleTimePartChange(field, value) {
    const nextTimeParts = {
      ...timeParts,
      [field]: value
    };

    onChange({
      target: {
        name: 'timeParts',
        value: nextTimeParts
      }
    });

    onChange({
      target: {
        name: 'timeDisplay',
        value: formatSelectedTime(nextTimeParts)
      }
    });
  }

  useEffect(() => {
    const place = (formData.place || '').trim();
    if (place.length < 3) {
      setPlaceSuggestions([]);
      setPlaceSuggestError('');
      setIsSearchingPlaces(false);
      if (placeAbortRef.current) {
        placeAbortRef.current.abort();
      }
      return undefined;
    }

    const timeout = setTimeout(async () => {
      const cacheKey = place.toLowerCase();
      if (placeCacheRef.current.has(cacheKey)) {
        const cached = placeCacheRef.current.get(cacheKey) || [];
        // Do not trust cached empty arrays forever; they can come from transient failures.
        if (cached.length > 0) {
          setPlaceSuggestions(cached);
          setPlaceSuggestError('');
          setIsSearchingPlaces(false);
          return;
        }
      }
      if (placeCacheRef.current.has(cacheKey)) {
        placeCacheRef.current.delete(cacheKey);
      }
      if (placeAbortRef.current) {
        placeAbortRef.current.abort();
      }
      const controller = new AbortController();
      placeAbortRef.current = controller;
      setIsSearchingPlaces(true);
      setPlaceSuggestError('');
      try {
        // Public endpoint — omit cookies so the browser can use a simple CORS GET (avoids production failures).
        const response = await apiFetch(`${PLACE_SUGGEST_URL}?q=${encodeURIComponent(place)}`, {
          signal: controller.signal,
          credentials: 'omit'
        });
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          setPlaceSuggestions([]);
          setPlaceSuggestError(
            import.meta.env.DEV
              ? 'Place search returned HTML instead of JSON — use the Vite dev server (npm run dev in frontend/) so /api is proxied to port 3000.'
              : 'Place search is misconfigured on this deployment (API route returned HTML). Redeploy the frontend with the latest vercel.json API proxy, or set VITE_API_BASE_URL to your Render API URL at build time.'
          );
          return;
        }
        let payload;
        try {
          payload = await response.json();
        } catch (error) {
          payload = { suggestions: [] };
        }
        if (!response.ok) {
          setPlaceSuggestions([]);
          setPlaceSuggestError(
            import.meta.env.DEV
              ? 'Suggestions unavailable — run the API from the repo root (npm run dev) and reload.'
              : 'Place search is temporarily unavailable. Wait a few seconds (the API may be waking up) and try again.'
          );
          return;
        }
        let suggestions = payload.suggestions || [];
        if (suggestions.length === 0 && place.length >= 3) {
          try {
            const openMeteoSuggestions = await fetchOpenMeteoPlaceSuggestions(place, 6, controller.signal);
            if (openMeteoSuggestions.length > 0) {
              suggestions = openMeteoSuggestions;
            }
          } catch (fallbackError) {
            if (fallbackError?.name !== 'AbortError') {
              // keep primary error messaging below
            }
          }
        }
        if (suggestions.length > 0) {
          placeCacheRef.current.set(cacheKey, suggestions);
        }
        setPlaceSuggestions(suggestions);
        setIsSearchingPlaces(false);
        if (suggestions.length === 0 && place.length >= 3) {
          setPlaceSuggestError(
            'No matches yet — try “City, Country” format (e.g. “Pokhara, Nepal”) and select from the list.'
          );
        } else {
          setPlaceSuggestError('');
        }
      } catch (error) {
        if (error?.name === 'AbortError' || (typeof error?.message === 'string' && error.message.includes('aborted'))) {
          return;
        }
        setPlaceSuggestions([]);
        setPlaceSuggestError(
          import.meta.env.DEV
            ? 'Could not reach the API for place search — run backend + frontend dev servers from the repo README.'
            : 'Could not load suggestions. Check your connection, wait if the service just started, then try again.'
        );
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [formData.place]);

  function handlePlaceChange(event) {
    setIsPlaceFocused(true);
    onChange(event);
    onChange({
      target: {
        name: 'location',
        value: null
      }
    });
  }

  function chooseSuggestion(suggestion) {
    onChange({
      target: {
        name: 'place',
        value: suggestion.displayName
      }
    });
    onLocationSelect({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      displayName: suggestion.displayName
    });
    setPlaceSuggestions([]);
    setPlaceSuggestError('');
    setIsPlaceFocused(false);
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      className="glass-panel relative z-50 isolate overflow-visible rounded-[2rem] p-4 shadow-glow sm:p-5 md:p-8"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-gold-300/80 sm:tracking-[0.35em]">{t('form.eyebrow')}</p>
        <h2 className="mt-3 font-serif text-2xl text-ivory-50 sm:text-3xl">{t('form.title')}</h2>
        <p className="mt-3 text-sm leading-6 text-ivory-100/60">{t('form.subtitle')}</p>
      </div>

      <div className="grid gap-4 overflow-visible">
        <label className="space-y-2">
          <span className={labelClass}>{t('form.name')}</span>
          <input
            className={inputClass}
            name="name"
            value={formData.name}
            onChange={onChange}
            placeholder={t('form.namePlaceholder')}
            required
          />
        </label>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={labelClass}>{t('form.birthDate')}</span>
            <div className="inline-flex overflow-hidden rounded-full border border-gold-400/30 bg-black/40">
              {['AD', 'BS'].map((type) => {
                const selected = dateType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleDateTypeChange(type)}
                    className={`px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] ${
                      selected ? 'bg-gold-300/20 text-gold-100' : 'text-ivory-100/55 hover:text-gold-100'
                    }`}
                  >
                    {type === 'AD' ? t('form.dateType.ad') : t('form.dateType.bs')}
                  </button>
                );
              })}
            </div>
          </div>

          {dateType === 'AD' ? (
            // Styled to match the BS dropdowns below rather than the browser's
            // own unstyled native date picker -- toggling AD/BS used to swap
            // between two visually inconsistent controls; both now use the
            // same three gold-dropdown pattern.
            <div className="grid grid-cols-3 gap-2">
              <select
                className={selectClass}
                aria-label="Birth day"
                value={adParts.day}
                onChange={(event) => handleAdPartChange('day', event.target.value)}
                required
              >
                <option value="">Day</option>
                {DAY_OPTIONS.map((day) => (
                  <option key={day} value={day}>
                    {Number(day)}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                aria-label="Birth month"
                value={adParts.month}
                onChange={(event) => handleAdPartChange('month', event.target.value)}
                required
              >
                <option value="">Month</option>
                {GREG_MONTHS.map(([num, label]) => (
                  <option key={num} value={String(num).padStart(2, '0')}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                aria-label="Birth year"
                value={adParts.year}
                onChange={(event) => handleAdPartChange('year', event.target.value)}
                required
              >
                <option value="">Year</option>
                {AD_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <select
                  className={selectClass}
                  aria-label="BS day"
                  value={formData.bsDate?.day ? String(formData.bsDate.day).padStart(2, '0') : ''}
                  onChange={(event) =>
                    handleBsPartChange('day', event.target.value ? String(Number(event.target.value)) : '')
                  }
                  required
                >
                  <option value="">Day</option>
                  {DAY_OPTIONS.map((day) => (
                    <option key={day} value={day}>
                      {Number(day)}
                    </option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  aria-label="BS month"
                  value={String(formData.bsDate?.month || '')}
                  onChange={(event) => handleBsPartChange('month', event.target.value)}
                  required
                >
                  <option value="">Month</option>
                  {BS_MONTHS.map(([num, label]) => (
                    <option key={num} value={String(num)}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  aria-label="BS year"
                  value={String(formData.bsDate?.year || '')}
                  onChange={(event) => handleBsPartChange('year', event.target.value)}
                  required
                >
                  <option value="">Year</option>
                  {BS_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <p className={helperClass}>Bikram Sambat — we convert to English date for the chart.</p>
            </>
          )}
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <span className={labelClass}>{t('form.birthTime')}</span>
            <TimePicker
              timeParts={timeParts}
              onChange={handleTimePartChange}
            />
            <button
              type="button"
              onClick={handleUnknownTime}
              className="text-left text-xs text-gold-200/75 underline-offset-2 hover:text-gold-100 hover:underline"
            >
              {t('form.timeUnknown')}
            </button>
            <p className={helperClass}>{t('form.timeHelper')}</p>
          </div>
        </div>

        <label className="relative z-[120] block space-y-2 overflow-visible">
          <span className={labelClass}>{t('form.birthPlace')}</span>
          <div className="flex flex-wrap gap-1.5">
            {NEPAL_PLACE_CHIPS.map((chip) => {
              const active = selectedLocation?.displayName === chip.displayName;
              return (
                <button
                  key={chip.displayName}
                  type="button"
                  onClick={() => chooseSuggestion(chip)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    active
                      ? 'border-gold-300/70 bg-gold-300/20 text-gold-50'
                      : 'border-gold-400/20 bg-black/30 text-ivory-100/70 hover:border-gold-300/40 hover:text-gold-100'
                  }`}
                >
                  {chip.displayName.replace(', Nepal', '')}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <input
              className={inputClass}
              name="place"
              value={formData.place}
              onChange={handlePlaceChange}
              onFocus={() => setIsPlaceFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsPlaceFocused(false), 120);
              }}
              placeholder={t('form.placePlaceholder')}
              required
              autoComplete="off"
            />
            {showSuggestions && (
              // Was a flat bg-slate-900 box -- a plain Tailwind grey that had
              // nothing to do with the site's violet/gold cosmic palette, so
              // it looked like a foreign browser-default dropdown pasted onto
              // the page. Now built from the same gradient + gold-border
              // language as every other panel (glass-card, form card, etc.).
              <ul className="absolute left-0 top-full z-[9999] isolate mt-2 w-full max-h-60 overflow-y-auto rounded-2xl border border-gold-400/30 bg-gradient-to-b from-[#191527] to-[#0a0813] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                {placeSuggestions.map((suggestion, index) => (
                  <li
                    key={`${suggestion.displayName}-${suggestion.latitude}-${suggestion.longitude}`}
                    className={index > 0 ? 'border-t border-gold-400/10' : ''}
                  >
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        chooseSuggestion(suggestion);
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-ivory-100/80 transition hover:bg-gold-300/12 hover:text-gold-100"
                    >
                      {suggestion.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className={helperClass}>{placeHelperText}</p>
          {placeSuggestError ? (
            <p className="text-xs leading-relaxed text-amber-200/90">{placeSuggestError}</p>
          ) : null}
          <p className="text-xs leading-5 text-gold-200/55">{t('form.timezoneNote')}</p>
        </label>

        {showLifeEvents && (
          <div className="rounded-3xl border border-gold-400/12 bg-black/20 p-4">
            <button
              type="button"
              onClick={onLifeEventsToggle}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className={labelClass}>Significant life events (optional)</span>
              <span className="text-gold-200/70">{lifeEventsExpanded ? '−' : '+'}</span>
            </button>
            <p className={`mt-2 text-xs leading-relaxed text-ivory-100/50 ${lifeEventsExpanded ? '' : 'line-clamp-2'}`}>
              Add milestones as an exact day or approximate month/year. We match them to Vimshottari windows and
              transits for rectification testing and a verification readout. Leave empty for chart-only.
            </p>
            {lifeEventsExpanded && (
              <div className="mt-4 space-y-3">
                {lifeEvents.length === 0 && (
                  <p className="text-xs text-ivory-100/45">No events yet — add one if you want rectification testing.</p>
                )}
                {lifeEvents.map((evt, index) => (
                  <div
                    key={`life-${index}`}
                    className="grid gap-2 rounded-2xl border border-gold-400/12 bg-black/30 p-3 sm:grid-cols-2"
                  >
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-gold-200/45">When (precision)</span>
                      <select
                        className={inputClass}
                        value={evt.datePrecision === 'monthYear' ? 'monthYear' : 'exact'}
                        onChange={(e) => onLifeEventFieldChange(index, 'datePrecision', e.target.value)}
                      >
                        <option value="exact">Exact calendar day</option>
                        <option value="monthYear">Approximate month &amp; year</option>
                      </select>
                    </label>
                    {evt.datePrecision === 'monthYear' ? (
                      <>
                        <label className="space-y-1">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-gold-200/45">Year (AD)</span>
                          <input
                            className={inputClass}
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 2019"
                            value={evt.approxYear ?? ''}
                            onChange={(e) => onLifeEventFieldChange(index, 'approxYear', e.target.value)}
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-gold-200/45">Month</span>
                          <select
                            className={inputClass}
                            value={evt.approxMonth != null && evt.approxMonth !== '' ? String(evt.approxMonth) : ''}
                            onChange={(e) => onLifeEventFieldChange(index, 'approxMonth', e.target.value)}
                          >
                            <option value="">—</option>
                            {GREG_MONTHS.map(([num, label]) => (
                              <option key={num} value={String(num)}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : (
                      <label className="space-y-1 sm:col-span-2">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-gold-200/45">Date</span>
                        <input
                          className={inputClass}
                          type="text"
                          inputMode="numeric"
                          placeholder="YYYY-MM-DD"
                          value={evt.date || ''}
                          onChange={(e) => onLifeEventFieldChange(index, 'date', e.target.value)}
                        />
                      </label>
                    )}
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-gold-200/45">Type</span>
                      <select
                        className={inputClass}
                        value={evt.type || 'other'}
                        onChange={(e) => onLifeEventFieldChange(index, 'type', e.target.value)}
                      >
                        {LIFE_EVENT_TYPES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-gold-200/45">Note (optional)</span>
                      <input
                        className={inputClass}
                        type="text"
                        placeholder="e.g. promotion, wedding weekend trip"
                        value={evt.note || ''}
                        onChange={(e) => onLifeEventFieldChange(index, 'note', e.target.value)}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-gold-200/45">Impact</span>
                      <select
                        className={inputClass}
                        value={evt.impact || ''}
                        onChange={(e) => onLifeEventFieldChange(index, 'impact', e.target.value)}
                      >
                        {IMPACT_OPTIONS.map(([value, label]) => (
                          <option key={value || 'auto'} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-end justify-end sm:col-span-1">
                      <button
                        type="button"
                        onClick={() => onLifeEventRemove(index)}
                        className="rounded-xl border border-red-400/25 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-200/90 hover:bg-red-500/10"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onLifeEventAdd}
                    disabled={lifeEvents.length >= 8}
                    className="rounded-xl border border-gold-300/30 bg-gold-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-100 transition hover:border-gold-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add event
                  </button>
                  <span className="self-center text-[11px] text-ivory-100/40">
                    Max 8 · exact rows send YYYY-MM-DD; approximate sends YYYY-MM
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <motion.button
        whileHover={{ scale: isLoading ? 1 : 1.02 }}
        whileTap={{ scale: isLoading ? 1 : 0.98 }}
        disabled={isLoading}
        className="relative z-0 mt-6 w-full rounded-2xl border border-gold-300/50 bg-gold-gradient px-5 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-black shadow-glow transition sm:tracking-[0.25em] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Calculating...' : t('form.submit')}
      </motion.button>

      {/* Unlock access helper - always visible */}
      <div className="mt-6 rounded-2xl border border-gold/20 bg-black/30 p-4 text-center">
        <p className="text-sm text-gold/80 mb-2">
          {demoUsed ? 'Already paid and unlocked before?' : t('form.alreadyPaid')}
        </p>
        <button
          type="button"
          onClick={onRestorePremium}
          className="mt-2 rounded-full border border-gold/30 bg-black/30 px-4 py-2 text-sm font-medium text-gold transition hover:border-gold/40 hover:bg-black/50"
        >
          {t('nav.unlock')}
        </button>
      </div>
    </motion.form>
  );
}

function TimePicker({ timeParts, onChange }) {
  return (
    <div className="grid w-full gap-2 sm:flex sm:items-center sm:gap-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:flex-1 sm:items-center sm:gap-3">
        <TimeDropdown
          label="Birth hour"
          value={timeParts.hour || '04'}
          options={hourOptions}
          kind="hour"
          onChange={(val) => onChange('hour', val)}
          className="flex-1"
        />

        <span className="text-center text-base font-semibold text-gold-200/70">:</span>

        <TimeDropdown
          label="Birth minute"
          value={timeParts.minute || '30'}
          options={minuteOptions}
          kind="minute"
          onChange={(val) => onChange('minute', val)}
          className="flex-1"
        />
      </div>

      <div className="inline-flex h-11 w-full overflow-hidden rounded-xl border border-gold-400/35 bg-[#020409] shadow-[0_0_18px_rgba(0,0,0,0.88)] sm:w-auto sm:flex-1">
        {['AM', 'PM'].map((meridiem) => {
          const isSelected = (timeParts.meridiem || 'AM') === meridiem;
          return (
            <button
              key={meridiem}
              type="button"
              onClick={() => onChange('meridiem', meridiem)}
              className={`flex-1 px-2 text-xs font-semibold tracking-[0.12em] transition ${
                isSelected
                  ? 'bg-gold-300/20 text-gold-100'
                  : 'text-ivory-100/60 hover:bg-gold-300/10 hover:text-gold-100'
              }`}
            >
              {meridiem}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeDropdown({ label, value, options, onChange, kind, className = '' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    function handleOutsideClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function toggle() {
    setOpen((current) => !current);
  }

  function handleSelect(option) {
    onChange(option);
    setOpen(false);
  }

  function clampValue(raw) {
    if (!raw) return '';
    let num = Number(raw);
    if (Number.isNaN(num)) return '';
    if (kind === 'hour') {
      if (num < 1) num = 1;
      if (num > 12) num = 12;
    } else if (kind === 'minute') {
      if (num < 0) num = 0;
      if (num > 59) num = 59;
    }
    return String(num).padStart(2, '0');
  }

  function handleInputChange(event) {
    const raw = event.target.value.replace(/\D/g, '').slice(0, 2);
    setInputValue(raw);
  }

  function handleInputBlur() {
    const normalized = clampValue(inputValue);
    if (!normalized) {
      setInputValue(value);
      return;
    }
    if (normalized !== value) {
      onChange(normalized);
    }
    setInputValue(normalized);
  }

  return (
    <div ref={rootRef} className={`relative z-[300] min-w-[72px] sm:min-w-[76px] ${className}`}>
      <div className="flex h-11 w-full items-center justify-between rounded-xl border border-gold-400/35 bg-[#020409] px-2 text-sm text-ivory-100 shadow-[0_0_18px_rgba(0,0,0,0.88)] outline-none transition focus-within:border-gold-300/70 focus-within:ring-2 focus-within:ring-gold-400/25">
        <input
          aria-label={label}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className="w-full bg-transparent font-mono text-sm text-ivory-100 outline-none placeholder:text-ivory-100/40"
          placeholder={value}
        />
        <button
          type="button"
          onClick={toggle}
          className="ml-1 px-1 text-[10px] text-gold-200/70 hover:text-gold-100"
          aria-label={`${label} options`}
        >
          ▾
        </button>
      </div>
      {open && (
        <div className="absolute z-[1200] mt-2 w-full rounded-2xl border border-gold-400/45 bg-black shadow-[0_24px_56px_rgba(0,0,0,0.98)]">
          <ul className="max-h-52 overflow-y-auto py-1 text-sm text-ivory-100">
            {options.map((option) => {
              const active = option === value;
              return (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`flex w-full items-center px-3 py-1.5 text-left transition ${
                      active
                        ? 'bg-amber-500/20 text-amber-100'
                        : 'text-ivory-100/90 hover:bg-amber-400/15 hover:text-amber-50'
                    }`}
                  >
                    <span className="font-mono">{option}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default BirthDetailsForm;

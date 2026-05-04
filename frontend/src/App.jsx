import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BirthDetailsForm from './components/BirthDetailsForm';
import KundaliWheel from './components/KundaliWheel';
import LifePatternReport from './components/LifePatternReport';
import LoadingSequence from './components/LoadingSequence';
import PlanetInsightCard from './components/PlanetInsightCard';

const API_URL = '/api/generate-chart';

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
  const [formData, setFormData] = useState({
    name: '',
    dateType: 'AD',
    date: '',
    bsDate: {
      year: '2053',
      month: '12',
      day: '19',
    },
    time: '',
    place: '',
  });
  const [chart, setChart] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    setSelectedPlanet(null);

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
        time: normalizeBirthTime(formData.timeDisplay || ''),
        place: formData.place,
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        throw new Error(data.details?.[0] || data.message || data.error || 'Chart generation failed.');
      }

      setChart(data);
      setSelectedPlanet(data.planets?.[0] || null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-void text-ivory">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.1),transparent_28%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col justify-between gap-4 border-b border-gold/20 pb-6 lg:flex-row lg:items-end"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.55em] text-gold/70">GrahaPath</p>
            <h1 className="mt-3 font-serif text-4xl text-gold sm:text-5xl">
              Premium Kundali Intelligence
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-ivory/65">
            Swiss Ephemeris chart calculation connected to structured planet interpretation for
            visual trust, insight popups, and future remedy workflows.
          </p>
        </motion.header>

        <section className="grid flex-1 gap-6 lg:grid-cols-[390px_1fr]">
          <BirthDetailsForm
            formData={formData}
            onChange={handleFormChange}
            onSubmit={handleGenerateChart}
            isLoading={isLoading}
          />

          <div className="min-h-[560px] rounded-[2rem] border border-gold/20 bg-onyx/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <LoadingSequence key="loading" isLoading={isLoading} />
              ) : chart ? (
                <motion.div
                  key="chart"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="grid h-full gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"
                >
                  <div className="space-y-5">
                    <div className="rounded-3xl border border-gold/15 bg-black/25 p-4">
                      <p className="text-xs uppercase tracking-[0.35em] text-gold/60">
                        Calculated Chart
                      </p>
                      <h2 className="mt-2 font-serif text-2xl text-gold">{chart.name}</h2>
                      <div className="mt-2 grid gap-1 text-sm text-ivory/60">
                        <p>{chart.place} · {chart.localDateTime} · {chart.ayanamsa} Sidereal</p>
                        <p>Birth Date (AD): {chart.birthDateAD}</p>
                        {chart.birthDateBS && <p>Birth Date (BS): {chart.birthDateBS}</p>}
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-ivory/55 sm:grid-cols-2">
                        <span>Birth Date (AD): {chart.birthDateAD}</span>
                        {chart.birthDateBS && <span>Birth Date (BS): {chart.birthDateBS}</span>}
                      </div>
                    </div>

                    <KundaliWheel
                      chart={chart}
                      selectedPlanet={selectedPlanet}
                      onSelectPlanet={setSelectedPlanet}
                    />

                    <LifePatternReport chart={chart} />
                  </div>

                  <PlanetInsightCard planet={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative flex h-full min-h-[520px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-dashed border-gold/20 bg-black/20 p-8 text-center"
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
                    <p className="text-xs uppercase tracking-[0.45em] text-gold/60">
                      Awaiting Birth Details
                    </p>
                    <h2 className="mt-4 font-serif text-3xl text-gold sm:text-4xl">
                      Your Kundali. Calculated, Not Assumed.
                    </h2>
                    <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-ivory/65">
                      Enter your birth details to generate your personalized chart using precise
                      planetary calculations aligned with Vedic principles.
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

                    {error && (
                      <p className="mx-auto mt-5 max-w-md rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                        {error}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </main>
  );
}

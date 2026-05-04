import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BirthDetailsForm from './components/BirthDetailsForm';
import KundaliWheel from './components/KundaliWheel';
import LifePatternReport from './components/LifePatternReport';
import LoadingSequence from './components/LoadingSequence';
import PlanetInsightCard from './components/PlanetInsightCard';

const API_URL = '/api/generate-chart';

export default function App() {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    place: '',
  });
  const [chart, setChart] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  function handleFormChange(event) {
    const { name, value } = event.target;
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
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
                      <p className="mt-1 text-sm text-ivory/60">
                        {chart.place} · {chart.localDateTime} · {chart.ayanamsa} Sidereal
                      </p>
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
                  className="flex h-full min-h-[520px] items-center justify-center rounded-[1.5rem] border border-dashed border-gold/20 bg-black/20 p-8 text-center"
                >
                  <div className="max-w-md">
                    <p className="text-xs uppercase tracking-[0.45em] text-gold/60">
                      Awaiting Birth Details
                    </p>
                    <h2 className="mt-4 font-serif text-3xl text-gold">
                      Your chart wheel will appear here
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-ivory/60">
                      Submit verified birth data to calculate the kundali and unlock clickable
                      planetary interpretations.
                    </p>
                    {error && (
                      <p className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
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

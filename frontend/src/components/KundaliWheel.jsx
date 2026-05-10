import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getRashiParts } from '../data/vedicNames';
import { hasDeepChartData } from '../lib/chartAccess';
import PlanetWheelModal from './PlanetWheelModal';

const HOUSE_LABEL_RADIUS = 128;
const PLANET_RADIUS = 96;
const CENTER = 150;

function polarToCartesian(radius, angleDegrees) {
  const angle = ((angleDegrees - 90) * Math.PI) / 180;

  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle)
  };
}

function houseAngle(house) {
  return (house - 1) * 30 + 15;
}

function planetsForHouse(planets, house) {
  return planets.filter((planet) => planet.house === house);
}

function planetPosition(house, index, total) {
  const spread = total > 1 ? (index - (total - 1) / 2) * 8 : 0;
  return polarToCartesian(PLANET_RADIUS, houseAngle(house) + spread);
}

export default function KundaliWheel({
  chart,
  selectedPlanet: controlledSelected,
  onSelectPlanet,
  forceDeepData = false,
  mode = 'paid'
}) {
  const planets = chart?.planets || [];
  const ascendantParts = getRashiParts(chart.ascendant);
  const isFreeMode = mode === 'free';
  const ephemerisUnlocked = isFreeMode ? false : hasDeepChartData(chart, forceDeepData);
  const [detailPlanet, setDetailPlanet] = useState(null);

  const selectedForHighlight = controlledSelected ?? detailPlanet;

  useEffect(() => {
    if (!ephemerisUnlocked || isFreeMode) {
      setDetailPlanet(null);
    }
  }, [ephemerisUnlocked, isFreeMode]);

  function handlePlanetClick(planet) {
    if (isFreeMode || !ephemerisUnlocked) return;
    setDetailPlanet(planet);
    onSelectPlanet?.(planet);
  }

  function closeModal() {
    setDetailPlanet(null);
  }

  return (
    <motion.div
      className="glass-panel overflow-hidden p-3 sm:p-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <div className="rounded-full border border-gold-400/30 px-4 py-2 text-sm text-gold-100">
          Ascendant: <span className="text-gold-300">{chart.ascendant}</span>
        </div>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[88vw] sm:max-w-[560px]">
        <svg
          viewBox="0 0 300 300"
          className={`h-full w-full drop-shadow-[0_0_24px_rgba(218,165,32,0.2)] transition ${
            isFreeMode ? 'pointer-events-none select-none blur-[3px] saturate-90' : ''
          }`}
        >
          <defs>
            <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f7d774" stopOpacity="0.18" />
              <stop offset="58%" stopColor="#0c0a07" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#050505" stopOpacity="0.96" />
            </radialGradient>
          </defs>

          <circle cx={CENTER} cy={CENTER} r="140" fill="url(#wheelGlow)" stroke="#d4af37" strokeWidth="1.4" />
          <circle cx={CENTER} cy={CENTER} r="102" fill="none" stroke="#8f6f22" strokeWidth="0.7" opacity="0.55" />
          <circle cx={CENTER} cy={CENTER} r="54" fill="none" stroke="#8f6f22" strokeWidth="0.6" opacity="0.35" />

          {Array.from({ length: 12 }, (_item, index) => {
            const angle = index * 30;
            const outer = polarToCartesian(140, angle);
            const inner = polarToCartesian(24, angle);
            const label = polarToCartesian(HOUSE_LABEL_RADIUS, angle + 15);

            return (
              <g key={index + 1}>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#d4af37"
                  strokeWidth="0.65"
                  opacity="0.72"
                />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-gold-200 text-[8px] font-semibold"
                >
                  H{index + 1}
                </text>
              </g>
            );
          })}

          <text x={CENTER} y="132" textAnchor="middle" className="fill-gold-300 text-[8px] uppercase tracking-widest">
            Lagna
          </text>
          <text x={CENTER} y="148" textAnchor="middle" className="fill-cream text-[13px] font-semibold">
            {chart.ascendant}
          </text>
          <text x={CENTER} y="162" textAnchor="middle" className="fill-gold-100 text-[7px]">
            {ascendantParts.vedic} / {ascendantParts.devanagari}
          </text>
          {chart.ascendantDegree != null && chart.ascendantDegree !== '' ? (
            <text x={CENTER} y="174" textAnchor="middle" className="fill-gold-100 text-[7px]" opacity="0.8">
              {chart.ascendantDegree} deg
            </text>
          ) : null}

          {Array.from({ length: 12 }, (_item, index) => {
            const house = index + 1;
            const housePlanets = planetsForHouse(planets, house);

            return housePlanets.map((planet, planetIndex) => {
              const position = planetPosition(house, planetIndex, housePlanets.length);
              const isSelected = selectedForHighlight?.name === planet.name;

              return (
                <g
                  key={planet.name}
                  role="button"
                  tabIndex="0"
                  aria-label={`${planet.name} in house ${planet.house}`}
                  className="cursor-pointer"
                  onClick={() => handlePlanetClick(planet)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handlePlanetClick(planet);
                    }
                  }}
                >
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={isSelected ? 12 : 10}
                    fill={isSelected ? '#d4af37' : '#111111'}
                    stroke="#f7d774"
                    strokeWidth="0.9"
                    opacity={isSelected ? 0.98 : 0.86}
                  />
                  <text
                    x={position.x}
                    y={position.y + 3}
                    textAnchor="middle"
                    className={isSelected ? 'fill-black text-[10px] font-bold' : 'fill-gold-200 text-[10px] font-bold'}
                  >
                    {planet.symbol}
                  </text>
                </g>
              );
            });
          })}
        </svg>
        {isFreeMode ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="max-w-[340px] rounded-2xl border border-gold/30 bg-black/75 px-4 py-4 text-center shadow-xl backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.28em] text-gold/65">Demo chart view</p>
              <p className="mt-2 text-sm leading-relaxed text-cream/90">
                Full interactive chart unlocks with Life Decode.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ivory/70">
                Demo view shows your core chart summary. Full placements unlock after Life Decode.
              </p>
            </div>
          </div>
        ) : !ephemerisUnlocked ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="max-w-[320px] rounded-2xl border border-gold/30 bg-black/75 px-4 py-4 text-center shadow-xl backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.28em] text-gold/65">Premium required</p>
              <p className="mt-2 text-sm leading-relaxed text-cream/90">
                Deep chart view is blurred in free tier. Unlock premium to open full wheel and detailed graha
                interactions.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-center text-xs text-cream/50">
        {isFreeMode
          ? 'Free demo shows Lagna and core rashi identity. Planet-level placement map unlocks in paid mode.'
          : ephemerisUnlocked
          ? 'Tap a planet for a full placement popup — sign, house, nakṣatra, and GrahaPath interpretation.'
          : 'Chart is blurred in free tier. Upgrade to premium to unlock full wheel visibility and planet drill-down.'}
      </p>

      <PlanetWheelModal
        planet={detailPlanet}
        onClose={closeModal}
        ephemerisUnlocked={ephemerisUnlocked}
        basicMode={isFreeMode}
      />
    </motion.div>
  );
}

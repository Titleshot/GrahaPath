import { motion } from 'framer-motion';
import { getRashiParts } from '../data/vedicNames';

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

export default function KundaliWheel({ chart, selectedPlanet, onSelectPlanet }) {
  const planets = chart?.planets || [];
  const ascendantParts = getRashiParts(chart.ascendant);

  return (
    <motion.div
      className="glass-panel p-4 sm:p-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gold-300/70">Interactive kundali</p>
          <h2 className="font-serif text-2xl text-cream">Whole-sign wheel</h2>
        </div>
        <div className="rounded-full border border-gold-400/30 px-4 py-2 text-sm text-gold-100">
          Ascendant: <span className="text-gold-300">{chart.ascendant}</span>
        </div>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[560px]">
        <svg viewBox="0 0 300 300" className="h-full w-full drop-shadow-[0_0_24px_rgba(218,165,32,0.2)]">
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
          <text x={CENTER} y="174" textAnchor="middle" className="fill-gold-100 text-[7px]" opacity="0.8">
            {chart.ascendantDegree} deg
          </text>

          {Array.from({ length: 12 }, (_item, index) => {
            const house = index + 1;
            const housePlanets = planetsForHouse(planets, house);

            return housePlanets.map((planet, planetIndex) => {
              const position = planetPosition(house, planetIndex, housePlanets.length);
              const isSelected = selectedPlanet?.name === planet.name;

              return (
                <g
                  key={planet.name}
                  role="button"
                  tabIndex="0"
                  aria-label={`${planet.name} in house ${planet.house}`}
                  className="cursor-pointer"
                  onClick={() => onSelectPlanet(planet)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectPlanet(planet);
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
      </div>

      <p className="mt-4 text-center text-xs text-cream/50">
        Tap a planet to explore your personal insight. Placements come directly from your calculated chart.
      </p>
    </motion.div>
  );
}

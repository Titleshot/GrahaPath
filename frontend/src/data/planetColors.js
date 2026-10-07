// Traditional Vedic (Navaratna/gemstone) colour associations for each graha --
// not arbitrary decoration, these are the real stone/colour correspondences
// astrology already assigns to each planet, so the wheel reads as authentic
// rather than a random rainbow.
//   Sun     -> Ruby (red-orange)      Moon    -> Pearl (soft white/blue)
//   Mars    -> Red Coral              Mercury -> Emerald (green)
//   Jupiter -> Yellow Sapphire/Topaz  Venus   -> Diamond (rendered as rose/opal)
//   Saturn  -> Blue Sapphire          Rahu    -> Hessonite (smoky violet-grey)
//   Ketu    -> Cat's Eye (brown-maroon)
export const PLANET_COLORS = {
  Sun: { fill: '#e0632a', glow: 'rgba(224, 99, 42, 0.45)', text: '#2a0f06' },
  Moon: { fill: '#dbe4f5', glow: 'rgba(219, 228, 245, 0.45)', text: '#1a2233' },
  Mars: { fill: '#d1382f', glow: 'rgba(209, 56, 47, 0.45)', text: '#2a0806' },
  Mercury: { fill: '#3fae6a', glow: 'rgba(63, 174, 106, 0.45)', text: '#062a15' },
  Jupiter: { fill: '#e8b923', glow: 'rgba(232, 185, 35, 0.5)', text: '#2a2004' },
  Venus: { fill: '#e08fc0', glow: 'rgba(224, 143, 192, 0.45)', text: '#2a0e1e' },
  Saturn: { fill: '#4d6fc7', glow: 'rgba(77, 111, 199, 0.45)', text: '#eef2ff' },
  Rahu: { fill: '#8b7fb8', glow: 'rgba(139, 127, 184, 0.4)', text: '#15101f' },
  Ketu: { fill: '#a06a45', glow: 'rgba(160, 106, 69, 0.4)', text: '#1f1108' }
};

export const DEFAULT_PLANET_COLOR = { fill: '#d4af37', glow: 'rgba(212, 175, 55, 0.4)', text: '#111111' };

export function getPlanetColor(name) {
  return PLANET_COLORS[name] || DEFAULT_PLANET_COLOR;
}

// Classical elemental grouping of the 12 rashi -- used to give the Lagna /
// Moon / Sun rashi cards a colour that means something (same fire/earth/
// air/water split astrology itself already uses) instead of every card
// sharing one flat gold tone.
const ELEMENT_COLORS = {
  fire: { accent: '#e0632a', soft: 'rgba(224, 99, 42, 0.16)' },
  earth: { accent: '#5a9e5a', soft: 'rgba(90, 158, 90, 0.16)' },
  air: { accent: '#5aa9d6', soft: 'rgba(90, 169, 214, 0.16)' },
  water: { accent: '#6a7fd6', soft: 'rgba(106, 127, 214, 0.16)' }
};

const FIRE_SIGNS = new Set(['Aries', 'Leo', 'Sagittarius']);
const EARTH_SIGNS = new Set(['Taurus', 'Virgo', 'Capricorn']);
const AIR_SIGNS = new Set(['Gemini', 'Libra', 'Aquarius']);
const WATER_SIGNS = new Set(['Cancer', 'Scorpio', 'Pisces']);

export function getZodiacElementColor(sign) {
  const name = String(sign || '').trim();
  if (FIRE_SIGNS.has(name)) return ELEMENT_COLORS.fire;
  if (EARTH_SIGNS.has(name)) return ELEMENT_COLORS.earth;
  if (AIR_SIGNS.has(name)) return ELEMENT_COLORS.air;
  if (WATER_SIGNS.has(name)) return ELEMENT_COLORS.water;
  return null;
}

const ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces'
];

const FIRE = new Set(['Aries', 'Leo', 'Sagittarius']);
const EARTH = new Set(['Taurus', 'Virgo', 'Capricorn']);
const AIR = new Set(['Gemini', 'Libra', 'Aquarius']);
const WATER = new Set(['Cancer', 'Scorpio', 'Pisces']);

const CARDINAL = new Set(['Aries', 'Cancer', 'Libra', 'Capricorn']);
const FIXED = new Set(['Taurus', 'Leo', 'Scorpio', 'Aquarius']);
const MUTABLE = new Set(['Gemini', 'Virgo', 'Sagittarius', 'Pisces']);

const EXALTATION = {
  Sun: 'Aries',
  Moon: 'Taurus',
  Mars: 'Capricorn',
  Mercury: 'Virgo',
  Jupiter: 'Cancer',
  Venus: 'Pisces',
  Saturn: 'Libra'
};

const DEBILITATION = {
  Sun: 'Libra',
  Moon: 'Scorpio',
  Mars: 'Cancer',
  Mercury: 'Pisces',
  Jupiter: 'Capricorn',
  Venus: 'Virgo',
  Saturn: 'Aries'
};

const OWN_SIGNS = {
  Sun: ['Leo'],
  Moon: ['Cancer'],
  Mars: ['Aries', 'Scorpio'],
  Mercury: ['Gemini', 'Virgo'],
  Jupiter: ['Sagittarius', 'Pisces'],
  Venus: ['Taurus', 'Libra'],
  Saturn: ['Capricorn', 'Aquarius']
};

/** Simplified classical friendships (sign rulers) for dignity scoring — not exhaustive. */
const FRIEND_SIGNS = {
  Sun: new Set(['Aries', 'Sagittarius', 'Leo', 'Scorpio']),
  Moon: new Set(['Cancer', 'Taurus', 'Gemini', 'Pisces']),
  Mars: new Set(['Aries', 'Scorpio', 'Leo', 'Sagittarius', 'Capricorn']),
  Mercury: new Set(['Gemini', 'Virgo', 'Taurus', 'Capricorn']),
  Jupiter: new Set(['Sagittarius', 'Pisces', 'Cancer', 'Aries', 'Leo']),
  Venus: new Set(['Taurus', 'Libra', 'Capricorn', 'Pisces']),
  Saturn: new Set(['Capricorn', 'Aquarius', 'Libra', 'Virgo', 'Taurus'])
};

const ENEMY_SIGNS = {
  Sun: new Set(['Libra', 'Capricorn']),
  Moon: new Set(['Scorpio', 'Capricorn']),
  Mars: new Set(['Cancer', 'Libra']),
  Mercury: new Set(['Pisces']),
  Jupiter: new Set(['Capricorn', 'Gemini', 'Virgo']),
  Venus: new Set(['Virgo', 'Aries', 'Scorpio']),
  Saturn: new Set(['Aries', 'Cancer', 'Leo'])
};

const SIGN_LORD = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter'
};

const HOUSE_MEANING = {
  1: 'self, body, identity',
  2: 'wealth, speech, family values',
  3: 'courage, effort, communication, siblings',
  4: 'mother, home, emotional security, inner peace',
  5: 'intelligence, creativity, children, romance, past merit',
  6: 'struggle, enemies, debt, service, health discipline',
  7: 'marriage, partnerships, public dealings',
  8: 'transformation, secrecy, sudden events, research',
  9: 'dharma, luck, father, higher learning',
  10: 'career, status, karma, public responsibility',
  11: 'gains, networks, income, ambitions',
  12: 'loss, isolation, foreign lands, sleep, moksha'
};

const NAKSHATRA_NAMES = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati'
];

const VIMSHOTTARI_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

const VIMSHOTTARI_YEARS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17
};

const NAKSHATRA_DEGREE = 360 / 27;

module.exports = {
  ZODIAC_SIGNS,
  FIRE,
  EARTH,
  AIR,
  WATER,
  CARDINAL,
  FIXED,
  MUTABLE,
  EXALTATION,
  DEBILITATION,
  OWN_SIGNS,
  FRIEND_SIGNS,
  ENEMY_SIGNS,
  SIGN_LORD,
  HOUSE_MEANING,
  NAKSHATRA_NAMES,
  VIMSHOTTARI_ORDER,
  VIMSHOTTARI_YEARS,
  NAKSHATRA_DEGREE
};

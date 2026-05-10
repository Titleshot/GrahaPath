/**
 * Structured remedy knowledge base (Navagraha + major doshas).
 * Source phrasing is intentionally human-facing for direct assistant usage.
 */

const remediesDatabase = [
  {
    key: 'Sun',
    planet_or_dosha: 'Sun (Surya)',
    traditional_rituals: [
      'Offer water to the rising Sun from a copper vessel every morning.',
      'Recite Aditya Hridaya Stotra on Sundays.',
      'Take blessings from father or father-like elders.'
    ],
    practical_lifestyle: [
      'Build a disciplined morning routine.',
      'Develop leadership with humility, not ego.',
      'Maintain integrity in authority/government-facing work.'
    ],
    mantra: 'Om Hram Hreem Hroum Sah Suryaya Namah',
    items_to_donate: ['Wheat', 'Jaggery', 'Copper utensils', 'Red cloth']
  },
  {
    key: 'Moon',
    planet_or_dosha: 'Moon (Chandra)',
    traditional_rituals: [
      'Offer raw milk and water to Shiva on Mondays.',
      'Respect and seek blessings from mother before important work.',
      'Observe and pray under the Full Moon.'
    ],
    practical_lifestyle: [
      'Practice 10 minutes of daily meditation for emotional stability.',
      'Journal to reduce overthinking loops.',
      'Hydrate well and keep sleep-time calm.'
    ],
    mantra: 'Om Shram Shreem Shroum Sah Chandraya Namah',
    items_to_donate: ['Rice', 'Milk', 'Silver', 'White cloth']
  },
  {
    key: 'Mars',
    planet_or_dosha: 'Mars (Mangal)',
    traditional_rituals: [
      'Recite Hanuman Chalisa on Tuesdays.',
      'Avoid alcohol and non-veg on Tuesdays.',
      'Offer sindoor and jasmine oil to Hanuman.'
    ],
    practical_lifestyle: [
      'Channel heat via exercise and physical discipline.',
      'Delay reactive decisions when angry.',
      'Use direct but respectful communication.'
    ],
    mantra: 'Om Kram Kreem Kroum Sah Bhaumaya Namah',
    items_to_donate: ['Red lentils', 'Red cloth', 'Jaggery', 'Copper']
  },
  {
    key: 'Mercury',
    planet_or_dosha: 'Mercury (Budha)',
    traditional_rituals: [
      'Worship Ganesha on Wednesdays and offer durva grass.',
      'Feed green fodder to cows.',
      'Honor sisters/aunts and support their wellbeing.'
    ],
    practical_lifestyle: [
      'Improve communication clarity.',
      'Avoid gossip and unnecessary argument.',
      'Keep workspace organized and minimal.'
    ],
    mantra: 'Om Bram Breem Broum Sah Budhaya Namah',
    items_to_donate: ['Green gram', 'Green cloth', 'Educational supplies']
  },
  {
    key: 'Jupiter',
    planet_or_dosha: 'Jupiter (Guru)',
    traditional_rituals: [
      'Worship Vishnu/Ishtha Devata on Thursdays.',
      'Use saffron or turmeric tilak.',
      'Offer water to banana plant on Thursdays.'
    ],
    practical_lifestyle: [
      'Respect teachers/mentors and elders.',
      'Share knowledge without superiority.',
      'Maintain continuous study and ethical growth.'
    ],
    mantra: 'Om Gram Greem Groum Sah Gurave Namah',
    items_to_donate: ['Chana dal', 'Turmeric', 'Yellow cloth', 'Spiritual books']
  },
  {
    key: 'Venus',
    planet_or_dosha: 'Venus (Shukra)',
    traditional_rituals: [
      'Worship Lakshmi or Durga on Fridays.',
      'Keep clothing and personal presentation clean and refined.',
      'Offer sweets to young girls on Fridays.'
    ],
    practical_lifestyle: [
      'Practice respect in relationships.',
      'Balance comfort with responsibility.',
      'Maintain financial discipline and avoid vanity spending.'
    ],
    mantra: 'Om Dram Dreem Droum Sah Shukraya Namah',
    items_to_donate: ['Rice', 'Sugar', 'White sweets', 'Camphor', 'Fragrance items']
  },
  {
    key: 'Saturn',
    planet_or_dosha: 'Saturn (Shani)',
    traditional_rituals: [
      'Offer water to Peepal tree and light mustard-oil lamp on Saturdays.',
      'Recite Shani Chalisa.',
      'Avoid intoxication on Saturdays.'
    ],
    practical_lifestyle: [
      'Respect workers, helpers, and subordinates.',
      'Follow punctuality and structure.',
      'Choose long-term effort over shortcuts.'
    ],
    mantra: 'Om Pram Preem Proum Sah Shanaishcharaya Namah',
    items_to_donate: ['Mustard oil', 'Black sesame', 'Black blanket', 'Iron utensils', 'Footwear to needy']
  },
  {
    key: 'Rahu',
    planet_or_dosha: 'Rahu',
    traditional_rituals: [
      'Worship Shiva or Kalabhairava.',
      'Feed street dogs.',
      'Avoid milk late at night.'
    ],
    practical_lifestyle: [
      'Avoid get-rich-quick temptation.',
      'Reduce screen overuse and digital overstimulation.',
      'Cut toxic social influences.'
    ],
    mantra: 'Om Bhram Bhreem Bhroum Sah Rahave Namah',
    items_to_donate: ['Barley', 'Mustard', 'Support sanitation workers']
  },
  {
    key: 'Ketu',
    planet_or_dosha: 'Ketu',
    traditional_rituals: [
      'Regular Ganesha worship.',
      'Offer temple flag donation where culturally appropriate.',
      'Support and feed street dogs.'
    ],
    practical_lifestyle: [
      'Reduce past-focused overthinking.',
      'Use meditation and breath work for grounding.',
      'Trust intuition while staying practical.'
    ],
    mantra: 'Om Sram Sreem Sroum Sah Ketave Namah',
    items_to_donate: ['Dual-tone blanket', 'Black/white sesame', 'Lime']
  },
  {
    key: 'MangalDosha',
    planet_or_dosha: 'Mangal Dosha',
    traditional_rituals: [
      'Tuesday Hanuman worship and Hanuman Chalisa.',
      'Do culturally valid pre-marriage remedies only with qualified guidance.',
      'Perform Mars pacification rituals where authentic tradition supports it.'
    ],
    practical_lifestyle: [
      'Control ego and anger in relationship decisions.',
      'Prioritize transparent communication before commitment.',
      'Respect partner autonomy and boundaries.'
    ],
    mantra: 'Om Kram Kreem Kroum Sah Bhaumaya Namah',
    items_to_donate: ['Blood donation', 'Red lentils']
  },
  {
    key: 'SadeSati',
    planet_or_dosha: 'Sade Sati',
    traditional_rituals: [
      'Light mustard-oil lamp under Peepal tree on Saturdays.',
      'Recite Hanuman Chalisa or Dasharatha Krita Shani Stotra.',
      'Serve poor, disabled, or vulnerable people.'
    ],
    practical_lifestyle: [
      'Treat Sade Sati as a discipline cycle, not punishment.',
      'Avoid extreme financial risk; use conservative planning.',
      'Stay humble and accountable in public behavior.'
    ],
    mantra: 'Om Sham Shanaishcharaya Namah',
    items_to_donate: ['Black blanket', 'Footwear', 'Mustard oil']
  }
];

const remediesByKey = Object.fromEntries(remediesDatabase.map((entry) => [entry.key, entry]));

module.exports = {
  remediesDatabase,
  remediesByKey
};


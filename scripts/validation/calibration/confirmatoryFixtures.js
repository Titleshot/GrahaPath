/**
 * FINAL CONFIRMATORY set for the two-way GROWTH vs DISRUPTION investigation --
 * genuinely fresh, never used in any prior round (dev-15, holdout1-10, or any
 * calibration experiment). Per the anti-overfitting protocol: touched exactly
 * once, by confirmatoryHoldoutCheck.js, and never used to choose anything.
 *
 * Same provenance caveat as the other fixture files: Rodden Rating AA/A
 * sourced from Astro-Databank (astro.com/astro-databank), confirmed via live
 * browser fetch this round (not memory/cache). One entry (García Márquez)
 * carries an explicit caveat: Astro-Databank's own letter grade for that
 * entry is "B", but the birth time is directly self-quoted in the subject's
 * own published autobiography, which is why it was included here rather than
 * excluded outright -- flagged, not smoothed over.
 *
 * 9 people, spanning Brazil, Czechoslovakia, Poland/Vatican, India, USA,
 * Colombia, Italy, Germany, and French Algeria across motorsport, politics,
 * the papacy, cricket, chemistry, literature, neuroscience, and philosophy --
 * deliberately different spread from both prior sets.
 */

const CAREER_TIMING_CONFIRMATORY_FIXTURES = [
  {
    id: 'senna',
    name: 'Ayrton Senna',
    birth: {
      date: '1960-03-21',
      time: '02:35',
      place: 'São Paulo, Brazil',
      lat: -23.5525,
      lon: -46.6247,
      zone: 'America/Sao_Paulo',
      timeReliability: 'AA (birth certificate)',
      timeSource: "astro.com/astro-databank/Senna,_Ayrton — Marcello Borges quotes the birth certificate as printed in a newspaper two days after Senna's death"
    },
    events: [
      { year: 1984, age: 24, category: 'breakthrough', label: 'F1 debut season; sensational 2nd place at the rain-soaked Monaco GP', source: 'Wikipedia: Ayrton Senna' },
      { year: 1988, age: 28, category: 'leadership', label: 'Won his first Formula One World Championship, with McLaren', source: 'Wikipedia: Ayrton Senna' },
      { year: 1991, age: 31, category: 'expansion', label: 'Won his third World Championship, cementing his dominance', source: 'Wikipedia: Ayrton Senna' },
      { year: 1994, age: 34, category: 'setback', label: 'Died in a crash while leading the San Marino Grand Prix at Imola', source: 'Wikipedia: Ayrton Senna' }
    ]
  },
  {
    id: 'havel',
    name: 'Václav Havel',
    birth: {
      date: '1936-10-05',
      time: '15:00',
      place: 'Prague, Czechoslovakia (Czech Republic)',
      lat: 50.0833,
      lon: 14.4333,
      zone: 'Europe/Prague',
      timeReliability: 'AA (birth certificate/record)',
      timeSource: "astro.com/astro-databank/Havel,_Václav — David Fisher quotes Jaroslav Mixa of Czechoslovakia, 'recorded'"
    },
    events: [
      { year: 1963, age: 27, category: 'breakthrough', label: "Play 'The Garden Party' premieres, becomes a sensation", source: 'Wikipedia: Václav Havel' },
      { year: 1979, age: 42, category: 'setback', label: 'Imprisoned by the Communist government for political dissent', source: 'Wikipedia: Václav Havel' },
      { year: 1989, age: 53, category: 'leadership', label: 'Sworn in as President of Czechoslovakia after the Velvet Revolution', source: 'Wikipedia: Václav Havel' },
      { year: 1993, age: 56, category: 'transition', label: 'Became first President of the independent Czech Republic', source: 'Wikipedia: Václav Havel' }
    ]
  },
  {
    id: 'john_paul_ii',
    name: 'Pope John Paul II (Karol Wojtyła)',
    birth: {
      date: '1920-05-18',
      time: '17:30',
      place: 'Wadowice, Poland',
      lat: 49.8833,
      lon: 19.5,
      zone: 'Europe/Warsaw',
      timeReliability: 'A (direct quote from the subject)',
      timeSource: "astro.com/astro-databank/Pope_John_Paul_II — quoted the Pope replying 'at 17:00 exactly' in private audience; corroborated by a TV quote 'born between 5:00 and 6:00 PM'"
    },
    events: [
      { year: 1958, age: 38, category: 'leadership', label: 'Appointed auxiliary Bishop of Kraków', source: 'Wikipedia: Pope John Paul II' },
      { year: 1967, age: 47, category: 'expansion', label: 'Named Cardinal by Pope Paul VI', source: 'Wikipedia: Pope John Paul II' },
      { year: 1978, age: 58, category: 'breakthrough', label: 'Elected the 264th Pope, first non-Italian pope in 455 years', source: 'Wikipedia: Pope John Paul II' },
      { year: 1981, age: 60, category: 'setback', label: 'Survived an assassination attempt in St. Peter’s Square', source: 'Wikipedia: Pope John Paul II' }
    ]
  },
  {
    id: 'tendulkar',
    name: 'Sachin Tendulkar',
    birth: {
      date: '1973-04-24',
      time: '13:00',
      place: 'Bombay (Mumbai), India',
      lat: 18.9667,
      lon: 72.8333,
      zone: 'Asia/Kolkata',
      timeReliability: 'A (direct quote from delivering physician)',
      timeSource: "astro.com/astro-databank/Tendulkar,_Sachin — delivering physician quoted, 'a healthy baby boy at 1pm exactly' (DNA India, 2013)"
    },
    events: [
      { year: 1989, age: 16, category: 'breakthrough', label: 'Test debut against Pakistan, youngest Indian Test cricketer at the time', source: 'Wikipedia: Sachin Tendulkar' },
      { year: 1996, age: 22, category: 'leadership', label: 'Appointed captain of the Indian national cricket team', source: 'Wikipedia: Sachin Tendulkar' },
      { year: 2011, age: 37, category: 'expansion', label: 'Won the ICC Cricket World Cup with India, his first title', source: 'Wikipedia: Sachin Tendulkar' },
      { year: 2013, age: 40, category: 'transition', label: 'Retired from all forms of international cricket', source: 'Wikipedia: Sachin Tendulkar' }
    ]
  },
  {
    id: 'pauling',
    name: 'Linus Pauling',
    birth: {
      date: '1901-02-28',
      time: '22:00',
      place: 'Portland, Oregon, USA',
      lat: 45.5167,
      lon: -122.6833,
      zone: 'America/Los_Angeles',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Pauling,_Linus — published birth certificate confirmed 10 PM'
    },
    events: [
      { year: 1954, age: 53, category: 'breakthrough', label: 'Nobel Prize in Chemistry for work on the nature of the chemical bond', source: 'Wikipedia: Linus Pauling' },
      { year: 1962, age: 61, category: 'expansion', label: 'Nobel Peace Prize, only person with two unshared Nobel Prizes', source: 'Wikipedia: Linus Pauling' },
      { year: 1973, age: 72, category: 'transition', label: 'Founded the Linus Pauling Institute, shifted to vitamin research', source: 'Wikipedia: Linus Pauling' },
      { year: 1985, age: 84, category: 'setback', label: 'Mayo Clinic trial (NEJM) refuted his vitamin C-cancer claims', source: 'Wikipedia: Linus Pauling' }
    ]
  },
  {
    id: 'garcia_marquez',
    name: 'Gabriel García Márquez',
    birth: {
      date: '1927-03-06',
      time: '09:00',
      place: 'Aracataca, Colombia',
      lat: 10.6,
      lon: -74.2,
      zone: 'America/Bogota',
      timeReliability: "Self-stated in his own autobiography (Astro-Databank's own letter grade for this entry is B, not AA/A -- included here specifically because the time is directly self-quoted by the subject, not a third-party guess; flagged, not smoothed over)",
      timeSource: "García Márquez, 'Living to Tell the Tale' (trans. Grossman, 2003), p.60: born 'at nine in the morning'"
    },
    events: [
      { year: 1955, age: 28, category: 'setback', label: 'Employer newspaper shut down by the Colombian government while he was abroad, left stranded/unemployed', source: 'Wikipedia: Gabriel García Márquez' },
      { year: 1967, age: 40, category: 'breakthrough', label: "Publication of 'One Hundred Years of Solitude', an instant sensation", source: 'Wikipedia: Gabriel García Márquez' },
      { year: 1982, age: 55, category: 'expansion', label: 'Awarded the Nobel Prize in Literature', source: 'Wikipedia: Gabriel García Márquez' },
      { year: 1999, age: 72, category: 'transition', label: "Purchased the newsweekly 'Cambio', becoming a media proprietor", source: 'Astro-Databank biography' }
    ]
  },
  {
    id: 'levi_montalcini',
    name: 'Rita Levi-Montalcini',
    birth: {
      date: '1909-04-22',
      time: '23:00',
      place: 'Turin, Italy',
      lat: 45.05,
      lon: 7.6667,
      zone: 'Europe/Rome',
      timeReliability: 'AA (birth certificate/record)',
      timeSource: "astro.com/astro-databank/Levi-Montalcini,_Rita — collector Gauquelin, 'Quoted BC/BR'"
    },
    events: [
      { year: 1938, age: 29, category: 'setback', label: 'Fascist racial laws barred Jews from academic posts; dismissed, worked in a secret home lab', source: 'Wikipedia: Rita Levi-Montalcini' },
      { year: 1947, age: 38, category: 'transition', label: "Moved to Washington University in St. Louis to join Viktor Hamburger's lab", source: 'Wikipedia: Rita Levi-Montalcini' },
      { year: 1952, age: 43, category: 'breakthrough', label: 'Isolated Nerve Growth Factor (NGF) with Stanley Cohen', source: 'Wikipedia: Rita Levi-Montalcini' },
      { year: 1986, age: 77, category: 'expansion', label: 'Awarded the Nobel Prize in Physiology or Medicine for NGF', source: 'Wikipedia: Rita Levi-Montalcini' }
    ]
  },
  {
    id: 'willy_brandt',
    name: 'Willy Brandt',
    birth: {
      date: '1913-12-18',
      time: '12:45',
      place: 'Lübeck, Germany',
      lat: 53.8667,
      lon: 10.6667,
      zone: 'Europe/Berlin',
      timeReliability: 'AA (birth certificate/record)',
      timeSource: "astro.com/astro-databank/Brandt,_Willy — collector Gauquelin, 'Quoted BC/BR'"
    },
    events: [
      { year: 1957, age: 43, category: 'transition', label: 'Elected Mayor of West Berlin, a post held for nine years', source: 'Wikipedia: Willy Brandt' },
      { year: 1969, age: 55, category: 'leadership', label: 'Became Chancellor of West Germany', source: 'Wikipedia: Willy Brandt' },
      { year: 1971, age: 57, category: 'expansion', label: 'Awarded the Nobel Peace Prize for Ostpolitik reconciliation', source: 'Wikipedia: Willy Brandt' },
      { year: 1974, age: 60, category: 'setback', label: 'Resigned as Chancellor after a spy scandal involving an aide', source: 'Wikipedia: Willy Brandt' }
    ]
  },
  {
    id: 'camus',
    name: 'Albert Camus',
    birth: {
      date: '1913-11-07',
      time: '02:00',
      place: 'Mondovi, French Algeria',
      lat: 35.6667,
      lon: 7.8167,
      zone: 'Africa/Algiers',
      timeReliability: 'AA (birth certificate/record)',
      timeSource: "astro.com/astro-databank/Camus,_Albert — collector Gauquelin, 'Quoted BC/BR'"
    },
    events: [
      { year: 1937, age: 23, category: 'transition', label: 'Published his first book while working as a journalist in Algiers', source: 'Wikipedia: Albert Camus' },
      { year: 1942, age: 28, category: 'breakthrough', label: "Publication of 'The Stranger', establishing international reputation", source: 'Wikipedia: Albert Camus' },
      { year: 1944, age: 30, category: 'leadership', label: "Became editor of the Resistance newspaper 'Combat' in liberated Paris", source: 'Wikipedia: Albert Camus' },
      { year: 1957, age: 43, category: 'expansion', label: 'Awarded the Nobel Prize in Literature, second-youngest recipient in history', source: 'Wikipedia: Albert Camus' }
    ]
  }
];

module.exports = { CAREER_TIMING_CONFIRMATORY_FIXTURES };

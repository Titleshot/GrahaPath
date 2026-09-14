/**
 * HOLDOUT set for Career Timing Calibration v1 -- genuinely independent of
 * the 15-person development set (careerTimingFixtures.js). Per the
 * anti-overfitting protocol: this file must NEVER be used to choose weights,
 * rules, or normalization methods. It is touched exactly once, after all
 * dev-set experiments are complete, to check whether the single chosen
 * candidate (v1a_reducedWeights) generalizes or whether the dev-set
 * improvement was an artifact of fitting these particular 15 people.
 *
 * Same provenance caveat as the dev set: Astro-Databank blocked direct
 * automated fetches during research; ratings/sources were confirmed via
 * search-engine-cached excerpts of those specific pages. Spot-check before
 * treating as final. All 10 people are new relative to the dev set, span
 * 1879-1961 in birth year, and cover the US, UK, India, Germany, Spain,
 * Mexico, and Brazil across science, art, politics, royalty, music, film,
 * and sport -- deliberately broader than the dev set's US/UK-heavy skew.
 * Excluded candidates (Napoleon, Michael Jackson, John Lennon, Nelson
 * Mandela, Carl Jung, Golda Meir, Diego Maradona, Sun Yat-sen, Chiang
 * Kai-shek, Eva Peron, Fidel Castro, Akira Kurosawa, Yasser Arafat,
 * Gorbachev, Tagore) are documented in the research pass for weak/DD/
 * conflicting birth-time reliability.
 */

const CAREER_TIMING_HOLDOUT_FIXTURES = [
  {
    id: 'einstein',
    name: 'Albert Einstein',
    birth: {
      date: '1879-03-14',
      time: '11:30',
      place: 'Ulm, Württemberg, Germany',
      lat: 48.4011,
      lon: 9.9876,
      zone: 'Europe/Berlin',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Einstein,_Albert — Rodden Rating AA, birth certificate from the Einstein Archive'
    },
    events: [
      { year: 1905, age: 26, category: 'breakthrough', label: "Published the four 'Annus Mirabilis' papers", source: 'Wikipedia: Albert Einstein' },
      { year: 1915, age: 36, category: 'expansion', label: 'Completed the general theory of relativity', source: 'Wikipedia: Albert Einstein' },
      { year: 1921, age: 42, category: 'leadership', label: 'Awarded the Nobel Prize in Physics', source: 'Wikipedia: Albert Einstein' },
      { year: 1933, age: 54, category: 'transition', label: 'Fled Nazi Germany, joined the Institute for Advanced Study', source: 'Wikipedia: Albert Einstein' }
    ]
  },
  {
    id: 'picasso',
    name: 'Pablo Picasso',
    birth: {
      date: '1881-10-25',
      time: '23:15',
      place: 'Málaga, Spain',
      lat: 36.7213,
      lon: -4.4213,
      zone: 'Europe/Madrid',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Picasso,_Pablo — Rodden Rating AA'
    },
    events: [
      { year: 1901, age: 19, category: 'transition', label: "Begins the 'Blue Period' after Casagemas's suicide", source: 'Wikipedia: Pablo Picasso' },
      { year: 1907, age: 25, category: 'breakthrough', label: "Painted 'Les Demoiselles d'Avignon', launching Cubism", source: 'Wikipedia: Pablo Picasso' },
      { year: 1937, age: 55, category: 'expansion', label: "Painted 'Guernica', greatly expanding his global stature", source: 'Wikipedia: Pablo Picasso' }
    ]
  },
  {
    id: 'nehru',
    name: 'Jawaharlal Nehru',
    birth: {
      date: '1889-11-14',
      time: '23:30',
      place: 'Allahabad (Prayagraj), India',
      lat: 25.4358,
      lon: 81.8463,
      zone: 'Asia/Kolkata',
      timeReliability: 'A (direct/biographical quote, to-the-minute family record)',
      timeSource: "astro.com/astro-databank/Nehru,_Jawaharlal — Rodden Rating A; biography quotes 11:30 PM (astro.com chart lists 23:36 LMT)"
    },
    events: [
      { year: 1929, age: 40, category: 'leadership', label: 'Elected President of the Indian National Congress (Purna Swaraj)', source: 'Wikipedia: Jawaharlal Nehru' },
      { year: 1947, age: 57, category: 'breakthrough', label: "Became independent India's first Prime Minister", source: 'Wikipedia: Jawaharlal Nehru' },
      { year: 1962, age: 72, category: 'setback', label: 'Sino-Indian War defeat, a major political setback', source: 'Wikipedia: Jawaharlal Nehru' }
    ]
  },
  {
    id: 'thatcher',
    name: 'Margaret Thatcher',
    birth: {
      date: '1925-10-13',
      time: '09:00',
      place: 'Grantham, Lincolnshire, England, UK',
      lat: 52.9092,
      lon: -0.6396,
      zone: 'Europe/London',
      timeReliability: 'A (reliable direct source, not birth certificate)',
      timeSource: 'astro.com/astro-databank/Thatcher,_Margaret — Rodden Rating A'
    },
    events: [
      { year: 1975, age: 49, category: 'breakthrough', label: 'Elected leader of the Conservative Party', source: 'Wikipedia: Margaret Thatcher' },
      { year: 1979, age: 53, category: 'leadership', label: 'Became Prime Minister of the United Kingdom', source: 'Wikipedia: Margaret Thatcher' },
      { year: 1982, age: 56, category: 'expansion', label: 'Falklands War victory boosted her political standing', source: 'Wikipedia: Margaret Thatcher' },
      { year: 1990, age: 65, category: 'setback', label: 'Resigned as PM following a leadership challenge', source: 'Wikipedia: Margaret Thatcher' }
    ]
  },
  {
    id: 'monroe',
    name: 'Marilyn Monroe',
    birth: {
      date: '1926-06-01',
      time: '09:30',
      place: 'Los Angeles, California, USA',
      lat: 34.0522,
      lon: -118.2437,
      zone: 'America/Los_Angeles',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Monroe,_Marilyn — Rodden Rating AA, recorded at Los Angeles General Hospital'
    },
    events: [
      { year: 1953, age: 27, category: 'breakthrough', label: "Starred in 'Niagara' and 'Gentlemen Prefer Blondes'", source: 'Wikipedia: Marilyn Monroe' },
      { year: 1955, age: 28, category: 'transition', label: 'Founded Marilyn Monroe Productions, moved to study at the Actors Studio', source: 'Wikipedia: Marilyn Monroe' },
      { year: 1959, age: 32, category: 'expansion', label: "'Some Like It Hot' a critical/commercial hit, wins Golden Globe", source: 'Wikipedia: Marilyn Monroe' },
      { year: 1962, age: 36, category: 'setback', label: "Fired by 20th Century-Fox from 'Something's Got to Give'", source: 'Wikipedia: Marilyn Monroe' }
    ]
  },
  {
    id: 'grace_kelly',
    name: 'Grace Kelly',
    birth: {
      date: '1929-11-12',
      time: '05:31',
      place: 'Philadelphia, Pennsylvania, USA',
      lat: 39.9526,
      lon: -75.1652,
      zone: 'America/New_York',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Kelly,_Grace — Rodden Rating AA'
    },
    events: [
      { year: 1955, age: 25, category: 'breakthrough', label: "Won Best Actress Oscar for 'The Country Girl'", source: 'Wikipedia: Grace Kelly' },
      { year: 1956, age: 26, category: 'transition', label: 'Retired from acting, married Prince Rainier III of Monaco', source: 'Wikipedia: Grace Kelly' }
    ]
  },
  {
    id: 'prince',
    name: 'Prince (Prince Rogers Nelson)',
    birth: {
      date: '1958-06-07',
      time: '18:17',
      place: 'Minneapolis, Minnesota, USA',
      lat: 44.9778,
      lon: -93.265,
      zone: 'America/Chicago',
      timeReliability: 'AA (birth record)',
      timeSource: 'astro.com/astro-databank/Prince_(musician) — Rodden Rating AA'
    },
    events: [
      { year: 1984, age: 26, category: 'breakthrough', label: "'Purple Rain' album/film become a massive global hit", source: 'Wikipedia: Prince (musician)' },
      { year: 1993, age: 35, category: 'restructuring', label: 'Changed his name to a symbol amid a Warner Bros. contract dispute', source: 'Wikipedia: Prince (musician)' },
      { year: 2004, age: 45, category: 'expansion', label: "Rock and Roll Hall of Fame induction and 'Musicology' resurgence", source: 'Wikipedia: Prince (musician)' }
    ]
  },
  {
    id: 'diana',
    name: 'Diana, Princess of Wales',
    birth: {
      date: '1961-07-01',
      time: '19:45',
      place: 'Sandringham, Norfolk, England, UK',
      lat: 52.8305,
      lon: 0.5077,
      zone: 'Europe/London',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Wales,_Diana_Princess_of — Rodden Rating AA'
    },
    events: [
      { year: 1981, age: 20, category: 'transition', label: 'Married Prince Charles, became Princess of Wales', source: 'Wikipedia: Diana, Princess of Wales' },
      { year: 1987, age: 25, category: 'leadership', label: 'Public HIV/AIDS handshake, became a leading humanitarian voice', source: 'Wikipedia: Diana, Princess of Wales' },
      { year: 1996, age: 35, category: 'setback', label: 'Divorce from Prince Charles finalized', source: 'Wikipedia: Diana, Princess of Wales' }
    ]
  },
  {
    id: 'frida_kahlo',
    name: 'Frida Kahlo',
    birth: {
      date: '1907-07-06',
      time: '08:30',
      place: 'Mexico City (Coyoacán), Mexico',
      lat: 19.4326,
      lon: -99.1332,
      zone: 'America/Mexico_City',
      timeReliability: 'AA (birth registry entry)',
      timeSource: 'astro.com/astro-databank/Kahlo,_Frida — Rodden Rating AA, Distrito Federal archive registry entry'
    },
    events: [
      { year: 1925, age: 18, category: 'transition', label: 'Severely injured in a bus accident, turning her toward painting', source: 'Wikipedia: Frida Kahlo' },
      { year: 1938, age: 31, category: 'breakthrough', label: 'First solo exhibition, Julien Levy Gallery, New York', source: 'Wikipedia: Frida Kahlo' },
      { year: 1939, age: 31, category: 'expansion', label: "Exhibited in Paris; Louvre acquires 'The Frame'", source: 'Wikipedia: Frida Kahlo' }
    ]
  },
  {
    id: 'pele',
    name: 'Pelé (Edson Arantes do Nascimento)',
    birth: {
      date: '1940-10-21',
      time: '03:00',
      place: 'Três Corações, Minas Gerais, Brazil',
      lat: -21.7,
      lon: -45.25,
      zone: 'America/Sao_Paulo',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Pele — Rodden Rating AA'
    },
    events: [
      { year: 1958, age: 17, category: 'breakthrough', label: 'Won the FIFA World Cup with Brazil, scoring twice in the final', source: 'Wikipedia: Pelé' },
      { year: 1970, age: 29, category: 'expansion', label: 'Won a third World Cup with Brazil', source: 'Wikipedia: Pelé' },
      { year: 1975, age: 34, category: 'transition', label: 'Came out of retirement to sign with the New York Cosmos', source: 'Wikipedia: Pelé' }
    ]
  }
];

module.exports = { CAREER_TIMING_HOLDOUT_FIXTURES };

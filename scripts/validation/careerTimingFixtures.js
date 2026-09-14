/**
 * Blind validation fixtures for the career-timing engine.
 *
 * IMPORTANT: none of this file's `events` data is ever passed into chart
 * generation or the astrology engine (services/dasha/*). Only the `birth`
 * fields are used to build the chart the engine sees; `events` exist purely
 * so the VALIDATION RUNNER (outside the engine) can compare predictions
 * against known outcomes afterward. See careerTimingValidationRunner.js's
 * buildChartFromFixture(), which reads ONLY fixture.birth.
 *
 * Fixture shape:
 * {
 *   id: string,                 // stable short id for reports
 *   name: string,                // for report readability only
 *   birth: {
 *     date: 'YYYY-MM-DD',
 *     time: 'HH:MM',            // 24h local time
 *     place: 'City, Region, Country',
 *     lat: number, lon: number,
 *     zone: 'IANA/Timezone',
 *     timeReliability: string,   // Rodden Rating or equivalent, as sourced
 *     timeSource: string         // citation
 *   },
 *   events: [
 *     { year: number, age: number, category: 'breakthrough'|'setback'|'transition'|'expansion'|'leadership'|'restructuring', label: string, source: string }
 *   ]
 * }
 *
 * DATA PROVENANCE / METHODOLOGY NOTE (read before treating results as final):
 * This 15-person set was compiled by a research pass against Astro-Databank
 * (astro.com/astro-databank) for Rodden Rating AA/A birth data and Wikipedia
 * for career-event years. Astro-Databank's own pages blocked direct automated
 * fetches during that research, so ratings/sources below were confirmed via
 * search-engine-cached excerpts of those specific pages (the cited page name
 * is given per person) rather than a live render -- spot-check a few against
 * the live astro.com pages before treating this as fully final ground truth.
 * Two entries carry an extra caveat noted inline: Elvis Presley's AA rating
 * rests on the attending doctor's medical log (the family's own birth
 * certificate is believed lost), and Michael Jordan's AA-rated birth-
 * certificate time has been contradicted by a later, secondhand informal
 * anecdote. Both still meet the AA bar per Astro-Databank's own rating.
 * Candidates researched and explicitly EXCLUDED for weak/DD/rectified birth
 * times: Michael Jackson, Nelson Mandela, Stephen Hawking, Freddie Mercury,
 * Diego Maradona, Princess Diana, Martin Luther King Jr., David Bowie, Bill
 * Gates (kept in reserve, not included here).
 */

const CAREER_TIMING_VALIDATION_FIXTURES = [
  {
    id: 'obama',
    name: 'Barack Obama',
    birth: {
      date: '1961-08-04',
      time: '19:24',
      place: 'Honolulu, Hawaii, USA',
      lat: 21.3069,
      lon: -157.8583,
      zone: 'Pacific/Honolulu',
      timeReliability: 'AA (birth certificate)',
      timeSource:
        'astro.com/astro-databank/Obama,_Barack — copy of birth certificate published June 2008, confirmed by campaign spokesman Ben LaBolt; Rodden Rating changed to AA June 2008.'
    },
    events: [
      { year: 2004, age: 42, category: 'breakthrough', label: 'DNC keynote address brings national prominence; wins US Senate seat', source: 'Wikipedia: Barack Obama' },
      { year: 2008, age: 47, category: 'leadership', label: 'Elected 44th President of the United States', source: 'Wikipedia: Barack Obama' },
      { year: 2010, age: 49, category: 'setback', label: "Democrats lose control of the House in a midterm 'shellacking'", source: 'Wikipedia: Barack Obama; 2010 US House elections' },
      { year: 2012, age: 51, category: 'expansion', label: 'Re-elected to a second presidential term', source: 'Wikipedia: Barack Obama' }
    ]
  },
  {
    id: 'clinton',
    name: 'Bill Clinton',
    birth: {
      date: '1946-08-19',
      time: '08:51',
      place: 'Hope, Arkansas, USA',
      lat: 33.6668,
      lon: -93.5916,
      zone: 'America/Chicago',
      timeReliability: 'A (direct quote / reliable source)',
      timeSource: 'astro.com/astro-databank/Clinton,_Bill — Rodden Rating A'
    },
    events: [
      { year: 1978, age: 32, category: 'breakthrough', label: 'Elected Governor of Arkansas, youngest governor in the nation at the time', source: 'Wikipedia: Bill Clinton' },
      { year: 1980, age: 34, category: 'setback', label: 'Loses re-election bid for Governor of Arkansas', source: 'Wikipedia: Bill Clinton' },
      { year: 1992, age: 46, category: 'leadership', label: 'Elected 42nd President of the United States', source: 'Wikipedia: Bill Clinton' },
      { year: 1998, age: 52, category: 'setback', label: 'Impeached by the House following the Lewinsky scandal', source: 'Wikipedia: Bill Clinton' }
    ]
  },
  {
    id: 'indira_gandhi',
    name: 'Indira Gandhi',
    birth: {
      date: '1917-11-19',
      time: '23:11',
      place: 'Allahabad, Uttar Pradesh, India',
      lat: 25.4358,
      lon: 81.8463,
      zone: 'Asia/Kolkata',
      timeReliability: 'A (direct quote / biography)',
      timeSource:
        "astro.com/astro-databank/Gandhi,_Indira — Rodden Rating A; corroborated by Katherine Frank's biography citing 'about 11pm'"
    },
    events: [
      { year: 1966, age: 48, category: 'leadership', label: 'Becomes Prime Minister of India', source: 'Wikipedia: Indira Gandhi' },
      { year: 1975, age: 57, category: 'restructuring', label: 'Declares the Emergency, ruling by decree', source: 'Wikipedia: Indira Gandhi' },
      { year: 1977, age: 59, category: 'setback', label: 'Congress party defeated; she loses her own parliamentary seat', source: 'Wikipedia: Indira Gandhi' },
      { year: 1980, age: 62, category: 'transition', label: 'Returns to power as Prime Minister', source: 'Wikipedia: Indira Gandhi' }
    ]
  },
  {
    id: 'elizabeth_ii',
    name: 'Elizabeth II',
    birth: {
      date: '1926-04-21',
      time: '02:40',
      place: 'Mayfair, London, England, UK',
      lat: 51.5099,
      lon: -0.1479,
      zone: 'Europe/London',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Elizabeth_II,_Queen_of_England — Rodden Rating AA'
    },
    events: [
      { year: 1952, age: 25, category: 'leadership', label: 'Accedes to the British throne', source: 'Wikipedia: Elizabeth II' },
      { year: 1953, age: 27, category: 'expansion', label: 'Formal Coronation at Westminster Abbey', source: 'Wikipedia: Elizabeth II' },
      { year: 1977, age: 51, category: 'expansion', label: 'Silver Jubilee marking 25 years as monarch', source: 'Wikipedia: Elizabeth II' },
      { year: 1992, age: 66, category: 'setback', label: "'Annus horribilis' — Windsor fire and family marital breakdowns", source: 'Wikipedia: Elizabeth II' }
    ]
  },
  {
    id: 'oprah',
    name: 'Oprah Winfrey',
    birth: {
      date: '1954-01-29',
      time: '04:30',
      place: 'Kosciusko, Mississippi, USA',
      lat: 33.0585,
      lon: -89.5876,
      zone: 'America/Chicago',
      timeReliability: 'A (direct quote / reliable source)',
      timeSource: 'astro.com/astro-databank/Winfrey,_Oprah — Rodden Rating A'
    },
    events: [
      { year: 1986, age: 32, category: 'breakthrough', label: 'The Oprah Winfrey Show goes into national syndication', source: 'Wikipedia: Oprah Winfrey' },
      { year: 2003, age: 49, category: 'expansion', label: "First Black woman on Forbes' billionaires list", source: 'Wikipedia: Oprah Winfrey' },
      { year: 2011, age: 56, category: 'transition', label: 'Ends her talk show and launches OWN', source: 'Wikipedia: Oprah Winfrey' }
    ]
  },
  {
    id: 'buffett',
    name: 'Warren Buffett',
    birth: {
      date: '1930-08-30',
      time: '15:00',
      place: 'Omaha, Nebraska, USA',
      lat: 41.2565,
      lon: -95.9345,
      zone: 'America/Chicago',
      timeReliability: 'A (direct quote from subject, via friend)',
      timeSource: 'astro.com/astro-databank/Buffett,_Warren_E. — Rodden Rating A'
    },
    events: [
      { year: 1956, age: 25, category: 'breakthrough', label: 'Forms Buffett Partnership Ltd, his first investment partnership', source: 'Wikipedia: Warren Buffett' },
      { year: 1965, age: 34, category: 'leadership', label: 'Takes formal control of Berkshire Hathaway', source: 'Wikipedia: Warren Buffett; Britannica' },
      { year: 1969, age: 38, category: 'restructuring', label: 'Dissolves Buffett Partnership Ltd to focus on Berkshire Hathaway', source: 'Wikipedia: Warren Buffett' },
      { year: 2008, age: 77, category: 'expansion', label: "Ranked world's richest person by Forbes", source: 'Wikipedia: Warren Buffett' }
    ]
  },
  {
    id: 'jobs',
    name: 'Steve Jobs',
    birth: {
      date: '1955-02-24',
      time: '19:15',
      place: 'San Francisco, California, USA',
      lat: 37.7749,
      lon: -122.4194,
      zone: 'America/Los_Angeles',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Jobs,_Steve — Rodden Rating AA'
    },
    events: [
      { year: 1976, age: 21, category: 'breakthrough', label: 'Co-founds Apple Computer with Steve Wozniak', source: 'Wikipedia: Steve Jobs' },
      { year: 1985, age: 30, category: 'setback', label: 'Forced out of Apple after internal power struggle', source: 'Wikipedia: Steve Jobs' },
      { year: 1997, age: 42, category: 'transition', label: 'Returns to Apple as CEO after NeXT acquisition', source: 'Wikipedia: Steve Jobs' },
      { year: 2007, age: 52, category: 'expansion', label: "Launches the iPhone, reshaping Apple's business", source: 'Wikipedia: Steve Jobs' }
    ]
  },
  {
    id: 'branson',
    name: 'Richard Branson',
    birth: {
      date: '1950-07-18',
      time: '07:00',
      place: 'Blackheath, London, England, UK',
      lat: 51.4649,
      lon: 0.0089,
      zone: 'Europe/London',
      timeReliability: 'A (contemporary newspaper birth notice)',
      timeSource: 'astro.com/astro-databank/Branson,_Richard — Rodden Rating A; corroborated by a Times birth announcement (19 Jul 1950)'
    },
    events: [
      { year: 1972, age: 21, category: 'breakthrough', label: 'Founds Virgin Records', source: 'Wikipedia: Richard Branson' },
      { year: 1984, age: 33, category: 'expansion', label: 'Launches Virgin Atlantic Airways', source: 'Wikipedia: Richard Branson' },
      { year: 2004, age: 54, category: 'transition', label: 'Founds Virgin Galactic', source: 'Wikipedia: Richard Branson' },
      { year: 2021, age: 70, category: 'expansion', label: "Flies to space aboard Virgin Galactic's Unity 22", source: 'Wikipedia: Richard Branson; Space.com' }
    ]
  },
  {
    id: 'elvis',
    name: 'Elvis Presley',
    birth: {
      date: '1935-01-08',
      time: '04:35',
      place: 'Tupelo, Mississippi, USA',
      lat: 34.2576,
      lon: -88.7034,
      zone: 'America/Chicago',
      timeReliability: "AA (doctor's medical log) -- CAVEAT: family's own birth certificate is believed lost; a 1972 anecdote has Elvis stating 3:30am, but the AA rating rests on the attending doctor's record",
      timeSource: "astro.com/astro-databank/Presley,_Elvis — Rodden Rating AA, sourced to attending doctor's log"
    },
    events: [
      { year: 1956, age: 21, category: 'breakthrough', label: '"Heartbreak Hotel" hits #1 and Ed Sullivan Show appearance', source: 'Wikipedia: Elvis Presley' },
      { year: 1958, age: 23, category: 'transition', label: 'Drafted into the U.S. Army, pausing his career', source: 'Wikipedia: Elvis Presley' },
      { year: 1968, age: 33, category: 'transition', label: "The '68 Comeback Special revives his career", source: 'Wikipedia: Elvis Presley' },
      { year: 1969, age: 34, category: 'expansion', label: 'Begins Las Vegas concert residency', source: 'Wikipedia: Elvis Presley' }
    ]
  },
  {
    id: 'madonna',
    name: 'Madonna',
    birth: {
      date: '1958-08-16',
      time: '07:05',
      place: 'Bay City, Michigan, USA',
      lat: 43.5945,
      lon: -83.8889,
      zone: 'America/Detroit',
      timeReliability: 'A (hospital record via researcher)',
      timeSource: "astro.com/astro-databank/Madonna — Rodden Rating A, sourced to mother's hospital record via researcher Margaret M. Carter"
    },
    events: [
      { year: 1984, age: 26, category: 'breakthrough', label: '"Like a Virgin" becomes her first #1 album', source: 'Wikipedia: Madonna' },
      { year: 1996, age: 38, category: 'transition', label: 'Stars as Eva Perón in Evita, pivoting into film', source: 'Wikipedia: Madonna' },
      { year: 1998, age: 39, category: 'expansion', label: 'Releases Ray of Light, a critically acclaimed reinvention', source: 'Wikipedia: Madonna' }
    ]
  },
  {
    id: 'schwarzenegger',
    name: 'Arnold Schwarzenegger',
    birth: {
      date: '1947-07-30',
      time: '04:10',
      place: 'Thal, Styria, Austria',
      lat: 47.0742,
      lon: 15.3872,
      zone: 'Europe/Vienna',
      timeReliability: 'A (reliable biographical source)',
      timeSource: 'astro.com/astro-databank/Schwarzenegger,_Arnold — Rodden Rating A'
    },
    events: [
      { year: 1970, age: 23, category: 'breakthrough', label: 'Wins Mr. Olympia for the first time', source: 'Wikipedia: Arnold Schwarzenegger' },
      { year: 1982, age: 34, category: 'transition', label: 'Stars in Conan the Barbarian, launching Hollywood career', source: 'Wikipedia: Arnold Schwarzenegger' },
      { year: 1984, age: 37, category: 'expansion', label: 'The Terminator establishes him as a top action star', source: 'Wikipedia: Arnold Schwarzenegger' },
      { year: 2003, age: 56, category: 'transition', label: 'Elected Governor of California in a special recall election', source: 'Wikipedia: Arnold Schwarzenegger' }
    ]
  },
  {
    id: 'ali',
    name: 'Muhammad Ali',
    birth: {
      date: '1942-01-17',
      time: '18:35',
      place: 'Louisville, Kentucky, USA',
      lat: 38.2527,
      lon: -85.7585,
      zone: 'America/Kentucky/Louisville',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Ali,_Muhammad — Rodden Rating AA'
    },
    events: [
      { year: 1964, age: 22, category: 'breakthrough', label: 'Defeats Sonny Liston to win the World Heavyweight Championship', source: 'Wikipedia: Muhammad Ali' },
      { year: 1967, age: 25, category: 'setback', label: 'Stripped of his title after refusing induction into the U.S. Army', source: 'Wikipedia: Muhammad Ali' },
      { year: 1974, age: 32, category: 'expansion', label: "Wins the 'Rumble in the Jungle' to reclaim the heavyweight title", source: 'Wikipedia: Muhammad Ali' },
      { year: 1981, age: 39, category: 'setback', label: 'Retires after a final loss to Trevor Berbick', source: 'Wikipedia: Muhammad Ali' }
    ]
  },
  {
    id: 'tiger_woods',
    name: 'Tiger Woods',
    birth: {
      date: '1975-12-30',
      time: '22:50',
      place: 'Long Beach, California, USA',
      lat: 33.7701,
      lon: -118.1937,
      zone: 'America/Los_Angeles',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Woods,_Tiger — Rodden Rating AA'
    },
    events: [
      { year: 1997, age: 21, category: 'breakthrough', label: 'Wins the Masters by a record margin in his first major as a pro', source: 'Wikipedia: Tiger Woods' },
      { year: 2001, age: 25, category: 'expansion', label: "Completes the 'Tiger Slam', holding all four majors at once", source: 'Wikipedia: Tiger Woods' },
      { year: 2009, age: 33, category: 'setback', label: 'Infidelity scandal becomes public, loses sponsorships', source: 'Wikipedia: Tiger Woods' },
      { year: 2019, age: 43, category: 'transition', label: 'Wins the Masters again after years of injury/setbacks', source: 'Wikipedia: Tiger Woods' }
    ]
  },
  {
    id: 'jordan',
    name: 'Michael Jordan',
    birth: {
      date: '1963-02-17',
      time: '13:40',
      place: 'Brooklyn, New York, USA',
      lat: 40.6782,
      lon: -73.9442,
      zone: 'America/New_York',
      timeReliability: 'AA (birth certificate) -- CAVEAT: a later informal secondhand anecdote cites a conflicting time (12:50am); AA rating rests on the certificate copy on file',
      timeSource: 'astro.com/astro-databank/Jordan,_Michael — Rodden Rating AA'
    },
    events: [
      { year: 1991, age: 28, category: 'breakthrough', label: 'Wins his first NBA championship with the Chicago Bulls', source: 'Wikipedia: Michael Jordan' },
      { year: 1993, age: 30, category: 'transition', label: 'Retires from basketball to pursue minor league baseball', source: 'Wikipedia: Michael Jordan' },
      { year: 1995, age: 32, category: 'transition', label: 'Returns to the NBA and the Chicago Bulls', source: 'Wikipedia: Michael Jordan' },
      { year: 2010, age: 47, category: 'leadership', label: 'Becomes majority owner of the Charlotte Bobcats/Hornets', source: 'Wikipedia: Michael Jordan' }
    ]
  },
  {
    id: 'serena',
    name: 'Serena Williams',
    birth: {
      date: '1981-09-26',
      time: '20:28',
      place: 'Saginaw, Michigan, USA',
      lat: 43.4195,
      lon: -83.9508,
      zone: 'America/Detroit',
      timeReliability: 'AA (birth certificate)',
      timeSource: 'astro.com/astro-databank/Williams,_Serena — Rodden Rating AA'
    },
    events: [
      { year: 1999, age: 17, category: 'breakthrough', label: 'Wins the US Open, her first Grand Slam singles title', source: 'Wikipedia: Serena Williams' },
      { year: 2003, age: 21, category: 'expansion', label: "Completes the 'Serena Slam', holding all four majors at once", source: 'Wikipedia: Serena Williams' },
      { year: 2017, age: 35, category: 'breakthrough', label: 'Wins the Australian Open while pregnant, 23rd Grand Slam title', source: 'Wikipedia: Serena Williams' },
      { year: 2022, age: 40, category: 'transition', label: "Announces her retirement ('evolution') from tennis", source: 'Wikipedia: Serena Williams' }
    ]
  }
];

module.exports = { CAREER_TIMING_VALIDATION_FIXTURES };

const { DateTime } = require('luxon');
const { buildTransitSnapshotAtUtc } = require('./astrologyService');
const { buildKathmanduDatePayload, buildNepaliDatePayloadFromAdDate } = require('./nepaliDateService');

const TITHI_NAMES = [
  'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
];
const TITHI_NAMES_NP = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा',
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'औँसी'
];

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

function normalizeDegrees(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return ((n % 360) + 360) % 360;
}

function nakshatraFromLongitude(longitude) {
  const n = normalizeDegrees(longitude);
  if (!Number.isFinite(n)) return null;
  const idx = Math.min(26, Math.floor(n / (360 / 27)));
  return NAKSHATRA_NAMES[idx] || null;
}

function tithiFromLongitudes(moonAbs, sunAbs) {
  const moon = normalizeDegrees(moonAbs);
  const sun = normalizeDegrees(sunAbs);
  if (!Number.isFinite(moon) || !Number.isFinite(sun)) return null;
  const idx = Math.floor((((moon - sun) % 360) + 360) % 360 / 12);
  const safe = Math.max(0, Math.min(TITHI_NAMES.length - 1, idx));
  const paksha = safe < 15 ? 'Shukla' : 'Krishna';
  const pakshaNepali = safe < 15 ? 'शुक्ल' : 'कृष्ण';
  return {
    index: safe + 1,
    name: TITHI_NAMES[safe],
    nameNepali: TITHI_NAMES_NP[safe],
    paksha,
    pakshaNepali
  };
}

function buildDeterministicAstroContextFromTransit(transitSnapshot) {
  const planets = Array.isArray(transitSnapshot?.planets) ? transitSnapshot.planets : [];
  const moon = planets.find((p) => p?.name === 'Moon');
  const sun = planets.find((p) => p?.name === 'Sun');
  const tithi = tithiFromLongitudes(moon?.absoluteDegree, sun?.absoluteDegree);
  const nakshatra = nakshatraFromLongitude(moon?.absoluteDegree);
  const bsDate = buildKathmanduDatePayload();

  return {
    gregorianDate: bsDate.gregorianDate,
    bsDate: bsDate.bsDate,
    bsDateNepali: bsDate.bsDateNepali,
    moonSign: moon?.sign || null,
    currentNakshatra: nakshatra,
    currentTithi: tithi ? tithi.name : null,
    currentTithiNepali: tithi ? tithi.nameNepali : null,
    currentTithiIndex: tithi ? tithi.index : null,
    currentTithiPaksha: tithi ? tithi.paksha : null,
    currentTithiPakshaNepali: tithi ? tithi.pakshaNepali : null
  };
}

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shoola',
  'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti'
];

const KARANA_NAMES = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna'
];

function yogaFromLongitudes(moonAbs, sunAbs) {
  const moon = normalizeDegrees(moonAbs);
  const sun = normalizeDegrees(sunAbs);
  if (!Number.isFinite(moon) || !Number.isFinite(sun)) return null;
  const idx = Math.floor((((moon + sun) % 360) + 360) % 360 / (360 / 27));
  const safe = Math.max(0, Math.min(YOGA_NAMES.length - 1, idx));
  return { index: safe + 1, name: YOGA_NAMES[safe] };
}

function karanaFromLongitudes(moonAbs, sunAbs) {
  const moon = normalizeDegrees(moonAbs);
  const sun = normalizeDegrees(sunAbs);
  if (!Number.isFinite(moon) || !Number.isFinite(sun)) return null;
  const idx = Math.floor((((moon - sun) % 360) + 360) % 360 / 6);
  const safe = Math.max(0, Math.min(KARANA_NAMES.length - 1, idx));
  return { index: safe + 1, name: KARANA_NAMES[safe] };
}

async function buildPanchangaForDate(dateIso) {
  const base = DateTime.fromISO(String(dateIso || ''), { zone: 'Asia/Kathmandu' });
  if (!base.isValid) {
    const error = new Error('Invalid date query. Use YYYY-MM-DD.');
    error.statusCode = 400;
    throw error;
  }

  // Daily Panchanga anchor at local 6:00 AM in Nepal time.
  const anchor = base.startOf('day').plus({ hours: 6 });
  const snapshot = await buildTransitSnapshotAtUtc(anchor.toUTC().toISO(), 15);
  const core = buildDeterministicAstroContextFromTransit(snapshot);
  const planets = Array.isArray(snapshot?.planets) ? snapshot.planets : [];
  const moon = planets.find((p) => p?.name === 'Moon');
  const sun = planets.find((p) => p?.name === 'Sun');
  const yoga = yogaFromLongitudes(moon?.absoluteDegree, sun?.absoluteDegree);
  const karana = karanaFromLongitudes(moon?.absoluteDegree, sun?.absoluteDegree);
  const nepali = buildNepaliDatePayloadFromAdDate(base.toISODate());

  return {
    gregorianDate: base.toISODate(),
    bsDate: nepali.bsDate,
    bsDateNepali: nepali.bsDateNepali,
    tithi: core.currentTithi,
    tithiNepali: core.currentTithiNepali,
    paksha: core.currentTithiPaksha,
    pakshaNepali: core.currentTithiPakshaNepali,
    nakshatra: core.currentNakshatra,
    yoga: yoga?.name || null,
    karana: karana?.name || null,
    moonSign: core.moonSign
  };
}

async function buildPanchangaRange(startDateIso, days = 7) {
  const start = DateTime.fromISO(String(startDateIso || ''), { zone: 'Asia/Kathmandu' });
  if (!start.isValid) return [];
  const count = Math.max(1, Math.min(7, Number(days) || 1));
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const d = start.plus({ days: i }).toISODate();
    // eslint-disable-next-line no-await-in-loop
    out.push(await buildPanchangaForDate(d));
  }
  return out;
}

module.exports = {
  buildDeterministicAstroContextFromTransit,
  buildPanchangaForDate,
  buildPanchangaRange
};

const { DateTime } = require('luxon');
const NepaliDateModule = require('nepali-date-converter');

const NepaliDate = NepaliDateModule.default || NepaliDateModule;
const { dateConfigMap } = NepaliDateModule;

const BS_MONTH_NAMES = [
  'Baisakh',
  'Jestha',
  'Asar',
  'Shrawan',
  'Bhadra',
  'Aswin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra'
];

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatAdDate({ year, month, date }) {
  return `${year}-${pad(month + 1)}-${pad(date)}`;
}

function formatBsDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function asInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : NaN;
}

function getBsMonthLength(year, month) {
  const normalizedYear = asInteger(year);
  const normalizedMonth = asInteger(month);
  const yearConfig = dateConfigMap[String(normalizedYear)];
  const monthName = BS_MONTH_NAMES[normalizedMonth - 1];

  if (!yearConfig || !monthName) {
    return null;
  }

  return yearConfig[monthName] || null;
}

function validateBsDate(year, month, day) {
  const normalizedYear = asInteger(year);
  const normalizedMonth = asInteger(month);
  const normalizedDay = asInteger(day);

  if (!Number.isInteger(normalizedYear) || !Number.isInteger(normalizedMonth) || !Number.isInteger(normalizedDay)) {
    throw new Error('BS date must include numeric year, month, and day.');
  }

  if (normalizedMonth < 1 || normalizedMonth > 12) {
    throw new Error('BS month must be between 1 and 12.');
  }

  const monthLength = getBsMonthLength(normalizedYear, normalizedMonth);

  if (!monthLength) {
    throw new Error(`BS year ${normalizedYear} is outside the supported conversion range.`);
  }

  if (normalizedDay < 1 || normalizedDay > monthLength) {
    throw new Error(
      `BS day must be between 1 and ${monthLength} for ${BS_MONTH_NAMES[normalizedMonth - 1]} ${normalizedYear}.`
    );
  }

  return {
    year: normalizedYear,
    month: normalizedMonth,
    day: normalizedDay
  };
}

function convertBsToAd(year, month, day) {
  const validated = validateBsDate(year, month, day);

  // nepali-date-converter uses a verified BS month-length table. Its constructor
  // expects a zero-based BS month index, so month 12 (Chaitra) is passed as 11.
  const nepaliDate = new NepaliDate(validated.year, validated.month - 1, validated.day);
  const adDate = nepaliDate.getAD();

  return {
    adDate: formatAdDate(adDate),
    bsDate: formatBsDate(validated.year, validated.month, validated.day)
  };
}

function convertAdToBs(adDateIso, zone = 'Asia/Kathmandu') {
  if (typeof adDateIso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(adDateIso)) {
    throw new Error('AD date must be in YYYY-MM-DD format.');
  }

  const dt = DateTime.fromISO(adDateIso, { zone, setZone: true });
  if (!dt.isValid) {
    throw new Error(`Invalid AD date: ${adDateIso}`);
  }

  // nepali-date-converter accepts a JS Date (AD) and can return BS fields via getBS().
  const nepaliDate = new NepaliDate(dt.toJSDate());
  const bs = nepaliDate.getBS();

  const year = asInteger(bs.year);
  const monthZeroBased = asInteger(bs.month);
  const day = asInteger(bs.date);

  if (!Number.isInteger(year) || !Number.isInteger(monthZeroBased) || !Number.isInteger(day)) {
    throw new Error('Failed to convert AD to BS.');
  }

  const month = monthZeroBased + 1; // library exposes month index; BS months are 1–12

  return {
    year,
    month,
    day,
    bsDate: formatBsDate(year, month, day)
  };
}

module.exports = {
  BS_MONTH_NAMES,
  convertBsToAd,
  convertAdToBs,
  formatBsDate,
  getBsMonthLength
};

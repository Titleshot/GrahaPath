const { DateTime } = require('luxon');
const { convertAdToBs } = require('./dateConversionService');

const BS_MONTHS_EN = [
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

const BS_MONTHS_NP = [
  'वैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कात्तिक',
  'मंसिर',
  'पुष',
  'माघ',
  'फागुन',
  'चैत'
];

function toDevanagariNumber(value) {
  return String(value).replace(/\d/g, (d) => '०१२३४५६७८९'[Number(d)]);
}

function buildKathmanduDatePayload() {
  const gregorianDate = DateTime.now().setZone('Asia/Kathmandu').toISODate();
  return buildNepaliDatePayloadFromAdDate(gregorianDate);
}

function buildNepaliDatePayloadFromAdDate(gregorianDate) {
  const bs = convertAdToBs(gregorianDate, 'Asia/Kathmandu');
  const monthIndex = Math.max(0, Math.min(11, Number(bs.month) - 1));
  return {
    gregorianDate,
    bsDate: `${bs.year} ${BS_MONTHS_EN[monthIndex]} ${bs.day}`,
    bsDateNepali: `${toDevanagariNumber(bs.year)} ${BS_MONTHS_NP[monthIndex]} ${toDevanagariNumber(bs.day)}`,
    bsYear: bs.year,
    bsMonth: bs.month,
    bsDay: bs.day
  };
}

module.exports = {
  buildKathmanduDatePayload,
  buildNepaliDatePayloadFromAdDate
};

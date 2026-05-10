const CHARA_ORDER = [
  'Atmakaraka',
  'Amatyakaraka',
  'Bhratrukaraka',
  'Matrukaraka',
  'Putrakaraka',
  'Gnatikaraka',
  'Darakaraka'
];

function buildCharaKarakas(grahaProfiles = []) {
  const candidates = (grahaProfiles || []).filter((g) =>
    ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].includes(g.planet)
  );

  const ranked = [...candidates].sort((a, b) => Number(b.degree || 0) - Number(a.degree || 0));
  const karakas = ranked.map((g, idx) => ({
    role: CHARA_ORDER[idx] || `Karaka${idx + 1}`,
    planet: g.planet,
    degreeInSign: g.degree,
    sign: g.sign,
    house: g.house
  }));

  return {
    karakas,
    atmakaraka: karakas[0] || null,
    caveat:
      'Jaimini Chara Karaka v1 uses degree-in-sign ranking among seven classical grahas.'
  };
}

module.exports = {
  buildCharaKarakas
};


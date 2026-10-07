const assert = require('assert');
const { computeAshtakoot, _tables } = require('../services/kundaliMilanService');
const { YONI_MATRIX, YONI_BY_NAKSHATRA, GANA_BY_NAKSHATRA, NADI_BY_NAKSHATRA } = _tables;

// table integrity
for (let i = 0; i < 14; i += 1) {
  assert.strictEqual(YONI_MATRIX[i][i], 4, 'yoni diagonal');
  for (let j = 0; j < 14; j += 1) assert.strictEqual(YONI_MATRIX[i][j], YONI_MATRIX[j][i], `yoni symmetry ${i},${j}`);
}
const count = (arr, v) => arr.filter((x) => x === v).length;
for (let a = 0; a < 14; a += 1) assert.strictEqual(count(YONI_BY_NAKSHATRA, a), a === 12 ? 1 : 2, `yoni animal ${a}`);
for (let v = 0; v < 3; v += 1) {
  assert.strictEqual(count(GANA_BY_NAKSHATRA, v), 9, `gana ${v}`);
  assert.strictEqual(count(NADI_BY_NAKSHATRA, v), 9, `nadi ${v}`);
}
assert.strictEqual(YONI_BY_NAKSHATRA.length, 27);

// same Moon for both: 28 gunas, nadi dosha present
const same = computeAshtakoot(100, 100);
assert.strictEqual(same.total, 28);
assert.strictEqual(same.doshas.nadi, 'present');

// bounds + each koota within its max, for a sweep of pairs
for (let g = 0; g < 360; g += 13.3) {
  for (let b = 0; b < 360; b += 17.9) {
    const r = computeAshtakoot(g, b);
    assert(r.total >= 0 && r.total <= 36, 'total range');
    for (const k of r.kootas) assert(k.score >= 0 && k.score <= k.max, `${k.id} within max`);
    assert.strictEqual(r.kootas.reduce((s, k) => s + k.max, 0), 36);
  }
}

// a different-nadi, different-sign pair scores nonzero nadi
const diff = computeAshtakoot(10, 130);
assert.strictEqual(diff.kootas.find((k) => k.id === 'nadi').score, 8);
console.log('kundali milan tests passed; same-moon total =', same.total);

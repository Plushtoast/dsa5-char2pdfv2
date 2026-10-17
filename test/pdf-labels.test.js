const assert = require('assert');
const { loadLang, loc, overlayKeys, leitOptions, buildReplacements } = require('../scripts/ulisses/pdf-labels');

const en = loadLang('en');
const de = loadLang('de');

for (const key of overlayKeys()) {
  const enText = loc(en, key);
  const deText = loc(de, key);
  assert(enText, `missing foundry14 en.json key ${key}`);
  assert(deText, `missing foundry14 de.json key ${key}`);
}

assert.strictEqual(loc(en, 'SKILL.body'), 'Physical Skills');
assert.strictEqual(loc(de, 'SKILL.body'), 'Körpertalente');
assert.strictEqual(loc(en, 'CHARAbbrev.MU'), 'COU');
assert.strictEqual(loc(de, 'CHARAbbrev.MU'), 'MU');
assert.strictEqual(loc(en, 'CHARAbbrev.FW'), 'SR');
assert.strictEqual(loc(en, 'TYPES.Item.species'), 'Species');
assert.strictEqual(loc(en, 'CHARAbbrev.castingTime'), 'Action duration');

assert.deepStrictEqual(leitOptions(en), ['DEX', 'AGI', 'STR', 'AGI/STR']);
assert.deepStrictEqual(leitOptions(de), ['FF', 'GE', 'KK', 'GE/KK']);

const replacements = buildReplacements(en, de, { 28: { de: 'Pflanzenkunde', en: 'Plant Lore' } }, [
  { de: 'Armbrüste', en: 'Crossbows' },
]);
assert.strictEqual(replacements.get('Geschlecht'), 'Gender');
assert.strictEqual(replacements.get('Körpertalente'), 'Physical Skills');
assert.strictEqual(replacements.get('Armbrüste'), 'Crossbows');
assert.strictEqual(replacements.get('Planzenkunde'), 'Plant Lore');
assert.strictEqual(replacements.get('Größe / Gewicht'), 'Height / Weight');
assert.strictEqual(replacements.get('FERTIGKEITEN'), 'Skills');
assert.strictEqual(replacements.get('Persönliche Daten'), 'Personal data');

console.log(`pdf-labels.test.js passed (${overlayKeys().length} keys, ${replacements.size} replacements)`);

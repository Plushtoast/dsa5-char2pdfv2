const assert = require('assert');
const fs = require('fs');
const path = require('path');

const fieldMap = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'ulisses', 'field-map.js'), 'utf8');
const locale = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'shared', 'locale.js'), 'utf8');
const dialog = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'dsa5-char2pdf.js'), 'utf8');

function extractArray(name) {
  const match = fieldMap.match(new RegExp(`static ${name} = (\\[[\\s\\S]*?\\]);`));
  assert(match, `${name} array not found`);
  return Function(`return ${match[1]}`)();
}

const talents = extractArray('TALENTS');
const combat = extractArray('COMBAT_SKILLS');
const coins = extractArray('COINS');

assert.strictEqual(talents.length, 59, 'expected 59 talent slots');
assert.strictEqual(combat.length, 14, 'expected 14 combat techniques');
assert.strictEqual(coins.length, 4, 'expected 4 coin types');

const dests = talents.map((t) => t.dest).sort((a, b) => a - b);
assert.deepStrictEqual(dests, [...Array(59)].map((_, i) => i + 1), 'talent dests must be 1..59');

for (const talent of talents) {
  assert(talent.de && talent.en, `talent ${talent.dest} needs de and en names`);
  assert.notStrictEqual(talent.de, talent.en, `talent ${talent.dest} DE/EN names should differ (${talent.de})`);
}

const gaukel = talents.find((t) => t.dest === 2);
assert.strictEqual(gaukel.de, 'Gaukeleien');
assert.strictEqual(gaukel.en, 'Gaukelei');

for (const skill of combat) {
  assert(skill.de && skill.en && Number.isInteger(skill.dest), `combat skill incomplete: ${JSON.stringify(skill)}`);
}

assert.deepStrictEqual(coins.map((c) => c.field), ['D', 'S', 'H', 'K']);

assert(locale.includes("startsWith('de') ? 'de' : 'en'"), 'PDF language must follow game.i18n.lang with EN fallback');
assert(!dialog.includes('[name="pdfLang"]'), 'PDF language must not be chosen from a dropdown');
assert(dialog.includes('exportHtmlSheet'), 'HTML sheet export must be wired from the dialog');
assert(dialog.includes('EXPORT_TYPES.HTMLSHEET'), 'HTML sheet must be the default export type');

console.log('locale-map.test.js passed');

import assert from 'assert';
import { SHEET_PAGES } from '../scripts/config/sheet-pages.js';
import { ROW_LIMITS } from '../scripts/config/print.js';
import { buildPageSequence } from '../scripts/htmlsheet/render-sheet.js';
import { buildActorSnapshot } from '../scripts/shared/actor-snapshot.js';
import { fatActor, mundaneActor, localize } from './actor-fixtures.mjs';

assert.deepStrictEqual(SHEET_PAGES.map((page) => page.id), [
  'personal', 'skills', 'combat', 'inventory', 'liturgy', 'spells', 'notes',
]);
assert(SHEET_PAGES.find((page) => page.id === 'inventory').required);
assert.deepStrictEqual(SHEET_PAGES.find((page) => page.id === 'liturgy').skipWhenEmpty, ['liturgies', 'blessings', 'karma']);
assert.deepStrictEqual(SHEET_PAGES.find((page) => page.id === 'spells').skipWhenEmpty, ['spells', 'cantrips', 'astral']);
assert.deepStrictEqual(SHEET_PAGES.find((page) => page.id === 'notes').skipWhenEmpty, ['notes']);

const fat = buildActorSnapshot(fatActor(), 'en', { localize });
const mundane = buildActorSnapshot(mundaneActor(), 'en', { localize });
const fatSeq = buildPageSequence(fat);
const mundaneSeq = buildPageSequence(mundane);

assert(fatSeq.filter((page) => page.id === 'spells').length >= 3);
assert(fatSeq.filter((page) => page.id === 'inventory').length >= 3);
assert.strictEqual(fatSeq.filter((page) => page.id === 'liturgy').length, 1);
assert.ok(fatSeq.some((page) => page.id === 'notes'));
assert.deepStrictEqual(mundaneSeq.map((page) => page.id), ['personal', 'skills', 'combat', 'inventory']);
assert.ok(ROW_LIMITS.spells < 40);
assert.ok(ROW_LIMITS.inventory < 72);

console.log('sheet-pages.test.mjs passed');

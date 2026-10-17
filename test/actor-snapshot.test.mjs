import assert from 'assert';
import { buildActorSnapshot, isSectionEmpty } from '../scripts/shared/actor-snapshot.js';
import { fatActor, mundaneActor, localize } from './actor-fixtures.mjs';
import { pdfFilename } from '../scripts/htmlsheet/html-to-pdf.js';

const fat = buildActorSnapshot(fatActor(), 'en', { localize });
const mundane = buildActorSnapshot(mundaneActor(), 'en', { localize });
const de = buildActorSnapshot(fatActor(), 'de', { localize });

assert.strictEqual(fat.personal.name, 'Alrik');
assert.strictEqual(fat.personal.species, 'Human');
assert.strictEqual(fat.personal.career, 'Mage');
assert.strictEqual(fat.personal.socialstatus, 'Free');
assert.strictEqual(fat.personal.home, 'Gareth');
assert.strictEqual(fat.personal.portrait, 'portrait.webp');
assert.strictEqual(fat.attributes.find((row) => row.key === 'mu').abbrev, 'COU');
assert.strictEqual(fat.attributes.find((row) => row.key === 'mu').value, 14);
assert.strictEqual(fat.attributes.find((row) => row.key === 'kl').abbrev, 'SGC');
assert.strictEqual(fat.derived.lp.abbrev, 'LP');
assert.strictEqual(fat.derived.lp.max, 32);
assert.strictEqual(fat.derived.ae.max, 35);
assert.strictEqual(fat.derived.kp.max, 20);
assert.strictEqual(fat.derived.spi.abbrev, 'SPI');
assert.strictEqual(fat.derived.tou.abbrev, 'TOU');
assert.strictEqual(fat.derived.dodge.abbrev, 'DO');
assert.strictEqual(fat.derived.mov.value, 8);
assert.strictEqual(fat.derived.ini.value, 15);
assert.strictEqual(fat.fate.current, 3);
assert.strictEqual(fat.experience.grade, 'Ordinary');
assert.strictEqual(fat.experience.total, 1000);
assert.deepStrictEqual(fat.traits.advantages, ['Advantageous I']);
assert.deepStrictEqual(fat.traits.disadvantages, ['Afraid of Spiders II']);
assert.deepStrictEqual(fat.traits.generalAbilities, ['Area Knowledge I']);

const talentCount = fat.talentGroups.reduce((sum, group) => sum + group.rows.length, 0);
assert.strictEqual(talentCount, 3);
assert.strictEqual(fat.talentGroups[0].id, 'body');
assert.strictEqual(fat.talentGroups[0].label, 'Physical Skills');
const flying = fat.talentGroups[0].rows.find((row) => row.name === 'Flying');
assert.strictEqual(flying.check, 'COU/INT/AGI');
assert.strictEqual(flying.sr, 4);
assert.strictEqual(flying.enc, 'yes');
assert(fat.talentGroups.find((g) => g.id === 'knowledge').rows.some((row) => row.name === 'Foo Lore'));
assert.strictEqual(de.talentGroups[0].rows[0].name, 'Flying');

assert.deepStrictEqual(fat.languages, ['Language Garethi III']);
assert.deepStrictEqual(fat.scripts, ['Literacy Kuslik Signs I']);

const swords = fat.combatTechniques.find((row) => row.name === 'Swords');
assert.strictEqual(swords.sr, 10);
assert.strictEqual(swords.at, 12);
assert.strictEqual(swords.pa, 6);
assert.strictEqual(swords.attr, 'AGI');
assert(fat.combatTechniques.some((row) => row.name === 'Firearms'), 'extra combat techniques are kept');
assert.strictEqual(fat.melee[0].name, 'Longsword');
assert.strictEqual(fat.melee[0].at, 13);
assert.strictEqual(fat.melee[0].pa, 7);
assert.strictEqual(fat.melee[0].reach, 'Medium');
assert.strictEqual(fat.ranged[0].name, 'Shortbow');
assert.strictEqual(fat.ranged[0].rc, 9);
assert.strictEqual(fat.armor[0].protection, 4);
assert.strictEqual(fat.shields[0].name, 'Wooden Shield');
assert.deepStrictEqual(fat.combatAbilities, ['Feint II']);

const pain = fat.conditions.find((row) => row.id === 'inpain');
assert.strictEqual(pain.name, 'Pain');
assert.strictEqual(pain.level, 2);
assert.strictEqual(pain.max, 4);
assert.strictEqual(pain.label, 'II');
assert.strictEqual(pain.dropdown, '-,I,II,III,IV');
assert.deepStrictEqual(pain.steps, [true, true, false, false]);
assert(fat.conditions.length >= 20, 'default status effects must be listed');
assert(fat.conditions.some((row) => row.id === 'burning' && row.max === 3));
assert(fat.conditions.some((row) => row.id === 'prone' && row.max === 1));

assert.strictEqual(fat.coins.find((coin) => coin.field === 'D').quantity, 5);
assert.strictEqual(fat.inventory.length, 80, 'inventory must not use MAX_ITEMS');
assert.strictEqual(fat.inventory[0].displayName, '3x Item 1');
assert.strictEqual(fat.inventory[1].location, 'Item 1');
assert.strictEqual(fat.carryCapacity, 30);
assert.ok(fat.weightTotal > 0);
assert(!fat.inventory.some((row) => row.name === 'Longsword'), 'worn weapons stay on the combat tables');

assert.strictEqual(fat.spells.length, 45, 'spell list must not cap at 40');
assert.strictEqual(fat.spells[0].check, 'COU/SGC/INT');
assert.strictEqual(fat.spells[0].ic, 'B');
assert.deepStrictEqual(fat.cantrips, ['Cantrip Spark']);
assert.strictEqual(fat.liturgies.length, 1);
assert.deepStrictEqual(fat.blessings, ['Blessing of Light']);
assert.strictEqual(fat.clerical.tradition, 'Praios');
assert.strictEqual(fat.magical.tradition, 'Guild Mage');
assert(fat.notes.hasContent);
assert.strictEqual(fat.notes.biography, '', 'biography is omitted unless opted in');
const withBio = buildActorSnapshot(fatActor(), 'en', { localize, includeBiography: true });
assert(withBio.notes.biography.includes('Gareth'));
const noBio = buildActorSnapshot(fatActor(), 'en', { localize, includeBiography: false });
assert.strictEqual(noBio.notes.biography, '');
assert(noBio.notes.hasContent, 'other notes stay when biography is omitted');
assert.strictEqual(noBio.skip.notes, false);

const bioOnlyActor = mundaneActor();
bioOnlyActor.system.details.biography = { value: '<p>Hi</p>' };
assert.strictEqual(buildActorSnapshot(bioOnlyActor, 'en', { localize }).skip.notes, true);
assert.strictEqual(buildActorSnapshot(bioOnlyActor, 'en', { localize, includeBiography: true }).skip.notes, false);

assert.strictEqual(fat.skip.liturgy, false);
assert.strictEqual(fat.skip.spells, false);
assert.strictEqual(fat.skip.notes, false);
assert.deepStrictEqual(fat.pages, ['personal', 'skills', 'combat', 'inventory', 'liturgy', 'spells', 'notes']);

assert.strictEqual(mundane.skip.liturgy, true);
assert.strictEqual(mundane.skip.spells, true);
assert.strictEqual(mundane.skip.notes, true);
assert.deepStrictEqual(mundane.pages, ['personal', 'skills', 'combat', 'inventory']);
assert.strictEqual(mundane.talentGroups.reduce((sum, group) => sum + group.rows.length, 0), 0);
assert.strictEqual(mundane.experience.grade, 'Inexperienced');
assert(isSectionEmpty(mundane, 'spells'));
assert(isSectionEmpty(mundane, 'astral'));
assert(!isSectionEmpty(fat, 'karma'));
assert.strictEqual(mundane.portrait, '');

const umlaut = buildActorSnapshot({ ...mundaneActor(), name: 'Mu\u0308ller' }, 'en', { localize });
assert.strictEqual(umlaut.name, 'Müller');
assert.strictEqual(pdfFilename('Mu\u0308ller'), 'DSA5-Müller.pdf');
assert.strictEqual(pdfFilename('a/b'), 'DSA5-a_b.pdf');

console.log('actor-snapshot.test.mjs passed');

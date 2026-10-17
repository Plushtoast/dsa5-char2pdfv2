import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import { HTML_SHEET_PARTIALS } from '../scripts/htmlsheet/templates.js';
import { renderSheet } from '../scripts/htmlsheet/render-sheet.js';
import { buildActorSnapshot } from '../scripts/shared/actor-snapshot.js';
import { fatActor, mundaneActor, localize } from './actor-fixtures.mjs';
import { THEMES } from '../scripts/config/print.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fileFor(modulePath) {
  return path.join(root, modulePath.replace(/^modules\/dsa5-char2pdfv2\//, ''));
}

for (const [alias, modulePath] of Object.entries(HTML_SHEET_PARTIALS)) {
  Handlebars.registerPartial(alias, fs.readFileSync(fileFor(modulePath), 'utf8'));
}

function render(alias, data) {
  const src = fs.readFileSync(fileFor(HTML_SHEET_PARTIALS[alias]), 'utf8');
  return Handlebars.compile(src)(data);
}

const fat = buildActorSnapshot(fatActor(), 'en', { localize });
const mundane = buildActorSnapshot(mundaneActor(), 'en', { localize });
const html = await renderSheet(fat, THEMES.TABLE, { localize, render });
const printHtml = await renderSheet(fat, THEMES.PRINT, { localize, render });
const mundaneHtml = await renderSheet(mundane, THEMES.TABLE, { localize, render });

assert(html.includes('id="dsa5-htmlsheet"'));
assert(html.includes('data-theme="table"'));
assert(printHtml.includes('data-theme="print"'));
assert(html.includes('Alrik'));
assert(html.includes('Flying'));
assert(html.includes('COU'));
assert(html.includes('Longsword'));
assert(html.includes('Spell 45'));
assert(html.includes('Item 80'));
assert(!html.includes('Born in Gareth'));
const withBioHtml = await renderSheet(
  buildActorSnapshot(fatActor(), 'en', { localize, includeBiography: true }),
  THEMES.TABLE,
  { localize, render },
);
assert(withBioHtml.includes('Born in Gareth'));
assert((html.match(/class="sheet-page"/g) || []).length >= 10);
assert(html.includes('data-page="spells"'));
assert(html.includes('data-page="notes"'));
assert(mundaneHtml.includes('data-page="inventory"'));
assert(!mundaneHtml.includes('data-page="spells"'));
assert(!mundaneHtml.includes('data-page="liturgy"'));
assert(!mundaneHtml.includes('data-page="notes"'));
assert(html.includes('dsa5-htmlsheet'));
assert(html.includes('sheet-page-bg-img'));
assert(html.includes('attr-lily'));
assert(!html.includes('attr-strip'));
assert(html.includes('data-pdf-field="personal.name"'));
assert(html.includes('data-pdf-field="attr.mu"'));
assert(html.includes('data-pdf-field="cond.inpain"'));
assert(html.includes('data-pdf-dropdown'));
assert(html.includes('Hair color'));
assert(html.includes('cond-grid'));
assert(html.includes('data-pdf-field="traits.generalAbilities"'));
assert(html.includes('trait-text'));
assert(html.includes('data-pdf-field="derived.tou">2<'));
assert(!html.includes('data-pdf-field="derived.tou">1 / 2<'));
assert(html.includes('/&nbsp;'));
assert(html.includes('data-split-prose'));
assert(html.includes('col-check">Check</th>'));
assert(html.includes('>SR</th>'));
assert(html.includes('sheet-zierleiste'));

console.log('htmlsheet-render.test.mjs passed');

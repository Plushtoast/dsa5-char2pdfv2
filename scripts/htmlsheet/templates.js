import { dsa5char2pdf } from '../shared/module.js';

const ROOT = `modules/${dsa5char2pdf.ID}/templates/htmlsheet`;

/** Short Handlebars names → module template paths. */
export const HTML_SHEET_PARTIALS = {
  'htmlsheet-page': `${ROOT}/page.hbs`,
  'htmlsheet-personal': `${ROOT}/page-personal.hbs`,
  'htmlsheet-skills': `${ROOT}/page-skills.hbs`,
  'htmlsheet-combat': `${ROOT}/page-combat.hbs`,
  'htmlsheet-inventory': `${ROOT}/page-inventory.hbs`,
  'htmlsheet-liturgy': `${ROOT}/page-liturgy.hbs`,
  'htmlsheet-spells': `${ROOT}/page-spells.hbs`,
  'htmlsheet-notes': `${ROOT}/page-notes.hbs`,
  'htmlsheet-attributes': `${ROOT}/parts/attributes.hbs`,
  'htmlsheet-derived': `${ROOT}/parts/derived.hbs`,
  'htmlsheet-traits': `${ROOT}/parts/traits.hbs`,
  'htmlsheet-talent-table': `${ROOT}/parts/talent-table.hbs`,
  'htmlsheet-combat-tables': `${ROOT}/parts/combat-tables.hbs`,
  'htmlsheet-spell-table': `${ROOT}/parts/spell-table.hbs`,
};

export const PAGE_PARTIALS = {
  personal: 'htmlsheet-personal',
  skills: 'htmlsheet-skills',
  combat: 'htmlsheet-combat',
  inventory: 'htmlsheet-inventory',
  liturgy: 'htmlsheet-liturgy',
  spells: 'htmlsheet-spells',
  notes: 'htmlsheet-notes',
};

export async function registerHtmlSheetTemplates() {
  const handlebars = globalThis.foundry?.applications?.handlebars;
  const paths = Object.values(HTML_SHEET_PARTIALS);
  if (typeof handlebars?.loadTemplates === 'function') {
    await handlebars.loadTemplates(paths);
  }

  const hbs = globalThis.Handlebars;
  if (!hbs?.registerPartial) return;
  for (const [alias, path] of Object.entries(HTML_SHEET_PARTIALS)) {
    let compiled = hbs.partials?.[path] || hbs.partials?.[alias];
    if (!compiled && typeof handlebars?.getTemplate === 'function') {
      compiled = await handlebars.getTemplate(path);
    }
    if (compiled) hbs.registerPartial(alias, compiled);
  }
}

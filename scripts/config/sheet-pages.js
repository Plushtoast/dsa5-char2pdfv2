/** Page ids for the HTML sheet. Order is the old Heldendokument booklet order. */
export const SHEET_PAGES = [
  { id: 'personal', template: 'page-personal.hbs', required: true },
  { id: 'skills', template: 'page-skills.hbs', required: true },
  { id: 'combat', template: 'page-combat.hbs', required: true },
  { id: 'inventory', template: 'page-inventory.hbs', required: true },
  { id: 'liturgy', template: 'page-liturgy.hbs', skipWhenEmpty: ['liturgies', 'blessings', 'karma'] },
  { id: 'spells', template: 'page-spells.hbs', skipWhenEmpty: ['spells', 'cantrips', 'astral'] },
  { id: 'notes', template: 'page-notes.hbs', skipWhenEmpty: ['notes'] },
];

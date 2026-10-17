import { dsa5char2pdf } from '../shared/module.js';
import { ROW_LIMITS } from '../config/print.js';
import { themeClass } from './themes.js';
import { buildChromeLabels } from './labels.js';
import { HTML_SHEET_PARTIALS, PAGE_PARTIALS } from './templates.js';

function joinList(values) {
  const list = (values || []).filter(Boolean);
  return list.length ? list.join(', ') : '—';
}

function pageTitle(id, labels) {
  return {
    personal: labels.personalDetails,
    skills: labels.skills,
    combat: labels.combat,
    inventory: labels.inventory,
    liturgy: labels.liturgies,
    spells: labels.spells,
    notes: labels.notes,
  }[id] || labels.characterSheet;
}

export function imageUrls(lang) {
  const base = `modules/${dsa5char2pdf.ID}/assets/images`;
  return {
    hintergrund: `${base}/hintergrund.webp`,
    attribute: `${base}/attribute.webp`,
    zierleiste: `${base}/zierleiste.webp`,
    lilie: `${base}/lilie.webp`,
    logo: lang === 'de' ? `${base}/dsa5logo.webp` : `${base}/dsalogoen.webp`,
    melee: `${base}/nahkampfwaffen.webp`,
    ranged: `${base}/fernkampfwaffen.webp`,
    armor: `${base}/armor.webp`,
  };
}

export function chunkRows(rows, size) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [{ rows: [], continuation: false, isLast: true }];
  const chunks = [];
  for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size));
  return chunks.map((chunk, index) => ({
    rows: chunk,
    continuation: index > 0,
    isLast: index === chunks.length - 1,
  }));
}

export function buildPageSequence(snapshot) {
  const sequence = [];
  for (const id of snapshot.pages || []) {
    if (id === 'inventory') {
      for (const chunk of chunkRows(snapshot.inventory, ROW_LIMITS.inventory)) {
        sequence.push({ id, partial: PAGE_PARTIALS.inventory, ...chunk });
      }
    } else if (id === 'spells') {
      for (const chunk of chunkRows(snapshot.spells, ROW_LIMITS.spells)) {
        sequence.push({ id, partial: PAGE_PARTIALS.spells, ...chunk });
      }
    } else if (id === 'liturgy') {
      for (const chunk of chunkRows(snapshot.liturgies, ROW_LIMITS.liturgies)) {
        sequence.push({ id, partial: PAGE_PARTIALS.liturgy, ...chunk });
      }
    } else if (id === 'skills') {
      sequence.push({
        id,
        partial: PAGE_PARTIALS.skills,
        continuation: false,
        leftGroups: (snapshot.talentGroups || []).slice(0, 3),
        rightGroups: (snapshot.talentGroups || []).slice(3),
      });
    } else {
      sequence.push({ id, partial: PAGE_PARTIALS[id], continuation: false, isLast: true });
    }
  }
  return sequence;
}

export function buildSheetContext(snapshot, theme) {
  return {
    snapshot,
    theme,
    themeClass: themeClass(theme),
    labels: buildChromeLabels(),
    images: imageUrls(snapshot.lang),
    lists: {
      advantages: joinList(snapshot.traits?.advantages),
      disadvantages: joinList(snapshot.traits?.disadvantages),
      generalAbilities: joinList(snapshot.traits?.generalAbilities),
      fateAbilities: joinList(snapshot.traits?.fateAbilities),
      languages: joinList(snapshot.languages),
      scripts: joinList(snapshot.scripts),
      combatAbilities: joinList(snapshot.combatAbilities),
      clericalAbilities: joinList(snapshot.clericalAbilities),
      magicalAbilities: joinList(snapshot.magicalAbilities),
      blessings: joinList(snapshot.blessings),
      cantrips: joinList(snapshot.cantrips),
    },
  };
}

async function renderPartial(alias, data, options) {
  if (typeof options.render === 'function') return options.render(alias, data);
  const path = HTML_SHEET_PARTIALS[alias];
  if (!path) throw new Error(`Unknown HTML sheet partial ${alias}`);
  const renderTemplate = globalThis.foundry?.applications?.handlebars?.renderTemplate;
  if (typeof renderTemplate !== 'function') {
    throw new Error('Handlebars renderer is not available');
  }
  return renderTemplate(path, data);
}

export async function renderSheet(snapshot, theme, options = {}) {
  const base = buildSheetContext(snapshot, theme);
  const sequence = buildPageSequence(snapshot);
  const parts = [];
  for (const page of sequence) {
    const data = { ...base, ...page, pageId: page.id, title: pageTitle(page.id, base.labels) };
    const body = await renderPartial(page.partial, data, options);
    parts.push(await renderPartial('htmlsheet-page', { ...data, body }, options));
  }
  return `<div id="dsa5-htmlsheet" class="dsa5-htmlsheet ${themeClass(theme)}" data-theme="${theme}" lang="${snapshot.lang}">${parts.join('')}</div>`;
}

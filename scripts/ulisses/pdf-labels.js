const fs = require('fs');
const path = require('path');
const { PDFName, decodePDFRawStream, rgb } = require('pdf-lib');

const FOUNDRY_LANG_DIR = path.resolve(__dirname, '../../../foundry14/lang');

function loadLang(lang) {
  const file = path.join(FOUNDRY_LANG_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) throw new Error(`Foundry lang file not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loc(dict, key) {
  let raw;
  if (typeof dict[key] === 'string') {
    raw = dict[key];
  } else {
    let cur = dict;
    for (const part of key.split('.')) {
      if (cur == null || typeof cur !== 'object' || !(part in cur)) return null;
      cur = cur[part];
    }
    if (typeof cur !== 'string') return null;
    raw = cur;
  }
  return raw
    .replace(/<wbr>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Printed German chrome whose wording does not always match the i18n value. */
const PRINT_TO_KEY = [
  ['Lebensenergie', 'CHAR.LEP'],
  ['Astralenergie', 'CHAR.ASP'],
  ['Fw', 'CHARAbbrev.FW'],
  ['Ktw.', 'CHARAbbrev.KTW'],
  ['Leiteig.', 'char'],
  ['Kampftechniken', 'TYPES.Item.combatskill'],
  ['Nahkampfwaffen', 'meleeweapons'],
  ['Fernkampfwaffen', 'rangeweapons'],
  ['Rüstungen', 'armor'],
  ['Schild/Parierwaffe', 'LocalizedIDs.Shields'],
  ['Sprachen', 'language'],
  ['Schriften', 'LocalizedIDs.literacy'],
  ['Behinderung', 'encumbrance'],
  ['Anmerkung', 'Notes'],
  ['Talent', 'TYPES.Item.skill'],
  ['Kampfsonderfertigkeiten', 'specialAbilities'],
  ['Klerikale Sonderfertigkeiten', 'specialAbilities'],
  ['Magische Sonderfertigkeiten', 'specialAbilities'],
  ['Allgemeine Sonderfertigkeiten', 'specialAbilities'],
  ['Liturgien & Zeremonien', 'liturgies'],
  ['Liturgien & Zeremonien 2', 'liturgies'],
  ['Zauber & Rituale', 'spells'],
  ['Zauber & Rituale 2', 'spells'],
  ['Liturgie/Zeremonie', 'TYPES.Item.liturgy'],
  ['Zauber/Ritual', 'TYPES.Item.spell'],
  ['Segnungen', 'blessings'],
  ['Zaubertricks', 'magictricks'],
  ['Leiteigenschaft', 'guidevalue'],
  ['Aspekt(e)', 'aspect'],
  ['Merkmal(e)', 'feature'],
  ['Kosten', 'cost'],
  ['Ladezeiten', 'reloadTime'],
  ['Munition', 'Equipment.ammunition'],
  ['Kampftechnik', 'TYPES.Item.combatskill'],
  ['Strukturp.', 'structure'],
  ['Zukauf', 'ABBR.advances'],
  ['Wert', 'ABBR.value'],
  ['Erfahrungsgrad', 'Experience'],
  ['Stg.', 'CHARAbbrev.STF'],
  ['LE', 'CHARAbbrev.LeP'],
  ['TP', 'CHARAbbrev.damage'],
  ['AsP', 'CHARAbbrev.AsP'],
  ['KaP', 'CHARAbbrev.KaP'],
  ['FERTIGKEITEN', 'skills'],
  ['Persönliche Daten', 'personalDetails'],
  ['Kampf', 'Combat'],
  ['AUSRÜSTUNG', 'TYPES.Item.equipment'],
  ['Besitz', 'GROUP.inventory'],
  ['Geldbeutel', 'purse'],
  ['Dukaten', 'Money-D'],
  ['Silbertaler', 'Money-S'],
  ['Heller', 'Money-H'],
  ['Kreuzer', 'Money-K'],
  ['Tragkraft', 'carrycapacity'],
  ['JA', 'yes'],
  ['NEIN', 'no'],
  ['EVTL', 'maybe'],
  ['Zustand', 'condition'],
  ['Schmerz', 'CONDITION.inpain'],
  ['Betäubung', 'CONDITION.stunned'],
  ['Entrückt', 'CONDITION.raptured'],
  ['Furcht', 'CONDITION.feared'],
  ['Paralyse', 'CONDITION.paralysed'],
  ['Verwirrung', 'CONDITION.confused'],
  ['Angriff', 'CHAR.ATTACK'],
  ['Wirkung', 'effect'],
  ['Typus', 'creatureClass'],
  ['Waffen', 'meleeweapons'],
  ['Fernkampf', 'rangeweapons'],
  ['stufe', 'level'],
  ['Wo getragen?', 'place'],
  ['Zus. Abzüge', 'Modifier'],
  ['Schadensbonus', 'CHAR.DAMAGE'],
  ['Geburtsort', 'Home'],
  ['Eigenschaftsmodifikationen', 'Modifiers'],
  ['Fertigkeits-', 'skills'],
  ['Liturgie-', 'TYPES.Item.liturgy'],
  ['Zauber-', 'TYPES.Item.spell'],
  ['Wirkungs-', 'effect'],
  ['dauer', 'duration'],
  ['AP gesamt', 'APValue'],
  ['Gegenstand', 'Name'],
  ['Gesamtgewicht', 'Weight'],
];

const PRINT_LITERAL = {
  'Aktuell': 'Current',
  'Aktionen': 'Actions',
  'Basis': 'Base',
  'Gesamt': 'Total',
  'punkte': 'pts',
  'Malus': 'Penalty',
  'Bonus/': 'Bonus/',
  'Qualitäts-': 'Quality',
  'AP verfügbar': 'AP avail.',
  'AP ausgegeben': 'AP spent',
  'Geburtsdatum': 'Birth date',
  'HELDENDOKUMENT': 'CHARACTER SHEET',
  'Spielwerte': 'Scores',
  'Reise,': 'Travel,',
  'Schlacht, ...': 'Battle, ...',
  'Tierbogen': 'Range band',
  '(Handlungs-': '(Incapaci-',
  'unfähig)': 'tated)',
  'Stufe I': 'Level I',
  'Stufe II': 'Level II',
  'Stufe III': 'Level III',
  'Stufe IV': 'Level IV',
  '0 oder niedriger = Held liegt im Sterben': '0 or less = hero is dying',
  '1/4 LE verloren': '1/4 LP lost',
  '2/4 LE verloren': '2/4 LP lost',
  '3/4 LE verloren': '3/4 LP lost',
  '5 oder weniger LE': '5 or fewer LP',
  '(+1 Schmerz)': '(+1 Pain)',
};

const FRAGMENTS = [
  ['Leiteigenschaft', 'guidevalue'],
  ['Spezies', 'TYPES.Item.species'],
  ['Schmerz', 'CONDITION.inpain'],
  ['Betäubung', 'CONDITION.stunned'],
  ['Entrückt', 'CONDITION.raptured'],
  ['Furcht', 'CONDITION.feared'],
  ['Paralyse', 'CONDITION.paralysed'],
  ['Verwirrung', 'CONDITION.confused'],
  ['Geweihter', 'blessed'],
  ['Zauberer', 'TYPES.Item.spell'],
];

function talentColumns(fwX, y) {
  const dx = fwX - 201.3;
  return [
    { page: 1, x: 136 + dx, y, w: 62, h: 12, key: 'probe', size: 6 },
    { page: 1, x: fwX, y, w: 12, h: 12, key: 'CHARAbbrev.FW', size: 6 },
    { page: 1, x: fwX + 11.3, y, w: 12, h: 12, key: 'CHARAbbrev.RPR', size: 6 },
    { page: 1, x: fwX + 25.5, y, w: 58, h: 12, key: 'Notes', size: 6 },
  ];
}

function spellLikeHeaders(page, titleKey, costKey, featureKey) {
  const y = 660.5;
  return [
    { page, x: 38.8, y, w: 97.8, h: 12, key: titleKey, size: 6 },
    { page, x: 139.5, y, w: 39.7, h: 12, key: 'probe', size: 6 },
    { page, x: 182, y, w: 14, h: 12, key: 'CHARAbbrev.FW', size: 6 },
    { page, x: 196.2, y, w: 39.7, h: 12, key: costKey, size: 6 },
    { page, x: 238.7, y, w: 39.7, h: 12, key: 'castingTime', size: 5 },
    { page, x: 281.2, y, w: 39.7, h: 12, key: 'CHARAbbrev.RW', size: 6 },
    { page, x: 323.7, y, w: 39.7, h: 12, key: 'duration', size: 5 },
    { page, x: 366.2, y, w: 39.7, h: 12, key: featureKey, size: 5 },
    { page, x: 408.8, y, w: 14, h: 12, key: 'CHARAbbrev.STF', size: 6 },
    { page, x: 422.9, y, w: 80, h: 12, key: 'effect', size: 6 },
  ];
}

const ATTRIBUTE_KEYS = ['MU', 'KL', 'IN', 'CH', 'FF', 'GE', 'KO', 'KK'];
const ATTRIBUTE_X = [76.5, 131.8, 187.1, 242.4, 297.6, 352.9, 408.2, 463.5];

function attributeOverlays() {
  const pages = [
    { page: 0, y: 547.8 },
    { page: 1, y: 724.1 },
    { page: 2, y: 724.1 },
    { page: 4, y: 724.1 },
    { page: 5, y: 724.1 },
    { page: 6, y: 724.1 },
    { page: 7, y: 724.1 },
  ];
  const overlays = [];
  for (const { page, y } of pages) {
    ATTRIBUTE_KEYS.forEach((abbr, i) => {
      overlays.push({
        page,
        x: ATTRIBUTE_X[i],
        y,
        w: 55.3,
        h: 12,
        key: `CHARAbbrev.${abbr}`,
        size: 8,
      });
    });
  }
  return overlays;
}

const HEADER_OVERLAYS = [
  { page: 0, x: 18, y: 734.7, w: 72, h: 17, key: 'Name', size: 8 },
  { page: 0, x: 18, y: 712.6, w: 72, h: 17, key: 'Gender', size: 8 },
  { page: 0, x: 18, y: 690.5, w: 72, h: 17, key: 'TYPES.Item.species', size: 8 },
  { page: 0, x: 18, y: 646.3, w: 72, h: 17, key: 'Age', size: 8 },
  { page: 0, x: 18, y: 624.2, w: 72, h: 17, key: 'Hair_color', size: 7 },
  { page: 0, x: 18, y: 602.1, w: 72, h: 17, key: 'Eye_color', size: 7 },
  { page: 0, x: 18, y: 580, w: 90, h: 17, key: 'Height', size: 7 },
  { page: 0, x: 157.4, y: 580, w: 50, h: 17, key: 'Weight', size: 7 },
  { page: 0, x: 370, y: 734.7, w: 70, h: 17, key: 'TYPES.Item.career', size: 7 },
  { page: 0, x: 370, y: 712.6, w: 70, h: 17, key: 'TYPES.Item.culture', size: 7 },
  { page: 0, x: 370, y: 690.5, w: 70, h: 17, key: 'Socialstate', size: 6 },
  { page: 0, x: 370, y: 668.4, w: 70, h: 17, key: 'Home', size: 8 },
  { page: 0, x: 370, y: 646.3, w: 70, h: 17, key: 'Family', size: 8 },
  { page: 0, x: 370, y: 580, w: 70, h: 17, key: 'Distinguishing_mark', size: 5 },
  { page: 0, x: 360, y: 467.7, w: 92, h: 20, key: 'wounds', size: 7 },
  { page: 0, x: 360, y: 425.6, w: 92, h: 20, key: 'astralenergy', size: 7 },
  { page: 0, x: 360, y: 383.6, w: 92, h: 20, key: 'karmaenergy', size: 7 },
  { page: 0, x: 360, y: 341.5, w: 92, h: 20, key: 'soulpower', size: 7 },
  { page: 0, x: 360, y: 299.5, w: 92, h: 20, key: 'toughness', size: 7 },
  { page: 0, x: 360, y: 257.4, w: 92, h: 20, key: 'dodge', size: 7 },
  { page: 0, x: 454.7, y: 490.1, w: 20, h: 11, key: 'ABBR.value', size: 5 },
  { page: 0, x: 480.2, y: 490.1, w: 24, h: 11, key: 'ABBR.modifiers', size: 5 },
  { page: 0, x: 505.7, y: 490.1, w: 24, h: 11, key: 'ABBR.advances', size: 5 },
  { page: 0, x: 531.2, y: 490.1, w: 24, h: 11, key: 'ABBR.max', size: 5 },
  { page: 0, x: 280, y: 164.1, w: 84, h: 20, key: 'fatePoints', size: 6 },
  { page: 0, x: 280, y: 98.6, w: 84, h: 20, key: 'Experience', size: 6 },
  { page: 0, x: 46.8, y: 483.8, w: 180, h: 14, key: 'advantages', size: 8 },
  { page: 0, x: 46.8, y: 343.1, w: 180, h: 14, key: 'disadvantages', size: 8 },
  { page: 0, x: 46.8, y: 201.5, w: 200, h: 14, key: 'specialAbilities', size: 8 },
  { page: 1, x: 36, y: 630.5, w: 100, h: 12, key: 'SKILL.body', size: 7 },
  { page: 1, x: 36, y: 434.9, w: 100, h: 12, key: 'SKILL.social', size: 7 },
  { page: 1, x: 36, y: 304.5, w: 100, h: 12, key: 'SKILL.nature', size: 7 },
  { page: 1, x: 297, y: 630.5, w: 100, h: 12, key: 'SKILL.knowledge', size: 7 },
  { page: 1, x: 297, y: 461, w: 100, h: 12, key: 'SKILL.trade', size: 7 },
  ...talentColumns(201.3, 630.5),
  ...talentColumns(201.3, 434.9),
  ...talentColumns(201.3, 304.5),
  ...talentColumns(462.3, 630.5),
  ...talentColumns(462.3, 461),
  { page: 1, x: 400, y: 759.1, w: 74, h: 20, key: 'encumbrance', size: 6 },
  { page: 1, x: 352.3, y: 200.5, w: 160, h: 14, key: 'language', size: 8 },
  { page: 1, x: 352.3, y: 111.9, w: 160, h: 14, key: 'LocalizedIDs.literacy', size: 8 },
  { page: 2, x: 248, y: 759.1, w: 30, h: 20, key: 'CHARAbbrev.GS', size: 7 },
  { page: 2, x: 297, y: 759.1, w: 30, h: 20, key: 'CHARAbbrev.LeP', size: 7 },
  { page: 2, x: 346, y: 759.1, w: 30, h: 20, key: 'CHARAbbrev.AW', size: 7 },
  { page: 2, x: 395, y: 759.1, w: 30, h: 20, key: 'CHARAbbrev.INI', size: 7 },
  { page: 2, x: 444, y: 759.1, w: 30, h: 20, key: 'CHARAbbrev.SK', size: 7 },
  { page: 2, x: 493, y: 759.1, w: 30, h: 20, key: 'CHARAbbrev.ZK', size: 7 },
  { page: 2, x: 37, y: 671.6, w: 93, h: 12, key: 'TYPES.Item.combatskill', size: 6 },
  { page: 2, x: 131.5, y: 671.6, w: 44, h: 12, key: 'char', size: 5 },
  { page: 2, x: 179.2, y: 671.6, w: 34, h: 12, key: 'CHARAbbrev.FW', size: 7 },
  { page: 2, x: 213.2, y: 671.6, w: 34, h: 12, key: 'CHARAbbrev.AT', size: 7 },
  { page: 2, x: 247.2, y: 671.6, w: 34, h: 12, key: 'CHARAbbrev.PA', size: 7 },
  { page: 2, x: 307.8, y: 671.6, w: 180, h: 12, key: 'specialAbilities', size: 8 },
  { page: 2, x: 38.8, y: 436.9, w: 90.7, h: 12, key: 'meleeweapons', size: 6 },
  { page: 2, x: 131.3, y: 436.9, w: 91.6, h: 12, key: 'TYPES.Item.combatskill', size: 5 },
  { page: 2, x: 288, y: 436.9, w: 65, h: 12, key: 'CHARAbbrev.damage', size: 6 },
  { page: 2, x: 407.1, y: 436.9, w: 48.2, h: 12, key: 'reach', size: 6 },
  { page: 2, x: 458.1, y: 436.9, w: 23.4, h: 12, key: 'CHARAbbrev.AT', size: 6 },
  { page: 2, x: 482.9, y: 436.9, w: 23.4, h: 12, key: 'CHARAbbrev.PA', size: 6 },
  { page: 2, x: 509.1, y: 436.9, w: 47.3, h: 12, key: 'Weight', size: 6 },
  { page: 2, x: 38.8, y: 334.6, w: 90.7, h: 12, key: 'rangeweapons', size: 6 },
  { page: 2, x: 132.4, y: 334.6, w: 91.6, h: 12, key: 'TYPES.Item.combatskill', size: 5 },
  { page: 2, x: 226.8, y: 334.6, w: 58.4, h: 12, key: 'CHARAbbrev.reloadTime', size: 6 },
  { page: 2, x: 288, y: 334.6, w: 65.2, h: 12, key: 'CHARAbbrev.damage', size: 6 },
  { page: 2, x: 356, y: 334.6, w: 48.2, h: 12, key: 'Equipment.ammunition', size: 5 },
  { page: 2, x: 407.1, y: 334.6, w: 48.2, h: 12, key: 'CHARAbbrev.RW', size: 6 },
  { page: 2, x: 458.1, y: 334.6, w: 48.2, h: 12, key: 'CHARAbbrev.FK', size: 6 },
  { page: 2, x: 509.1, y: 334.6, w: 47.3, h: 12, key: 'Weight', size: 6 },
  { page: 2, x: 38.8, y: 232.3, w: 90.7, h: 12, key: 'armor', size: 7 },
  { page: 2, x: 132.4, y: 232.3, w: 22.7, h: 12, key: 'CHARAbbrev.RS', size: 6 },
  { page: 2, x: 157.9, y: 232.3, w: 22.7, h: 12, key: 'encumbrance', size: 4 },
  { page: 2, x: 234.4, y: 232.3, w: 31.2, h: 12, key: 'Weight', size: 5 },
  { page: 2, x: 328.5, y: 232.3, w: 75.7, h: 12, key: 'LocalizedIDs.Shields', size: 7 },
  { page: 2, x: 407.1, y: 232.3, w: 48.2, h: 12, key: 'structure', size: 5 },
  { page: 2, x: 509.1, y: 232.3, w: 47.3, h: 12, key: 'Weight', size: 6 },
  { page: 3, x: 320, y: 766.2, w: 74, h: 20, key: 'Equipment.money', size: 8 },
  { page: 3, x: 41.7, y: 725.8, w: 129.8, h: 12, key: 'TYPES.Item.equipment', size: 7 },
  { page: 3, x: 174.3, y: 725.8, w: 48.2, h: 12, key: 'Weight', size: 6 },
  { page: 3, x: 225.4, y: 725.8, w: 69.4, h: 12, key: 'place', size: 6 },
  { page: 3, x: 300.5, y: 725.8, w: 129.8, h: 12, key: 'TYPES.Item.equipment', size: 7 },
  { page: 3, x: 433.1, y: 725.8, w: 48.2, h: 12, key: 'Weight', size: 6 },
  { page: 3, x: 484.2, y: 725.8, w: 69.4, h: 12, key: 'place', size: 6 },
  { page: 3, x: 120, y: 229.3, w: 50, h: 16, key: 'Weight', size: 7 },
  { page: 3, x: 430, y: 229.3, w: 88, h: 16, key: 'carrycapacity', size: 6 },
  ...spellLikeHeaders(4, 'liturgies', 'CHARAbbrev.KaP', 'aspect'),
  ...spellLikeHeaders(5, 'liturgies', 'CHARAbbrev.KaP', 'aspect'),
  ...spellLikeHeaders(6, 'spells', 'CHARAbbrev.AsP', 'feature'),
  ...spellLikeHeaders(7, 'spells', 'CHARAbbrev.AsP', 'feature'),
  { page: 4, x: 18, y: 320.9, w: 58, h: 20, key: 'aspect', size: 7 },
  { page: 4, x: 18, y: 277.2, w: 58, h: 20, key: 'guidevalue', size: 5 },
  { page: 4, x: 46.8, y: 215.7, w: 180, h: 14, key: 'specialAbilities', size: 8 },
  { page: 4, x: 314.4, y: 215.7, w: 180, h: 14, key: 'blessings', size: 8 },
  { page: 6, x: 18, y: 320.9, w: 58, h: 20, key: 'feature', size: 7 },
  { page: 6, x: 18, y: 277.2, w: 58, h: 20, key: 'guidevalue', size: 5 },
  { page: 6, x: 46.8, y: 215.7, w: 180, h: 14, key: 'specialAbilities', size: 8 },
  { page: 6, x: 314.4, y: 215.7, w: 180, h: 14, key: 'magictricks', size: 8 },
];

function allOverlays() {
  return [...HEADER_OVERLAYS, ...attributeOverlays()];
}

function overlayKeys() {
  return [...new Set([...allOverlays().map((o) => o.key), ...PRINT_TO_KEY.map(([, key]) => key)])];
}

function leitOptions(dict) {
  return ['FF', 'GE', 'KK', 'GE/KK'].map((k) => loc(dict, `CHARAbbrev.${k}`));
}

function buildReplacements(en, de, talentNames = {}, combatSkills = []) {
  const map = new Map();
  const add = (from, to) => {
    if (!from || !to) return;
    const a = String(from).trim();
    const b = String(to).trim();
    if (a && b && a !== b) map.set(a, b);
  };
  for (const key of overlayKeys()) add(loc(de, key), loc(en, key));
  for (const [print, key] of PRINT_TO_KEY) add(print, loc(en, key));
  for (const [print, text] of Object.entries(PRINT_LITERAL)) add(print, text);
  add('Größe / Gewicht', `${loc(en, 'Height')} / ${loc(en, 'Weight')}`);
  for (const talent of Object.values(talentNames)) add(talent.de, talent.en);
  add('Planzenkunde', talentNames[28] && talentNames[28].en);
  for (const skill of combatSkills) add(skill.de, skill.en);
  return map;
}

function translateAbbrevRun(str, en) {
  const direct = loc(en, `CHARAbbrev.${str}`);
  if (direct && direct !== str) return direct;
  if (!/^[A-ZÄÖÜ]{2}(\/[A-ZÄÖÜ]{2})+$/.test(str)) return null;
  const translated = str
    .split('/')
    .map((part) => loc(en, `CHARAbbrev.${part}`) || part)
    .join('/');
  return translated === str ? null : translated;
}

function decodeToUnicode(cmap) {
  const map = new Map();
  const beginbfchar = /beginbfchar\s+([\s\S]*?)endbfchar/g;
  const beginbfrange = /beginbfrange\s+([\s\S]*?)endbfrange/g;
  let m;
  while ((m = beginbfchar.exec(cmap))) {
    const re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let p;
    while ((p = re.exec(m[1]))) map.set(p[1].toUpperCase(), String.fromCharCode(parseInt(p[2], 16)));
  }
  while ((m = beginbfrange.exec(cmap))) {
    const re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let p;
    while ((p = re.exec(m[1]))) {
      const start = parseInt(p[1], 16);
      const end = parseInt(p[2], 16);
      let uni = parseInt(p[3], 16);
      const width = p[1].length;
      for (let i = start; i <= end; i++) {
        map.set(i.toString(16).toUpperCase().padStart(width, '0'), String.fromCharCode(uni++));
      }
    }
  }
  return map;
}

function invertCmap(decodeMap) {
  const encodeMap = new Map();
  for (const [cid, ch] of decodeMap.entries()) {
    if (!encodeMap.has(ch)) encodeMap.set(ch, cid);
  }
  return encodeMap;
}

function decodeHex(hex, decodeMap) {
  let out = '';
  for (let i = 0; i < hex.length; i += 4) {
    out += decodeMap.get(hex.slice(i, i + 4).toUpperCase()) || '';
  }
  return out;
}

function encodeText(text, encodeMap) {
  let hex = '';
  for (const ch of text) {
    const cid = encodeMap.get(ch);
    if (!cid) return null;
    hex += cid;
  }
  return hex;
}

function fontMapsFromResources(pdf, resourcesRef) {
  if (!resourcesRef) return [];
  const resDict = pdf.context.lookup(resourcesRef);
  const fonts = resDict.get && resDict.get(PDFName.of('Font'));
  if (!fonts) return [];
  const fontDict = pdf.context.lookup(fonts);
  const maps = [];
  for (const [, fref] of fontDict.entries()) {
    const fd = pdf.context.lookup(fref);
    const tu = fd.get(PDFName.of('ToUnicode'));
    if (!tu) continue;
    const cmap = decodeToUnicode(Buffer.from(decodePDFRawStream(pdf.context.lookup(tu)).decode()).toString('utf8'));
    maps.push({ decode: cmap, encode: invertCmap(cmap) });
  }
  return maps;
}

function translateFragments(str, en) {
  let out = str;
  for (const [german, key] of FRAGMENTS) {
    const to = loc(en, key);
    if (to && out.includes(german)) out = out.split(german).join(to);
  }
  const abbrev = /(?<![A-Za-z])(MU|KL|IN|CH|FF|GE|KO|KK|LE|GS|SK|ZK|AW|INI|FW|AT|PA|TP|RS|BE|AsP|KaP|AE|KE)(?![A-Za-z])/g;
  out = out.replace(abbrev, (token) => {
    const mapped = {
      LE: 'CHARAbbrev.LeP',
      AE: 'CHARAbbrev.AsP',
      KE: 'CHARAbbrev.KaP',
      BE: 'encumbrance',
    }[token] || `CHARAbbrev.${token}`;
    return loc(en, mapped) || token;
  });
  out = out
    .replaceAll('durch', 'via')
    .replaceAll(' der ', ' of ')
    .replaceAll('GW ', 'BV ');
  return out !== str ? out : null;
}

function replacementFor(decoded, replacements, en) {
  const trimmed = decoded.trim();
  if (!trimmed) return null;
  return replacements.get(trimmed)
    || replacements.get(decoded)
    || translateAbbrevRun(trimmed, en)
    || translateFragments(trimmed, en);
}

function formatTf(font, size, original) {
  const make = (value, spaces = 1) => `/C0_${font} ${value}` + ' '.repeat(Math.max(1, spaces)) + 'Tf';
  let text = make(size);
  if (text.length === original.length) return text;
  if (text.length < original.length) return make(size, 1 + original.length - text.length);
  const rounded = Math.max(5, Math.round(size));
  text = make(rounded);
  if (text.length === original.length) return text;
  if (text.length < original.length) return make(rounded, 1 + original.length - text.length);
  return text;
}

function rewriteContent(text, replacements, maps, en) {
  if (!text.includes('TJ') && !text.includes('Tj')) return { text, count: 0 };
  const tokenRe = /\/C0_(\d)\s+([0-9.]+)\s+Tf|\[([^\[\]]*)\]\s*TJ|<([0-9A-Fa-f]+)>\s*Tj/g;
  const tfOps = new Map();
  const tjOps = [];
  let lastTf = null;
  let count = 0;
  let m;
  while ((m = tokenRe.exec(text))) {
    if (m[1] != null) {
      lastTf = { start: m.index, end: m.index + m[0].length, font: m[1], size: Number(m[2]), raw: m[0] };
      continue;
    }
    const isArray = m[3] != null;
    const hexParts = isArray
      ? [...m[3].matchAll(/<([0-9A-Fa-f]+)>/g)].map((p) => p[1])
      : (m[4].length >= 4 && m[4].length % 4 === 0 ? [m[4]] : []);
    if (!hexParts.length) continue;
    for (const map of maps) {
      const decoded = hexParts.map((hex) => decodeHex(hex, map.decode)).join('');
      const to = replacementFor(decoded, replacements, en);
      if (!to) continue;
      const encoded = encodeText(to, map.encode);
      if (!encoded) continue;
      const from = decoded.trim();
      if (lastTf && from.length <= 4 && to.length > from.length) {
        const newSize = Math.max(5, Math.round((lastTf.size * from.length / to.length) * 10) / 10);
        if (newSize < lastTf.size - 0.05) {
          const prev = tfOps.get(lastTf.start);
          const size = prev ? Math.min(prev.size, newSize) : newSize;
          tfOps.set(lastTf.start, {
            start: lastTf.start,
            end: lastTf.end,
            size,
            text: formatTf(lastTf.font, size, lastTf.raw),
          });
        }
      }
      tjOps.push({
        start: m.index,
        end: m.index + m[0].length,
        text: isArray ? `[<${encoded}>] TJ` : `<${encoded}> Tj`,
      });
      count += 1;
      break;
    }
  }
  const ops = [...tfOps.values(), ...tjOps].sort((a, b) => b.start - a.start || b.end - a.end);
  if (!ops.length) return { text, count: 0 };
  let next = text;
  for (const op of ops) {
    next = next.slice(0, op.start) + op.text + next.slice(op.end);
  }
  return { text: next, count };
}

function setStreamBytes(context, ref, bytes) {
  const old = context.lookup(ref);
  old.contents = bytes;
  old.dict.delete(PDFName.of('Filter'));
  old.dict.delete(PDFName.of('DecodeParms'));
  old.dict.set(PDFName.of('Length'), context.obj(bytes.length));
}

function contentRefs(contents) {
  if (!contents) return [];
  return contents.asArray ? contents.asArray() : [contents];
}

function rewriteStreamRef(pdf, ref, replacements, maps, en, seen) {
  const key = String(ref);
  if (seen.has(key)) return 0;
  seen.add(key);
  const stream = pdf.context.lookup(ref);
  if (!stream || !stream.dict) return 0;
  const subtype = stream.dict.get(PDFName.of('Subtype'));
  if (subtype && subtype !== PDFName.of('Form')) return 0;
  let count = 0;
  const localMaps = fontMapsFromResources(pdf, stream.dict.get(PDFName.of('Resources')));
  const useMaps = localMaps.length ? localMaps : maps;
    if (useMaps.length && stream.contents) {
      let original;
      try {
        original = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
      } catch (err) {
        original = null;
      }
      if (original) {
        const rewritten = rewriteContent(original, replacements, useMaps, en);
        if (rewritten.count) {
          setStreamBytes(pdf.context, ref, new Uint8Array(Buffer.from(rewritten.text, 'latin1')));
          count += rewritten.count;
        }
      }
    }
  const resources = stream.dict.get(PDFName.of('Resources')) || null;
  count += walkXObjects(pdf, resources, replacements, useMaps, en, seen);
  return count;
}

function walkXObjects(pdf, resourcesRef, replacements, maps, en, seen) {
  if (!resourcesRef) return 0;
  const resDict = pdf.context.lookup(resourcesRef);
  const xobj = resDict.get && resDict.get(PDFName.of('XObject'));
  if (!xobj) return 0;
  const xdict = pdf.context.lookup(xobj);
  let count = 0;
  for (const [, child] of xdict.entries()) {
    count += rewriteStreamRef(pdf, child, replacements, maps, en, seen);
  }
  return count;
}

function rewritePrintedLabels(pdfDoc, talentNames, combatSkills) {
  const en = loadLang('en');
  const de = loadLang('de');
  const replacements = buildReplacements(en, de, talentNames, combatSkills);
  const seen = new Set();
  let count = 0;
  for (const page of pdfDoc.getPages()) {
    const resources = page.node.Resources();
    const maps = fontMapsFromResources(pdfDoc, resources);
    for (const ref of contentRefs(page.node.Contents())) {
      count += rewriteStreamRef(pdfDoc, ref, replacements, maps, en, seen);
    }
    count += walkXObjects(pdfDoc, resources, replacements, maps, en, seen);
  }
  return count;
}

function collectPrintedStrings(pdfDoc) {
  const seen = new Set();
  const strings = new Set();
  const visit = (ref, maps) => {
    const key = String(ref);
    if (seen.has(key)) return;
    seen.add(key);
    const stream = pdfDoc.context.lookup(ref);
    if (!stream || !stream.dict) return;
    const subtype = stream.dict.get(PDFName.of('Subtype'));
    if (subtype && subtype !== PDFName.of('Form')) return;
    const localMaps = fontMapsFromResources(pdfDoc, stream.dict.get(PDFName.of('Resources')));
    const useMaps = localMaps.length ? localMaps : maps;
    if (useMaps.length && stream.contents) {
      let text;
      try {
        text = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
      } catch (err) {
        return;
      }
      const tjRe = /\[([^\[\]]*)\]\s*TJ/g;
      let m;
      while ((m = tjRe.exec(text))) {
        const parts = [...m[1].matchAll(/<([0-9A-Fa-f]+)>/g)];
        for (const map of useMaps) {
          const decoded = parts.map((p) => decodeHex(p[1], map.decode)).join('').trim();
          if (decoded) strings.add(decoded);
        }
      }
      const tj2 = /<([0-9A-Fa-f]+)>\s*Tj/g;
      while ((m = tj2.exec(text))) {
        for (const map of useMaps) {
          const decoded = decodeHex(m[1], map.decode).trim();
          if (decoded) strings.add(decoded);
        }
      }
    }
    walkVisit(stream.dict.get(PDFName.of('Resources')), useMaps);
  };
  const walkVisit = (resourcesRef, maps) => {
    if (!resourcesRef) return;
    const resDict = pdfDoc.context.lookup(resourcesRef);
    const xobj = resDict.get && resDict.get(PDFName.of('XObject'));
    if (!xobj) return;
    const xdict = pdfDoc.context.lookup(xobj);
    for (const [, child] of xdict.entries()) visit(child, maps);
  };
  for (const page of pdfDoc.getPages()) {
    const resources = page.node.Resources();
    const maps = fontMapsFromResources(pdfDoc, resources);
    for (const ref of contentRefs(page.node.Contents())) visit(ref, maps);
    walkVisit(resources, maps);
  }
  return strings;
}

function drawFallbackHeaders(pdfDoc, font) {
  const en = loadLang('en');
  const de = loadLang('de');
  let added = 0;
  for (const o of HEADER_OVERLAYS.filter((item) => item.page === 3)) {
    const enText = loc(en, o.key);
    const deText = loc(de, o.key);
    if (!enText || !deText || enText === deText) continue;
    const page = pdfDoc.getPage(o.page);
    page.drawRectangle({
      x: o.x,
      y: o.y,
      width: o.w,
      height: o.h,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });
    page.drawText(enText, {
      x: o.x + 1,
      y: o.y + Math.max(2, (o.h - (o.size || 7)) / 2),
      size: o.size || 7,
      font,
      color: rgb(0, 0, 0),
    });
    added += 1;
  }
  return added;
}

function addHeaderOverlays(pdfDoc, lang, font, talentNames, combatSkills) {
  if (lang !== 'en') return { rewritten: 0, drawn: 0 };
  const rewritten = rewritePrintedLabels(pdfDoc, talentNames, combatSkills);
  const drawn = drawFallbackHeaders(pdfDoc, font);
  return { rewritten, drawn };
}

function lockField(field) {
  field.enableReadOnly();
}

module.exports = {
  FOUNDRY_LANG_DIR,
  loadLang,
  loc,
  allOverlays,
  overlayKeys,
  leitOptions,
  buildReplacements,
  addHeaderOverlays,
  collectPrintedStrings,
  lockField,
};

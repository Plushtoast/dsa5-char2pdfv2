import { CharacterUtils } from './locale.js';
import { RomanNumerals } from './roman.js';
import { Config } from '../ulisses/field-map.js';
import { SHEET_PAGES } from '../config/sheet-pages.js';
import {
  calculateCombatSkillValues,
  equipmentCategories,
  experienceGrades,
  isShield,
  languageToken,
  literacyToken,
  moneyName,
  skillGroups,
  socialStateChoices,
  statusEffects,
} from './dsa5-api.js';

const SKILL_GROUP_ORDER = ['body', 'social', 'nature', 'knowledge', 'trade'];

const CHARACTERISTIC_KEYS = ['mu', 'kl', 'in', 'ch', 'ff', 'ge', 'ko', 'kk'];

const SKIP_CONDITION_IDS = new Set(['dead', 'services']);
const CONDITION_LEVEL_MARKS = ['-', 'I', 'II', 'III', 'IV'];

function itemsOf(actor) {
  const raw = actor?.items;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw.contents !== 'undefined') return [...raw.contents];
  if (typeof raw.filter === 'function') return raw.filter(() => true);
  return [...raw];
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function text(value) {
  return value == null ? '' : String(value).normalize('NFC');
}

function roundWeight(value) {
  return Math.round(num(value) * 100) / 100;
}

function hasProse(value) {
  return text(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length > 0;
}

function characteristicTotal(char) {
  if (!char) return 0;
  if (typeof char.value === 'number') return char.value;
  return num(char.initial) + num(char.modifier) + num(char.advances) + num(char.gearmodifier);
}

function setting(namespace, key, fallback) {
  try {
    const value = globalThis.game?.settings?.get?.(namespace, key);
    return value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

function cloneSystem(item) {
  return {
    name: item.name,
    type: item.type,
    id: item.id,
    img: item.img,
    system: JSON.parse(JSON.stringify(item.system || {})),
  };
}

export function isSectionEmpty(snapshot, key) {
  const value = snapshot?.[key];
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return !hasProse(value);
  if (typeof value === 'number') return value === 0;
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'object') {
    if ('hasContent' in value) return !value.hasContent;
    if ('max' in value) return !num(value.max);
    return Object.values(value).every((entry) => isSectionEmpty({ x: entry }, 'x'));
  }
  return false;
}

export function shouldSkipPage(snapshot, page) {
  if (!page?.skipWhenEmpty?.length) return false;
  return page.skipWhenEmpty.every((key) => isSectionEmpty(snapshot, key));
}

/**
 * Plain JSON the HTML sheet templates consume. Localizes names/abbreviations here.
 * No MAX_ITEMS truncation. Ulisses fill does not use this yet.
 */
export class ActorSnapshot {
  constructor(actor, lang, options = {}) {
    this.actor = actor;
    this.lang = CharacterUtils.resolveLang(lang);
    this.localizeFn = typeof options.localize === 'function'
      ? options.localize
      : (key) => globalThis.game?.i18n?.localize?.(key) ?? key;
    this.includeBiography = options.includeBiography === true;
    this.moneyHasWeight = options.moneyHasWeight ?? setting('dsa5', 'moneyHasWeight', false);
    this.items = itemsOf(actor);
  }

  loc(key) {
    const translated = this.localizeFn(key);
    return translated == null || translated === '' ? key : translated;
  }

  abbrev(code) {
    if (!code) return '';
    const raw = String(code);
    if (raw.includes('/')) {
      return raw.split('/').map((part) => this.abbrev(part.trim())).join('/');
    }
    const token = CHARACTERISTIC_KEYS.includes(raw.toLowerCase()) ? raw.toUpperCase() : raw;
    return this.loc(`CHARAbbrev.${token}`);
  }

  leitwert(code) {
    if (!code || code === '-') return '';
    return this.loc(`CHAR.${String(code).toUpperCase()}`);
  }

  withStep(name, step) {
    const roman = RomanNumerals.romanize(Number(step));
    return roman ? `${name} ${roman}` : name;
  }

  filterType(type, extra = null) {
    const list = this.items.filter((item) => item.type === type);
    return extra ? list.filter(extra) : list;
  }

  isShieldSkill(skillName) {
    return isShield({ system: { combatskill: { value: skillName } } });
  }

  static build(actor, lang, options) {
    return new ActorSnapshot(actor, lang, options).build();
  }

  build() {
    const system = this.actor?.system || {};
    const snapshot = {
      lang: this.lang,
      name: text(this.actor?.name),
      portrait: text(this.actor?.img),
      personal: this.#personal(system),
      attributes: this.#attributes(system),
      derived: this.#derived(system),
      fate: this.#fate(system),
      experience: this.#experience(system),
      traits: this.#traits(),
      talentGroups: this.#talentGroups(),
      languages: this.#languages(),
      scripts: this.#scripts(),
      combatTechniques: this.#combatTechniques(system),
      melee: [],
      ranged: [],
      armor: [],
      shields: [],
      combatAbilities: this.#specials('Combat'),
      conditions: this.#conditions(system),
      coins: this.#coins(),
      inventory: [],
      carryCapacity: num(system.carrycapacity),
      weightTotal: 0,
      liturgies: this.#spellLikes(['liturgy', 'ceremony']),
      blessings: this.filterType('blessing').map((item) => item.name),
      clericalAbilities: this.#specials('clerical'),
      clerical: {
        tradition: text(system.tradition?.clerical),
        aspect: this.leitwert(system.feature?.clerical),
        guidevalue: this.leitwert(system.guidevalue?.clerical),
      },
      spells: this.#spellLikes(['spell', 'ritual']),
      cantrips: this.filterType('magictrick').map((item) => item.name),
      magicalAbilities: this.#specials('magical'),
      magical: {
        tradition: text(system.tradition?.magical),
        feature: this.leitwert(system.feature?.magical),
        guidevalue: this.leitwert(system.guidevalue?.magical),
      },
      notes: this.#notes(system),
    };

    snapshot.astral = snapshot.derived.ae;
    snapshot.karma = snapshot.derived.kp;

    const combatByName = {};
    for (const row of snapshot.combatTechniques) combatByName[row.name] = row;
    snapshot.melee = this.#melee(combatByName);
    snapshot.ranged = this.#ranged(combatByName);
    snapshot.armor = this.#armor();
    snapshot.shields = this.#shields();
    snapshot.inventory = this.#inventory();
    snapshot.weightTotal = roundWeight(
      snapshot.inventory.reduce((sum, row) => sum + num(row.weightTotal), 0),
    );

    snapshot.skip = {};
    for (const page of SHEET_PAGES) {
      if (page.skipWhenEmpty) snapshot.skip[page.id] = shouldSkipPage(snapshot, page);
    }
    snapshot.pages = SHEET_PAGES.filter((page) => !snapshot.skip[page.id]).map((page) => page.id);
    return snapshot;
  }

  #personal(system) {
    const details = system.details || {};
    const socialRaw = details.socialstate?.value;
    const socialKey = socialStateChoices()[socialRaw] ?? socialRaw;
    const socialstatus = socialKey === '-' || socialKey == null || socialKey === ''
      ? ''
      : (typeof socialRaw === 'number' ? this.loc(socialKey) : text(socialRaw));

    return {
      name: text(this.actor?.name),
      gender: text(details.gender?.value),
      species: text(details.species?.value),
      culture: text(details.culture?.value),
      career: text(details.career?.value),
      socialstatus: socialstatus === socialKey ? text(socialRaw) : socialstatus,
      home: text(details.Home?.value),
      family: text(details.family?.value),
      age: text(details.age?.value),
      hair: text(details.haircolor?.value),
      eyes: text(details.eyecolor?.value),
      height: text(details.height?.value),
      weight: text(details.weight?.value),
      distinguishing: text(details.distinguishingmark?.value),
      portrait: text(this.actor?.img),
    };
  }

  #attributes(system) {
    const chars = system.characteristics || {};
    return CHARACTERISTIC_KEYS.map((key) => ({
      key,
      abbrev: this.abbrev(key),
      value: characteristicTotal(chars[key]),
    }));
  }

  #energy(block, abbrevKey) {
    const src = block || {};
    return {
      abbrev: this.abbrev(abbrevKey),
      max: num(src.max),
      current: num(src.current),
      value: num(src.value),
      advances: num(src.advances),
      modifier: num(src.modifier),
    };
  }

  #derived(system) {
    const status = system.status || {};
    const chars = system.characteristics || {};
    const speed = status.speed || {};
    const initiative = status.initiative || {};
    const speedValue = speed.value != null
      ? num(speed.value)
      : num(speed.initial) + num(speed.modifier) + num(speed.gearmodifier);
    const iniValue = Math.round((characteristicTotal(chars.mu) + characteristicTotal(chars.ge)) / 2)
      + num(initiative.modifier) + num(initiative.gearmodifier);

    return {
      lp: this.#energy(status.wounds, 'LeP'),
      ae: this.#energy(status.astralenergy, 'AsP'),
      kp: this.#energy(status.karmaenergy, 'KaP'),
      spi: {
        abbrev: this.abbrev('SK'),
        max: num(status.soulpower?.max),
        value: num(status.soulpower?.value),
        modifier: num(status.soulpower?.modifier),
      },
      tou: {
        abbrev: this.abbrev('ZK'),
        max: num(status.toughness?.max),
        value: num(status.toughness?.value),
        modifier: num(status.toughness?.modifier),
      },
      dodge: {
        abbrev: this.abbrev('AW'),
        max: num(status.dodge?.max),
        value: num(status.dodge?.value),
        modifier: num(status.dodge?.modifier),
      },
      mov: { abbrev: this.abbrev('GS'), value: speedValue },
      ini: { abbrev: this.abbrev('INI'), value: iniValue },
    };
  }

  #fate(system) {
    const fate = system.status?.fatePoints || {};
    return {
      current: num(fate.current, num(fate.value, 3)),
      max: num(fate.max, num(fate.current, 3)),
      value: num(fate.value, num(fate.current)),
      modifier: num(fate.modifier),
    };
  }

  #experience(system) {
    const exp = system.details?.experience || {};
    const total = num(exp.total);
    const spent = num(exp.spent);
    const gradeKey = exp.description || experienceGrades().find((g) => total >= g.threshold)?.label || 'EXP.inexperienced';
    return {
      total,
      spent,
      current: exp.current != null ? num(exp.current) : total - spent,
      gradeKey,
      grade: this.loc(gradeKey),
    };
  }

  #namedList(type, extra = null) {
    return this.filterType(type, extra).map((item) => this.withStep(item.name, item.system?.step?.value));
  }

  #specials(category) {
    return this.#namedList('specialability', (item) => item.system?.category?.value === category);
  }

  #traits() {
    const general = this.#specials('general');
    const fate = this.#specials('fatePoints');
    return {
      advantages: this.#namedList('advantage'),
      disadvantages: this.#namedList('disadvantage'),
      generalAbilities: general,
      fateAbilities: fate,
    };
  }

  #skillFields(skill) {
    const chars = [
      skill.system?.characteristic1?.value,
      skill.system?.characteristic2?.value,
      skill.system?.characteristic3?.value,
    ];
    const encKey = skill.system?.burden?.value || '';
    const group = skill.system?.group?.value || 'body';
    return {
      name: skill.name,
      check: chars.filter(Boolean).map((code) => this.abbrev(code)).join('/'),
      sr: num(skill.system?.talentValue?.value),
      enc: encKey ? this.loc(encKey) : '',
      notes: '',
      group,
    };
  }

  #talentGroups() {
    const labels = skillGroups();
    const groups = Object.fromEntries(SKILL_GROUP_ORDER.map((id) => [id, {
      id,
      label: this.loc(labels[id] || `SKILL.${id}`),
      rows: [],
    }]));

    for (const skill of this.filterType('skill')) {
      const row = this.#skillFields(skill);
      (groups[row.group] || groups.body).rows.push(row);
    }

    return SKILL_GROUP_ORDER.map((id) => groups[id]);
  }

  #languageLike(script) {
    const token = script ? literacyToken() : languageToken();
    return this.filterType('specialability', (item) => {
      if (item.system?.category?.value !== 'language') return false;
      return token && text(item.name).includes(token);
    }).map((item) => this.withStep(item.name, item.system?.step?.value));
  }

  #languages() {
    return this.#languageLike(false);
  }

  #scripts() {
    return this.#languageLike(true);
  }

  #combatValues(skillItem, system) {
    const calculated = calculateCombatSkillValues(cloneSystem(skillItem), system);
    return {
      sr: num(calculated.system?.talentValue?.value),
      at: num(calculated.system?.attack?.value),
      pa: num(calculated.system?.parry?.value),
      guidevalue: text(calculated.system?.guidevalue?.value),
      weapontype: num(calculated.system?.weapontype?.value),
    };
  }

  #combatTechniques(system) {
    return this.filterType('combatskill').map((item) => {
      const values = this.#combatValues(item, system);
      const hasParry = values.weapontype === 0;
      return {
        name: item.name,
        attr: this.abbrev(values.guidevalue),
        sr: values.sr,
        at: values.at,
        pa: hasParry ? values.pa : '',
        hasParry,
      };
    });
  }

  #worn(type) {
    return this.filterType(type, (item) => item.system?.worn?.value);
  }

  #melee(combatByName) {
    return this.#worn('meleeweapon')
      .filter((item) => !this.isShieldSkill(item.system?.combatskill?.value))
      .map((item) => {
        const skillName = text(item.system?.combatskill?.value);
        const technique = combatByName[skillName] || { at: 0, pa: 0 };
        const atmod = num(item.system?.atmod?.value);
        const pamod = num(item.system?.pamod?.value);
        const reachRaw = item.system?.reach?.value;
        return {
          name: item.name,
          combatskill: skillName,
          guidevalue: text(item.system?.guidevalue?.value).toUpperCase(),
          threshold: num(item.system?.damageThreshold?.value),
          damage: text(item.system?.damage?.value),
          atmod,
          pamod,
          reach: reachRaw ? this.loc(`Range-${reachRaw}`) : '',
          at: num(technique.at) + atmod,
          pa: num(technique.pa) + pamod,
          weight: num(item.system?.weight?.value),
        };
      });
  }

  #ranged(combatByName) {
    return this.#worn('rangeweapon').map((item) => {
      const skillName = text(item.system?.combatskill?.value);
      const technique = combatByName[skillName] || { at: 0 };
      return {
        name: item.name,
        combatskill: skillName,
        reloadTime: num(item.system?.reloadTime?.value),
        damage: text(item.system?.damage?.value),
        ammunition: num(item.system?.quantity?.value),
        range: text(item.system?.reach?.value),
        rc: num(technique.at),
        weight: num(item.system?.weight?.value),
      };
    });
  }

  #armor() {
    return this.#worn('armor').map((item) => ({
      name: item.name,
      protection: num(item.system?.protection?.value),
      encumbrance: num(item.system?.encumbrance?.value),
      effect: text(item.system?.effect?.value),
      weight: num(item.system?.weight?.value),
    }));
  }

  #shields() {
    return this.#worn('meleeweapon')
      .filter((item) => this.isShieldSkill(item.system?.combatskill?.value))
      .map((item) => ({
        name: item.name,
        structure: `${num(item.system?.structure?.value)} / ${num(item.system?.structure?.max)}`,
        atmod: num(item.system?.atmod?.value),
        pamod: num(item.system?.pamod?.value),
        weight: num(item.system?.weight?.value),
      }));
  }

  #conditionCatalog() {
    return statusEffects()
      .filter((entry) => entry?.id && !SKIP_CONDITION_IDS.has(entry.id))
      .map((entry) => ({
        id: entry.id,
        nameKey: entry.name || `CONDITION.${entry.id}`,
        max: Math.min(4, Math.max(1, num(entry.system?.condition?.max, entry.max || 1))),
      }));
  }

  #conditionName(nameKey, id) {
    const translated = this.loc(nameKey);
    if (translated && translated !== nameKey) return translated;
    return id;
  }

  #conditions(system) {
    const condition = system.condition || {};
    return this.#conditionCatalog().map((entry) => {
      const max = entry.max;
      const level = Math.min(max, Math.max(0, num(condition[entry.id])));
      const options = max <= 1
        ? ['-', 'X']
        : CONDITION_LEVEL_MARKS.slice(0, max + 1);
      return {
        id: entry.id,
        name: this.#conditionName(entry.nameKey, entry.id),
        level,
        max,
        leveled: max > 1,
        steps: Array.from({ length: max }, (_, index) => index < level),
        label: options[level] || String(level),
        dropdown: options.join(','),
      };
    });
  }

  #coins() {
    return Config.COINS.map((coin) => {
      const name = moneyName(coin.i18n);
      const total = this.filterType('money', (item) => item.name === name)
        .reduce((sum, item) => sum + num(item.system?.quantity?.value), 0);
      return {
        field: coin.field,
        name,
        quantity: total,
      };
    });
  }

  #spellLikes(types) {
    return types.flatMap((type) => this.filterType(type)).map((item) => {
      const check = [
        item.system?.characteristic1?.value,
        item.system?.characteristic2?.value,
        item.system?.characteristic3?.value,
      ].filter(Boolean).map((code) => this.abbrev(code)).join('/');
      return {
        name: item.name,
        type: item.type,
        check,
        sr: num(item.system?.talentValue?.value),
        cost: text(item.system?.AsPCost?.value),
        duration: text(item.system?.duration?.value),
        castingTime: text(item.system?.castingTime?.value),
        range: text(item.system?.range?.value),
        effect: text(item.system?.effect?.value),
        ic: text(item.system?.StF?.value),
        feature: text(item.system?.feature || item.system?.distribution?.value),
      };
    });
  }

  #notes(system) {
    const details = system.details || {};
    const biography = this.includeBiography ? text(details.biography?.value) : '';
    const player = text(details.notes?.value);
    const owner = text(details.notes?.ownerdescription);
    const gm = text(details.notes?.gmdescription);
    return {
      biography,
      player,
      owner,
      gm,
      hasContent: [biography, player, owner, gm].some(hasProse),
    };
  }

  #inventory() {
    const byId = new Map(this.items.map((item) => [item.id, item]));
    const types = equipmentCategories();
    const bag = [...this.items.filter((item) => types.has(item.type)
      && (!item.system?.worn?.value || item.type === 'equipment'))];
    if (this.moneyHasWeight) bag.push(...this.filterType('money'));

    return bag.map((item) => {
      const quantity = num(item.system?.quantity?.value, 1);
      const unitWeight = num(item.system?.weight?.value);
      const parent = byId.get(item.system?.parent_id);
      return {
        name: item.name,
        displayName: quantity > 1 ? `${quantity}x ${item.name}` : item.name,
        quantity,
        weight: unitWeight,
        weightTotal: roundWeight(unitWeight * quantity),
        location: text(parent?.name),
        type: item.type,
      };
    });
  }
}

export function buildActorSnapshot(actor, lang, options) {
  return ActorSnapshot.build(actor, lang, options);
}

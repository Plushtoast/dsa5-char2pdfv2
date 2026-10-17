
const I18N = {
  'CHARAbbrev.MU': 'COU',
  'CHARAbbrev.KL': 'SGC',
  'CHARAbbrev.IN': 'INT',
  'CHARAbbrev.CH': 'CHA',
  'CHARAbbrev.FF': 'DEX',
  'CHARAbbrev.GE': 'AGI',
  'CHARAbbrev.KO': 'CON',
  'CHARAbbrev.KK': 'STR',
  'CHARAbbrev.LeP': 'LP',
  'CHARAbbrev.AsP': 'AE',
  'CHARAbbrev.KaP': 'KP',
  'CHARAbbrev.SK': 'SPI',
  'CHARAbbrev.ZK': 'TOU',
  'CHARAbbrev.AW': 'DO',
  'CHARAbbrev.GS': 'MOV',
  'CHARAbbrev.INI': 'INI',
  'CHAR.MU': 'Courage',
  'CHAR.IN': 'Intuition',
  'SKILL.body': 'Physical Skills',
  'SKILL.social': 'Social Skills',
  'SKILL.nature': 'Nature Skills',
  'SKILL.knowledge': 'Knowledge Skills',
  'SKILL.trade': 'Craft Skills',
  'CONDITION.inpain': 'Pain',
  'CONDITION.stunned': 'Stupor',
  'CONDITION.raptured': 'Rapture',
  'CONDITION.feared': 'Fear',
  'CONDITION.paralysed': 'Paralysis',
  'CONDITION.confused': 'Confusion',
  'SOCIAL_CLASS.freeman': 'Free',
  'EXP.average': 'Ordinary',
  'EXP.inexperienced': 'Inexperienced',
  yes: 'yes',
  no: 'no',
  maybe: 'maybe',
  'Range-medium': 'Medium',
  'LocalizedIDs.language': 'Language',
  'LocalizedIDs.literacy': 'Literacy',
  'LocalizedIDs.Shields': 'Shields',
  Hair_color: 'Hair color',
  probe: 'Check',
  'CHARAbbrev.FW': 'SR',
  'dsa5-char2pdfv2.encAbbrev': 'BE',
  'Money-D': 'Ducat',
  'Money-S': 'Silverthaler',
  'Money-H': 'Haler',
  'Money-K': 'Kreutzer',
};

function localize(key) {
  return I18N[key] ?? key;
}

globalThis._loc = localize;

const STATUS_EFFECTS = [
  { id: 'dead', name: 'CONDITION.defeated' },
  { id: 'inpain', name: 'CONDITION.inpain', system: { condition: { max: 4 } } },
  { id: 'maneuverReadiness', name: 'CONDITION.maneuverReadiness', system: { condition: { max: 4 } } },
  { id: 'shipCondition', name: 'CONDITION.shipCondition', system: { condition: { max: 4 } } },
  { id: 'prone', name: 'CONDITION.prone' },
  { id: 'unconscious', name: 'CONDITION.unconscious' },
  { id: 'rooted', name: 'CONDITION.rooted' },
  { id: 'fixated', name: 'CONDITION.fixated' },
  { id: 'surprised', name: 'CONDITION.surprised' },
  { id: 'blind', name: 'CONDITION.blind' },
  { id: 'poisoned', name: 'CONDITION.poisoned' },
  { id: 'sick', name: 'CONDITION.sick' },
  { id: 'deaf', name: 'CONDITION.deaf' },
  { id: 'burning', name: 'CONDITION.burning', system: { condition: { max: 3 } } },
  { id: 'invisible', name: 'CONDITION.invisible' },
  { id: 'constricted', name: 'CONDITION.constricted' },
  { id: 'bloodrush', name: 'CONDITION.bloodrush' },
  { id: 'mute', name: 'CONDITION.mute' },
  { id: 'incapacitated', name: 'CONDITION.incapacitated' },
  { id: 'encumbered', name: 'CONDITION.encumbered', system: { condition: { max: 4 } } },
  { id: 'stunned', name: 'CONDITION.stunned', system: { condition: { max: 4 } } },
  { id: 'raptured', name: 'CONDITION.raptured', system: { condition: { max: 4 } } },
  { id: 'feared', name: 'CONDITION.feared', system: { condition: { max: 4 } } },
  { id: 'paralysed', name: 'CONDITION.paralysed', system: { condition: { max: 4 } } },
  { id: 'confused', name: 'CONDITION.confused', system: { condition: { max: 4 } } },
  { id: 'minorSpirits', name: 'CONDITION.minorSpirits' },
  { id: 'services', name: 'PLAYER.services', system: { condition: { max: 500 } } },
];

function characteristicTotal(char) {
  if (!char) return 0;
  return Number(char.initial) + Number(char.modifier) + Number(char.advances) + Number(char.gearmodifier);
}

function calculateCombatSkillValues(skill, actorData) {
  const fw = Number(skill.system.talentValue.value) || 0;
  const higherDefense = Number(globalThis.game?.settings?.get?.('dsa5', 'higherDefense') || 0);
  const total = (code) => characteristicTotal(actorData.characteristics[code]);
  if (Number(skill.system.weapontype.value) === 0) {
    const vals = String(skill.system.guidevalue.value).split('/').map((code) => total(code.trim()));
    skill.system.parry.value = Math.ceil(fw / 2) + Math.max(0, Math.floor((Math.max(...vals) - 8) / 3)) + higherDefense;
    skill.system.attack.value = fw + Math.max(0, Math.floor((total('mu') - 8) / 3));
  } else {
    skill.system.parry.value = 0;
    skill.system.attack.value = fw + Math.max(0, Math.floor((total('ff') - 8) / 3));
  }
  return skill;
}

globalThis.game = {
  i18n: { localize, lang: 'en' },
  settings: {
    get(_namespace, key) {
      if (key === 'moneyHasWeight') return false;
      if (key === 'higherDefense') return 0;
      return undefined;
    },
  },
  dsa5: {
    config: {
      statusEffects: STATUS_EFFECTS,
      skillGroups: {
        body: 'SKILL.body',
        social: 'SKILL.social',
        knowledge: 'SKILL.knowledge',
        trade: 'SKILL.trade',
        nature: 'SKILL.nature',
      },
      equipmentCategories: new Set([
        'meleeweapon', 'rangeweapon', 'equipment', 'ammunition', 'armor',
        'poison', 'consumable', 'plant', 'book',
      ]),
    },
    dataModels: {
      Item: {
        combatskill: { _calculateCombatSkillValues: calculateCombatSkillValues },
      },
    },
    apps: {
      DSA5_Utility: {
        EXPERIENCE_GRADES: [
          { threshold: 2100, label: 'EXP.legendary' },
          { threshold: 1700, label: 'EXP.brillant' },
          { threshold: 1400, label: 'EXP.masterful' },
          { threshold: 1200, label: 'EXP.competent' },
          { threshold: 1100, label: 'EXP.experienced' },
          { threshold: 1000, label: 'EXP.average' },
        ],
      },
      RuleChaos: {
        isShield(item) {
          return localize('LocalizedIDs.Shields') === item?.system?.combatskill?.value;
        },
      },
    },
  },
};

globalThis.CONFIG = {
  statusEffects: STATUS_EFFECTS,
  Actor: {
    dataModels: {
      character: {
        schema: {
          getField(path) {
            if (path !== 'details.socialstate.value') return null;
            return {
              choices: {
                0: '-',
                1: 'SOCIAL_CLASS.slave',
                2: 'SOCIAL_CLASS.freeman',
                3: 'SOCIAL_CLASS.lessernoble',
                4: 'SOCIAL_CLASS.noble',
                5: 'SOCIAL_CLASS.highborn',
              },
            };
          },
        },
      },
    },
  },
};

function characteristic(value) {
  return { initial: value, modifier: 0, advances: 0, gearmodifier: 0, value };
}

function energy({ max = 0, current = 0, value = 0, advances = 0, modifier = 0 } = {}) {
  return { max, current, value, advances, modifier };
}

function skill(name, { group = 'body', sr = 0, c1 = 'mu', c2 = 'ge', c3 = 'kk', enc = 'no' } = {}) {
  return {
    name,
    type: 'skill',
    system: {
      group: { value: group },
      talentValue: { value: sr },
      characteristic1: { value: c1 },
      characteristic2: { value: c2 },
      characteristic3: { value: c3 },
      burden: { value: enc },
    },
  };
}

function combatskill(name, { sr = 6, guide = 'ge', ranged = false } = {}) {
  return {
    name,
    type: 'combatskill',
    system: {
      talentValue: { value: sr },
      guidevalue: { value: guide },
      weapontype: { value: ranged ? 1 : 0 },
      attack: { value: 0 },
      parry: { value: 0 },
    },
  };
}

function spellLike(type, name, index) {
  return {
    name,
    type,
    system: {
      characteristic1: { value: 'mu' },
      characteristic2: { value: 'kl' },
      characteristic3: { value: 'in' },
      talentValue: { value: index % 14 },
      AsPCost: { value: `${4 + (index % 8)} AsP` },
      castingTime: { value: '1 action' },
      range: { value: '8 yards' },
      duration: { value: 'QS minutes' },
      effect: { value: `Effect ${index}` },
      StF: { value: 'B' },
      feature: 'Healing',
    },
  };
}

function fatActor() {
  const spells = Array.from({ length: 45 }, (_, i) => spellLike('spell', `Spell ${i + 1}`, i));
  const gear = Array.from({ length: 80 }, (_, i) => ({
    id: `eq${i + 1}`,
    name: `Item ${i + 1}`,
    type: 'equipment',
    system: {
      quantity: { value: i === 0 ? 3 : 1 },
      weight: { value: 0.5 },
      worn: { value: false },
      parent_id: i === 1 ? 'eq1' : '',
    },
  }));

  return {
    name: 'Alrik',
    img: 'portrait.webp',
    system: {
      details: {
        gender: { value: 'male' },
        species: { value: 'Human' },
        culture: { value: 'Middenrealm' },
        career: { value: 'Mage' },
        socialstate: { value: 2 },
        Home: { value: 'Gareth' },
        family: { value: 'Alrik clan' },
        age: { value: '24' },
        haircolor: { value: 'brown' },
        eyecolor: { value: 'grey' },
        height: { value: '178' },
        weight: { value: '72' },
        distinguishingmark: { value: 'scar' },
        experience: { total: 1000, spent: 400, current: 600 },
        biography: { value: '<p>Born in Gareth.</p>' },
        notes: { value: 'Hates orcs', gmdescription: '', ownerdescription: '' },
      },
      characteristics: {
        mu: characteristic(14),
        kl: characteristic(13),
        in: characteristic(12),
        ch: characteristic(11),
        ff: characteristic(13),
        ge: characteristic(13),
        ko: characteristic(12),
        kk: characteristic(14),
      },
      status: {
        wounds: energy({ max: 32, current: 31, value: 28, advances: 2, modifier: 0 }),
        astralenergy: energy({ max: 35, current: 20, value: 30, advances: 5, modifier: 1 }),
        karmaenergy: energy({ max: 20, current: 18, value: 16, advances: 0, modifier: 0 }),
        soulpower: { max: 3, value: 2, modifier: 1 },
        toughness: { max: 2, value: 1, modifier: 0 },
        dodge: { max: 7, value: 6, modifier: 0 },
        fatePoints: { current: 3, max: 3, value: 2, modifier: 0 },
        speed: { initial: 8, modifier: 0, gearmodifier: 0 },
        initiative: { modifier: 1, gearmodifier: 0 },
      },
      condition: { inpain: 2, stunned: 0, raptured: 0, feared: 0, paralysed: 0, confused: 1 },
      carrycapacity: 30,
      tradition: { magical: 'Guild Mage', clerical: 'Praios' },
      guidevalue: { magical: 'kl', clerical: 'in' },
      feature: { magical: 'mu', clerical: 'in' },
    },
    items: [
      skill('Flying', { group: 'body', sr: 4, c1: 'mu', c2: 'in', c3: 'ge', enc: 'yes' }),
      skill('Body Control', { group: 'body', sr: 8, c1: 'mu', c2: 'ge', c3: 'kk', enc: 'maybe' }),
      skill('Foo Lore', { group: 'knowledge', sr: 5, c1: 'kl', c2: 'kl', c3: 'in', enc: 'no' }),
      combatskill('Swords', { sr: 10, guide: 'ge' }),
      combatskill('Bows', { sr: 8, guide: 'ff', ranged: true }),
      combatskill('Firearms', { sr: 7, guide: 'ff', ranged: true }),
      {
        name: 'Longsword',
        type: 'meleeweapon',
        system: {
          worn: { value: true },
          combatskill: { value: 'Swords' },
          guidevalue: { value: 'ge' },
          damageThreshold: { value: 14 },
          damage: { value: '1d6+4' },
          atmod: { value: 1 },
          pamod: { value: 1 },
          reach: { value: 'medium' },
          weight: { value: 1.2 },
        },
      },
      {
        name: 'Shortbow',
        type: 'rangeweapon',
        system: {
          worn: { value: true },
          combatskill: { value: 'Bows' },
          reloadTime: { value: 1 },
          damage: { value: '1d6+3' },
          quantity: { value: 20 },
          reach: { value: '50/100/150' },
          weight: { value: 0.8 },
        },
      },
      {
        name: 'Chainmail',
        type: 'armor',
        system: {
          worn: { value: true },
          protection: { value: 4 },
          encumbrance: { value: 2 },
          effect: { value: '' },
          weight: { value: 8 },
        },
      },
      {
        name: 'Wooden Shield',
        type: 'meleeweapon',
        system: {
          worn: { value: true },
          combatskill: { value: 'Shields' },
          structure: { value: 3, max: 4 },
          atmod: { value: -1 },
          pamod: { value: 1 },
          weight: { value: 3 },
        },
      },
      { name: 'Advantageous', type: 'advantage', system: { step: { value: 1 } } },
      { name: 'Afraid of Spiders', type: 'disadvantage', system: { step: { value: 2 } } },
      { name: 'Area Knowledge', type: 'specialability', system: { category: { value: 'general' }, step: { value: 1 } } },
      { name: 'Language Garethi', type: 'specialability', system: { category: { value: 'language' }, step: { value: 3 } } },
      { name: 'Literacy Kuslik Signs', type: 'specialability', system: { category: { value: 'language' }, step: { value: 1 } } },
      { name: 'Feint', type: 'specialability', system: { category: { value: 'Combat' }, step: { value: 2 } } },
      { name: 'Powerful Voice', type: 'specialability', system: { category: { value: 'magical' }, step: { value: 1 } } },
      { name: 'Church Knowledge', type: 'specialability', system: { category: { value: 'clerical' }, step: { value: 1 } } },
      { name: 'Ducat', type: 'money', system: { quantity: { value: 5 } } },
      { name: 'Cantrip Spark', type: 'magictrick', system: {} },
      { name: 'Blessing of Light', type: 'blessing', system: {} },
      spellLike('liturgy', 'Blinding Ray', 1),
      ...spells,
      ...gear,
    ],
  };
}

function mundaneActor() {
  return {
    name: 'Bold',
    img: '',
    system: {
      details: {
        gender: { value: 'male' },
        species: { value: 'Human' },
        culture: { value: '' },
        career: { value: 'Warrior' },
        socialstate: { value: 0 },
        Home: { value: '' },
        family: { value: '' },
        age: { value: '' },
        haircolor: { value: '' },
        eyecolor: { value: '' },
        height: { value: '' },
        weight: { value: '' },
        distinguishingmark: { value: '' },
        experience: { total: 0, spent: 0 },
        biography: { value: '' },
        notes: { value: '', gmdescription: '', ownerdescription: '' },
      },
      characteristics: Object.fromEntries(
        ['mu', 'kl', 'in', 'ch', 'ff', 'ge', 'ko', 'kk'].map((key) => [key, characteristic(8)]),
      ),
      status: {
        wounds: energy({ max: 29, current: 29, value: 29 }),
        astralenergy: energy(),
        karmaenergy: energy(),
        soulpower: { max: 1, value: 1, modifier: 0 },
        toughness: { max: 1, value: 1, modifier: 0 },
        dodge: { max: 4, value: 4, modifier: 0 },
        fatePoints: { current: 3, value: 3, modifier: 0 },
        speed: { initial: 8, modifier: 0, gearmodifier: 0 },
        initiative: { modifier: 0, gearmodifier: 0 },
      },
      condition: {},
      carrycapacity: 16,
    },
    items: [],
  };
}

export { fatActor, mundaneActor, localize };

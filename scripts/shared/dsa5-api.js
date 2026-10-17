function loc(key) {
  if (typeof globalThis._loc === 'function') return globalThis._loc(key);
  return globalThis.game?.i18n?.localize?.(key) ?? key;
}

export function dsa5() {
  return globalThis.game?.dsa5 ?? {};
}

export function dsaConfig() {
  return dsa5().config ?? {};
}

export function isShield(item) {
  const fn = dsa5().apps?.RuleChaos?.isShield;
  if (typeof fn === 'function') return fn(item);
  return loc('LocalizedIDs.Shields') === item?.system?.combatskill?.value;
}

export function calculateCombatSkillValues(skill, actorData) {
  const fn = dsa5().dataModels?.Item?.combatskill?._calculateCombatSkillValues;
  if (typeof fn !== 'function') {
    throw new Error('DSA5 combat skill calculator is not available');
  }
  return fn(skill, actorData);
}

export function experienceGrades() {
  return dsa5().apps?.DSA5_Utility?.EXPERIENCE_GRADES ?? [];
}

export function statusEffects() {
  const list = globalThis.CONFIG?.statusEffects ?? dsaConfig().statusEffects;
  return Array.isArray(list) ? list : [];
}

export function skillGroups() {
  return dsaConfig().skillGroups ?? {
    body: 'SKILL.body',
    social: 'SKILL.social',
    nature: 'SKILL.nature',
    knowledge: 'SKILL.knowledge',
    trade: 'SKILL.trade',
  };
}

export function equipmentCategories() {
  return dsaConfig().equipmentCategories ?? new Set([
    'meleeweapon', 'rangeweapon', 'equipment', 'ammunition', 'armor',
    'poison', 'consumable', 'plant', 'book',
  ]);
}

export function socialStateChoices() {
  return globalThis.CONFIG?.Actor?.dataModels?.character?.schema?.getField?.('details.socialstate.value')?.choices ?? {
    0: '-',
    1: 'SOCIAL_CLASS.slave',
    2: 'SOCIAL_CLASS.freeman',
    3: 'SOCIAL_CLASS.lessernoble',
    4: 'SOCIAL_CLASS.noble',
    5: 'SOCIAL_CLASS.highborn',
  };
}

export function languageToken() {
  return loc('LocalizedIDs.language');
}

export function literacyToken() {
  return loc('LocalizedIDs.literacy');
}

export function moneyName(i18nKey) {
  return loc(i18nKey);
}

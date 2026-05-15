var cb_actors_tale = false;
var cb_del_pages = false;
var modul_version = '';

/**
 * A class which holds some constants for dsa-char2pdf
 */
class dsa5char2pdf {
  static ID = 'dsa5-char2pdfv2';

  static TEMPLATES = {
    PDF_Template: `modules/${this.ID}/templates/template.pdf`,
    PDF_Biography: `modules/${this.ID}/templates/template_biography.pdf`,
    export_preferences: `modules/${this.ID}/templates/export_preferences.hbs`,
  };

  static PATH = {
    main: `modules/${this.ID}/`,
  };

  /** A small helper function which leverages developer mode flags to gate debug logs.
   *
   * @param {boolean} force - forces the log even if the debug flag is not on
   * @param  {...any} args - what to log
   */
  static log(force, ...args) {
    const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

    if (shouldLog) {
      console.log(this.ID, '|', ...args);
    }
  }
}

/**
 * Utility functions for Roman numeral conversion
 */
class RomanNumerals {
  static romanize(num) {
    num = Number(num);
    if (!Number.isInteger(num) || num <= 0) return false;

    const romanNumerals = [
      ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
      ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
      ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1],
    ];

    let result = '';
    for (const [roman, value] of romanNumerals) {
      while (num >= value) {
        result += roman;
        num -= value;
      }
    }
    return result;
  }

  static deromanize(str) {
    const upperStr = str.toUpperCase();
    const validator = /^M*(?:D?C{0,3}|C[MD])(?:L?X{0,3}|X[CL])(?:V?I{0,3}|I[XV])$/;
    const token = /[MDLV]|C[MD]?|X[CL]?|I[XV]?/g;
    const key = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };

    if (!(upperStr && validator.test(upperStr))) return false;

    let num = 0;
    let match;
    while ((match = token.exec(upperStr))) {
      num += key[match[0]];
    }
    return num;
  }
}

/**
 * Image conversion utility
 */
class ImageConverter {
  static async toDataUrl(src, outputFormat = 'image/png') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(outputFormat));
      };
      img.onerror = reject;
      img.src = src;
      if (img.complete) {
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
        img.src = src;
      }
    });
  }

  static async getActorPicture(src) {
    try {
      return await this.toDataUrl(src);
    } catch (error) {
      console.error('ERROR getting actor picture:', error);
      throw error;
    }
  }
}

/**
 * Utility functions for character data
 */
class CharacterUtils {
  static getLeitwertLong(shortCode) {
    const mapping = {
      MU: 'Mut',
      KL: 'Klugheit',
      IN: 'Intuition',
      CH: 'Charisma',
      FF: 'Fingerfertigkeit',
      GE: 'Gewandheit',
      KO: 'Konstitution',
      KK: 'Körperkraft',
    };
    return mapping[shortCode.toUpperCase()] || shortCode;
  }

  static getCurrentDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }
}

/**
 * Configuration constants
 */
class Config {
  static TALENT_MAPPING = {
    // Body talents
    'Fliegen': 1, 'Gaukeleien': 2, 'Klettern': 3, 'Körperbeherrschung': 4,
    'Kraftakt': 5, 'Reiten': 6, 'Schwimmen': 7, 'Selbstbeherrschung': 8,
    'Singen': 9, 'Sinnesschärfe': 10, 'Tanzen': 11, 'Taschendiebstahl': 12,
    'Verbergen': 13, 'Zechen': 14,
    // Society talents
    'Bekehren & Überzeugen': 15, 'Betören': 16, 'Einschüchtern': 17,
    'Etikette': 18, 'Gassenwissen': 19, 'Menschenkenntnis': 20,
    'Überreden': 21, 'Verkleiden': 22, 'Willenskraft': 23,
    // Nature talents
    'Fährtensuchen': 24, 'Fesseln': 25, 'Fischen & Angeln': 26,
    'Orientierung': 27, 'Pflanzenkunde': 28, 'Tierkunde': 29, 'Wildnisleben': 30,
    // Knowledge talents
    'Brett- & Glücksspiel': 31, 'Geographie': 32, 'Geschichtswissen': 33,
    'Götter & Kulte': 34, 'Kriegskunst': 35, 'Magiekunde': 36,
    'Mechanik': 37, 'Rechnen': 38, 'Rechtskunde': 39, 'Sagen & Legenden': 40,
    'Sphärenkunde': 41, 'Sternkunde': 42,
    // Crafting talents
    'Alchimie': 43, 'Boote & Schiffe': 44, 'Fahrzeuge': 45, 'Handel': 46,
    'Heilkunde Gift': 47, 'Heilkunde Krankheiten': 48, 'Heilkunde Seele': 49,
    'Heilkunde Wunden': 50, 'Holzbearbeitung': 51, 'Lebensmittelbearbeitung': 52,
    'Lederbearbeitung': 53, 'Malen & Zeichnen': 54, 'Metallbearbeitung': 55,
    'Musizieren': 56, 'Schlösserknacken': 57, 'Steinbearbeitung': 58,
    'Stoffbearbeitung': 59
  };

  static COMBAT_SKILLS = {
    'Armbrüste': { destination: 1, hasParry: false },
    'Bögen': { destination: 2, hasParry: false },
    'Dolche': { destination: 3, hasParry: true },
    'Fechtwaffen': { destination: 4, hasParry: true },
    'Hiebwaffen': { destination: 5, hasParry: true },
    'Kettenwaffen': { destination: 6, hasParry: false },
    'Lanzen': { destination: 7, hasParry: true },
    'Raufen': { destination: 8, hasParry: true },
    'Schilde': { destination: 9, hasParry: true },
    'Schwerter': { destination: 10, hasParry: true },
    'Stangenwaffen': { destination: 11, hasParry: true },
    'Wurfwaffen': { destination: 12, hasParry: false },
    'Zweihandhiebwaffen': { destination: 13, hasParry: true },
    'Zweihandschwerter': { destination: 14, hasParry: true }
  };

  static CHARACTERISTIC_MAPPING = {
    'MU_1': 'mu', 'KL_1': 'kl', 'IN_1': 'in', 'CH_1': 'ch',
    'FF_1': 'ff', 'GE_1': 'ge', 'KO_1': 'ko', 'KK_1': 'kk'
  };

  static MAX_ITEMS = {
    SHIELDS: 4,
    ARMOR: 4,
    RANGE_WEAPONS: 4,
    MELEE_WEAPONS: 4,
    SPELLS: 40,
    LITURGY: 40,
    INVENTORY: 72
  };
}

/** Hook registrations */
Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(dsa5char2pdf.ID);
});

Hooks.on('getActorContextOptions', (html, entryOptions) => {
  entryOptions.push({
    label: 'DSA5-Char2PDF',
    icon: '<i class="fas fa-tasks"></i>',
    visible: (li) => {
      const entity = game.actors.get(li.dataset.entryId);
      return (entity.type === 'character' || entity.sheet === 'ActorSheetdsa5Character') ? entity.id : false;
    },
    onClick: (_, li) => {
      const actor = game.actors.get(li.dataset.entryId);
      const exportPreferences = new ExportPreferences(actor);
      exportPreferences.render(true);
    },
  });
});

/** Export Preferences Form */
class ExportPreferences extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  constructor(actor) {
    super();
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = {
    id: 'export_preferences',
    window: { title: 'DSA5 - char2PDF' },
    actions: {
      btn_Export: this._btn_Export
    }
  };

  static PARTS = {
    main: {
      template: dsa5char2pdf.TEMPLATES.export_preferences,
    },
  };

  async _prepareContext(_options) {
    const data = await super._prepareContext(_options);
    data.ID = this.actor.id;
    data.actor = this.actor.name;
    return data;
  }

  static async _btn_Export(ev, target) {
    target.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    const pdfRenderer = new DSACHAR2PDF(this.actor.uuid);
    await pdfRenderer.fillForm();
    this.close();
  }
}

/**
 * Main PDF generation class
 */
class DSACHAR2PDF {
  constructor(actorId) {
    this.actorId = actorId;
    this.entity = null;
    this.map = null;
    this.form = null;
    this.combatSkills = {};
  }

  setTextField(fieldName, value, fontSize = undefined) {
    const field = this.form.getTextField(fieldName);
    field.setText(String(value).normalize('NFC'));
    if (fontSize) {
      field.setFontSize(fontSize);
    }
  }

  findItemByName(name, type) {
    return this.map.find(item => item.type === type && item.name === name);
  }

  filterItems(type, additionalFilter = null) {
    let filtered = this.map.filter(item => item.type === type);
    return additionalFilter ? filtered.filter(additionalFilter) : filtered;
  }

  combat(name, destination, hasParry) {
    const skill = this.findItemByName(name, 'combatskill');
    if (!skill) return { r_AT: 0, r_PA: 0 };

    const combatskillData = game.dsa5.dataModels.Item.combatskill._calculateCombatSkillValues(skill, this.entity.system);

    this.setTextField(`KT_FW_${destination}`, combatskillData.system.talentValue.value);
    this.setTextField(`KT_AT_${destination}`, combatskillData.system.attack.value);

    if (hasParry) {
      this.setTextField(`KT_PA_${destination}`, combatskillData.system.parry.value);
    }

    return {
      r_AT: combatskillData.system.attack.value,
      r_PA: hasParry ? combatskillData.system.parry.value : 0,
    };
  }

  processTalent(name, destination) {
    const skill = this.findItemByName(name, 'skill');
    if (!skill) return;

    const talentValue = skill.system.talentValue.value;
    this.setTextField(`Talent_FW_${destination}`, talentValue, 8);

    const charNames = [
      skill.system.characteristic1.value,
      skill.system.characteristic2.value,
      skill.system.characteristic3.value
    ];
    const charValues = charNames.map(n => this.entity.system.characteristics[n]?.value ?? 0);

    // Calculate routine modifier
    if (charValues.every(v => v >= 13)) {
      const routineModifiers = [
        [1, 4, '+3'], [4, 7, '+2'], [7, 10, '+1'], [10, 13, '0'],
        [13, 16, '-1'], [16, 19, '-2'], [19, Infinity, '-3']
      ];

      const routine = routineModifiers.find(([min, max]) => talentValue >= min && talentValue < max)?.[2] || '';
      // Use routine if needed
    }
  }

  processCoins() {
    const coins = ['Dukaten', 'Silber', 'Heller', 'Kreuzer'];
    for (let currencyName of coins) {
      const currencyItems = this.filterItems('money', item => game.i18n.localize(item.name) === currencyName);
      const total = currencyItems.reduce((sum, item) => sum + Number(item.system.quantity.value), 0);
      const fieldShort = currencyName[0];
      this.setTextField(`Geld_${fieldShort}`, total);
    }
  }

  fillCharacterDetails() {
    const details = this.entity.system.details;
    const fieldMappings = {
      'Held_Name': this.entity.name,
      'Held_Geschlecht': details.gender.value,
      'Held_Spezies_Anzeige': details.species.value,
      'Held_Geburtsdatum': '',
      'Held_Alter': details.age.value,
      'Held_Haare': details.haircolor.value,
      'Held_Augen': details.eyecolor.value,
      'Held_Groesse': details.height.value,
      'Held_Gewicht': details.weight.value,
      'Held_Profession_Anzeige': details.career.value,
      'Held_Kultur_Anzeige': details.culture.value,
      'Held_Sozialstatus': details.socialstate.value,
      'Held_Geburtsort': details.Home.value,
      'Held_Familie': details.family.value,
      'Held_Charakteristika': details.distinguishingmark.value,
    };

    Object.entries(fieldMappings).forEach(([field, value]) => {
      this.setTextField(field, value);
    });
  }

  fillActorMainAttributes() {
    const characteristics = this.entity.system.characteristics;
    Object.entries(Config.CHARACTERISTIC_MAPPING).forEach(([fieldName, charKey]) => {
      this.setTextField(fieldName, characteristics[charKey].value);
    });
  }

  setStatusFields() {
    this.setLifeFields();
    this.setSoulpowerFields();
    this.setToughnessFields();
    this.setDodgeFields();
    this.setAstralEnergyFields();
    this.setKarmaEnergyFields();
  }

  setLifeFields() {
    const wounds = this.entity.system.status.wounds;
    const fieldMappings = {
      'LE_Max_1': wounds.max,
      'LE_Max_3': wounds.max,
      'LE_Wert_1': wounds.current,
      'LE_Kauf_1': wounds.advances,
      'LE_BM_1': wounds.modifier,
    };

    Object.entries(fieldMappings).forEach(([field, value]) => {
      this.setTextField(field, value);
    });

    if (wounds.max !== wounds.value) {
      this.setTextField('LE_Aktuell_1', wounds.value);
    }
  }

  setSoulpowerFields() {
    const soulpower = this.entity.system.status.soulpower;
    this.setTextField('SK_Max_1', soulpower.max);
    this.setTextField('SK_Wert_1', soulpower.value);
    this.setTextField('SK_BM_1', soulpower.modifier);
  }

  setToughnessFields() {
    const toughness = this.entity.system.status.toughness;
    this.setTextField('ZK_Max_1', toughness.max);
    this.setTextField('ZK_Wert_1', toughness.value);
    this.setTextField('ZK_BM_1', toughness.modifier);
  }

  setDodgeFields() {
    const dodge = this.entity.system.status.dodge;
    this.setTextField('AW_Max_1', dodge.max);
    this.setTextField('AW_Wert_1', dodge.value);
    this.setTextField('AW_BM_1', dodge.modifier);
  }

  setAstralEnergyFields() {
    const astralenergy = this.entity.system.status.astralenergy;
    this.setTextField('AE_Max_1', astralenergy.max);
    this.setTextField('AE_Wert_1', astralenergy.current + 20);
    this.setTextField('AE_Kauf_1', astralenergy.advances);
    this.setTextField('AE_BM_1', astralenergy.modifier);
  }

  setKarmaEnergyFields() {
    const karmaenergy = this.entity.system.status.karmaenergy;
    this.setTextField('KE_Max_1', karmaenergy.max);
    this.setTextField('KE_Wert_1', karmaenergy.current + 20);
    this.setTextField('KE_Kauf_1', karmaenergy.advances);
    this.setTextField('KE_BM_1', karmaenergy.modifier);
  }

  setTalentFields() {
    Object.entries(Config.TALENT_MAPPING).forEach(([talentName, destination]) => {
      this.processTalent(talentName, destination);
    });
  }

  setEquipmentFields(itemType, namePrefix, maxItems, processFn) {
    const items = this.filterItems(itemType, item => item.system.worn?.value);
    const arrayLength = Math.min(items.length, maxItems);

    if (items.length > maxItems) {
      ui.notifications.warn(`You have equipped more than ${maxItems} ${itemType}s! The template can only hold a maximum of ${maxItems}`);
    }

    for (let i = 0; i < arrayLength; i++) {
      processFn(items[i], i + 1);
    }
  }

  static WORNGEARFONTSIZE = 9;

  setShieldFields() {
    this.setEquipmentFields('meleeweapon', 'Schild', Config.MAX_ITEMS.SHIELDS, (item, index) => {
      if (item.system.combatskill.value !== 'Schilde') return;

      this.setTextField(`Schild_Name_Anzeige_${index}`, item.name, DSACHAR2PDF.WORNGEARFONTSIZE);
      this.setTextField(`Schild_SP_${index}`, `${item.system.structure.value} / ${item.system.structure.max}`, DSACHAR2PDF.WORNGEARFONTSIZE);
      this.setTextField(`Schild_Mod_${index}`, `AT:${item.system.atmod.value} / PA:${item.system.pamod.value}`, DSACHAR2PDF.WORNGEARFONTSIZE);
      this.setTextField(`Schild_Gewicht_${index}`, item.system.weight.value, 9);
    });
  }

  setArmorFields() {
    this.setEquipmentFields('armor', 'Ruestung', Config.MAX_ITEMS.ARMOR, (item, index) => {
      const fieldMappings = {
        [`Ruestung_Name_Anzeige_${index}`]: item.name,
        [`Ruestung_RS_${index}`]: item.system.protection.value,
        [`Ruestung_BE_${index}`]: item.system.encumbrance.value,
        [`Ruestung_Abzuege_${index}`]: item.system.effect.value,
        [`Ruestung_Gewicht_${index}`]: item.system.weight.value,
        [`Ruestung_Gebiet_${index}`]: '',
      };

      Object.entries(fieldMappings).forEach(([field, value]) => {
        this.setTextField(field, value, DSACHAR2PDF.WORNGEARFONTSIZE);
      });
    });
  }

  setRangeFields() {
    this.setEquipmentFields('rangeweapon', 'Fernwaffe', Config.MAX_ITEMS.RANGE_WEAPONS, (item, index) => {
      const fieldMappings = {
        [`Fernwaffe_Name_Anzeige_${index}`]: item.name,
        [`Fern_Kampftechnik_Name_Anzeige_${index}`]: item.system.combatskill.value,
        [`Fern_Ladezeit_${index}`]: `${item.system.reloadTime.value} Runden`,
        [`Fern_TP_${index}`]: item.system.damage.value,
        [`Fern_Munition_${index}`]: item.system.quantity.value,
        [`Fern_Reichweite_${index}`]: item.system.reach.value,
        [`Fern_FK_${index}`]: this.combatSkills[item.system.combatskill.value]?.r_AT || 0,
        [`Fern_Gewicht_${index}`]: item.system.weight.value,
      };

      Object.entries(fieldMappings).forEach(([field, value]) => {
        this.setTextField(field, value, DSACHAR2PDF.WORNGEARFONTSIZE);
      });
    });
  }

  setMeleeFields() {
    /*const meleeWeapons = this.filterItems('meleeweapon', item =>
      item.system.worn?.value && item.system.combatskill.value !== 'Schilde'
    );*/

    this.setEquipmentFields('meleeweapon', 'Nahwaffe', Config.MAX_ITEMS.MELEE_WEAPONS, (item, index) => {
      if (item.system.combatskill.value === 'Schilde') return;

      const combatSkill = this.combatSkills[item.system.combatskill.value] || { r_AT: 0, r_PA: 0 };
      const reach = game.i18n.localize(`Range-${item.system.reach.value}`);

      const fieldMappings = {
        [`Nahwaffe_Name_Anzeige_${index}`]: item.name,
        [`Nah_Kampftechnik_Name_Anzeige_${index}`]: item.system.combatskill.value,
        [`Nah_Schadensbonus_${index}`]: item.system.guidevalue.value.toUpperCase(),
        [`Nah_Schadensschwelle_${index}`]: item.system.damageThreshold.value,
        [`Nah_TP_Wurf_${index}`]: item.system.damage.value,
        [`Nah_TP_Basis_${index}`]: '',
        [`Nah_TP_${index}`]: '',
        [`Nah_AT_Mod_${index}`]: item.system.atmod.value,
        [`Nah_PA_Mod_${index}`]: item.system.pamod.value,
        [`Nah_Reichweite_${index}`]: reach,
        [`Nah_AT_${index}`]: combatSkill.r_AT + Number(item.system.atmod.value),
        [`Nah_PA_${index}`]: combatSkill.r_PA + Number(item.system.pamod.value),
        [`Nah_Gewicht_${index}`]: item.system.weight.value,
      };

      Object.entries(fieldMappings).forEach(([field, value]) => {
        this.setTextField(field, value, DSACHAR2PDF.WORNGEARFONTSIZE);
      });
    });
  }

  setSpellFields() {
    const spells = this.filterItems('spell').concat(this.filterItems('ritual'));
    this.processSpellLikeItems(spells, 'Zauber', 'Z', Config.MAX_ITEMS.SPELLS);
  }

  setLiturgyFields() {
    const liturgies = this.filterItems('liturgy').concat(this.filterItems('ceremony'));
    this.processSpellLikeItems(liturgies, 'Liturgie', 'L', Config.MAX_ITEMS.LITURGY);
  }

  processSpellLikeItems(items, namePrefix, fieldPrefix, maxItems) {
    const arrayLength = Math.min(items.length, maxItems);

    if (items.length > maxItems) {
      ui.notifications.warn(`You have more than ${maxItems} ${namePrefix.toLowerCase()}s! The template can only hold a maximum of ${maxItems}`);
    }

    for (let i = 0; i < arrayLength; i++) {
      const item = items[i];
      const index = i + 1;

      const characteristics = [
        item.system.characteristic1.value.toUpperCase(),
        item.system.characteristic2.value.toUpperCase(),
        item.system.characteristic3.value.toUpperCase()
      ].join('/');

      const fieldMappings = {
        [`${namePrefix}_Anzeige_${index}`]: item.name,
        [`${fieldPrefix}_Probe_${index}`]: characteristics,
        [`${fieldPrefix}_FW_${index}`]: item.system.talentValue.value,
        [`${fieldPrefix}_${fieldPrefix === 'Z' ? 'AsP' : 'KaP'}_${index}`]: item.system.AsPCost.value,
        [`${fieldPrefix}_${fieldPrefix === 'Z' ? 'Z' : 'L'}Dauer_${index}`]: item.system.castingTime.value,
        [`${fieldPrefix}_RW_${index}`]: item.system.range.value,
        [`${fieldPrefix}_WDauer_${index}`]: item.system.duration.value,
        [`${fieldPrefix}_${fieldPrefix === 'Z' ? 'Merkmal' : 'Aspekt'}_${index}`]: '',
        [`${fieldPrefix}_SF_${index}`]: item.system.StF.value,
        [`${fieldPrefix}_Wirkung_${index}`]: item.system.effect.value,
        [`${fieldPrefix}_Seite_${index}`]: '',
      };

      Object.entries(fieldMappings).forEach(([field, value]) => {
        this.setTextField(field, value, 7);
      });
    }
  }

  async processActorImage(pdfDoc) {
    const actorImageUrl = this.entity.img;
    let actorImageBytes;

    if (['png', 'jpg'].includes(actorImageUrl.split('.').pop())) {
      actorImageBytes = await fetch(actorImageUrl).then(res => res.arrayBuffer());
    } else {
      actorImageBytes = await ImageConverter.getActorPicture(actorImageUrl);
    }

    const actorImage = await pdfDoc.embedPng(actorImageBytes);
    this.form.getButton('Charakterbild').setImage(actorImage);
  }

  processSpecialAbilities() {
    const categories = {
      disadvantage: 'Held_Nachteile',
      advantage: 'Held_Vorteile',
    };

    Object.entries(categories).forEach(([type, field]) => {
      const items = this.filterItems(type);
      const names = items.map(item => item.name).join(', ');
      this.setTextField(field, names);
    });

    // Process special abilities
    const generalSA = this.filterItems('specialability', item => item.system.category.value === 'general');
    const fatePointSA = this.filterItems('specialability', item => item.system.category.value === 'fatePoints');

    const generalNames = generalSA.map(item => item.name).join(', ');
    const fatePointNames = fatePointSA.map(item => item.name).join(', ');

    let combined = generalNames;
    if (fatePointNames) {
      combined += `\n\nSchicksalspunkt SF: ${fatePointNames}`;
    }

    this.setTextField('Held_SF_allgemein', combined);
  }

  processLanguagesAndScripts() {
    const languages = this.filterItems('specialability', item =>
      item.system.category.value === 'language' && item.name.includes('Sprache')
    );
    const scripts = this.filterItems('specialability', item =>
      item.system.category.value === 'language' && item.name.includes('Schrift')
    );

    const formatItems = (items) =>
      items.map(item => `${item.name} ${RomanNumerals.romanize(item.system.step.value)}`).join(', ');

    this.setTextField('Held_Sprachen', formatItems(languages));
    this.setTextField('Held_Schriften', formatItems(scripts));
  }

  async fillForm() {
    try {
      const { PDFDocument, StandardFonts, rgb } = PDFLib;

      this.entity = await fromUuid(this.actorId);
      this.map = this.entity.items;

      const formUrl = dsa5char2pdf.TEMPLATES.PDF_Template;
      const formPdfBytes = await fetch(formUrl).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(formPdfBytes);
      this.form = pdfDoc.getForm();

      // Get module version
      const moduleAPI = game.modules.get('dsa5-char2pdfv2');
      modul_version = moduleAPI.version;

      const today = CharacterUtils.getCurrentDate();

      // Fill all sections
      this.fillCharacterDetails();
      await this.processActorImage(pdfDoc);
      this.fillActorMainAttributes();
      this.processSpecialAbilities();
      this.processLanguagesAndScripts();
      this.setStatusFields();

      // Experience
      const expTranslate = game.i18n.localize(this.entity.system.details.experience.description);
      this.setTextField('AP_Erfahrungsgrad_Anzeige', expTranslate);
      this.setTextField('AP_gesamt', this.entity.system.details.experience.total);
      this.setTextField('AP_gesammelt', this.entity.system.details.experience.current);
      this.setTextField('AP_ausgegeben', this.entity.system.details.experience.spent);

      // Fate points
      const fatePoints = this.entity.system.status.fatePoints;
      this.setTextField('SchiP_Wert_1', fatePoints.current);
      this.setTextField('SchiP_Max_1', fatePoints.max);
      if (fatePoints.current !== fatePoints.value) {
        this.setTextField('SchiP_Aktuell_1', fatePoints.value);
      }
      this.setTextField('SchiP_BM_1', fatePoints.modifier);

      // Talents
      this.setTalentFields();

      // Combat section
      this.setTextField('LE_Max_2', this.entity.system.status.wounds.max);

      const speed = this.entity.system.status.speed;
      this.setTextField('GS_Max_1', speed.initial + speed.modifier + speed.gearmodifier);
      this.setTextField('AW_Max_2', this.entity.system.status.dodge.max);

      const initiative = this.entity.system.status.initiative;
      const characteristics = this.entity.system.characteristics;
      this.setTextField('INI_Max_1',
        Math.round((characteristics.mu.value + characteristics.ge.value) / 2) +
        initiative.modifier + initiative.gearmodifier
      );
      this.setTextField('SK_Max_2', this.entity.system.status.soulpower.max);
      this.setTextField('ZK_Max_2', this.entity.system.status.toughness.max);

      // Combat skills
      Object.entries(Config.COMBAT_SKILLS).forEach(([skillName, config]) => {
        this.combatSkills[skillName] = this.combat(skillName, config.destination, config.hasParry);
      });

      const combatSA = this.filterItems('specialability', item => item.system.category.value === 'Combat');
      const combatSANames = combatSA.map(item => `${item.name} ${RomanNumerals.romanize(item.system.step.value)}`).join(', ');
      this.setTextField('Held_SF_Kampf', combatSANames);

      // Coins

      this.processCoins();

      // Equipment
      this.setMeleeFields();
      this.setRangeFields();
      this.setArmorFields();
      this.setShieldFields();

      // Inventory
      const equipmentCategories = game.dsa5.config.equipmentCategories;
      const items = this.map.filter(item => equipmentCategories.has(item.type) && (!item.system.worn?.value || item.type === 'equipment'));

      if (game.settings.get('dsa5', 'moneyHasWeight')) {
        items.push(...this.filterItems('money'));
      }

      let sumWeight1 = 0;
      let sumWeight2 = 0;
      const arrayLength = Math.min(items.length, Config.MAX_ITEMS.INVENTORY);

      if (items.length > Config.MAX_ITEMS.INVENTORY) {
        ui.notifications.warn(`You have more than ${Config.MAX_ITEMS.INVENTORY} items in your inventory! The template can only hold a maximum of ${Config.MAX_ITEMS.INVENTORY}`);
      }

      for (let i = 0; i < arrayLength; i++) {
        const quantityV = items[i].system.quantity.value
        const quantity = quantityV > 1 ? `${quantityV}x ` : '';
        this.setTextField(`Besitz_Name_${i + 1}`, quantity + items[i].name);
        this.setTextField(`Besitz_Gewicht_${i + 1}`, items[i].system.weight.value * quantityV);

        if (i <= 36) {
          sumWeight1 += items[i].system.weight.value * quantityV;
        } else {
          sumWeight2 += items[i].system.weight.value * quantityV;
        }
      }

      this.setTextField('Gewicht_1', Math.round(sumWeight1 * 100) / 100);
      this.setTextField('Gewicht_2', Math.round((sumWeight1 + sumWeight2) * 100) / 100);
      this.setTextField('Trag_1', this.entity.system.carrycapacity);

      // Magic section
      this.setSpellFields();

      const astralEnergy = this.entity.system.status.astralenergy;
      this.setTextField('AE_Max_2', astralEnergy.max);
      if (astralEnergy.max !== astralEnergy.value) {
        this.setTextField('AE_Aktuell', astralEnergy.value);
      }
      this.setTextField('Held_Tradition_magisch', this.entity.system.tradition.magical);
      this.setTextField('Leit_Magie_Ansicht', CharacterUtils.getLeitwertLong(this.entity.system.guidevalue.magical));
      this.setTextField('Held_Merkmale', CharacterUtils.getLeitwertLong(this.entity.system.feature.magical));

      // Magic tricks
      const magicTricks = this.filterItems('magictrick');
      this.setTextField('Held_Tricks', magicTricks.map(item => item.name).join(', '));

      // Magic special abilities
      const magicSA = this.filterItems('specialability', item => item.system.category.value === 'magical');
      this.setTextField('Held_SF_Mag', magicSA.map(item => item.name).join(', '));

      // Clerical section
      this.setLiturgyFields();

      const karmaEnergy = this.entity.system.status.karmaenergy;
      this.setTextField('KE_Max_2', karmaEnergy.max);
      if (karmaEnergy.max !== karmaEnergy.value) {
        this.setTextField('KE_Aktuell', karmaEnergy.value);
      }
      this.setTextField('Held_Tradition_klerikal', this.entity.system.tradition.clerical);
      this.setTextField('Leit_Karma_Anzeige', CharacterUtils.getLeitwertLong(this.entity.system.guidevalue.clerical));
      this.setTextField('Held_Aspekt', CharacterUtils.getLeitwertLong(this.entity.system.feature.clerical));

      // Blessings
      const blessings = this.filterItems('blessing');
      this.setTextField('Held_Segen', blessings.map(item => item.name).join(', '));

      // Clerical special abilities
      const clericalSA = this.filterItems('specialability', item => item.system.category.value === 'clerical');
      this.setTextField('Held_SF_Karm', clericalSA.map(item => item.name).join(', '));

      // Set PDF metadata
      pdfDoc.setTitle(`DSA5-${this.entity.name}.pdf created on ${today}`);
      pdfDoc.setSubject('https://github.com/Plushtoast/dsa5-char2pdfv2');
      pdfDoc.setProducer(`DSA5 - char2PDF ${modul_version}`);
      pdfDoc.setCreator('pdf-lib (https://github.com/Hopding/pdf-lib)');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf;charset=utf-8' });
      saveAs(blob, `DSA5-${this.entity.name}.pdf`);

    } catch (err) {
      ui.notifications.error(`Char2PDF - Error: ${err.message}`);
      console.error(err);
    }
  }
}

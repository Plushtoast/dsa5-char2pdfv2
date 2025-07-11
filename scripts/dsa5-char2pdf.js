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

/** Fuction Roman Numeral Converter by Steven Levithan
 * https://blog.stevenlevithan.com/archives/javascript-roman-numeral-converter
 */

function romanize(num) {
  num = Number(num);
  if (!Number.isInteger(num) || num <= 0) return false;
  const romanNumerals = [
    ['M', 1000],
    ['CM', 900],
    ['D', 500],
    ['CD', 400],
    ['C', 100],
    ['XC', 90],
    ['L', 50],
    ['XL', 40],
    ['X', 10],
    ['IX', 9],
    ['V', 5],
    ['IV', 4],
    ['I', 1],
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

function deromanize(str) {
  var str = str.toUpperCase(),
    validator = /^M*(?:D?C{0,3}|C[MD])(?:L?X{0,3}|X[CL])(?:V?I{0,3}|I[XV])$/,
    token = /[MDLV]|C[MD]?|X[CL]?|I[XV]?/g,
    key = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 },
    num = 0,
    m;
  if (!(str && validator.test(str))) return false;
  while ((m = token.exec(str))) num += key[m[0]];
  return num;
}

/** register our module's debug flag with developer mode's custom hook */

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(dsa5char2pdf.ID);
});

/** register Hook to Display Option within the actor context menu */

Hooks.on('getActorContextOptions', (html, entryOptions) => {
  entryOptions.push({
    name: 'DSA5-Char2PDF',
    icon: '<i class="fas fa-tasks"></i>',
    condition: (li) => {
      const entity = game.actors.get(li.dataset.entryId);
      //check for the right DSA5 template and for the right type
      if (entity.type == 'character' || entity.sheet == 'ActorSheetdsa5Character') {
        return entity.id;
      }
    },
    callback: (li) => {
      const actor = game.actors.get(li.dataset.entryId);
      const exportPreferences = new ExportPreferences(actor);
      exportPreferences.render(true);
    },
  });
});

/** Set up FormApplication */

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

/** Function to convert webp to png for PDF-Import */

async function toDataUrl(src, outputFormat = 'image/png') {
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

/** Function to get result of the async task to read the pictures from a source with the use of 'await' */
async function get_actor_pic(src) {
  try {
    const result = await toDataUrl(src);
    return result;
  } catch (error) {
    console.error('ERROR:');
    console.error(error);
  }
}

/**
 * Converts the Leitwert short into the long version
 */
function Leitwert_long(Leitwert_short) {
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
  return mapping[Leitwert_short.toUpperCase()] || Leitwert_short;
}

/**
 * Call function to fill pdf template
 */

class DSACHAR2PDF {
  constructor(actorId) {
    this.actorId = actorId;
  }

  combat(name, destination, hasParry) {
    const skill = this.entity.items.find(item => item.type === 'combatskill' && item.name === name);
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

  talent(name, destination) {
    const skillItems = this.map.filter(item => item.type === 'skill' && item.name === name);
    if (!skillItems.length) return;

    const skill = skillItems[0];
    const talentValue = skill.system.talentValue.value;
    this.setTextField('Talent_FW_' + destination, talentValue);

    const charNames = [
      skill.system.characteristic1.value,
      skill.system.characteristic2.value,
      skill.system.characteristic3.value
    ];
    const charValues = charNames.map(n => this.entity.system.characteristics[n]?.value ?? 0);

    let routine = '';
    if (charValues.every(v => v >= 13)) {
      if (talentValue >= 1 && talentValue < 4) routine = '+3';
      else if (talentValue >= 4 && talentValue < 7) routine = '+2';
      else if (talentValue >= 7 && talentValue < 10) routine = '+1';
      else if (talentValue >= 10 && talentValue < 13) routine = '0';
      else if (talentValue >= 13 && talentValue < 16) routine = '-1';
      else if (talentValue >= 16 && talentValue < 19) routine = '-2';
      else if (talentValue >= 19) routine = '-3';
    }
  }

  coins(currencyName, fieldShort) {
    const currencyItems = this.map.filter(item => item.name === currencyName);
    const total = currencyItems.reduce((sum, item) => sum + Number(item.system.quantity.value), 0);
    this.setTextField('Geld_' + fieldShort, total);
  }

  setTextField(fieldName, value) {
    this.form.getTextField(fieldName).setText(String(value).normalize('NFC'));
  }

  fillCharacterDetails() {
    const details = this.entity.system.details;

    this.setTextField('Held_Name', this.entity.name);
    this.setTextField('Held_Geschlecht', details.gender.value);
    this.setTextField('Held_Spezies_Anzeige', details.species.value);
    this.setTextField('Held_Geburtsdatum', '');
    this.setTextField('Held_Alter', details.age.value);
    this.setTextField('Held_Haare', details.haircolor.value);
    this.setTextField('Held_Augen', details.eyecolor.value);
    this.setTextField('Held_Groesse', details.height.value);
    this.setTextField('Held_Gewicht', details.weight.value);
    this.setTextField('Held_Profession_Anzeige', details.career.value);
    this.setTextField('Held_Kultur_Anzeige', details.culture.value);
    this.setTextField('Held_Sozialstatus', details.socialstate.value);
    this.setTextField('Held_Geburtsort', details.Home.value);
    this.setTextField('Held_Familie', details.family.value);
    this.setTextField('Held_Charakteristika', details.distinguishingmark.value);
  }

  fillActorMainAttributes() {
    const characteristics = this.entity.system.characteristics;
    const charMap = {
      'MU_1': characteristics.mu.value,
      'KL_1': characteristics.kl.value,
      'IN_1': characteristics.in.value,
      'CH_1': characteristics.ch.value,
      'FF_1': characteristics.ff.value,
      'GE_1': characteristics.ge.value,
      'KO_1': characteristics.ko.value,
      'KK_1': characteristics.kk.value
    };

    Object.entries(charMap).forEach(([fieldName, value]) => {
      this.setTextField(fieldName, value);
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
    this.setTextField('LE_Max_1', wounds.max);
    this.setTextField('LE_Max_3', wounds.max);
    this.setTextField('LE_Wert_1', wounds.current);
    if (wounds.max !== wounds.value) {
      this.setTextField('LE_Aktuell_1', wounds.value);
    }
    this.setTextField('LE_Kauf_1', wounds.advances);
    this.setTextField('LE_BM_1', wounds.modifier);
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
    // Property "current" is only the "Leiteigenschaft" without the 20AsP basis
    this.setTextField('AE_Wert_1', astralenergy.current + 20);
    this.setTextField('AE_Kauf_1', astralenergy.advances);
    this.setTextField('AE_BM_1', astralenergy.modifier);
  }

  setKarmaEnergyFields() {
    const karmaenergy = this.entity.system.status.karmaenergy;
    this.setTextField('KE_Max_1', karmaenergy.max);
    // Property "current" is only the "Leiteigenschaft" without the 20KsP basis
    this.setTextField('KE_Wert_1', karmaenergy.current + 20);
    this.setTextField('KE_Kauf_1', karmaenergy.advances);
    this.setTextField('KE_BM_1', karmaenergy.modifier);
  }

  setTalentFields() {
    const talentConfig = {
      // body talents
      'Fliegen': 1,
      'Gaukeleien': 2,
      'Klettern': 3,
      'Körperbeherrschung': 4,
      'Kraftakt': 5,
      'Reiten': 6,
      'Schwimmen': 7,
      'Selbstbeherrschung': 8,
      'Singen': 9,
      'Sinnesschärfe': 10,
      'Tanzen': 11,
      'Taschendiebstahl': 12,
      'Verbergen': 13,
      'Zechen': 14,
      // society talents
      'Bekehren & Überzeugen': 15,
      'Betören': 16,
      'Einschüchtern': 17,
      'Etikette': 18,
      'Gassenwissen': 19,
      'Menschenkenntnis': 20,
      'Überreden': 21,
      'Verkleiden': 22,
      'Willenskraft': 23,
      // nature talents
      'Fährtensuchen': 24,
      'Fesseln': 25,
      'Fischen & Angeln': 26,
      'Orientierung': 27,
      'Pflanzenkunde': 28,
      'Tierkunde': 29,
      'Wildnisleben': 30,
      // knowledge talents
      'Brett- & Glücksspiel': 31,
      'Geographie': 32,
      'Geschichtswissen': 33,
      'Götter & Kulte': 34,
      'Kriegskunst': 35,
      'Magiekunde': 36,
      'Mechanik': 37,
      'Rechnen': 38,
      'Rechtskunde': 39,
      'Sagen & Legenden': 40,
      'Sphärenkunde': 41,
      'Sternkunde': 42,
      // crafting talents
      'Alchimie': 43,
      'Boote & Schiffe': 44,
      'Fahrzeuge': 45,
      'Handel': 46,
      'Heilkunde Gift': 47,
      'Heilkunde Krankheiten': 48,
      'Heilkunde Seele': 49,
      'Heilkunde Wunden': 50,
      'Holzbearbeitung': 51,
      'Lebensmittelbearbeitung': 52,
      'Lederbearbeitung': 53,
      'Malen & Zeichnen': 54,
      'Metallbearbeitung': 55,
      'Musizieren': 56,
      'Schlösserknacken': 57,
      'Steinbearbeitung': 58,
      'Stoffbearbeitung': 59
    };

    Object.entries(talentConfig).forEach(([talentName, destination]) => {
      this.talent(talentName, destination);
    });
  }

  setShieldFields() {
    const combat_shields = this.map
      .filter((value) => value.type === 'meleeweapon')
      .filter((value) => (value.system.worn.value = 'true'))
      .filter((value) => value.system.combatskill.value === 'Schilde');
    var arrayLength = combat_shields.length;
    if (arrayLength > 4) {
      arrayLength = 4;
      ui.notifications.warn('You have equipped more than 4 shields or parry weapons! The template can only hold a maximum of 4');
    }
    for (var i = 0; i < arrayLength; i++) {
      this.setTextField('Schild_Name_Anzeige_' + (i + 1), combat_shields[i].name);
      this.setTextField('Schild_SP_' + (i + 1), combat_shields[i].system.structure.value + ' / ' + combat_shields[i].system.structure.max);
      this.setTextField('Schild_Mod_' + (i + 1), 'AT:' + combat_shields[i].system.atmod.value + ' / PA:' + combat_shields[i].system.pamod.value);
      this.setTextField('Schild_Gewicht_' + (i + 1), combat_shields[i].system.weight.value);
    }
  }

  setArmorFields() {
    const combat_armor = this.map.filter((value) => value.type === 'armor').filter((value) => (value.system.worn.value = 'true'));
    var arrayLength = combat_armor.length;
    if (arrayLength > 4) {
      arrayLength = 4;
      ui.notifications.warn('You have equipped more than 4 armors! The template can only hold a maximum of 4');
    }
    for (var i = 0; i < arrayLength; i++) {
      this.setTextField('Ruestung_Name_Anzeige_' + (i + 1), combat_armor[i].name);
      this.setTextField('Ruestung_RS_' + (i + 1), combat_armor[i].system.protection.value);
      this.setTextField('Ruestung_BE_' + (i + 1), combat_armor[i].system.encumbrance.value);
      this.setTextField('Ruestung_Abzuege_' + (i + 1), combat_armor[i].system.effect.value);
      this.setTextField('Ruestung_Gewicht_' + (i + 1), combat_armor[i].system.weight.value);
      this.setTextField('Ruestung_Gebiet_' + (i + 1), '');
    }
  }

  setRangeFields() {
    const combat_rangeweapon = this.map.filter((value) => value.type === 'rangeweapon').filter((value) => (value.system.worn.value = 'true'));
    var arrayLength = combat_rangeweapon.length;
    if (arrayLength > 4) {
      arrayLength = 4;
      ui.notifications.warn('You have equipped more than 4 range weapons! The template can only hold a maximum of 4');
    }
    for (var i = 0; i < arrayLength; i++) {
      this.setTextField('Fernwaffe_Name_Anzeige_' + (i + 1), combat_rangeweapon[i].name);
      this.setTextField('Fern_Kampftechnik_Name_Anzeige_' + (i + 1), combat_rangeweapon[i].system.combatskill.value);
      this.setTextField('Fern_Ladezeit_' + (i + 1), combat_rangeweapon[i].system.reloadTime.value + ' Runden');
      this.setTextField('Fern_TP_' + (i + 1), combat_rangeweapon[i].system.damage.value);
      this.setTextField('Fern_Munition_' + (i + 1), combat_rangeweapon[i].system.quantity.value);
      this.setTextField('Fern_Reichweite_' + (i + 1), combat_rangeweapon[i].system.reach.value);
      this.setTextField('Fern_FK_' + (i + 1), this.combatSkills[combat_rangeweapon[i].system.combatskill.value].r_AT);
      this.setTextField('Fern_Gewicht_' + (i + 1), combat_rangeweapon[i].system.weight.value);
    }
  }

  setMeleeFields() {
    const combat_meleeweapon = this.map
      .filter((value) => value.type === 'meleeweapon')
      .filter((value) => (value.system.worn.value = 'true'))
      .filter((value) => value.system.combatskill.value !== 'Schilde');
    var arrayLength = combat_meleeweapon.length;
    if (arrayLength > 4) {
      arrayLength = 4;
      ui.notifications.warn('You have equipped more than 4 melee weapons! The template can only hold a maximum of 4');
    }
    for (var i = 0; i < arrayLength; i++) {
      this.setTextField('Nahwaffe_Name_Anzeige_' + (i + 1), combat_meleeweapon[i].name);
      this.setTextField('Nah_Kampftechnik_Name_Anzeige_' + (i + 1), combat_meleeweapon[i].system.combatskill.value);
      this.setTextField('Nah_Schadensbonus_' + (i + 1), combat_meleeweapon[i].system.guidevalue.value.toUpperCase());
      this.setTextField('Nah_Schadensschwelle_' + (i + 1), combat_meleeweapon[i].system.damageThreshold.value);
      this.setTextField('Nah_TP_Wurf_' + (i + 1), combat_meleeweapon[i].system.damage.value);
      this.setTextField('Nah_TP_Basis_' + (i + 1), ''); //follow up
      this.setTextField('Nah_TP_' + (i + 1), ''); //follow up
      this.setTextField('Nah_AT_Mod_' + (i + 1), combat_meleeweapon[i].system.atmod.value);
      this.setTextField('Nah_PA_Mod_' + (i + 1), combat_meleeweapon[i].system.pamod.value);
      var reach_translate = combat_meleeweapon[i].system.reach.value;
      switch (reach_translate) {
        case 'short':
          reach_translate = 'kurz';
          break;
        case 'long':
          reach_translate = 'lang';
          break;
        default:
          break;
      }

      this.setTextField('Nah_Reichweite_' + (i + 1), reach_translate);
      this.setTextField('Nah_AT_' + (i + 1), this.combatSkills[combat_meleeweapon[i].system.combatskill.value].r_AT + Number(combat_meleeweapon[i].system.atmod.value));
      this.setTextField('Nah_PA_' + (i + 1), this.combatSkills[combat_meleeweapon[i].system.combatskill.value].r_PA + Number(combat_meleeweapon[i].system.pamod.value));
      this.setTextField('Nah_Gewicht_' + (i + 1), combat_meleeweapon[i].system.weight.value);
    }
  }

  setSpellFields() {
    const combat_spells = this.map.filter((value) => ['spell', 'ritual'].includes(value.type));
    var arrayLength = combat_spells.length;
    if (arrayLength > 40) {
      arrayLength = 40;
      ui.notifications.warn('You have more than 40 spells! The template can only hold a maximum of 40');
    }
    for (var i = 0; i < arrayLength; i++) {
      this.setTextField('Zauber_Anzeige_' + (i + 1), combat_spells[i].name);
      this.setTextField('Z_Probe_' + (i + 1),
        combat_spells[i].system.characteristic1.value.toUpperCase() +
        ' / ' +
        combat_spells[i].system.characteristic2.value.toUpperCase() +
        ' / ' +
        combat_spells[i].system.characteristic3.value.toUpperCase()
      );
      this.setTextField('Z_FW_' + (i + 1), combat_spells[i].system.talentValue.value);
      this.setTextField('Z_AsP_' + (i + 1), combat_spells[i].system.AsPCost.value);
      this.setTextField('Z_ZDauer_' + (i + 1), combat_spells[i].system.castingTime.value);
      this.setTextField('Z_RW_' + (i + 1), combat_spells[i].system.range.value);
      this.setTextField('Z_WDauer_' + (i + 1), combat_spells[i].system.duration.value);
      this.setTextField('Z_Merkmal_' + (i + 1), '');
      this.setTextField('Z_SF_' + (i + 1), combat_spells[i].system.StF.value);
      this.setTextField('Z_Wirkung_' + (i + 1), combat_spells[i].system.effect.value);
      this.setTextField('Z_Seite_' + (i + 1), '');
    }
  }

  setLiturgyFields() {
    const combat_liturgy = this.map.filter((value) => ['liturgy', 'ceremony'].includes(value.type));
    var arrayLength = combat_liturgy.length;
    if (arrayLength > 40) {
      arrayLength = 40;
      ui.notifications.warn('You have more than 40 liturgys! The template can only hold a maximum of 40');
    }

    for (var i = 0; i < arrayLength; i++) {
      this.setTextField('Liturgie_Anzeige_' + (i + 1), combat_liturgy[i].name);
      this.setTextField('L_Probe_' + (i + 1),
        combat_liturgy[i].system.characteristic1.value.toUpperCase() +
        ' / ' +
        combat_liturgy[i].system.characteristic2.value.toUpperCase() +
        ' / ' +
        combat_liturgy[i].system.characteristic3.value.toUpperCase()
      );
      this.setTextField('L_FW_' + (i + 1), combat_liturgy[i].system.talentValue.value);
      this.setTextField('L_KaP_' + (i + 1), combat_liturgy[i].system.AsPCost.value);
      this.setTextField('L_LDauer_' + (i + 1), combat_liturgy[i].system.castingTime.value);
      this.setTextField('L_RW_' + (i + 1), combat_liturgy[i].system.range.value);
      this.setTextField('L_WDauer_' + (i + 1), combat_liturgy[i].system.duration.value);
      this.setTextField('L_Aspekt_' + (i + 1), '');
      this.setTextField('L_SF_' + (i + 1), combat_liturgy[i].system.StF.value);
      this.setTextField('L_Wirkung_' + (i + 1), combat_liturgy[i].system.effect.value);
      this.setTextField('L_Seite_' + (i + 1), '');
    }
  }

  async fillForm(dsa_actor_id) {
    try {
      /** declaration */

      var PDFDocument = PDFLib.PDFDocument;
      var StandardFonts = PDFLib.StandardFonts;
      var rgb = PDFLib.rgb;

      this.entity = await fromUuid(this.actorId);
      this.map = this.entity.items;

      const formUrl = dsa5char2pdf.TEMPLATES.PDF_Template;
      const formPdfBytes = await fetch(formUrl).then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(formPdfBytes);
      this.form = pdfDoc.getForm();

      /** check for modul version */
      const ModuleAPI = game.modules.get('dsa5-char2pdfv2');
      modul_version = ModuleAPI.version;

      /** Current date in right format */

      var today = new Date();
      var dd = String(today.getDate()).padStart(2, '0');
      var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      var yyyy = today.getFullYear();
      today = dd + '.' + mm + '.' + yyyy;

      /** character detail */

      this.fillCharacterDetails();

      /** actor picture */

      const actor_image_url = this.entity.img;

      if (actor_image_url.split('.').pop() === 'png' || actor_image_url.split('.').pop() === 'jpg') {
        var actor_imageBytes = await fetch(actor_image_url).then((res) => res.arrayBuffer());
      } else {
        actor_imageBytes = await get_actor_pic(actor_image_url);
      }
      var actor_image = await pdfDoc.embedPng(actor_imageBytes);
      this.form.getButton('Charakterbild').setImage(actor_image);

      /** main attributes */

      this.fillActorMainAttributes();

      /** disadvantages */

      const disadvantage = this.map.filter((value) => value.type === 'disadvantage');
      var f_disadvantage = Array.from(disadvantage.values(), (value) => value.name).join(', ');
      this.setTextField('Held_Nachteile', f_disadvantage);

      /** advantages */

      const advantage = this.map.filter((value) => value.type === 'advantage');
      var f_advantage = Array.from(advantage.values(), (value) => value.name).join(', ');
      this.setTextField('Held_Vorteile', f_advantage);

      /** specialability */
      let f_specialability = '';

      /** - General */
      const specialability_general = this.map.filter((value) => value.type === 'specialability').filter((value) => value.system.category.value === 'general');
      var f_specialability_general = Array.from(specialability_general.values(), (value) => value.name).join(', ');
      f_specialability += f_specialability_general;

      /** - Fate Points*/

      const specialability_fatepoint = this.map.filter((value) => value.type === 'specialability').filter((value) => value.system.category.value === 'fatePoints');
      var f_specialability_fatepoints = Array.from(specialability_fatepoint.values(), (value) => value.name).join(', ');
      f_specialability += '\n\nSchicksalspunkt SF: ' + f_specialability_fatepoints;

      this.setTextField('Held_SF_allgemein', f_specialability);

      /** language */

      const language = this.map
        .filter((value) => value.type === 'specialability')
        .filter((value) => value.system.category.value === 'language')
        .filter((value) => value.name.includes('Sprache'));
      var f_language = Array.from(language.values(), (value) => value.name + ' ' + romanize(value.system.step.value)).join(', ');
      this.setTextField('Held_Sprachen', f_language);

      /** script */

      const script = this.map
        .filter((value) => value.type === 'specialability')
        .filter((value) => value.system.category.value === 'language')
        .filter((value) => value.name.includes('Schrift'));
      var f_script = Array.from(script.values(), (value) => value.name + ' ' + romanize(value.system.step.value)).join(', ');
      this.setTextField('Held_Schriften', f_script);

      this.setStatusFields();

      /** experience */
      const exp_translate = game.i18n.localize(this.entity.system.details.experience.description);

      this.setTextField('AP_Erfahrungsgrad_Anzeige', exp_translate);

      this.setTextField('AP_gesamt', this.entity.system.details.experience.total);
      this.setTextField('AP_gesammelt', this.entity.system.details.experience.current);
      this.setTextField('AP_ausgegeben', this.entity.system.details.experience.spent);

      /** fatepoints */

      const base = this.entity.system.status.fatePoints.current;
      const actual = this.entity.system.status.fatePoints.value;
      this.setTextField('SchiP_Wert_1', base);
      this.setTextField('SchiP_Max_1', this.entity.system.status.fatePoints.max);
      if (base !== actual) {
        this.setTextField('SchiP_Aktuell_1', this.entity.system.status.fatePoints.value);
      }
      this.setTextField('SchiP_BM_1', this.entity.system.status.fatePoints.modifier);

      /** talents */

      this.setTalentFields();


      /** Combat */
      /** general */

      this.setTextField('LE_Max_2', this.entity.system.status.wounds.max);
      // Don't use the max attribute of speed. It is allways 0.
      const speed = this.entity.system.status.speed;
      this.setTextField('GS_Max_1', speed.initial + speed.modifier + speed.gearmodifier);
      this.setTextField('AW_Max_2', this.entity.system.status.dodge.max);
      const initiative = this.entity.system.status.initiative;
      this.setTextField('INI_Max_1',
        Math.round((this.entity.system.characteristics.mu.value + this.entity.system.characteristics.ge.value) / 2)
        + initiative.modifier + initiative.gearmodifier
      );
      this.setTextField('AW_Max_2', this.entity.system.status.dodge.max);
      this.setTextField('SK_Max_2', this.entity.system.status.soulpower.max);
      this.setTextField('ZK_Max_2', this.entity.system.status.toughness.max);

      /** Wepaons */
      /** combat */

      this.combatSkills = {};
      
      const combatSkillsConfig = {
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

      Object.entries(combatSkillsConfig).forEach(([skillName, config]) => {
        this.combatSkills[skillName] = this.combat(skillName, config.destination, config.hasParry);
      });

      const combat_specialability = this.map.filter((value) => value.type === 'specialability').filter((value) => value.system.category.value === 'Combat');
      var f_combat_specialability = Array.from(combat_specialability.values(), (value) => value.name + ' ' + romanize(value.system.step.value)).join(', ');

      this.setTextField('Held_SF_Kampf', f_combat_specialability);

      /** Coins*/

      this.coins('Dukaten', 'D');
      this.coins('Silber', 'S');
      this.coins('Heller', 'H');
      this.coins('Kreuzer', 'K');

      /** Weapons */
      /** melee weapon */

      this.setMeleeFields();

      /** range weapon   */

      this.setRangeFields();

      /** armor */

      this.setArmorFields();

      /** shields and parry weapon */

      this.setShieldFields();

      /** Items */

      const items = this.map.filter(
        (value) => value.type === 'equipment' || value.type === 'meleeweapon' || value.type === 'armor' || value.type === 'rangeweapon' || value.type === 'ammunition'
      );
      var arrayLength = items.length;
      var sum_weight1 = 0;
      var sum_weight2 = 0;
      if (arrayLength > 72) {
        arrayLength = 72;
        ui.notifications.warn('You have more than 72 items in your inventory! The template can only hold a maximum of 72');
      }
      for (var i = 0; i < arrayLength; i++) {
        if (Number(items[i].system.quantity.value) > 1) {
          var quantity = items[i].system.quantity.value + 'x ';
        } else {
          var quantity = '';
        }
        this.setTextField('Besitz_Name_' + (i + 1), quantity + items[i].name);
        this.setTextField('Besitz_Gewicht_' + (i + 1), items[i].system.weight.value);
        if (i <= 36) {
          sum_weight1 = sum_weight1 + Number(items[i].system.weight.value);
        } else {
          sum_weight2 = sum_weight2 + Number(items[i].system.weight.value);
        }
      }
      this.setTextField('Gewicht_1', Math.round(sum_weight1 * 100) / 100);
      this.setTextField('Gewicht_2', Math.round((sum_weight1 + sum_weight2) * 100) / 100);
      this.setTextField('Trag_1', Number(this.entity.system.characteristics.kk.value) * 2);

      /** Mage */
      /** spells */

      this.setSpellFields();

      const baseAE = this.entity.system.status.astralenergy.max;
      const actualAE = this.entity.system.status.astralenergy.value
      this.setTextField('AE_Max_2', baseAE);
      if (baseAE !== actualAE) {
        this.setTextField('AE_Aktuell', actualAE);
      }
      this.setTextField('Held_Tradition_magisch', this.entity.system.tradition.magical);
      this.setTextField('Leit_Magie_Ansicht', Leitwert_long(this.entity.system.guidevalue.magical));
      this.setTextField('Held_Merkmale', Leitwert_long(this.entity.system.feature.magical));

      /** magictrick */
      const combat_magictrick = this.map.filter((value) => value.type === 'magictrick');
      var f_combat_magictrick = Array.from(combat_magictrick.values(), (value) => value.name).join(', ');

      this.setTextField('Held_Tricks', f_combat_magictrick);

      /** special_magic */
      const special_magic = this.map.filter((value) => value.type === 'specialability').filter((value) => value.system.category.value === 'magical');
      var f_special_magic = Array.from(special_magic.values(), (value) => value.name).join(', ');

      this.setTextField('Held_SF_Mag', f_special_magic);

      /** Cleric */
      /** liturgy */

      this.setLiturgyFields();

      const baseKE = this.entity.system.status.karmaenergy.max;
      const actualKE = this.entity.system.status.karmaenergy.value;      
      this.setTextField('KE_Max_2', baseKE);
      if (baseKE !== actualKE) {
        this.setTextField('KE_Aktuell', actualKE);
      }
      this.setTextField('Held_Tradition_klerikal', this.entity.system.tradition.clerical);
      this.setTextField('Leit_Karma_Anzeige', Leitwert_long(this.entity.system.guidevalue.clerical));
      this.setTextField('Held_Aspekt', Leitwert_long(this.entity.system.feature.clerical));

      /** blessing */
      const combat_blessing = this.map.filter((value) => value.type === 'blessing');
      var f_combat_blessing = Array.from(combat_blessing.values(), (value) => value.name).join(', ');

      this.setTextField('Held_Segen', f_combat_blessing);

      /** special_cleric */
      const special_cleric = this.map.filter((value) => value.type === 'specialability').filter((value) => value.system.category.value === 'clerical');
      var f_special_cleric = Array.from(special_cleric.values(), (value) => value.name).join(', ');

      this.setTextField('Held_SF_Karm', f_special_cleric);

      /** set PDF Metadata for PDF*/
      pdfDoc.setTitle('DSA5-' + this.entity.name + '.pdf created on ' + today);
      pdfDoc.setSubject('https://github.com/Plushtoast/dsa5-char2pdfv2');
      pdfDoc.setProducer('DSA5 - char2PDF ' + modul_version);
      pdfDoc.setCreator('pdf-lib (https://github.com/Hopding/pdf-lib)');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      /** save filled template */

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf;charset=utf-8' });
      saveAs(blob, 'DSA5-' + this.entity.name + '.pdf');
    } catch (err) {
      ui.notifications.error(`Char2PDF - Error: ${err.message}`);
      console.error(err);
    }
  }
}



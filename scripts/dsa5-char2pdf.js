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

      this.setTextField('Held_Name', this.entity.name);
      this.setTextField('Held_Geschlecht', this.entity.system.details.gender.value);
      this.setTextField('Held_Spezies_Anzeige', this.entity.system.details.species.value);
      this.setTextField('Held_Geburtsdatum', '');
      this.setTextField('Held_Alter', this.entity.system.details.age.value);
      this.setTextField('Held_Haare', this.entity.system.details.haircolor.value);
      this.setTextField('Held_Augen', this.entity.system.details.eyecolor.value);
      this.setTextField('Held_Groesse', this.entity.system.details.height.value);
      this.setTextField('Held_Gewicht', this.entity.system.details.weight.value);
      this.setTextField('Held_Profession_Anzeige', this.entity.system.details.career.value);
      this.setTextField('Held_Kultur_Anzeige', this.entity.system.details.culture.value);
      this.setTextField('Held_Sozialstatus', this.entity.system.details.socialstate.value);
      this.setTextField('Held_Geburtsort', this.entity.system.details.Home.value);
      this.setTextField('Held_Familie', this.entity.system.details.family.value);
      this.setTextField('Held_Charakteristika', this.entity.system.details.distinguishingmark.value);

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

      const p_mu = this.entity.system.characteristics.mu.value;
      const p_kl = this.entity.system.characteristics.kl.value;
      const p_in = this.entity.system.characteristics.in.value;
      const p_ch = this.entity.system.characteristics.ch.value;
      const p_ff = this.entity.system.characteristics.ff.value;
      const p_ge = this.entity.system.characteristics.ge.value;
      const p_ko = this.entity.system.characteristics.ko.value;
      const p_kk = this.entity.system.characteristics.kk.value;

      this.setTextField('MU_1', p_mu);
      this.setTextField('KL_1', p_kl);
      this.setTextField('IN_1', p_in);
      this.setTextField('CH_1', p_ch);
      this.setTextField('FF_1', p_ff);
      this.setTextField('GE_1', p_ge);
      this.setTextField('KO_1', p_ko);
      this.setTextField('KK_1', p_kk);

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

      /** life / wounds */

      const baseLE = this.entity.system.status.wounds.max;
      const actualLE = this.entity.system.status.wounds.value;
      this.setTextField('LE_Max_1', baseLE);
      this.setTextField('LE_Max_3', this.entity.system.status.wounds.max);
      this.setTextField('LE_Wert_1', this.entity.system.status.wounds.current);
      if (baseLE !== actualLE) {
        this.setTextField('LE_Aktuell_1', actualLE);
      }
      this.setTextField('LE_Kauf_1', this.entity.system.status.wounds.advances);
      this.setTextField('LE_BM_1', this.entity.system.status.wounds.modifier);

      /** soulpower*/

      this.setTextField('SK_Max_1', this.entity.system.status.soulpower.max);
      this.setTextField('SK_Wert_1', this.entity.system.status.soulpower.value);
      this.setTextField('SK_BM_1', this.entity.system.status.soulpower.modifier);

      /** toughness*/

      this.setTextField('ZK_Max_1', this.entity.system.status.toughness.max);
      this.setTextField('ZK_Wert_1', this.entity.system.status.toughness.value);
      this.setTextField('ZK_BM_1', this.entity.system.status.toughness.modifier);

      /** dodge*/

      this.setTextField('AW_Max_1', this.entity.system.status.dodge.max);
      this.setTextField('AW_Wert_1', this.entity.system.status.dodge.value);
      this.setTextField('AW_BM_1', this.entity.system.status.dodge.modifier);

      /** astralenergy */

      const baseAE = this.entity.system.status.astralenergy.max;
      const currentAE = this.entity.system.status.astralenergy.current;
      const actualAE = this.entity.system.status.astralenergy.value;
      const advAE = this.entity.system.status.astralenergy.advances;
      const modAE = this.entity.system.status.astralenergy.modifier;
      this.setTextField('AE_Max_1', baseAE);
      /* Property "current" is only the "Leiteigenschaft" without the 20AsP basis */
      this.setTextField('AE_Wert_1', currentAE + 20);
      this.setTextField('AE_Kauf_1', advAE);
      this.setTextField('AE_BM_1', modAE);

      /** karmaenergy */

      const baseKE = this.entity.system.status.karmaenergy.max;
      const currentKE = this.entity.system.status.karmaenergy.current;
      const actualKE = this.entity.system.status.karmaenergy.value;
      const advKE = this.entity.system.status.karmaenergy.advances;
      const modKE = this.entity.system.status.karmaenergy.modifier;
      this.setTextField('KE_Max_1', baseKE);
      /* Property "current" ia only the "Leiteigenschaft" withoud the 20KsP basis */
      this.setTextField('KE_Wert_1', currentKE + 20);
      this.setTextField('KE_Kauf_1', advKE);
      this.setTextField('KE_BM_1', modKE);

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
      /** body talents  */
      this.talent('Fliegen', 1);
      this.talent('Gaukeleien', 2);
      this.talent('Klettern', 3);
      this.talent('Körperbeherrschung', 4);
      this.talent('Kraftakt', 5);
      this.talent('Reiten', 6);
      this.talent('Schwimmen', 7);
      this.talent('Selbstbeherrschung', 8);
      this.talent('Singen', 9);
      this.talent('Sinnesschärfe', 10);
      this.talent('Tanzen', 11);
      this.talent('Taschendiebstahl', 12);
      this.talent('Verbergen', 13);
      this.talent('Zechen', 14);
      /** society talents  */
      this.talent('Bekehren & Überzeugen', 15);
      this.talent('Betören', 16);
      this.talent('Einschüchtern', 17);
      this.talent('Etikette', 18);
      this.talent('Gassenwissen', 19);
      this.talent('Menschenkenntnis', 20);
      this.talent('Überreden', 21);
      this.talent('Verkleiden', 22);
      this.talent('Willenskraft', 23);
      /** nature talents  */
      this.talent('Fährtensuchen', 24);
      this.talent('Fesseln', 25);
      this.talent('Fischen & Angeln', 26);
      this.talent('Orientierung', 27);
      this.talent('Pflanzenkunde', 28);
      this.talent('Tierkunde', 29);
      this.talent('Wildnisleben', 30);
      /** knowledge talents  */
      this.talent('Brett- & Glücksspiel', 31);
      this.talent('Geographie', 32);
      this.talent('Geschichtswissen', 33);
      this.talent('Götter & Kulte', 34);
      this.talent('Kriegskunst', 35);
      this.talent('Magiekunde', 36);
      this.talent('Mechanik', 37);
      this.talent('Rechnen', 38);
      this.talent('Rechtskunde', 39);
      this.talent('Sagen & Legenden', 40);
      this.talent('Sphärenkunde', 41);
      this.talent('Sternkunde', 42);
      /** crafting talents  */
      this.talent('Alchimie', 43);
      this.talent('Boote & Schiffe', 44);
      this.talent('Fahrzeuge', 45);
      this.talent('Handel', 46);
      this.talent('Heilkunde Gift', 47);
      this.talent('Heilkunde Krankheiten', 48);
      this.talent('Heilkunde Seele', 49);
      this.talent('Heilkunde Wunden', 50);
      this.talent('Holzbearbeitung', 51);
      this.talent('Lebensmittelbearbeitung', 52);
      this.talent('Lederbearbeitung', 53);
      this.talent('Malen & Zeichnen', 54);
      this.talent('Metallbearbeitung', 55);
      this.talent('Musizieren', 56);
      this.talent('Schlösserknacken', 57);
      this.talent('Steinbearbeitung', 58);
      this.talent('Stoffbearbeitung', 59);



      /** Combat */
      /** general */

      this.setTextField('LE_Max_2', this.entity.system.status.wounds.max);
      // Don't use the max attribute of speed. It is allways 0.
      const speed = this.entity.system.status.speed;
      this.setTextField('GS_Max_1', speed.initial + speed.modifier + speed.gearmodifier);
      this.setTextField('AW_Max_2', this.entity.system.status.dodge.max);
      const initiative = this.entity.system.status.initiative;
      this.setTextField('INI_Max_1', 
        Math.round( (this.entity.system.characteristics.mu.value + this.entity.system.characteristics.ge.value) / 2)
        + initiative.modifier + initiative.gearmodifier
      );
      this.setTextField('AW_Max_2', this.entity.system.status.dodge.max);
      this.setTextField('SK_Max_2', this.entity.system.status.soulpower.max);
      this.setTextField('ZK_Max_2', this.entity.system.status.toughness.max);

      /** Wepaons */
      /** combat */
      const r_Armbrüste = this.combat('Armbrüste', 1, 0);
      const r_Bögen = this.combat('Bögen', 2, 0);
      const r_Dolche = this.combat('Dolche', 3, 1);
      const r_Fechtwaffen = this.combat('Fechtwaffen', 4, 1);
      const r_Hiebwaffen = this.combat('Hiebwaffen', 5, 1);
      const r_Kettenwaffen = this.combat('Kettenwaffen', 6, 0);
      const r_Lanzen = this.combat('Lanzen', 7, 1);
      const r_Raufen = this.combat('Raufen', 8, 1);
      const r_Schilde = this.combat('Schilde', 9, 1);
      const r_Schwerter = this.combat('Schwerter', 10, 1);
      const r_Stangenwaffen = this.combat('Stangenwaffen', 11, 1);
      const r_Wurfwaffen = this.combat('Wurfwaffen', 12, 0);
      const r_Zweihandhiebwaffen = this.combat('Zweihandhiebwaffen', 13, 1);
      const r_Zweihandschwerter = this.combat('Zweihandschwerter', 14, 1);

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
        this.setTextField('Nah_AT_' + (i + 1), eval('r_' + combat_meleeweapon[i].system.combatskill.value + '.r_AT') + Number(combat_meleeweapon[i].system.atmod.value));
        this.setTextField('Nah_PA_' + (i + 1), eval('r_' + combat_meleeweapon[i].system.combatskill.value + '.r_PA') + Number(combat_meleeweapon[i].system.pamod.value));
        this.setTextField('Nah_Gewicht_' + (i + 1), combat_meleeweapon[i].system.weight.value);
      }

      /** range weapon   */

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
        this.setTextField('Fern_FK_' + (i + 1), eval('r_' + combat_rangeweapon[i].system.combatskill.value + '.r_AT'));
        this.setTextField('Fern_Gewicht_' + (i + 1), combat_rangeweapon[i].system.weight.value);
      }

      /** armor */

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

      /** shields and parry weapon */

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
      this.setTextField('Trag_1', Number (this.entity.system.characteristics.kk.value) * 2);

      /** Mage */
      /** spells */
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

      this.setTextField('AE_Max_2', baseAE);
      if (baseAE !== actualAE) {
        this.setTextField('AE_Aktuell', actualAE);
      }
      this.setTextField('Held_Tradition_magisch', this.entity.system.tradition.magical);
      this.setTextField('Leit_Magie_Ansicht', Leitwert_long (this.entity.system.guidevalue.magical));
      this.setTextField('Held_Merkmale', Leitwert_long (this.entity.system.feature.magical));

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

      this.setTextField('KE_Max_2', baseKE);
      if (baseKE !== actualKE) {
        this.setTextField('KE_Aktuell', actualKE);
      }
      this.setTextField('Held_Tradition_klerikal', this.entity.system.tradition.clerical);
      this.setTextField('Leit_Karma_Anzeige', Leitwert_long (this.entity.system.guidevalue.clerical));
      this.setTextField('Held_Aspekt', Leitwert_long (this.entity.system.feature.clerical));

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



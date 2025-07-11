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
    await fillForm(this.actor.uuid);
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

function combat(name, destination, hasParry) {
  const skill = entity.items.find(item => item.type === 'combatskill' && item.name === name);
  if (!skill) return { r_AT: 0, r_PA: 0 };

  const combatskillData = game.dsa5.dataModels.Item.combatskill._calculateCombatSkillValues(skill, entity.system);

  form.getTextField(`KT_FW_${destination}`).setText(String(combatskillData.system.talentValue.value).normalize('NFC'));
  form.getTextField(`KT_AT_${destination}`).setText(String(combatskillData.system.attack.value).normalize('NFC'));
  if (hasParry) {
    form.getTextField(`KT_PA_${destination}`).setText(String(combatskillData.system.parry.value).normalize('NFC'));
  }

  return {
    r_AT: combatskillData.system.attack.value,
    r_PA: hasParry ? combatskillData.system.parry.value : 0,
  };
}

function talent(name, destination) {
  const skillItems = map.filter(item => item.type === 'skill' && item.name === name);
  if (!skillItems.length) return;

  const skill = skillItems[0];
  const talentValue = skill.system.talentValue.value;
  form.getTextField('Talent_FW_' + destination).setText(String(talentValue).normalize('NFC'));

  const charNames = [
    skill.system.characteristic1.value,
    skill.system.characteristic2.value,
    skill.system.characteristic3.value
  ];
  const charValues = charNames.map(n => entity.system.characteristics[n]?.value ?? 0);

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

function coins(currencyName, fieldShort) {
  const currencyItems = map.filter(item => item.name === currencyName);
  const total = currencyItems.reduce((sum, item) => sum + Number(item.system.quantity.value), 0);
  form.getTextField('Geld_' + fieldShort).setText(String(total).normalize('NFC'));
}

async function fillForm(dsa_actor_id) {
  try {
    /** declaration */
    var PDFDocument = PDFLib.PDFDocument;
    var StandardFonts = PDFLib.StandardFonts;
    var rgb = PDFLib.rgb;

    const entity = await fromUuid(dsa_actor_id);
    let map = entity.items;

    const formUrl = dsa5char2pdf.TEMPLATES.PDF_Template;
    const formPdfBytes = await fetch(formUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(formPdfBytes);
    const form = pdfDoc.getForm();

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

    form.getTextField('Held_Name').setText(entity.name.normalize('NFC'));
    form.getTextField('Held_Geschlecht').setText(entity.system.details.gender.value.normalize('NFC'));
    form.getTextField('Held_Spezies_Anzeige').setText(entity.system.details.species.value.normalize('NFC'));
    form.getTextField('Held_Geburtsdatum').setText(''.normalize('NFC'));
    form.getTextField('Held_Alter' + '').setText((entity.system.details.age.value + '').normalize('NFC'));
    form.getTextField('Held_Haare').setText(entity.system.details.haircolor.value.normalize('NFC'));
    form.getTextField('Held_Augen').setText(entity.system.details.eyecolor.value.normalize('NFC'));
    form.getTextField('Held_Groesse' + '').setText((entity.system.details.height.value + '').normalize('NFC'));
    form.getTextField('Held_Gewicht' + '').setText((entity.system.details.weight.value + '').normalize('NFC'));
    form.getTextField('Held_Profession_Anzeige').setText(entity.system.details.career.value.normalize('NFC'));
    form.getTextField('Held_Kultur_Anzeige').setText(entity.system.details.culture.value.normalize('NFC'));
    form.getTextField('Held_Sozialstatus').setText(entity.system.details.socialstate.value.normalize('NFC'));
    form.getTextField('Held_Geburtsort').setText(entity.system.details.Home.value.normalize('NFC'));
    form.getTextField('Held_Familie').setText(entity.system.details.family.value.normalize('NFC'));
    form.getTextField('Held_Charakteristika').setText(entity.system.details.distinguishingmark.value.normalize('NFC'));

    /** actor picture */

    const actor_image_url = entity.img;

    if (actor_image_url.split('.').pop() === 'png' || actor_image_url.split('.').pop() === 'jpg') {
      var actor_imageBytes = await fetch(actor_image_url).then((res) => res.arrayBuffer());
    } else {
      actor_imageBytes = await get_actor_pic(actor_image_url);
    }
    var actor_image = await pdfDoc.embedPng(actor_imageBytes);
    form.getButton('Charakterbild').setImage(actor_image);

    /** main attributes */

    const p_mu = entity.system.characteristics.mu.value;
    const p_kl = entity.system.characteristics.kl.value;
    const p_in = entity.system.characteristics.in.value;
    const p_ch = entity.system.characteristics.ch.value;
    const p_ff = entity.system.characteristics.ff.value;
    const p_ge = entity.system.characteristics.ge.value;
    const p_ko = entity.system.characteristics.ko.value;
    const p_kk = entity.system.characteristics.kk.value;

    form.getTextField('MU_1').setText((p_mu + '').normalize('NFC'));
    form.getTextField('KL_1').setText((p_kl + '').normalize('NFC'));
    form.getTextField('IN_1').setText((p_in + '').normalize('NFC'));
    form.getTextField('CH_1').setText((p_ch + '').normalize('NFC'));
    form.getTextField('FF_1').setText((p_ff + '').normalize('NFC'));
    form.getTextField('GE_1').setText((p_ge + '').normalize('NFC'));
    form.getTextField('KO_1').setText((p_ko + '').normalize('NFC'));
    form.getTextField('KK_1').setText((p_kk + '').normalize('NFC'));

    /** disadvantages */

    const disadvantage = map.filter((value) => value.type === 'disadvantage');
    var f_disadvantage = Array.from(disadvantage.values(), (value) => value.name).join(', ');
    form.getTextField('Held_Nachteile').setText(f_disadvantage.normalize('NFC'));

    /** advantages */

    const advantage = map.filter((value) => value.type === 'advantage');
    var f_advantage = Array.from(advantage.values(), (value) => value.name).join(', ');
    form.getTextField('Held_Vorteile').setText(f_advantage.normalize('NFC'));

    /** specialability */
    let f_specialability = '';

    /** - General */
    const specialability_general = map.filter((value) => value.type === 'specialability').filter((value) => value.system.category.value === 'general');
    var f_specialability_general = Array.from(specialability_general.values(), (value) => value.name).join(', ');
    f_specialability += f_specialability_general;

    /** - Fate Points*/

    const specialability_fatepoint = map.filter((value) => value.type === 'specialability').filter((value) => value.system.category.value === 'fatePoints');
    var f_specialability_fatepoints = Array.from(specialability_fatepoint.values(), (value) => value.name).join(', ');
    f_specialability += '\n\nSchicksalspunkt SF: ' + f_specialability_fatepoints;

    form.getTextField('Held_SF_allgemein').setText(f_specialability.normalize('NFC'));

    /** language */

    const language = map
      .filter((value) => value.type === 'specialability')
      .filter((value) => value.system.category.value === 'language')
      .filter((value) => value.name.includes('Sprache'));
    var f_language = Array.from(language.values(), (value) => value.name + ' ' + romanize(value.system.step.value)).join(', ');
    form.getTextField('Held_Sprachen').setText(f_language.normalize('NFC'));

    /** script */

    const script = map
      .filter((value) => value.type === 'specialability')
      .filter((value) => value.system.category.value === 'language')
      .filter((value) => value.name.includes('Schrift'));
    var f_script = Array.from(script.values(), (value) => value.name + ' ' + romanize(value.system.step.value)).join(', ');
    form.getTextField('Held_Schriften').setText(f_script.normalize('NFC'));

    /** life / wounds */

    const baseLE = entity.system.status.wounds.max;
    const actualLE = entity.system.status.wounds.value;
    form.getTextField('LE_Max_1').setText(String(baseLE).normalize('NFC'));
    form.getTextField('LE_Max_3').setText((entity.system.status.wounds.max + '').normalize('NFC'));
    form.getTextField('LE_Wert_1').setText((entity.system.status.wounds.current + '').normalize('NFC'));
    if (baseLE !== actualLE) {
      form.getTextField('LE_Aktuell_1').setText(String(actualLE).normalize('NFC'));
    }
    form.getTextField('LE_Kauf_1').setText((entity.system.status.wounds.advances + '').normalize('NFC'));
    form.getTextField('LE_BM_1').setText((entity.system.status.wounds.modifier + '').normalize('NFC'));

    /** soulpower*/

    form.getTextField('SK_Max_1').setText((entity.system.status.soulpower.max + '').normalize('NFC'));
    form.getTextField('SK_Wert_1').setText((entity.system.status.soulpower.value + '').normalize('NFC'));
    form.getTextField('SK_BM_1').setText((entity.system.status.soulpower.modifier + '').normalize('NFC'));

    /** toughness*/

    form.getTextField('ZK_Max_1').setText((entity.system.status.toughness.max + '').normalize('NFC'));
    form.getTextField('ZK_Wert_1').setText((entity.system.status.toughness.value + '').normalize('NFC'));
    form.getTextField('ZK_BM_1').setText((entity.system.status.toughness.modifier + '').normalize('NFC'));

    /** dodge*/

    form.getTextField('AW_Max_1').setText((entity.system.status.dodge.max + '').normalize('NFC'));
    form.getTextField('AW_Wert_1').setText((entity.system.status.dodge.value + '').normalize('NFC'));
    form.getTextField('AW_BM_1').setText((entity.system.status.dodge.modifier + '').normalize('NFC'));

    /** astralenergy */

    const baseAE = entity.system.status.astralenergy.max;
    const currentAE = entity.system.status.astralenergy.current;
    const actualAE = entity.system.status.astralenergy.value;
    const advAE = entity.system.status.astralenergy.advances;
    const modAE = entity.system.status.astralenergy.modifier;
    form.getTextField('AE_Max_1').setText(String(baseAE).normalize('NFC'));
    /* Property "current" is only the "Leiteigenschaft" without the 20AsP basis */
    form.getTextField('AE_Wert_1').setText(String(currentAE + 20).normalize('NFC'));
    form.getTextField('AE_Kauf_1').setText(String(advAE).normalize('NFC'));
    form.getTextField('AE_BM_1').setText(String(modAE).normalize('NFC'));

    /** karmaenergy */

    const baseKE = entity.system.status.karmaenergy.max;
    const currentKE = entity.system.status.karmaenergy.current;
    const actualKE = entity.system.status.karmaenergy.value;
    const advKE = entity.system.status.karmaenergy.advances;
    const modKE = entity.system.status.karmaenergy.modifier;
    form.getTextField('KE_Max_1').setText(String(baseKE).normalize('NFC'));
    /* Property "current" ia only the "Leiteigenschaft" withoud the 20KsP basis */
    form.getTextField('KE_Wert_1').setText(String(currentKE + 20).normalize('NFC'));
    form.getTextField('KE_Kauf_1').setText(String(advKE).normalize('NFC'));
    form.getTextField('KE_BM_1').setText(String(modKE).normalize('NFC'));

    /** experience */
    var exp_translate = entity.system.details.experience.description;
    switch (exp_translate) {
      case 'EXP.inexperienced':
        exp_translate = 'Unerfahren';
        break;
      case 'EXP.average':
        exp_translate = 'Durchschnittlich';
        break;
      case 'EXP.experienced':
        exp_translate = 'Erfahren';
        break;
      case 'EXP.competent':
        exp_translate = 'Kompetent';
        break;
      case 'EXP.masterful':
        exp_translate = 'Meisterlich';
        break;
      default:
        break;
    }
    form.getTextField('AP_Erfahrungsgrad_Anzeige').setText((exp_translate + '').normalize('NFC'));

    form.getTextField('AP_gesamt').setText((entity.system.details.experience.total + '').normalize('NFC'));
    form.getTextField('AP_gesammelt').setText((entity.system.details.experience.current + '').normalize('NFC'));
    form.getTextField('AP_ausgegeben').setText((entity.system.details.experience.spent + '').normalize('NFC'));

    /** fatepoints */

    const base = entity.system.status.fatePoints.current;
    const actual = entity.system.status.fatePoints.value;
    form.getTextField('SchiP_Wert_1').setText(String(base).normalize('NFC'));
    form.getTextField('SchiP_Max_1').setText((entity.system.status.fatePoints.max + '').normalize('NFC'));
    if (base !== actual) {
      form.getTextField('SchiP_Aktuell_1').setText((entity.system.status.fatePoints.value + '').normalize('NFC'));
    }
    form.getTextField('SchiP_BM_1').setText((entity.system.status.fatePoints.modifier + '').normalize('NFC'));

    /** talents */
    /** body talents  */
    talent('Fliegen', 1);
    talent('Gaukeleien', 2);
    talent('Klettern', 3);
    talent('Körperbeherrschung', 4);
    talent('Kraftakt', 5);
    talent('Reiten', 6);
    talent('Schwimmen', 7);
    talent('Selbstbeherrschung', 8);
    talent('Singen', 9);
    talent('Sinnesschärfe', 10);
    talent('Tanzen', 11);
    talent('Taschendiebstahl', 12);
    talent('Verbergen', 13);
    talent('Zechen', 14);
    /** society talents  */
    talent('Bekehren & Überzeugen', 15);
    talent('Betören', 16);
    talent('Einschüchtern', 17);
    talent('Etikette', 18);
    talent('Gassenwissen', 19);
    talent('Menschenkenntnis', 20);
    talent('Überreden', 21);
    talent('Verkleiden', 22);
    talent('Willenskraft', 23);
    /** nature talents  */
    talent('Fährtensuchen', 24);
    talent('Fesseln', 25);
    talent('Fischen & Angeln', 26);
    talent('Orientierung', 27);
    talent('Pflanzenkunde', 28);
    talent('Tierkunde', 29);
    talent('Wildnisleben', 30);
    /** knowledge talents  */
    talent('Brett- & Glücksspiel', 31);
    talent('Geographie', 32);
    talent('Geschichtswissen', 33);
    talent('Götter & Kulte', 34);
    talent('Kriegskunst', 35);
    talent('Magiekunde', 36);
    talent('Mechanik', 37);
    talent('Rechnen', 38);
    talent('Rechtskunde', 39);
    talent('Sagen & Legenden', 40);
    talent('Sphärenkunde', 41);
    talent('Sternkunde', 42);
    /** crafting talents  */
    talent('Alchimie', 43);
    talent('Boote & Schiffe', 44);
    talent('Fahrzeuge', 45);
    talent('Handel', 46);
    talent('Heilkunde Gift', 47);
    talent('Heilkunde Krankheiten', 48);
    talent('Heilkunde Seele', 49);
    talent('Heilkunde Wunden', 50);
    talent('Holzbearbeitung', 51);
    talent('Lebensmittelbearbeitung', 52);
    talent('Lederbearbeitung', 53);
    talent('Malen & Zeichnen', 54);
    talent('Metallbearbeitung', 55);
    talent('Musizieren', 56);
    talent('Schlösserknacken', 57);
    talent('Steinbearbeitung', 58);
    talent('Stoffbearbeitung', 59);



    /** Combat */
    /** general */

    form.getTextField('LE_Max_2').setText((entity.system.status.wounds.max + '').normalize('NFC'));
    // Don't use the max attribute of speed. It is allways 0.
    const speed = entity.system.status.speed;
    form.getTextField('GS_Max_1').setText(String(speed.initial + speed.modifier + speed.gearmodifier).normalize('NFC'));
    form.getTextField('AW_Max_2').setText((entity.system.status.dodge.max + '').normalize('NFC'));
    const initiative = entity.system.status.initiative;
    form.getTextField('INI_Max_1').setText(String(
      Math.round((entity.system.characteristics.mu.value + entity.system.characteristics.ge.value) / 2)
      + initiative.modifier + initiative.gearmodifier
    ).normalize('NFC')
    );
    form.getTextField('AW_Max_2').setText((entity.system.status.dodge.max + '').normalize('NFC'));
    form.getTextField('SK_Max_2').setText((entity.system.status.soulpower.max + '').normalize('NFC'));
    form.getTextField('ZK_Max_2').setText((entity.system.status.toughness.max + '').normalize('NFC'));

    /** Wepaons */
    /** combat */
    const r_Armbrüste = combat('Armbrüste', 1, 0);
    const r_Bögen = combat('Bögen', 2, 0);
    const r_Dolche = combat('Dolche', 3, 1);
    const r_Fechtwaffen = combat('Fechtwaffen', 4, 1);
    const r_Hiebwaffen = combat('Hiebwaffen', 5, 1);
    const r_Kettenwaffen = combat('Kettenwaffen', 6, 0);
    const r_Lanzen = combat('Lanzen', 7, 1);
    const r_Raufen = combat('Raufen', 8, 1);
    const r_Schilde = combat('Schilde', 9, 1);
    const r_Schwerter = combat('Schwerter', 10, 1);
    const r_Stangenwaffen = combat('Stangenwaffen', 11, 1);
    const r_Wurfwaffen = combat('Wurfwaffen', 12, 0);
    const r_Zweihandhiebwaffen = combat('Zweihandhiebwaffen', 13, 1);
    const r_Zweihandschwerter = combat('Zweihandschwerter', 14, 1);

    const combat_specialability = map.filter((value) => value.type === 'specialability').filter((value) => value.system.category.value === 'Combat');
    var f_combat_specialability = Array.from(combat_specialability.values(), (value) => value.name + ' ' + romanize(value.system.step.value)).join(', ');

    form.getTextField('Held_SF_Kampf').setText(f_combat_specialability.normalize('NFC'));

    /** Coins*/

    coins('Dukaten', 'D');
    coins('Silber', 'S');
    coins('Heller', 'H');
    coins('Kreuzer', 'K');

    /** Weapons */
    /** melee weapon */

    const combat_meleeweapon = map
      .filter((value) => value.type === 'meleeweapon')
      .filter((value) => (value.system.worn.value = 'true'))
      .filter((value) => value.system.combatskill.value !== 'Schilde');
    var arrayLength = combat_meleeweapon.length;
    if (arrayLength > 4) {
      arrayLength = 4;
      ui.notifications.warn('You have equipped more than 4 melee weapons! The template can only hold a maximum of 4');
    }
    for (var i = 0; i < arrayLength; i++) {
      form.getTextField('Nahwaffe_Name_Anzeige_' + (i + 1)).setText((combat_meleeweapon[i].name + '').normalize('NFC'));
      form.getTextField('Nah_Kampftechnik_Name_Anzeige_' + (i + 1)).setText((combat_meleeweapon[i].system.combatskill.value + '').normalize('NFC'));
      form.getTextField('Nah_Schadensbonus_' + (i + 1)).setText((combat_meleeweapon[i].system.guidevalue.value + '').toUpperCase().normalize('NFC'));
      form.getTextField('Nah_Schadensschwelle_' + (i + 1)).setText((combat_meleeweapon[i].system.damageThreshold.value + '').normalize('NFC'));
      form.getTextField('Nah_TP_Wurf_' + (i + 1)).setText((combat_meleeweapon[i].system.damage.value + '').normalize('NFC'));
      form.getTextField('Nah_TP_Basis_' + (i + 1)).setText(''.normalize('NFC')); //follow up
      form.getTextField('Nah_TP_' + (i + 1)).setText(''.normalize('NFC')); //follow up
      form.getTextField('Nah_AT_Mod_' + (i + 1)).setText((combat_meleeweapon[i].system.atmod.value + '').normalize('NFC'));
      form.getTextField('Nah_PA_Mod_' + (i + 1)).setText((combat_meleeweapon[i].system.pamod.value + '').normalize('NFC'));
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

      form.getTextField('Nah_Reichweite_' + (i + 1)).setText(reach_translate.normalize('NFC'));
      form.getTextField('Nah_AT_' + (i + 1)).setText((eval('r_' + combat_meleeweapon[i].system.combatskill.value + '.r_AT') + Number(combat_meleeweapon[i].system.atmod.value) + '').normalize('NFC'));
      form.getTextField('Nah_PA_' + (i + 1)).setText((eval('r_' + combat_meleeweapon[i].system.combatskill.value + '.r_PA') + Number(combat_meleeweapon[i].system.pamod.value) + '').normalize('NFC'));
      form.getTextField('Nah_Gewicht_' + (i + 1)).setText((combat_meleeweapon[i].system.weight.value + '').normalize('NFC'));
    }

    /** range weapon   */

    const combat_rangeweapon = map.filter((value) => value.type === 'rangeweapon').filter((value) => (value.system.worn.value = 'true'));
    var arrayLength = combat_rangeweapon.length;
    if (arrayLength > 4) {
      arrayLength = 4;
      ui.notifications.warn('You have equipped more than 4 range weapons! The template can only hold a maximum of 4');
    }
    for (var i = 0; i < arrayLength; i++) {
      form.getTextField('Fernwaffe_Name_Anzeige_' + (i + 1)).setText((combat_rangeweapon[i].name + '').normalize('NFC'));
      form.getTextField('Fern_Kampftechnik_Name_Anzeige_' + (i + 1)).setText((combat_rangeweapon[i].system.combatskill.value + '').normalize('NFC'));
      form.getTextField('Fern_Ladezeit_' + (i + 1)).setText((combat_rangeweapon[i].system.reloadTime.value + ' Runden').normalize('NFC'));
      form.getTextField('Fern_TP_' + (i + 1)).setText((combat_rangeweapon[i].system.damage.value + '').normalize('NFC'));
      form.getTextField('Fern_Munition_' + (i + 1)).setText((combat_rangeweapon[i].system.quantity.value + '').normalize('NFC'));
      form.getTextField('Fern_Reichweite_' + (i + 1)).setText((combat_rangeweapon[i].system.reach.value + '').normalize('NFC'));
      form.getTextField('Fern_FK_' + (i + 1)).setText((eval('r_' + combat_rangeweapon[i].system.combatskill.value + '.r_AT') + '').normalize('NFC'));
      form.getTextField('Fern_Gewicht_' + (i + 1)).setText((combat_rangeweapon[i].system.weight.value + '').normalize('NFC'));
    }

    /** armor */

    const combat_armor = map.filter((value) => value.type === 'armor').filter((value) => (value.system.worn.value = 'true'));
    var arrayLength = combat_armor.length;
    if (arrayLength > 4) {
      arrayLength = 4;
      ui.notifications.warn('You have equipped more than 4 armors! The template can only hold a maximum of 4');
    }
    for (var i = 0; i < arrayLength; i++) {
      form.getTextField('Ruestung_Name_Anzeige_' + (i + 1)).setText((combat_armor[i].name + '').normalize('NFC'));
      form.getTextField('Ruestung_RS_' + (i + 1)).setText((combat_armor[i].system.protection.value + '').normalize('NFC'));
      form.getTextField('Ruestung_BE_' + (i + 1)).setText((combat_armor[i].system.encumbrance.value + '').normalize('NFC'));
      form.getTextField('Ruestung_Abzuege_' + (i + 1)).setText((combat_armor[i].system.effect.value + '').normalize('NFC'));
      form.getTextField('Ruestung_Gewicht_' + (i + 1)).setText((combat_armor[i].system.weight.value + '').normalize('NFC'));
      form.getTextField('Ruestung_Gebiet_' + (i + 1)).setText(''.normalize('NFC'));
    }

    /** shields and parry weapon */

    const combat_shields = map
      .filter((value) => value.type === 'meleeweapon')
      .filter((value) => (value.system.worn.value = 'true'))
      .filter((value) => value.system.combatskill.value === 'Schilde');
    var arrayLength = combat_shields.length;
    if (arrayLength > 4) {
      arrayLength = 4;
      ui.notifications.warn('You have equipped more than 4 shields or parry weapons! The template can only hold a maximum of 4');
    }
    for (var i = 0; i < arrayLength; i++) {
      form.getTextField('Schild_Name_Anzeige_' + (i + 1)).setText((combat_shields[i].name + '').normalize('NFC'));
      form.getTextField('Schild_SP_' + (i + 1)).setText((combat_shields[i].system.structure.value + ' / ' + combat_shields[i].system.structure.max).normalize('NFC'));
      form.getTextField('Schild_Mod_' + (i + 1)).setText(('AT:' + combat_shields[i].system.atmod.value + ' / PA:' + combat_shields[i].system.pamod.value).normalize('NFC'));
      form.getTextField('Schild_Gewicht_' + (i + 1)).setText((combat_shields[i].system.weight.value + '').normalize('NFC'));
    }

    /** Items */

    const items = map.filter(
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
      form.getTextField('Besitz_Name_' + (i + 1)).setText((quantity + items[i].name + '').normalize('NFC'));
      form.getTextField('Besitz_Gewicht_' + (i + 1)).setText((items[i].system.weight.value + '').normalize('NFC'));
      if (i <= 36) {
        sum_weight1 = sum_weight1 + Number(items[i].system.weight.value);
      } else {
        sum_weight2 = sum_weight2 + Number(items[i].system.weight.value);
      }
    }
    form.getTextField('Gewicht_1').setText((Math.round(sum_weight1 * 100) / 100 + '').normalize('NFC'));
    form.getTextField('Gewicht_2').setText((Math.round((sum_weight1 + sum_weight2) * 100) / 100 + '').normalize('NFC'));
    form.getTextField('Trag_1').setText((Number(entity.system.characteristics.kk.value) * 2 + '').normalize('NFC'));

    /** Mage */
    /** spells */
    const combat_spells = map.filter((value) => ['spell', 'ritual'].includes(value.type));
    var arrayLength = combat_spells.length;
    if (arrayLength > 40) {
      arrayLength = 40;
      ui.notifications.warn('You have more than 40 spells! The template can only hold a maximum of 40');
    }
    for (var i = 0; i < arrayLength; i++) {
      form.getTextField('Zauber_Anzeige_' + (i + 1)).setText((combat_spells[i].name + '').normalize('NFC'));
      form
        .getTextField('Z_Probe_' + (i + 1))
        .setText(
          (combat_spells[i].system.characteristic1.value.toUpperCase() +
            ' / ' +
            combat_spells[i].system.characteristic2.value.toUpperCase() +
            ' / ' +
            combat_spells[i].system.characteristic3.value.toUpperCase() +
            '').normalize('NFC')
        );
      form.getTextField('Z_FW_' + (i + 1)).setText((combat_spells[i].system.talentValue.value + '').normalize('NFC'));
      form.getTextField('Z_AsP_' + (i + 1)).setText((combat_spells[i].system.AsPCost.value + '').normalize('NFC'));
      form.getTextField('Z_ZDauer_' + (i + 1)).setText((combat_spells[i].system.castingTime.value + '').normalize('NFC'));
      form.getTextField('Z_RW_' + (i + 1)).setText((combat_spells[i].system.range.value + '').normalize('NFC'));
      form.getTextField('Z_WDauer_' + (i + 1)).setText((combat_spells[i].system.duration.value + '').normalize('NFC'));
      form.getTextField('Z_Merkmal_' + (i + 1)).setText(''.normalize('NFC'));
      form.getTextField('Z_SF_' + (i + 1)).setText((combat_spells[i].system.StF.value + '').normalize('NFC'));
      form.getTextField('Z_Wirkung_' + (i + 1)).setText((combat_spells[i].system.effect.value + '').normalize('NFC'));
      form.getTextField('Z_Seite_' + (i + 1)).setText(''.normalize('NFC'));
    }

    form.getTextField('AE_Max_2').setText(String(baseAE).normalize('NFC'));
    if (baseAE !== actualAE) {
      form.getTextField('AE_Aktuell').setText(String(actualAE).normalize('NFC'));
    }
    form.getTextField('Held_Tradition_magisch').setText((entity.system.tradition.magical + '').normalize('NFC'));
    form.getTextField('Leit_Magie_Ansicht').setText((Leitwert_long(entity.system.guidevalue.magical) + '').normalize('NFC'));
    form.getTextField('Held_Merkmale').setText((Leitwert_long(entity.system.feature.magical) + '').normalize('NFC'));

    /** magictrick */
    const combat_magictrick = map.filter((value) => value.type === 'magictrick');
    var f_combat_magictrick = Array.from(combat_magictrick.values(), (value) => value.name).join(', ');

    form.getTextField('Held_Tricks').setText(f_combat_magictrick.normalize('NFC'));

    /** special_magic */
    const special_magic = map.filter((value) => value.type === 'specialability').filter((value) => value.system.category.value === 'magical');
    var f_special_magic = Array.from(special_magic.values(), (value) => value.name).join(', ');

    form.getTextField('Held_SF_Mag').setText(f_special_magic.normalize('NFC'));

    /** Cleric */
    /** liturgy */
    const combat_liturgy = map.filter((value) => ['liturgy', 'ceremony'].includes(value.type));
    var arrayLength = combat_liturgy.length;
    if (arrayLength > 40) {
      arrayLength = 40;
      ui.notifications.warn('You have more than 40 liturgys! The template can only hold a maximum of 40');
    }

    for (var i = 0; i < arrayLength; i++) {
      form.getTextField('Liturgie_Anzeige_' + (i + 1)).setText((combat_liturgy[i].name + '').normalize('NFC'));
      form
        .getTextField('L_Probe_' + (i + 1))
        .setText(
          (combat_liturgy[i].system.characteristic1.value.toUpperCase() +
            ' / ' +
            combat_liturgy[i].system.characteristic2.value.toUpperCase() +
            ' / ' +
            combat_liturgy[i].system.characteristic3.value.toUpperCase() +
            '').normalize('NFC')
        );
      form.getTextField('L_FW_' + (i + 1)).setText((combat_liturgy[i].system.talentValue.value + '').normalize('NFC'));
      form.getTextField('L_KaP_' + (i + 1)).setText((combat_liturgy[i].system.AsPCost.value + '').normalize('NFC'));
      form.getTextField('L_LDauer_' + (i + 1)).setText((combat_liturgy[i].system.castingTime.value + '').normalize('NFC'));
      form.getTextField('L_RW_' + (i + 1)).setText((combat_liturgy[i].system.range.value + '').normalize('NFC'));
      form.getTextField('L_WDauer_' + (i + 1)).setText((combat_liturgy[i].system.duration.value + '').normalize('NFC'));
      form.getTextField('L_Aspekt_' + (i + 1)).setText(''.normalize('NFC'));
      form.getTextField('L_SF_' + (i + 1)).setText((combat_liturgy[i].system.StF.value + '').normalize('NFC'));
      form.getTextField('L_Wirkung_' + (i + 1)).setText((combat_liturgy[i].system.effect.value + '').normalize('NFC'));
      form.getTextField('L_Seite_' + (i + 1)).setText(''.normalize('NFC'));
    }

    form.getTextField('KE_Max_2').setText(String(baseKE).normalize('NFC'));
    if (baseKE !== actualKE) {
      form.getTextField('KE_Aktuell').setText(String(actualKE).normalize('NFC'));
    }
    form.getTextField('Held_Tradition_klerikal').setText((entity.system.tradition.clerical + '').normalize('NFC'));
    form.getTextField('Leit_Karma_Anzeige').setText((Leitwert_long(entity.system.guidevalue.clerical) + '').normalize('NFC'));
    form.getTextField('Held_Aspekt').setText((Leitwert_long(entity.system.feature.clerical) + '').normalize('NFC'));

    /** blessing */
    const combat_blessing = map.filter((value) => value.type === 'blessing');
    var f_combat_blessing = Array.from(combat_blessing.values(), (value) => value.name).join(', ');

    form.getTextField('Held_Segen').setText(f_combat_blessing.normalize('NFC'));

    /** special_cleric */
    const special_cleric = map.filter((value) => value.type === 'specialability').filter((value) => value.system.category.value === 'clerical');
    var f_special_cleric = Array.from(special_cleric.values(), (value) => value.name).join(', ');

    form.getTextField('Held_SF_Karm').setText(f_special_cleric.normalize('NFC'));

    /** set PDF Metadata for PDF*/
    pdfDoc.setTitle('DSA5-' + entity.name + '.pdf created on ' + today);
    pdfDoc.setSubject('https://github.com/Plushtoast/dsa5-char2pdfv2');
    pdfDoc.setProducer('DSA5 - char2PDF ' + modul_version);
    pdfDoc.setCreator('pdf-lib (https://github.com/Hopding/pdf-lib)');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    /** save filled template */

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf;charset=utf-8' });
    saveAs(blob, 'DSA5-' + entity.name + '.pdf');
  } catch (err) {
    ui.notifications.error(`Char2PDF - Error: ${err.message}`);
    console.error(err);
  }
}

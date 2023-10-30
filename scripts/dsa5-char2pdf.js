var cb_actors_tale = false;
var cb_del_pages = false;
var modul_version = '';

/**
 * A class which holds some constants for dsa-char2pdf
 */

 class dsa5char2pdf {
  static ID = 'dsa5-char2pdf';

  static TEMPLATES = {
    PDF_Template: `modules/${this.ID}/templates/template.pdf`,
    PDF_Biography: `modules/${this.ID}/templates/template_biography.pdf`,
    export_preferences: `modules/${this.ID}/templates/export_preferences.hbs`
  }

  static PATH = {
    main: `modules/${this.ID}/`
  }

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

function romanize (num) {
	if (!+num)
		return false;
	var	digits = String(+num).split(""),
		key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
		       "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
		       "","I","II","III","IV","V","VI","VII","VIII","IX"],
		roman = "",
		i = 3;
	while (i--)
		roman = (key[+digits.pop() + (i * 10)] || "") + roman;
	return Array(+digits.join("") + 1).join("M") + roman;
}

function deromanize (str) {
	var	str = str.toUpperCase(),
		validator = /^M*(?:D?C{0,3}|C[MD])(?:L?X{0,3}|X[CL])(?:V?I{0,3}|I[XV])$/,
		token = /[MDLV]|C[MD]?|X[CL]?|I[XV]?/g,
		key = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1},
		num = 0, m;
	if (!(str && validator.test(str)))
		return false;
	while (m = token.exec(str))
		num += key[m[0]];
	return num;
}

/** register our module's debug flag with developer mode's custom hook */

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(dsa5char2pdf.ID);
});

/** register Hook to Display Option within the actor context menu */

Hooks.on("getActorDirectoryEntryContext", (html, entryOptions) => {
  entryOptions.push({
    name: 'DSA5-Char2PDF',
      icon: '<i class="fas fa-tasks"></i>',
      condition: li => {
        const entity = ActorDirectory.collection.get(li.data("documentId"));
        //check for the right DSA5 template and for the right type
        if (entity.type == "character" || entity.sheet == "ActorSheetdsa5Character") 
        {  
          return entity.id;
        }
      },
      callback: li => {
        const actor = ActorDirectory.collection.get(li.data("documentId"));
        const exportPreferences = new ExportPreferences(actor);
        exportPreferences.render(true);
      }
    })
});

/** Set up FormApplication */

class ExportPreferences extends FormApplication {
  constructor(actor) {
    super();
    this.actor = actor;
  }

  static get defaultOptions() {
    const defaults = super.defaultOptions;
    const overrides = {
      closeOnSubmit: false,
      height: 'auto',
      id: 'export_preferences',
      submitOnChange: true,
      template: dsa5char2pdf.TEMPLATES.export_preferences,
      title: 'DSA5 - char2PDF',
      chkbox_actorstale: false, 
      chkbox_delpages: false,
    };
    const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
    return mergedOptions;
  }

  getData(options) {
    return {
      ID: this.actor.id,
      actor: this.actor.name,
      chkbox_actorstale: false, 
      chkbox_delpages: false
    };
  }

  
	activateListeners() {

		document.getElementById("btn_Export").addEventListener("click", event => {
		event.preventDefault();
		fillForm(this.actor.id);
    this.close();
		});
/**
    const chkbox_actorstale = document.querySelector("input[name=chkbox_actors_tale]");
    chkbox_actorstale.addEventListener('change', function() {
      if (this.checked) {
        cb_actors_tale = true; 
      } else {
        cb_actors_tale = false; 
      }
    });

    const chkbox_delpages = document.querySelector("input[name=chkbox_del_pages]");
    chkbox_delpages.addEventListener('change', function() {
      if (this.checked) {
        cb_del_pages = true;
      } else {
        cb_del_pages = false;
      }
    });*/
	};
}


/** Function to convert webp to png for PDF-Import */  

 function toDataUrl(src, outputFormat) {
  // create an image-object to convert webp to png for PDF-Import
  return new Promise((resolve, reject) => {
    var img = new Image();
    // to solve Forge VTT problem - add CORS to prenvent tainted canvases
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      var canvas = document.createElement('CANVAS');
      var ctx = canvas.getContext('2d');
      var dataURL;
      canvas.height = this.naturalHeight;
      canvas.width = this.naturalWidth;
      ctx.drawImage(this, 0, 0);
      // Convert the canvas to a data url
      dataURL = canvas.toDataURL(outputFormat);
      resolve(dataURL);
      // Mark the canvas to be ready for garbage 
      // collection
      canvas = null;
    };
    // Load the image
    img.src = src;
    // make sure the load event fires for cached images too
    if (img.complete || img.complete === undefined) {
      // Flush cache
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
      // Try again
      img.src = src;
    }
  })
}

/** Function to get result of the async task to read the pictures from a source with the use of 'await' */
async function get_actor_pic(src) {
  try {
      const result = await toDataUrl(src);
      return (result);

  } catch (error) {
      console.error('ERROR:');
      console.error(error);
  }
}

/**
 * Converts the Leitwert short into the long version  
*/ 
function Leitwert_long (Leitwert_short) {
  switch((Leitwert_short).toUpperCase()) {
    case "MU":
      Leitwert_short="Mut"
      break;
    case "KL":
      Leitwert_short="Klugheit"
      break;
    case "IN":
      Leitwert_short="Intuition"
      break;
    case "CH":
      Leitwert_short="Charisma"
      break;
    case "FF":
      Leitwert_short="Fingerfertigkeit"
      break;
    case "GE":
      Leitwert_short="Gewandheit"
      break;
    case "KO":
      Leitwert_short="Konstitution"
      break;
    case "KK":
      Leitwert_short="Körperkraft"
      break;
    default:
    break;
  };
  return Leitwert_short
}

/**
 * Call function to fill pdf template
 */

async function fillForm(_dsa_actor_id) {
  try {
/** declaration */
 var PDFDocument = PDFLib.PDFDocument;
 var StandardFonts = PDFLib.StandardFonts;
 var rgb = PDFLib.rgb;
 
 const entity = ActorDirectory.collection.get(_dsa_actor_id);
 let map = entity.data.items;
 
 const formUrl = dsa5char2pdf.TEMPLATES.PDF_Template
 const formPdfBytes = await fetch(formUrl).then(res => res.arrayBuffer())
 const pdfDoc = await PDFDocument.load(formPdfBytes)
 const form = pdfDoc.getForm()

	/** check for modul version */
	const ModuleAPI = game.modules.get('dsa5-char2pdf')
	modul_version = (ModuleAPI.data.version)

    /** Current date in right format */

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    today = dd + '.' + mm + '.' + yyyy;

    /** character detail */

    form.getTextField('Held_Name').setText(entity.name)
    form.getTextField('Held_Geschlecht').setText(entity.data.data.details.gender.value)
    form.getTextField('Held_Spezies_Anzeige').setText(entity.data.data.details.species.value)
    form.getTextField('Held_Geburtsdatum').setText('')
    form.getTextField('Held_Alter'+'').setText(entity.data.data.details.age.value)
    form.getTextField('Held_Haare').setText(entity.data.data.details.haircolor.value)
    form.getTextField('Held_Augen').setText(entity.data.data.details.eyecolor.value)
    form.getTextField('Held_Groesse'+'').setText(entity.data.data.details.height.value)
    form.getTextField('Held_Gewicht'+'').setText(entity.data.data.details.weight.value)
    form.getTextField('Held_Profession_Anzeige').setText(entity.data.data.details.career.value)
    form.getTextField('Held_Kultur_Anzeige').setText(entity.data.data.details.culture.value)
    form.getTextField('Held_Sozialstatus').setText(entity.data.data.details.socialstate.value)
    form.getTextField('Held_Geburtsort').setText(entity.data.data.details.Home.value)
    form.getTextField('Held_Familie').setText(entity.data.data.details.family.value)
    form.getTextField('Held_Charakteristika').setText(entity.data.data.details.distinguishingmark.value)

  /** actor picture */

  const actor_image_url = entity.img

  if ((actor_image_url.split('.').pop()) === "png" || (actor_image_url.split('.').pop()) === "jpg") { 
    var actor_imageBytes = await fetch(actor_image_url).then(res => res.arrayBuffer())
  }
  else {
     actor_imageBytes = await get_actor_pic(actor_image_url)
  }
    var actor_image = await pdfDoc.embedPng(actor_imageBytes)
    form.getButton('Charakterbild').setImage(actor_image)
 
  /** main attributes */

  const p_mu = entity.data.data.characteristics.mu.value
  const p_kl = entity.data.data.characteristics.kl.value
  const p_in = entity.data.data.characteristics.in.value
  const p_ch = entity.data.data.characteristics.ch.value
  const p_ff = entity.data.data.characteristics.ff.value
  const p_ge = entity.data.data.characteristics.ge.value
  const p_ko = entity.data.data.characteristics.ko.value
  const p_kk = entity.data.data.characteristics.kk.value

  form.getTextField('MU_1').setText(p_mu+'')
  form.getTextField('KL_1').setText(p_kl+'')
  form.getTextField('IN_1').setText(p_in+'')
  form.getTextField('CH_1').setText(p_ch+'')
  form.getTextField('FF_1').setText(p_ff+'')
  form.getTextField('GE_1').setText(p_ge+'')
  form.getTextField('KO_1').setText(p_ko+'')
  form.getTextField('KK_1').setText(p_kk+'')

  /** calculated mods */
  form.getTextField('EW_Mod_MU').setText(p_mu+'')
  form.getTextField('EW_Mod_p1_MU').setText(p_mu+1+'')
  form.getTextField('EW_Mod_p2_MU').setText(p_mu+2+'')
  form.getTextField('EW_Mod_p3_MU').setText(p_mu+3+'')
  form.getTextField('EW_Mod_m1_MU').setText(p_mu-1+'')
  form.getTextField('EW_Mod_m2_MU').setText(p_mu-2+'')
  form.getTextField('EW_Mod_m3_MU').setText(p_mu-3+'')

  form.getTextField('EW_Mod_KL').setText(p_kl+'')
  form.getTextField('EW_Mod_p1_KL').setText(p_kl+1+'')
  form.getTextField('EW_Mod_p2_KL').setText(p_kl+2+'')
  form.getTextField('EW_Mod_p3_KL').setText(p_kl+3+'')
  form.getTextField('EW_Mod_m1_KL').setText(p_kl-1+'')
  form.getTextField('EW_Mod_m2_KL').setText(p_kl-2+'')
  form.getTextField('EW_Mod_m3_KL').setText(p_kl-3+'')

  form.getTextField('EW_Mod_IN').setText(p_in+'')
  form.getTextField('EW_Mod_p1_IN').setText(p_in+1+'')
  form.getTextField('EW_Mod_p2_IN').setText(p_in+2+'')
  form.getTextField('EW_Mod_p3_IN').setText(p_in+3+'')
  form.getTextField('EW_Mod_m1_IN').setText(p_in-1+'')
  form.getTextField('EW_Mod_m2_IN').setText(p_in-2+'')
  form.getTextField('EW_Mod_m3_IN').setText(p_in-3+'')

  form.getTextField('EW_Mod_CH').setText(p_ch+'')
  form.getTextField('EW_Mod_p1_CH').setText(p_ch+1+'')
  form.getTextField('EW_Mod_p2_CH').setText(p_ch+2+'')
  form.getTextField('EW_Mod_p3_CH').setText(p_ch+3+'')
  form.getTextField('EW_Mod_m1_CH').setText(p_ch-1+'')
  form.getTextField('EW_Mod_m2_CH').setText(p_ch-2+'')
  form.getTextField('EW_Mod_m3_CH').setText(p_ch-3+'')

  form.getTextField('EW_Mod_FF').setText(p_ff+'')
  form.getTextField('EW_Mod_p1_FF').setText(p_ff+1+'')
  form.getTextField('EW_Mod_p2_FF').setText(p_ff+2+'')
  form.getTextField('EW_Mod_p3_FF').setText(p_ff+3+'')
  form.getTextField('EW_Mod_m1_FF').setText(p_ff-1+'')
  form.getTextField('EW_Mod_m2_FF').setText(p_ff-2+'')
  form.getTextField('EW_Mod_m3_FF').setText(p_ff-3+'')

  form.getTextField('EW_Mod_GE').setText(p_ge+'')
  form.getTextField('EW_Mod_p1_GE').setText(p_ge+1+'')
  form.getTextField('EW_Mod_p2_GE').setText(p_ge+2+'')
  form.getTextField('EW_Mod_p3_GE').setText(p_ge+3+'')
  form.getTextField('EW_Mod_m1_GE').setText(p_ge-1+'')
  form.getTextField('EW_Mod_m2_GE').setText(p_ge-2+'')
  form.getTextField('EW_Mod_m3_GE').setText(p_ge-3+'')

  form.getTextField('EW_Mod_KO').setText(p_ko+'')
  form.getTextField('EW_Mod_p1_KO').setText(p_ko+1+'')
  form.getTextField('EW_Mod_p2_KO').setText(p_ko+2+'')
  form.getTextField('EW_Mod_p3_KO').setText(p_ko+3+'')
  form.getTextField('EW_Mod_m1_KO').setText(p_ko-1+'')
  form.getTextField('EW_Mod_m2_KO').setText(p_ko-2+'')
  form.getTextField('EW_Mod_m3_KO').setText(p_ko-3+'')

  form.getTextField('EW_Mod_KK').setText(p_kk+'')
  form.getTextField('EW_Mod_p1_KK').setText(p_kk+1+'')
  form.getTextField('EW_Mod_p2_KK').setText(p_kk+2+'')
  form.getTextField('EW_Mod_p3_KK').setText(p_kk+3+'')
  form.getTextField('EW_Mod_m1_KK').setText(p_kk-1+'')
  form.getTextField('EW_Mod_m2_KK').setText(p_kk-2+'')
  form.getTextField('EW_Mod_m3_KK').setText(p_kk-3+'')

  /** disadvantages */

    const disadvantage = map.filter(value => value.type === "disadvantage");
    var f_disadvantage = Array.from(disadvantage.values(), value => value.name).join(", ")
    form.getTextField('Held_Nachteile').setText(f_disadvantage)  
    
  /** advantages */

    const advantage = map.filter(value => value.type === "advantage");
    var f_advantage = Array.from(advantage.values(), value => value.name).join(", ")
    form.getTextField('Held_Vorteile').setText(f_advantage)  

  /** specialability */

    const specialability = map
    .filter(value => value.type === "specialability")
    .filter(value => value.data.data.category.value === "general");
    var f_specialability = Array.from(specialability.values(), value => value.name).join(", ")
    form.getTextField('Held_SF_allgemein').setText(f_specialability)  

  /** language */

  const language = map
  .filter(value => value.type === "specialability")
  .filter(value => value.data.data.category.value === "language")
  .filter(value => value.name.includes("Sprache"))
  var f_language = Array.from(language.values(), value => value.name + ' ' + romanize(value.data.data.step.value)).join(", ")
  form.getTextField('Held_Sprachen').setText(f_language)  

  /** script */

  const script = map
  .filter(value => value.type === "specialability")
  .filter(value => value.data.data.category.value === "language")
  .filter(value => value.name.includes("Schrift"))
  var f_script = Array.from(script.values(), value => value.name + ' ' + romanize(value.data.data.step.value)).join(", ")
  form.getTextField('Held_Schriften').setText(f_script)

  /** life / wounds */

  form.getTextField('LE_Max_1').setText(entity.data.data.status.wounds.max+'')
  form.getTextField('LE_Max_3').setText(entity.data.data.status.wounds.max+'')
  form.getTextField('LE_Wert_1').setText(entity.data.data.status.wounds.current+'')
  form.getTextField('LE_Aktuell_1').setText(entity.data.data.status.wounds.current+'')
  form.getTextField('LE_Kauf_1').setText(entity.data.data.status.wounds.advances+'')
  form.getTextField('LE_BM_1').setText(entity.data.data.status.wounds.modifier+'')

  /** soulpower*/ 

  form.getTextField('SK_Max_1').setText(entity.data.data.status.soulpower.max+'')
  form.getTextField('SK_Wert_1').setText(entity.data.data.status.soulpower.value+'')
  form.getTextField('SK_BM_1').setText(entity.data.data.status.soulpower.modifier+'')

  /** toughness*/ 

  form.getTextField('ZK_Max_1').setText(entity.data.data.status.toughness.max+'')
  form.getTextField('ZK_Wert_1').setText(entity.data.data.status.toughness.value+'')
  form.getTextField('ZK_BM_1').setText(entity.data.data.status.toughness.modifier+'')

  /** dodge*/ 

  form.getTextField('AW_Max_1').setText(entity.data.data.status.dodge.max+'')
  form.getTextField('AW_Wert_1').setText(entity.data.data.status.dodge.value+'')
  form.getTextField('AW_BM_1').setText(entity.data.data.status.dodge.modifier+'')

  /** astralenergy */ 

  form.getTextField('AE_Max_1').setText(entity.data.data.status.astralenergy.max+'')
  form.getTextField('AE_Wert_1').setText(entity.data.data.status.astralenergy.current+'')
  form.getTextField('AE_Kauf_1').setText(entity.data.data.status.astralenergy.advances+'')
  form.getTextField('AE_BM_1').setText(entity.data.data.status.astralenergy.modifier+'')

  /** karmaenergy */ 

  form.getTextField('KE_Max_1').setText(entity.data.data.status.karmaenergy.max+'')
  form.getTextField('KE_Wert_1').setText(entity.data.data.status.karmaenergy.current+'')
  form.getTextField('KE_Kauf_1').setText(entity.data.data.status.karmaenergy.advances+'')
  form.getTextField('KE_BM_1').setText(entity.data.data.status.karmaenergy.modifier+'')

  /** experience */ 

  var exp_translate = entity.data.data.details.experience.description
  switch(exp_translate) {
    case "EXP.inexperienced":
      exp_translate="Unerfahren"
      break;
    case "EXP.average":
      exp_translate="Durchschnittlich"
      break;
    case "EXP.experienced":
      exp_translate="Erfahren"
      break;
    case "EXP.competent":
      exp_translate="Kompetent"
      break;
    case "EXP.masterful":
      exp_translate="Meisterlich"
      break;
    case "EXP.brillant":
      exp_translate="Brilliant"
      break;
    case "EXP.legendary":
      exp_translate="Legendär"
      break;
    default:
    break;
  };
  form.getTextField('AP_Erfahrungsgrad_Anzeige').setText(exp_translate+'')

  form.getTextField('AP_gesamt').setText(entity.data.data.details.experience.total+'')
  form.getTextField('AP_gesammelt').setText(entity.data.data.details.experience.current+'')
  form.getTextField('AP_ausgegeben').setText(entity.data.data.details.experience.spent+'')

  /** fatepoints */ 

  form.getTextField('SchiP_Wert_1').setText(entity.data.data.status.fatePoints.value+'')
  form.getTextField('SchiP_Max_1').setText(entity.data.data.status.fatePoints.max+'')
  form.getTextField('SchiP_Aktuell_1').setText(entity.data.data.status.fatePoints.current+'')
  form.getTextField('SchiP_BM_1').setText(entity.data.data.status.fatePoints.modifier+'')

  /** talents */ 
  /** body talents  */
  talent ("Fliegen", 1)
  talent ("Gaukeleien", 2)
  talent ("Klettern", 3)
  talent ("Körperbeherrschung", 4)
  talent ("Kraftakt", 5)
  talent ("Reiten", 6)
  talent ("Schwimmen", 7)
  talent ("Selbstbeherrschung", 8)
  talent ("Singen", 9)
  talent ("Sinnesschärfe", 10)
  talent ("Tanzen", 11)
  talent ("Taschendiebstahl", 12)
  talent ("Verbergen", 13)
  talent ("Zechen", 14)
  /** society talents  */
  talent ("Bekehren & Überzeugen", 15)
  talent ("Betören", 16)
  talent ("Einschüchtern", 17)
  talent ("Etikette", 18)
  talent ("Gassenwissen", 19)
  talent ("Menschenkenntnis", 20)
  talent ("Überreden", 21)
  talent ("Verkleiden", 22)
  talent ("Willenskraft", 23)
  /** nature talents  */
  talent ("Fährtensuchen", 24)
  talent ("Fesseln", 25)
  talent ("Fischen & Angeln", 26)
  talent ("Orientierung", 27)
  talent ("Pflanzenkunde", 28)
  talent ("Tierkunde", 29)
  talent ("Wildnisleben", 30)
  /** knowledge talents  */
  talent ("Brett- & Glücksspiel", 31)
  talent ("Geographie", 32)
  talent ("Geschichtswissen", 33)
  talent ("Götter & Kulte", 34)
  talent ("Kriegskunst", 35)
  talent ("Magiekunde", 36)
  talent ("Mechanik", 37)
  talent ("Rechnen", 38)
  talent ("Rechtskunde", 39)
  talent ("Sagen & Legenden", 40)
  talent ("Sphärenkunde", 41)
  talent ("Sternkunde", 42)
  /** crafting talents  */
  talent ("Alchimie", 43)
  talent ("Boote & Schiffe", 44)
  talent ("Fahrzeuge", 45)
  talent ("Handel", 46)
  talent ("Heilkunde Gift", 47)
  talent ("Heilkunde Krankheiten", 48) 
  talent ("Heilkunde Seele", 49)
  talent ("Heilkunde Wunden", 50) 
  talent ("Holzbearbeitung", 51)
  talent ("Lebensmittelbearbeitung", 52)
  talent ("Lederbearbeitung", 53)
  talent ("Malen & Zeichnen", 54)
  talent ("Metallbearbeitung", 55)
  talent ("Musizieren", 56)
  talent ("Schlösserknacken", 57)
  talent ("Steinbearbeitung", 58)
  talent ("Stoffbearbeitung", 59)

  function talent (name, destination) {
    var name = map
    .filter(value => value.type === "skill")
    .filter(value => value.data.name === name);

  var temp = Array.from(name.values(), value => value.data.data.talentValue.value)
  form.getTextField("Talent_FW_"+destination).setText(temp+'')


  let e_1_name = Array.from(name.values(), value => value.data.data.characteristic1.value)[0]
  let e_2_name = Array.from(name.values(), value => value.data.data.characteristic1.value)[0]
  let e_3_name = Array.from(name.values(), value => value.data.data.characteristic1.value)[0]
  let e_1_value =  entity.data.data.characteristics[e_1_name].value
  let e_2_value =  entity.data.data.characteristics[e_2_name].value
  let e_3_value =  entity.data.data.characteristics[e_3_name].value

  let routine = ""
  if (e_1_value>=13 && e_2_value>=13 && e_3_value>=13){
      if (temp[0]>=1 && temp[0]<4){ routine = "+3"}
      else if (temp[0]>=4 && temp[0]<7){ routine = "+2"}
      else if (temp[0]>=7 && temp[0]<10){ routine = "+1"}
      else if (temp[0]>=10 && temp[0]<13){ routine = "0"}
      else if (temp[0]>=13 && temp[0]<16){ routine = "-1"}
      else if (temp[0]>=16 && temp[0]<19){ routine = "-2"}
      else if (temp[0]>=19){ routine = "-3"}
  }


  form.getTextField("Talent_R_"+destination).setText(routine+'')
}
  /** Combat */
  /** general */

  form.getTextField('LE_Max_2').setText(entity.data.data.status.wounds.max+'')
  form.getTextField('GS_Max_1').setText(entity.data.data.status.speed.max+'')
  form.getTextField('AW_Max_2').setText(entity.data.data.status.dodge.max+'')
  form.getTextField('INI_Max_1').setText((entity.data.data.characteristics.mu.value+entity.data.data.characteristics.ge.value)/2+'')
  form.getTextField('AW_Max_2').setText(entity.data.data.status.dodge.max+'')
  form.getTextField('SK_Max_2').setText(entity.data.data.status.soulpower.max+'')
  form.getTextField('ZK_Max_2').setText(entity.data.data.status.toughness.max+'')

  /** Wepaons */
  /** combat */
  const r_Armbrüste = combat ("Armbrüste", 1, 0)
  const r_Bögen = combat ("Bögen", 2, 0)
  const r_Dolche = combat ("Dolche", 3, 1, [p_ge])
  const r_Fechtwaffen = combat ("Fechtwaffen", 4, 1, [p_ge])
  const r_Hiebwaffen = combat ("Hiebwaffen", 5, 1, [p_kk])
  const r_Kettenwaffen = combat ("Kettenwaffen", 6, 0)
  const r_Lanzen = combat ("Lanzen", 7, 1, [p_kk]) 
  const r_Raufen = combat ("Raufen", 8, 1, [p_ge, p_kk])
  const r_Schilde = combat ("Schilde", 9, 1, [p_kk])
  const r_Schwerter = combat ("Schwerter", 10, 1, [p_ge, p_kk])
  const r_Stangenwaffen = combat ("Stangenwaffen", 11, 1, [p_ge, p_kk])
  const r_Wurfwaffen = combat ("Wurfwaffen", 12, 0)
  const r_Zweihandhiebwaffen = combat ("Zweihandhiebwaffen", 13, 1, [p_kk])
  const r_Zweihandschwerter = combat ("Zweihandschwerter", 14, 1, [p_kk]) 

  function combat (name, destination, pa, Leitwert) {
    var at_fk_modifier = Math.floor((Number(entity.data.data.characteristics.mu.value)-8)/3);/** calculation AT/FK  */
    var name = map
    .filter(value => value.type === "combatskill")
    .filter(value => value.data.name === name);

  var temp1 = Array.from(name.values(), value => value.data.data.talentValue.value)
  form.getTextField("KT_FW_"+destination).setText(temp1+'')

  var temp2 = Array.from(name.values(), value => value.data.data.attack.value)
  form.getTextField("KT_AT_"+destination).setText(Number(temp1)+Number(at_fk_modifier)+'')

  if (pa === 1){
  var max_LW_bonus = Math.floor(((Math.max.apply(Math, Leitwert))-8)/3) /** calculation Leitwert bonus  */
  var temp3 = (Math.round((Array.from(name.values(), value => value.data.data.talentValue.value))/2)+Number(max_LW_bonus))
    form.getTextField("KT_PA_"+destination).setText(temp3+'')
    }
    return {
      r_AT: (Number(temp1)+Number(temp2)+Number(at_fk_modifier)),
      r_PA:  Number(temp3),
      };
  }

  /** combat specialability */

  const combat_specialability = map
  .filter(value => value.type === "specialability")
  .filter(value => value.data.data.category.value === "Combat");
  var f_combat_specialability = Array.from(combat_specialability.values(), value => value.name + ' ' + romanize(value.data.data.step.value)).join(", ")

  form.getTextField('Held_SF_Kampf').setText(f_combat_specialability) 

  /** Coins*/

  coins("Dukaten", "D")
  coins("Silber", "S")
  coins("Heller", "H")
  coins("Kreuzer", "K")

  function coins (currency, shorten) {
    var currency = map
    .filter(value => value.data.name === "Money-"+shorten);
    var f_currency = Array.from(currency.values(), value => value.data.data.quantity.value);
    (form.getTextField('Geld_'+shorten)).setText(f_currency+'');
  }

  /** Weapons */ 
  /** melee weapon */

  const combat_meleeweapon = map
  .filter(value => value.type === "meleeweapon")
  .filter(value => value.data.data.worn.value = "true")
  .filter(value => value.data.data.combatskill.value !== "Schilde")
  var arrayLength = combat_meleeweapon.length;
  if (arrayLength > 4) {
    arrayLength = 4 
    ui.notifications.warn("You have equipped more than 4 melee weapons! The template can only hold a maximum of 4");
  }
  for (var i = 0; i < arrayLength; i++) {
    (form.getTextField('Nahwaffe_Name_Anzeige_'+(i+1))).setText(combat_meleeweapon[i].name+'');
    (form.getTextField('Nah_Kampftechnik_Name_Anzeige_'+(i+1))).setText(combat_meleeweapon[i].data.data.combatskill.value+'');
    (form.getTextField('Nah_Schadensbonus_'+(i+1))).setText((combat_meleeweapon[i].data.data.guidevalue.value+'').toUpperCase());
    (form.getTextField('Nah_Schadensschwelle_'+(i+1))).setText(combat_meleeweapon[i].data.data.damageThreshold.value+'');
    (form.getTextField('Nah_TP_Wurf_'+(i+1))).setText(combat_meleeweapon[i].data.data.damage.value+'');
    (form.getTextField('Nah_TP_Basis_'+(i+1))).setText("");//follow up 
    (form.getTextField('Nah_TP_'+(i+1))).setText("");//follow up 
    (form.getTextField('Nah_AT_Mod_'+(i+1))).setText(combat_meleeweapon[i].data.data.atmod.value+'');
    (form.getTextField('Nah_PA_Mod_'+(i+1))).setText(combat_meleeweapon[i].data.data.pamod.value+'');
    var reach_translate = combat_meleeweapon[i].data.data.reach.value
      switch(reach_translate) {
        case "short":
          reach_translate="kurz"
          break;
        case "long":
          reach_translate="lang"
          break;
        default:
        break;
      };
    
    (form.getTextField('Nah_Reichweite_'+(i+1))).setText(reach_translate);
    (form.getTextField('Nah_AT_'+(i+1))).setText(((eval('r_'+combat_meleeweapon[i].data.data.combatskill.value+'.r_AT'))+Number(combat_meleeweapon[i].data.data.atmod.value))+'');
    (form.getTextField('Nah_PA_'+(i+1))).setText(((eval('r_'+combat_meleeweapon[i].data.data.combatskill.value+'.r_PA'))+Number(combat_meleeweapon[i].data.data.pamod.value))+'');
    (form.getTextField('Nah_Gewicht_'+(i+1))).setText(combat_meleeweapon[i].data.data.weight.value+'');
  }

  /** range weapon   */

  const combat_rangeweapon = map
  .filter(value => value.type === "rangeweapon")
  .filter(value => value.data.data.worn.value = "true")
  var arrayLength = combat_rangeweapon.length;
  if (arrayLength > 4) {
    arrayLength = 4 
    ui.notifications.warn("You have equipped more than 4 range weapons! The template can only hold a maximum of 4");
  }
  for (var i = 0; i < arrayLength; i++) {
    (form.getTextField('Fernwaffe_Name_Anzeige_'+(i+1))).setText(combat_rangeweapon[i].name+'');
    (form.getTextField('Fern_Kampftechnik_Name_Anzeige_'+(i+1))).setText(combat_rangeweapon[i].data.data.combatskill.value+'');
    (form.getTextField('Fern_Ladezeit_'+(i+1))).setText(combat_rangeweapon[i].data.data.reloadTime.value+' Runden');
    (form.getTextField('Fern_TP_'+(i+1))).setText(combat_rangeweapon[i].data.data.damage.value+'');
    (form.getTextField('Fern_Munition_'+(i+1))).setText(combat_rangeweapon[i].data.data.quantity.value+'');
    (form.getTextField('Fern_Reichweite_'+(i+1))).setText(combat_rangeweapon[i].data.data.reach.value+'');
    (form.getTextField('Fern_FK_'+(i+1))).setText((eval('r_'+combat_rangeweapon[i].data.data.combatskill.value+'.r_AT'))+'');
    (form.getTextField('Fern_Gewicht_'+(i+1))).setText(combat_rangeweapon[i].data.data.weight.value+'');
  }

  /** armor */

  const combat_armor = map
  .filter(value => value.type === "armor")
  .filter(value => value.data.data.worn.value = "true")
  var arrayLength = combat_armor.length;
  if (arrayLength > 4) {
    arrayLength = 4 
    ui.notifications.warn("You have equipped more than 4 armors! The template can only hold a maximum of 4");
  }
  for (var i = 0; i < arrayLength; i++) {
    (form.getTextField('Ruestung_Name_Anzeige_'+(i+1))).setText(combat_armor[i].name+'');
    (form.getTextField('Ruestung_RS_'+(i+1))).setText(combat_armor[i].data.data.protection.value+'');
    (form.getTextField('Ruestung_BE_'+(i+1))).setText(combat_armor[i].data.data.encumbrance.value+'');
    (form.getTextField('Ruestung_Abzuege_'+(i+1))).setText(combat_armor[i].data.data.effect.value+'');
    (form.getTextField('Ruestung_Gewicht_'+(i+1))).setText(combat_armor[i].data.data.weight.value+'');
    (form.getTextField('Ruestung_Gebiet_'+(i+1))).setText("");
  }

  /** shields and parry weapon */

  const combat_shields = map
  .filter(value => value.type === "meleeweapon")
  .filter(value => value.data.data.worn.value = "true")
  .filter(value => value.data.data.combatskill.value === "Schilde")
  var arrayLength = combat_shields.length;
  if (arrayLength > 4) {
    arrayLength = 4 
    ui.notifications.warn("You have equipped more than 4 shields or parry weapons! The template can only hold a maximum of 4");
  }
  for (var i = 0; i < arrayLength; i++) {
    (form.getTextField('Schild_Name_Anzeige_'+(i+1))).setText(combat_shields[i].name+'');
    (form.getTextField('Schild_SP_'+(i+1))).setText(combat_shields[i].data.data.structure.value+' / '+combat_shields[i].data.data.structure.max);
    (form.getTextField('Schild_Mod_'+(i+1))).setText('AT:'+combat_shields[i].data.data.atmod.value+' / PA:'+combat_shields[i].data.data.pamod.value);
    (form.getTextField('Schild_Gewicht_'+(i+1))).setText(combat_shields[i].data.data.weight.value+'');
  }

  /** Items */

  const items = map
  .filter(value => value.type === "equipment" || value.type === "meleeweapon" || value.type === "armor" || value.type === "rangeweapon" || value.type === "ammunition") 
  var arrayLength = items.length;
  var sum_weight1 = 0;
  var sum_weight2 = 0;
  if (arrayLength > 72) {
    arrayLength = 72 
    ui.notifications.warn("You have more than 72 items in your inventory! The template can only hold a maximum of 72");
  }
  for (var i = 0; i < arrayLength; i++) {
    if (Number(items[i].data.data.quantity.value) > 1) {
      var quantity = items[i].data.data.quantity.value + "x "
    }
    else {
      var quantity =""
    }
    (form.getTextField('Besitz_Name_'+(i+1))).setText(quantity+items[i].name+'');
    (form.getTextField('Besitz_Gewicht_'+(i+1))).setText(items[i].data.data.weight.value+'');
        if (i <= 36) {
      sum_weight1 = sum_weight1 + Number(items[i].data.data.weight.value)
    }
    else {
      sum_weight2 = sum_weight2 + Number(items[i].data.data.weight.value)
    } 
  }
  (form.getTextField('Gewicht_1')).setText(Math.round(sum_weight1 * 100) / 100+'');
  (form.getTextField('Gewicht_2')).setText(Math.round((sum_weight1+sum_weight2)* 100) / 100+'');
  (form.getTextField('Trag_1')).setText(Number(entity.data.data.characteristics.kk.value)*2+'');

  /** Mage */
  /** spells */
  const combat_spells = map
  .filter(value => value.type === "spell" || value.type === "ritual");
  var arrayLength = combat_spells.length;    
    if (arrayLength > 40) {
      arrayLength = 40 
      ui.notifications.warn("You have more than 40 spells! The template can only hold a maximum of 40");
    }
    for (var i = 0; i < arrayLength; i++) {
      (form.getTextField('Zauber_Anzeige_'+(i+1))).setText(combat_spells[i].name+'');
      (form.getTextField('Z_Probe_'+(i+1))).setText((combat_spells[i].data.data.characteristic1.value).toUpperCase()+' / '+(combat_spells[i].data.data.characteristic2.value).toUpperCase()+' / '+(combat_spells[i].data.data.characteristic3.value).toUpperCase()+'');
      (form.getTextField('Z_FW_'+(i+1))).setText((combat_spells[i].data.data.talentValue.value+''));
      (form.getTextField('Z_AsP_'+(i+1))).setText((combat_spells[i].data.data.AsPCost.value+''));
      (form.getTextField('Z_ZDauer_'+(i+1))).setText((combat_spells[i].data.data.castingTime.value+''));
      (form.getTextField('Z_RW_'+(i+1))).setText((combat_spells[i].data.data.range.value+''));
      (form.getTextField('Z_WDauer_'+(i+1))).setText((combat_spells[i].data.data.duration.value+''));
      (form.getTextField('Z_Merkmal_'+(i+1))).setText((''));
      (form.getTextField('Z_SF_'+(i+1))).setText((combat_spells[i].data.data.StF.value+''));
      (form.getTextField('Z_Wirkung_'+(i+1))).setText((combat_spells[i].data.data.effect.value+''));
      (form.getTextField('Z_Seite_'+(i+1))).setText((''));
    }

    form.getTextField('AE_Max_2').setText(entity.data.data.status.astralenergy.max+'')
    form.getTextField('AE_Aktuell').setText(entity.data.data.status.astralenergy.current+'')
    form.getTextField('Held_Tradition_magisch').setText(entity.data.data.tradition.magical+'')
    form.getTextField('Leit_Magie_Ansicht').setText(Leitwert_long(entity.data.data.guidevalue.magical)+'')
    form.getTextField('Held_Merkmale').setText(Leitwert_long(entity.data.data.feature.magical)+'')
    
  /** magictrick */  
  const combat_magictrick = map
  .filter(value => value.type === "magictrick");
  var f_combat_magictrick = Array.from(combat_magictrick.values(), value => value.name).join(", ")

  form.getTextField('Held_Tricks').setText(f_combat_magictrick) 

  /** special_magic */  
  const special_magic = map
  .filter(value => value.type === "specialability")
  .filter(value => value.data.data.category.value === "magical");
  var f_special_magic = Array.from(special_magic.values(), value => value.name).join(", ")

  form.getTextField('Held_SF_Mag').setText(f_special_magic) 

  /** Cleric */
  /** liturgy */
  const combat_liturgy = map
  .filter(value => (value.type === "liturgy" || value.type === "ceremony"))
  var arrayLength = combat_liturgy.length;
    if (arrayLength > 40) {
      arrayLength = 40 
      ui.notifications.warn("You have more than 40 liturgys! The template can only hold a maximum of 40");
    }
    for (var i = 0; i < arrayLength; i++) {
      (form.getTextField('Liturgie_Anzeige_'+(i+1))).setText(combat_liturgy[i].name+'');
      (form.getTextField('L_Probe_'+(i+1))).setText((combat_liturgy[i].data.data.characteristic1.value).toUpperCase()+' / '+(combat_liturgy[i].data.data.characteristic2.value).toUpperCase()+' / '+(combat_liturgy[i].data.data.characteristic3.value).toUpperCase()+'');
      (form.getTextField('L_FW_'+(i+1))).setText((combat_liturgy[i].data.data.talentValue.value+''));
      (form.getTextField('L_KaP_'+(i+1))).setText((combat_liturgy[i].data.data.AsPCost.value+''));
      (form.getTextField('L_LDauer_'+(i+1))).setText((combat_liturgy[i].data.data.castingTime.value+''));
      (form.getTextField('L_RW_'+(i+1))).setText((combat_liturgy[i].data.data.range.value+''));
      (form.getTextField('L_WDauer_'+(i+1))).setText((combat_liturgy[i].data.data.duration.value+''));
      (form.getTextField('L_Aspekt_'+(i+1))).setText((''));
      (form.getTextField('L_SF_'+(i+1))).setText((combat_liturgy[i].data.data.StF.value+''));
      (form.getTextField('L_Wirkung_'+(i+1))).setText((combat_liturgy[i].data.data.effect.value+''));
      (form.getTextField('L_Seite_'+(i+1))).setText((''));
    }

    form.getTextField('KE_Max_2').setText(entity.data.data.status.karmaenergy.max+'')
    form.getTextField('KE_Aktuell').setText(entity.data.data.status.karmaenergy.current+'')
    form.getTextField('Held_Tradition_klerikal').setText(entity.data.data.tradition.clerical+'')
    form.getTextField('Leit_Karma_Anzeige').setText(Leitwert_long(entity.data.data.guidevalue.clerical)+'')
    form.getTextField('Held_Aspekt').setText(Leitwert_long(entity.data.data.feature.clerical)+'')
    
  /** blessing */  
  const combat_blessing = map
  .filter(value => value.type === "blessing");
  var f_combat_blessing = Array.from(combat_blessing.values(), value => value.name).join(", ")

  form.getTextField('Held_Segen').setText(f_combat_blessing) 

  /** special_cleric */  
  const special_cleric = map
  .filter(value => value.type === "specialability")
  .filter(value => value.data.data.category.value === "clerical");
  var f_special_cleric = Array.from(special_cleric.values(), value => value.name).join(", ")

  form.getTextField('Held_SF_Karm').setText(f_special_cleric) 

	/** set PDF Metadata for PDF*/
	pdfDoc.setTitle("DSA5-"+entity.name+".pdf created on "+today)
	pdfDoc.setSubject('https://github.com/JWinsen/DSA5-Foundry-VTT-Char2PDF')
	pdfDoc.setProducer('DSA5 - char2PDF ' +modul_version)
	pdfDoc.setCreator('pdf-lib (https://github.com/Hopding/pdf-lib)')
	pdfDoc.setCreationDate(new Date())
	pdfDoc.setModificationDate(new Date())

	/** save filled template */

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], {type: "application/pdf;charset=utf-8"});
    saveAs(blob, "DSA5-"+entity.name+".pdf")   
  }  
  catch (err) {
  ui.notifications.error(`Char2PDF - Error: ${err.message}`);
  }
}

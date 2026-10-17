import { dsa5char2pdf } from '../shared/module.js';
import { CharacterUtils } from '../shared/locale.js';
import { RomanNumerals } from '../shared/roman.js';
import { ImageConverter } from '../shared/image.js';
import { Config } from './field-map.js';
import { isShield, languageToken, literacyToken, moneyName } from '../shared/dsa5-api.js';

export class DSACHAR2PDF {
  constructor(actorId, lang) {
    this.actorId = actorId;
    this.lang = CharacterUtils.resolveLang(lang);
    this.entity = null;
    this.map = null;
    this.form = null;
    this.combatSkills = {};
  }

  loc(de, en) {
    return this.lang === 'de' ? de : en;
  }

  moduleLoc(key, data) {
    return game.i18n.format(`dsa5-char2pdfv2.${key}`, data || {});
  }

  setTextField(fieldName, value, fontSize = undefined) {
    const field = this.form.getTextField(fieldName);
    field.setText(String(value ?? '').normalize('NFC'));
    const size = fontSize
      ?? (typeof field.isMultiline === 'function' && field.isMultiline() ? 8 : 10);
    try {
      field.setFontSize(size);
    } catch (error) {
      console.warn(`dsa5-char2pdfv2 | Could not set font size for ${fieldName}`, error);
    }
  }

  trySetTextField(fieldName, value, fontSize = undefined) {
    try {
      this.setTextField(fieldName, value, fontSize);
    } catch (error) {
      console.warn(`dsa5-char2pdfv2 | Missing PDF field ${fieldName}`, error);
    }
  }

  findItemByName(name, type) {
    return this.map.find(item => item.type === type && item.name === name);
  }

  findItemByNames(type, names) {
    const nameSet = new Set(names.filter(Boolean));
    return this.map.find(item => item.type === type && nameSet.has(item.name));
  }

  filterItems(type, additionalFilter = null) {
    let filtered = this.map.filter(item => item.type === type);
    return additionalFilter ? filtered.filter(additionalFilter) : filtered;
  }

  isShieldSkill(skillName) {
    return isShield({ system: { combatskill: { value: skillName } } });
  }

  combat(skill) {
    const found = this.findItemByNames('combatskill', [skill.de, skill.en]);
    if (!found) return { r_AT: 0, r_PA: 0 };

    const combatskillData = game.dsa5.dataModels.Item.combatskill._calculateCombatSkillValues(found, this.entity.system);

    this.setTextField(`KT_FW_${skill.dest}`, combatskillData.system.talentValue.value);
    this.setTextField(`KT_AT_${skill.dest}`, combatskillData.system.attack.value);

    if (skill.hasParry) {
      this.setTextField(`KT_PA_${skill.dest}`, combatskillData.system.parry.value);
    }

    return {
      r_AT: combatskillData.system.attack.value,
      r_PA: skill.hasParry ? combatskillData.system.parry.value : 0,
    };
  }

  processTalent(talent) {
    this.trySetTextField(`Talent_Name_${talent.dest}`, this.loc(talent.de, talent.en), 7);

    const skill = this.findItemByNames('skill', [talent.de, talent.en]);
    if (!skill) return;

    const talentValue = skill.system.talentValue.value;
    this.setTextField(`Talent_FW_${talent.dest}`, talentValue, 8);
  }

  processCoins() {
    for (const coin of Config.COINS) {
      const name = moneyName(coin.i18n);
      const currencyItems = this.filterItems('money', item => item.name === name);
      const total = currencyItems.reduce((sum, item) => sum + Number(item.system.quantity.value), 0);
      this.setTextField(`Geld_${coin.field}`, total);
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
      this.setTextField(fieldName, characteristics[charKey].value, 14);
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
    for (const talent of Config.TALENTS) {
      this.processTalent(talent);
    }
  }

  fillCombatSkillLabels() {
    for (const skill of Config.COMBAT_SKILLS) {
      this.trySetTextField(`${skill.de}_name`, this.loc(skill.de, skill.en), 8);
    }
  }

  setEquipmentFields(itemType, namePrefix, maxItems, processFn) {
    const items = this.filterItems(itemType, item => item.system.worn?.value);
    const arrayLength = Math.min(items.length, maxItems);

    if (items.length > maxItems) {
      ui.notifications.warn(this.moduleLoc('warnTooMany', { max: maxItems, kind: namePrefix }));
    }

    for (let i = 0; i < arrayLength; i++) {
      processFn(items[i], i + 1);
    }
  }

  static WORNGEARFONTSIZE = 9;

  setShieldFields() {
    this.setEquipmentFields('meleeweapon', this.moduleLoc('kindShields'), Config.MAX_ITEMS.SHIELDS, (item, index) => {
      if (!this.isShieldSkill(item.system.combatskill.value)) return;

      this.setTextField(`Schild_Name_Anzeige_${index}`, item.name, DSACHAR2PDF.WORNGEARFONTSIZE);
      this.setTextField(`Schild_SP_${index}`, `${item.system.structure.value} / ${item.system.structure.max}`, DSACHAR2PDF.WORNGEARFONTSIZE);
      this.setTextField(`Schild_Mod_${index}`, `AT:${item.system.atmod.value} / PA:${item.system.pamod.value}`, DSACHAR2PDF.WORNGEARFONTSIZE);
      this.setTextField(`Schild_Gewicht_${index}`, item.system.weight.value, 9);
    });
  }

  setArmorFields() {
    this.setEquipmentFields('armor', this.moduleLoc('kindArmor'), Config.MAX_ITEMS.ARMOR, (item, index) => {
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
    this.setEquipmentFields('rangeweapon', this.moduleLoc('kindRangeWeapons'), Config.MAX_ITEMS.RANGE_WEAPONS, (item, index) => {
      const fieldMappings = {
        [`Fernwaffe_Name_Anzeige_${index}`]: item.name,
        [`Fern_Kampftechnik_Name_Anzeige_${index}`]: item.system.combatskill.value,
        [`Fern_Ladezeit_${index}`]: this.moduleLoc('reloadRounds', { value: item.system.reloadTime.value }),
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
    this.setEquipmentFields('meleeweapon', this.moduleLoc('kindMeleeWeapons'), Config.MAX_ITEMS.MELEE_WEAPONS, (item, index) => {
      if (this.isShieldSkill(item.system.combatskill.value)) return;

      const combatSkill = this.combatSkills[item.system.combatskill.value] || { r_AT: 0, r_PA: 0 };
      const reach = _loc(`Range-${item.system.reach.value}`);

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
      ui.notifications.warn(this.moduleLoc('warnTooMany', { max: maxItems, kind: namePrefix }));
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

    const generalSA = this.filterItems('specialability', item => item.system.category.value === 'general');
    const fatePointSA = this.filterItems('specialability', item => item.system.category.value === 'fatePoints');

    const generalNames = generalSA.map(item => item.name).join(', ');
    const fatePointNames = fatePointSA.map(item => item.name).join(', ');

    let combined = generalNames;
    if (fatePointNames) {
      combined += `\n\n${this.moduleLoc('fateAbilities', { names: fatePointNames })}`;
    }

    this.setTextField('Held_SF_allgemein', combined);
  }

  processLanguagesAndScripts() {
    const language = languageToken();
    const literacy = literacyToken();

    const languages = this.filterItems('specialability', item =>
      item.system.category.value === 'language' && language && item.name.includes(language)
    );
    const scripts = this.filterItems('specialability', item =>
      item.system.category.value === 'language' && literacy && item.name.includes(literacy)
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

      let formUrl = this.lang === 'de'
        ? dsa5char2pdf.TEMPLATES.PDF_TemplateDe
        : dsa5char2pdf.TEMPLATES.PDF_Template;
      let formResponse = await fetch(formUrl);
      if (!formResponse.ok) {
        formUrl = dsa5char2pdf.TEMPLATES.PDF_Template;
        formResponse = await fetch(formUrl);
      }
      const formPdfBytes = await formResponse.arrayBuffer();
      const pdfDoc = await PDFDocument.load(formPdfBytes);
      this.form = pdfDoc.getForm();

      const moduleVersion = game.modules.get('dsa5-char2pdfv2')?.version || '';

      const today = CharacterUtils.getCurrentDate();

      this.fillCharacterDetails();
      await this.processActorImage(pdfDoc);
      this.fillActorMainAttributes();
      this.processSpecialAbilities();
      this.processLanguagesAndScripts();
      this.setStatusFields();

      const expTranslate = _loc(this.entity.system.details.experience.description);
      this.setTextField('AP_Erfahrungsgrad_Anzeige', expTranslate);
      this.setTextField('AP_gesamt', this.entity.system.details.experience.total);
      this.setTextField('AP_gesammelt', this.entity.system.details.experience.current);
      this.setTextField('AP_ausgegeben', this.entity.system.details.experience.spent);

      const fatePoints = this.entity.system.status.fatePoints;
      this.setTextField('SchiP_Wert_1', fatePoints.current);
      this.setTextField('SchiP_Max_1', fatePoints.max);
      if (fatePoints.current !== fatePoints.value) {
        this.setTextField('SchiP_Aktuell_1', fatePoints.value);
      }
      this.setTextField('SchiP_BM_1', fatePoints.modifier);

      this.setTalentFields();

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

      this.fillCombatSkillLabels();
      for (const skill of Config.COMBAT_SKILLS) {
        const values = this.combat(skill);
        this.combatSkills[skill.de] = values;
        this.combatSkills[skill.en] = values;
      }

      const combatSA = this.filterItems('specialability', item => item.system.category.value === 'Combat');
      const combatSANames = combatSA.map(item => `${item.name} ${RomanNumerals.romanize(item.system.step.value)}`).join(', ');
      this.setTextField('Held_SF_Kampf', combatSANames);

      this.processCoins();

      this.setMeleeFields();
      this.setRangeFields();
      this.setArmorFields();
      this.setShieldFields();

      const equipmentCategories = game.dsa5.config.equipmentCategories;
      const items = this.map.filter(item => equipmentCategories.has(item.type) && (!item.system.worn?.value || item.type === 'equipment'));

      if (game.settings.get('dsa5', 'moneyHasWeight')) {
        items.push(...this.filterItems('money'));
      }

      let sumWeight1 = 0;
      let sumWeight2 = 0;
      const arrayLength = Math.min(items.length, Config.MAX_ITEMS.INVENTORY);

      if (items.length > Config.MAX_ITEMS.INVENTORY) {
        ui.notifications.warn(this.moduleLoc('warnTooMany', { max: Config.MAX_ITEMS.INVENTORY, kind: this.moduleLoc('kindInventory') }));
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

      this.setSpellFields();

      const astralEnergy = this.entity.system.status.astralenergy;
      this.setTextField('AE_Max_2', astralEnergy.max);
      if (astralEnergy.max !== astralEnergy.value) {
        this.setTextField('AE_Aktuell', astralEnergy.value);
      }
      this.setTextField('Held_Tradition_magisch', this.entity.system.tradition.magical);
      this.setTextField('Leit_Magie_Ansicht', CharacterUtils.getLeitwertLong(this.entity.system.guidevalue.magical));
      this.setTextField('Held_Merkmale', CharacterUtils.getLeitwertLong(this.entity.system.feature.magical));

      const magicTricks = this.filterItems('magictrick');
      this.setTextField('Held_Tricks', magicTricks.map(item => item.name).join(', '));

      const magicSA = this.filterItems('specialability', item => item.system.category.value === 'magical');
      this.setTextField('Held_SF_Mag', magicSA.map(item => item.name).join(', '));

      this.setLiturgyFields();

      const karmaEnergy = this.entity.system.status.karmaenergy;
      this.setTextField('KE_Max_2', karmaEnergy.max);
      if (karmaEnergy.max !== karmaEnergy.value) {
        this.setTextField('KE_Aktuell', karmaEnergy.value);
      }
      this.setTextField('Held_Tradition_klerikal', this.entity.system.tradition.clerical);
      this.setTextField('Leit_Karma_Anzeige', CharacterUtils.getLeitwertLong(this.entity.system.guidevalue.clerical));
      this.setTextField('Held_Aspekt', CharacterUtils.getLeitwertLong(this.entity.system.feature.clerical));

      const blessings = this.filterItems('blessing');
      this.setTextField('Held_Segen', blessings.map(item => item.name).join(', '));

      const clericalSA = this.filterItems('specialability', item => item.system.category.value === 'clerical');
      this.setTextField('Held_SF_Karm', clericalSA.map(item => item.name).join(', '));

      pdfDoc.setTitle(`DSA5-${this.entity.name}.pdf created on ${today}`);
      pdfDoc.setSubject('https://github.com/Plushtoast/dsa5-char2pdfv2');
      pdfDoc.setProducer(`DSA5 - char2PDF ${moduleVersion}`);
      pdfDoc.setCreator('pdf-lib (https://github.com/Hopding/pdf-lib)');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf;charset=utf-8' });
      saveAs(blob, `DSA5-${this.entity.name}.pdf`);

    } catch (err) {
      ui.notifications.error(`Char2PDF - Error: ${err.message}`);
      console.error(err);
    }
  }
}

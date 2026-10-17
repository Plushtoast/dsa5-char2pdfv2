import { dsa5char2pdf } from './shared/module.js';
import { DSACHAR2PDF } from './ulisses/fill-form.js';
import { EXPORT_TYPES, DEFAULT_EXPORT_TYPE } from './config/export-types.js';
import { THEMES, DEFAULT_THEME } from './config/print.js';
import { registerHtmlSheetTemplates } from './htmlsheet/templates.js';
import { exportHtmlSheet } from './htmlsheet/export-sheet.js';

Hooks.once('init', () => {
  registerHtmlSheetTemplates();
});

Hooks.on('getActorContextOptions', (html, entryOptions) => {
  entryOptions.push({
    label: 'DSA5-Char2PDF',
    icon: '<i class="fas fa-tasks"></i>',
    visible: (li) => {
      const id = li.dataset.entryId;
      const entity = game.actors.get(id);

      if (!entity) return false;

      return entity.type === 'character' ? entity.id : false;
    },
    onClick: (_, li) => {
      const id = li.dataset.entryId;
      const actor = game.actors.get(id);

      if (!actor) return;

      const exportPreferences = new ExportPreferences(actor);
      exportPreferences.render(true);
    },
  });
});

class ExportPreferences extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  constructor(actor) {
    super();
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = {
    id: 'export_preferences',
    classes: ['dsa5'],
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
    data.exportType = DEFAULT_EXPORT_TYPE;
    data.theme = DEFAULT_THEME;
    data.exportTypes = [
      { id: EXPORT_TYPES.HTMLSHEET, label: 'dsa5-char2pdfv2.exportHtmlsheet', selected: true },
      { id: EXPORT_TYPES.ULISSES, label: 'dsa5-char2pdfv2.exportUlisses', selected: false },
    ];
    data.themes = [
      { id: THEMES.TABLE, label: 'dsa5-char2pdfv2.themeTable', selected: true },
      { id: THEMES.PRINT, label: 'dsa5-char2pdfv2.themePrint', selected: false },
    ];
    return data;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector('.dialog-content')?.classList.add('scrollable');
    const typeSelect = this.element.querySelector('[name="exportType"]');
    const htmlOptions = this.element.querySelectorAll('[data-html-option]');
    const sync = () => {
      const html = typeSelect?.value !== EXPORT_TYPES.ULISSES;
      htmlOptions.forEach((row) => { row.hidden = !html; });
    };
    typeSelect?.addEventListener('change', sync);
    sync();
  }

  static async _btn_Export(ev, target) {
    const original = target.innerHTML;
    target.disabled = true;
    target.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${_loc('dsa5-char2pdfv2.exporting')}`;
    const exportType = this.element.querySelector('[name="exportType"]')?.value || DEFAULT_EXPORT_TYPE;
    const theme = this.element.querySelector('[name="theme"]')?.value || DEFAULT_THEME;
    const includeBiography = this.element.querySelector('[name="includeBiography"]')?.checked === true;
    try {
      if (exportType === EXPORT_TYPES.ULISSES) {
        const pdfRenderer = new DSACHAR2PDF(this.actor.uuid, game.i18n.lang);
        await pdfRenderer.fillForm();
      } else {
        await exportHtmlSheet(this.actor, { theme, lang: game.i18n.lang, includeBiography });
      }
      this.close();
    } catch (err) {
      ui.notifications.error(`Char2PDF - Error: ${err.message}`);
      console.error(err);
      target.disabled = false;
      target.innerHTML = original;
    }
  }
}

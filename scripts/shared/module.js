export class dsa5char2pdf {
  static ID = 'dsa5-char2pdfv2';

  static TEMPLATES = {
    PDF_Template: `modules/${this.ID}/templates/template.pdf`,
    PDF_TemplateDe: `modules/${this.ID}/templates/template_de.pdf`,
    PDF_Biography: `modules/${this.ID}/templates/template_biography.pdf`,
    export_preferences: `modules/${this.ID}/templates/export_preferences.hbs`,
  };

  static PATH = {
    main: `modules/${this.ID}/`,
  };
}

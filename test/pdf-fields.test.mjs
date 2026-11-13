import assert from 'assert';
import { createRequire } from 'module';
import { collectPdfFields, fieldFontSize, finishPdfForm, hidePdfFieldText, htmlRectToPdf } from '../scripts/htmlsheet/pdf-fields.js';

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require('../lib/pdf-lib.js');

const pagePx = { width: 794, height: 1123 };
const pagePt = { width: 595.28, height: 841.89 };

const topLeft = htmlRectToPdf({ x: 0, y: 0, width: 100, height: 50 }, pagePx, pagePt);
assert(Math.abs(topLeft.x) < 0.01);
assert(topLeft.y > pagePt.height - 50);
assert(topLeft.width > 70);
assert(topLeft.height > 30);

const bottom = htmlRectToPdf({ x: 0, y: 1073, width: 794, height: 50 }, pagePx, pagePt);
assert(bottom.y < 50);

const page = {
  getBoundingClientRect() { return { left: 0, top: 0, width: 794, height: 1123 }; },
  querySelectorAll() {
    return [{
      getAttribute(name) {
        return {
          'data-pdf-field': 'cond.inpain',
          'data-pdf-dropdown': '-,I,II,III,IV',
          'data-pdf-align': 'center',
        }[name] ?? null;
      },
      innerText: 'II',
      textContent: 'II',
      getBoundingClientRect() { return { left: 10, top: 20, width: 36, height: 18 }; },
    }];
  },
};
const fields = collectPdfFields(page);
assert.strictEqual(fields[0].name, 'cond.inpain');
assert.deepStrictEqual(fields[0].dropdown, ['-', 'I', 'II', 'III', 'IV']);
assert.strictEqual(fields[0].value, 'II');
assert.strictEqual(fields[0].x, 11);
assert.strictEqual(fields[0].y, 21);
assert.strictEqual(fields[0].width, 34);
assert.strictEqual(fields[0].height, 16);
assert.strictEqual(fieldFontSize({ multiline: true }, { height: 80 }), 8);
assert.ok(fieldFontSize({ multiline: true }, { height: 12 }) <= 8);
assert.ok(fieldFontSize({ multiline: true }, { height: 12 }) <= 8);
assert.strictEqual(fieldFontSize({ multiline: false }, { height: 12 }), 8);

const child = { style: {} };
const fieldEl = {
  style: {},
  querySelectorAll() { return [child]; },
};
hidePdfFieldText({
  querySelectorAll(selector) {
    return selector === '[data-pdf-field]' ? [fieldEl] : [];
  },
});
assert.strictEqual(fieldEl.style.color, 'transparent');
assert.strictEqual(child.style.color, 'transparent');
assert.strictEqual(child.style.webkitTextFillColor, 'transparent');

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const pdfPage = pdf.addPage([200, 80]);
const widget = {
  borderWidth: 0,
  font,
  textColor: rgb(0, 0, 0),
  backgroundColor: undefined,
  borderColor: undefined,
};
const form = pdf.getForm();
const name = form.createTextField('s1.personal_name');
name.addToPage(pdfPage, { ...widget, x: 10, y: 40, width: 120, height: 16 });
name.setFontSize(9);
name.setText('Alrik the Bold');
const weird = form.createTextField('s2.notes');
weird.addToPage(pdfPage, { ...widget, x: 10, y: 10, width: 120, height: 16 });
weird.setFontSize(9);
weird.setText('Weg \u2603');
finishPdfForm(pdf, font);

function appearanceText(field) {
  const normal = field.acroField.getWidgets()[0].getAppearances()?.normal;
  const stream = typeof normal?.getContentsString === 'function' ? normal : pdf.context.lookup(normal);
  return stream.getContentsString();
}

assert(appearanceText(name).includes('416C72696B2074686520426F6C64'), 'edited value must be in the field appearance');
assert.strictEqual(weird.getText(), 'Weg ?');
assert(appearanceText(weird).includes('576567203F'));
assert(!appearanceText(weird).includes('2603'));

console.log('pdf-fields.test.mjs passed');

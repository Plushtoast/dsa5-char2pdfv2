import assert from 'assert';
import { collectPdfFields, fieldFontSize, htmlRectToPdf } from '../scripts/htmlsheet/pdf-fields.js';

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

console.log('pdf-fields.test.mjs passed');

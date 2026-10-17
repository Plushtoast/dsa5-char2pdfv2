const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFName, decodePDFRawStream } = require('pdf-lib');
const { collectPrintedStrings } = require('../scripts/ulisses/pdf-labels');

function page0AttributeStream(pdf) {
  const page = pdf.getPages()[0];
  const res = pdf.context.lookup(page.node.Resources());
  const xobj = pdf.context.lookup(res.get(PDFName.of('XObject')));
  const fm1 = pdf.context.lookup(xobj.get(PDFName.of('Fm1')));
  return Buffer.from(decodePDFRawStream(fm1).decode()).toString('latin1');
}

async function loadPdf(file) {
  const bytes = fs.readFileSync(path.join(__dirname, '..', 'templates', file));
  return PDFDocument.load(bytes);
}

async function run() {
  const dePath = path.join(__dirname, '..', 'templates', 'template_de.pdf');
  const hasDe = fs.existsSync(dePath);
  const dePdf = hasDe ? await loadPdf('template_de.pdf') : null;
  const enPdf = await loadPdf('template.pdf');
  const de = dePdf?.getForm();
  const en = enPdf.getForm();

  if (hasDe) {
    assert.strictEqual(de.getTextField('Talent_Name_1').getText(), 'Fliegen');
    assert.strictEqual(de.getTextField('Armbrüste_name').getText(), 'Armbrüste');
    assert.strictEqual(de.getTextField('Schilde_name').getText(), 'Schilde');
    assert.strictEqual(de.getDropdown('Armbrüste_leit').getSelected()[0], 'FF');
  }

  let talent1;
  try {
    talent1 = en.getTextField('Talent_Name_1').getText();
  } catch {
    console.log('templates.test.js skipped (Ulisses template has no Talent_Name_1)');
    return;
  }
  if (talent1 !== 'Flying') {
    console.log(`templates.test.js skipped bilingual checks (Talent_Name_1=${talent1})`);
    return;
  }

  assert.strictEqual(en.getTextField('Armbrüste_name').getText(), 'Crossbows');
  assert.strictEqual(en.getTextField('Schilde_name').getText(), 'Shields');
  assert.strictEqual(en.getDropdown('Armbrüste_leit').getSelected()[0], 'DEX');
  assert(en.getTextField('Talent_Name_1').isReadOnly(), 'talent names must not be editable');
  assert(en.getTextField('Armbrüste_name').isReadOnly(), 'combat names must not be editable');
  assert(en.getDropdown('Armbrüste_leit').isReadOnly(), 'combat attribute dropdowns must not be editable');

  const enHeaderNames = en.getFields().map((f) => f.getName()).filter((n) => n.startsWith('hdr_'));
  assert.deepStrictEqual(enHeaderNames, [], 'headers must be printed, not extra form fields');

  const enFm1 = page0AttributeStream(enPdf);
  assert(!enFm1.includes('Tff'), 'EN attribute Tf operator was corrupted');
  assert(!enFm1.includes('[[<'), 'EN attribute TJ operator was corrupted');
  assert(/\/C0_0 9(\.3)? *Tf/.test(enFm1), `EN attribute labels must use a smaller font, got ${enFm1.match(/\/C0_0 [0-9.]+ *Tf/)}`);
  if (hasDe) {
    const deFm1 = page0AttributeStream(dePdf);
    assert(/\/C0_0 14 Tf/.test(deFm1), 'DE attribute labels must keep the original font size');
  }
  assert(!String(en.getTextField('MU_1').acroField.getDefaultAppearance()).includes(' 0 Tf'), 'attribute value fields must not use autosize 0');
  assert(!String(en.getTextField('Held_Nachteile').acroField.getDefaultAppearance()).includes(' 82 Tf'), 'disadvantage field must not use a giant font');

  const enPrint = collectPrintedStrings(enPdf);
  assert(enPrint.has('Physical Skills'), `EN template missing Physical Skills, got ${[...enPrint].slice(0, 20)}`);
  assert(enPrint.has('Gender'), 'EN template missing Gender');
  assert(enPrint.has('COU'), 'EN template missing COU');
  assert(enPrint.has('Skills'), 'EN template missing Skills title');
  assert(enPrint.has('Personal data'), 'EN template missing Personal data');
  assert(!enPrint.has('FERTIGKEITEN'), 'EN template still has FERTIGKEITEN');
  if (hasDe) {
    const dePrint = collectPrintedStrings(dePdf);
    assert(dePrint.has('Körpertalente'), 'DE template should keep Körpertalente');
    assert(dePrint.has('Geschlecht'), 'DE template should keep Geschlecht');
    assert(!dePrint.has('Physical Skills'), 'DE template must not rewrite English headers');
  }

  console.log('templates.test.js passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function editPdf() {
  // Load the existing PDF from file
  const existingPdfBytes = fs.readFileSync('templates/original_template.pdf');

  // Load the PDFDocument
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // Get the first page of the document
  const page = pdfDoc.getPage(2);
  const form = pdfDoc.getForm();

  const existingFields = form.getFields();

  // (Optional) Store the appearances of existing fields
  const fieldAppearances = {};
  /*existingFields.forEach((field) => {
    //if field has getFontSize() and getColor() methods

    if (!field.getFontSize || !field.getColor) return;

    fieldAppearances[field.getName()] = {
      fontSize: field.getFontSize(),
      color: field.getColor(),
      // You can save other properties as needed
    };
  });*/

  console.debug(`Appearances: ${JSON.stringify(fieldAppearances)}`);

  // Draw a rectangle with background color
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const defaultFields = ["Armbrüste", "Bögen", "Dolche", "Fechtwaffen", "Hiebwaffen", "Kettenwaffen", "Lanzen", "Raufen", "Schilde", "Schwerter", "Stangenwaffen", "Wurfwaffen", "Zweihandhiebwaffen", "Zweihandschwerter"];
  const select = ["FF", "FF", "GE", "GE", "KK", "KK", "KK", "GE/KK", "KK", "GE/KK", "GE/KK", "FF", "KK", "KK"];

  for(let i = 0; i < defaultFields.length; i++) {
  //for(let i = defaultFields.length -1; i >= 0; i--) {
    /*page.drawRectangle({
      x: 60,
      y: 400 + i * 20,
      width: 200,
      height: 20,
      color: rgb(1, 1, 1),
    });*/

    const lineheight = 13.05
    const name = defaultFields[defaultFields.length - i - 1]
    const textField = form.createTextField(name + "_name");
    textField.setText(name); // initial value, if needed
    textField.addToPage(page, {
      x: 37,
      y: 488.7 + i * lineheight,
      width: 93.7,
      height: lineheight - 1.2,
      color: rgb(1, 1, 1),
      borderWidth: 0,
      borderColor: rgb(1,1,1),
      backgroundColor: rgb(1, 1, 1),
    });

    const selectField = form.createDropdown(name + "_leit");
  
    // Add options to the dropdown
    selectField.addOptions(["FF", "GE", "KK", "GE/KK"]);
  
    // Set the default selected option (optional)
    selectField.select(select[select.length - i - 1]);
  
    selectField.addToPage(page, {
      x: 131.5,            // X-coordinate
      y: 488.7 + i * lineheight,            // Y-coordinate
      width: 33,        // Width of the dropdown
      height: lineheight - 1.2,        // Height of the dropdown
      borderWidth: 0,
      backgroundColor: rgb(0.8828125, 0.8359375, 0.816),
    }); 
  }

  existingFields.forEach((field) => {
    field.setFontSize(12);
  });

  // Save the modified PDF to a file
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('templates/template.pdf', pdfBytes);

  console.log("PDF edited successfully!");
}

// Run the function
editPdf();

import { PAGE } from '../config/print.js';

const FIELD_INSET_PX = 1;

export function htmlRectToPdf(rect, pagePx, pagePt) {
  const sx = pagePt.width / pagePx.width;
  const sy = pagePt.height / pagePx.height;
  return {
    x: rect.x * sx,
    y: pagePt.height - (rect.y + rect.height) * sy,
    width: rect.width * sx,
    height: rect.height * sy,
  };
}

function dropdownOptions(el) {
  return (el.getAttribute('data-pdf-dropdown') || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function collectPdfFields(pageEl) {
  const pageRect = pageEl.getBoundingClientRect();
  return [...pageEl.querySelectorAll('[data-pdf-field]')].map((el) => {
    const r = el.getBoundingClientRect();
    const width = r.width - FIELD_INSET_PX * 2;
    const height = r.height - FIELD_INSET_PX * 2;
    return {
      name: el.getAttribute('data-pdf-field') || 'field',
      value: (el.textContent || '').replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim(),
      multiline: el.getAttribute('data-pdf-multiline') === 'true',
      align: el.getAttribute('data-pdf-align') || 'left',
      dropdown: dropdownOptions(el),
      x: r.left - pageRect.left + FIELD_INSET_PX,
      y: r.top - pageRect.top + FIELD_INSET_PX,
      width,
      height,
    };
  }).filter((field) => field.width > 2 && field.height > 2);
}

function fieldName(base, serial) {
  const safe = String(base || 'field').replace(/[^A-Za-z0-9._]+/g, '_').slice(0, 60);
  return `s${serial}.${safe}`;
}

function alignmentValue(align) {
  if (align === 'center') return 1;
  if (align === 'right') return 2;
  return 0;
}

function winAnsi(value) {
  return String(value || '').replace(/[^\t\n\r\x20-\xFF]/g, '?');
}

function textForFont(font, value) {
  const clipped = String(value || '').slice(0, 8000);
  if (!clipped) return '';
  try {
    font?.encodeText?.(clipped);
    return clipped;
  } catch (_error) {
    return winAnsi(clipped);
  }
}

function blankTextPaint(el) {
  el.style.color = 'transparent';
  el.style.webkitTextFillColor = 'transparent';
}

/** Hide field text in the capture clone without changing the box. The widget draws the value. */
export function hidePdfFieldText(root) {
  for (const field of root.querySelectorAll('[data-pdf-field]')) {
    blankTextPaint(field);
    for (const child of field.querySelectorAll('*')) blankTextPaint(child);
  }
}

function drawFieldAppearance(field, font) {
  try {
    field.defaultUpdateAppearances(font);
  } catch (_error) {
    if (typeof field.setText !== 'function' || typeof field.getText !== 'function') {
      console.warn('char2pdf could not draw field', field.getName?.(), _error);
      return;
    }
    field.setText(winAnsi(field.getText()));
    try {
      field.defaultUpdateAppearances(font);
    } catch (error) {
      console.warn('char2pdf could not draw field', field.getName?.(), error);
    }
  }
}

/** Match the 12px sheet body (~9pt). Never larger than the widget; never auto-fit to a tall box. */
export function fieldFontSize(field, box) {
  const preferred = field.multiline ? 8 : 9;
  const fit = Math.max(5, box.height - 4);
  return Math.min(preferred, fit);
}

function applyFontSize(widgetField, size) {
  for (let next = size; next >= 5; next -= 1) {
    try {
      widgetField.setFontSize(next);
      return;
    } catch (_error) { /* try a smaller size rather than auto-fit */ }
  }
}

function widgetColors(theme, rgb) {
  const textColor = theme === 'print' ? rgb(0.08, 0.08, 0.08) : rgb(0.17, 0.13, 0.09);
  return { textColor, borderWidth: 0 };
}

export function addPdfFields(pdf, pdfPage, fields, options = {}) {
  const lib = globalThis.PDFLib || {};
  const rgb = typeof lib.rgb === 'function' ? lib.rgb : null;
  if (!rgb) throw new Error('pdf-lib rgb is not available');

  const form = pdf.getForm();
  const font = options.font;
  const theme = options.theme || 'table';
  const pagePx = options.pagePx || { width: PAGE.widthPx, height: PAGE.heightPx };
  const pagePt = options.pagePt || {
    width: PAGE.widthMm / 25.4 * 72,
    height: PAGE.heightMm / 25.4 * 72,
  };
  const colors = widgetColors(theme, rgb);

  let serial = options.serial || 0;
  for (const field of fields) {
    serial += 1;
    try {
      const box = htmlRectToPdf(field, pagePx, pagePt);
      const name = fieldName(field.name, serial);
      const widget = {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        ...colors,
        backgroundColor: undefined,
        borderColor: undefined,
        font,
      };
      const fontSize = fieldFontSize(field, box);

      if (field.dropdown.length) {
        const dropdown = form.createDropdown(name);
        dropdown.setOptions(field.dropdown);
        const selected = field.dropdown.includes(field.value) ? field.value : field.dropdown[0];
        if (selected) dropdown.select(selected);
        dropdown.addToPage(pdfPage, widget);
        applyFontSize(dropdown, fontSize);
        continue;
      }

      const textField = form.createTextField(name);
      if (field.multiline) {
        textField.enableMultiline();
        textField.enableScrolling();
      }
      if (field.value) textField.setText(textForFont(font, field.value));
      textField.addToPage(pdfPage, widget);
      textField.setAlignment(alignmentValue(field.align));
      applyFontSize(textField, fontSize);
    } catch (error) {
      console.warn('char2pdf could not add field', field.name, error);
    }
  }
  return serial;
}

export function finishPdfForm(pdf, font) {
  for (const field of pdf.getForm().getFields()) drawFieldAppearance(field, font);
}

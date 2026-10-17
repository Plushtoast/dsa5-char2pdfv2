import { PAGE } from '../config/print.js';
import { dsa5char2pdf } from '../shared/module.js';
import { ImageConverter } from '../shared/image.js';
import { savePdfBlob } from '../shared/download.js';
import { imageUrls } from './render-sheet.js';
import { paginateSheet } from './paginate.js';
import { addPdfFields, collectPdfFields, finishPdfForm } from './pdf-fields.js';

async function toDataUrlSafe(src, format = 'image/png') {
  if (!src || src.startsWith('data:')) return src;
  try {
    return await ImageConverter.toDataUrl(src, format);
  } catch (error) {
    console.warn('char2pdf could not embed image', src, error);
    return src;
  }
}

async function embedImages(root, lang) {
  const urls = imageUrls(lang);
  const decorative = await Promise.all([
    toDataUrlSafe(urls.hintergrund, 'image/jpeg'),
    toDataUrlSafe(urls.zierleiste, 'image/png'),
    toDataUrlSafe(urls.lilie, 'image/png'),
  ]);
  const [hintergrund, zierleiste, lilie] = decorative;
  const swap = {
    [urls.hintergrund]: hintergrund,
    [urls.zierleiste]: zierleiste,
    [urls.lilie]: lilie,
  };

  for (const img of root.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    const next = swap[src] || await toDataUrlSafe(src);
    if (next) img.setAttribute('src', next);
  }
}

function waitForImages(root) {
  return Promise.all([...root.querySelectorAll('img')].map((img) => {
    if (typeof img.decode === 'function') return img.decode().catch(() => undefined);
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));
}

/** Foundry/Electron defines `module`, so the UMD bundle does not attach to globalThis. */
async function ensureHtml2Pdf() {
  if (typeof globalThis.html2pdf === 'function') return globalThis.html2pdf;

  const url = `modules/${dsa5char2pdf.ID}/lib/html2pdf.bundle.min.js`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not fetch html2pdf.js (${response.status})`);
  const source = await response.text();
  const script = document.createElement('script');
  script.text = `"use strict";var module,exports,define;\n${source}`;
  document.documentElement.appendChild(script);
  script.remove();
  if (typeof globalThis.html2pdf !== 'function') throw new Error('html2pdf.js is not loaded');
  return globalThis.html2pdf;
}

function canvasFromWorker(html2pdf, page, theme) {
  const backgroundColor = theme === 'print' ? '#ffffff' : '#f4ead2';
  return new Promise((resolve, reject) => {
    html2pdf()
      .set({
        margin: 0,
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor,
          width: PAGE.widthPx,
          height: PAGE.heightPx,
          windowWidth: PAGE.widthPx,
          windowHeight: PAGE.heightPx,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          onclone(doc) {
            const sheet = doc.querySelector('#dsa5-htmlsheet');
            if (!sheet) return;
            sheet.classList.add('pdf-capture');
            sheet.style.left = '0';
            sheet.style.position = 'relative';
            for (const el of sheet.querySelectorAll('*')) {
              el.style.letterSpacing = '0';
              el.style.textShadow = 'none';
              el.style.webkitTextStroke = '0';
              el.style.textTransform = 'none';
              el.style.filter = 'none';
            }
          },
        },
        pagebreak: { mode: [] },
      })
      .from(page)
      .toCanvas()
      .get('canvas', resolve)
      .catch(reject);
  });
}

async function canvasToJpg(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('Could not encode sheet page');
  return new Uint8Array(await blob.arrayBuffer());
}

function isolatePage(root, page) {
  const original = [...root.children];
  for (const node of original) {
    if (node !== page) node.remove();
  }
  return () => {
    for (const node of original) root.appendChild(node);
  };
}

export function pdfFilename(actorName) {
  const safe = String(actorName || 'character').normalize('NFC').replace(/[<>:"/\\|?*]/g, '_').trim() || 'character';
  return `DSA5-${safe}.pdf`;
}

export async function htmlToPdf(html, filename, options = {}) {
  const html2pdf = await ensureHtml2Pdf();
  const { PDFDocument, StandardFonts } = globalThis.PDFLib || {};
  if (typeof PDFDocument?.create !== 'function') throw new Error('pdf-lib is not loaded');

  const host = document.createElement('div');
  host.id = 'dsa5-htmlsheet-host';
  host.innerHTML = html;
  document.body.appendChild(host);

  const root = host.querySelector('#dsa5-htmlsheet') || host;
  const theme = options.theme || root.getAttribute('data-theme') || 'table';
  try {
    await embedImages(root, options.lang || options.snapshot?.lang || 'en');
    await waitForImages(root);
    paginateSheet(root);

    const pages = [...root.querySelectorAll('.sheet-page')];
    if (!pages.length) throw new Error('HTML sheet produced no pages');

    root.style.width = `${PAGE.widthPx}px`;
    root.style.height = `${PAGE.heightPx}px`;
    root.style.overflow = 'hidden';

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const width = PAGE.widthMm / 25.4 * 72;
    const height = PAGE.heightMm / 25.4 * 72;
    const pagePx = { width: PAGE.widthPx, height: PAGE.heightPx };
    const pagePt = { width, height };

    let serial = 0;
    for (const page of pages) {
      const restore = isolatePage(root, page);
      try {
        const fields = collectPdfFields(page);
        const canvas = await canvasFromWorker(html2pdf, root, theme);
        const jpg = await canvasToJpg(canvas);
        const image = await pdf.embedJpg(jpg);
        const pdfPage = pdf.addPage([width, height]);
        pdfPage.drawImage(image, { x: 0, y: 0, width, height });
        serial = addPdfFields(pdf, pdfPage, fields, { theme, pagePx, pagePt, font, serial });
      } finally {
        restore();
      }
    }

    finishPdfForm(pdf, font);
    const bytes = await pdf.save({ updateFieldAppearances: false });
    savePdfBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
  } finally {
    host.remove();
  }
}

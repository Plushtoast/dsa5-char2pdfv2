import { CharacterUtils } from '../shared/locale.js';
import { DEFAULT_THEME } from '../config/print.js';
import { buildActorSnapshot } from '../shared/actor-snapshot.js';
import { registerHtmlSheetTemplates } from './templates.js';
import { renderSheet } from './render-sheet.js';
import { htmlToPdf, pdfFilename } from './html-to-pdf.js';

export async function exportHtmlSheet(actor, { theme, lang, includeBiography = false } = {}) {
  await registerHtmlSheetTemplates();
  const resolvedLang = CharacterUtils.resolveLang(lang ?? globalThis.game?.i18n?.lang);
  const snapshot = buildActorSnapshot(actor, resolvedLang, { includeBiography });
  const html = await renderSheet(snapshot, theme || DEFAULT_THEME);
  await htmlToPdf(html, pdfFilename(snapshot.name), {
    theme: theme || DEFAULT_THEME,
    lang: resolvedLang,
    snapshot,
  });
}

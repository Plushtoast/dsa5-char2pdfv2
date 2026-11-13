const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  shy: '',
};

function decodeEntity(body) {
  const token = body.toLowerCase();
  if (token[0] !== '#') return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, token) ? NAMED_ENTITIES[token] : '';
  const code = token[1] === 'x' ? parseInt(token.slice(2), 16) : parseInt(token.slice(1), 10);
  if (!Number.isFinite(code) || code === 0xad) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** Labels such as Leit&shy;eigenschaft must not show the entity in the PDF. */
export function plainText(value) {
  let text = String(value ?? '').replace(/<[^>]*>/g, '');
  for (let pass = 0; pass < 2; pass += 1) {
    const next = text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, body) => decodeEntity(body)).replace(/\u00ad/g, '');
    if (next === text) break;
    text = next;
  }
  return text;
}

export class CharacterUtils {
  static getLeitwertLong(shortCode) {
    if (!shortCode) return '';
    const key = `CHAR.${String(shortCode).toUpperCase()}`;
    const translated = typeof globalThis._loc === 'function' ? globalThis._loc(key) : game.i18n.localize(key);
    return translated === key ? shortCode : translated;
  }

  static getCurrentDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  static resolveLang(lang) {
    return String(lang || game.i18n?.lang || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
  }
}

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

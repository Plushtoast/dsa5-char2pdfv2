import { THEMES, DEFAULT_THEME } from '../config/print.js';

export { THEMES, DEFAULT_THEME };

export function themeClass(theme) {
  return theme === THEMES.PRINT ? 'theme-print' : 'theme-table';
}

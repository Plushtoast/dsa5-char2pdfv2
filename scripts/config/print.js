export const PAGE = {
  format: 'a4',
  widthMm: 210,
  heightMm: 297,
  contentInsetMm: 14,
  /** A4 at 96dpi — html2canvas is unreliable with CSS mm. */
  widthPx: 794,
  heightPx: 1123,
  insetPx: 70,
};

export const THEMES = {
  TABLE: 'table',
  PRINT: 'print',
};

export const DEFAULT_THEME = THEMES.TABLE;

export const ROW_LIMITS = {
  inventory: 28,
  spells: 16,
  liturgies: 16,
};

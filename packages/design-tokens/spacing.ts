/** Spacing / radius / shadow / layout — 8px modular cadence. */
export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2.5rem",
  gutter: "1rem",
  gutterDesktop: "1.5rem",
  margin: "1rem",
  marginTablet: "2rem",
  marginDesktop: "3rem",
} as const;

export const radius = {
  sm: "0.375rem",
  DEFAULT: "1rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  card: "1rem",
  panel: "0.75rem",
  input: "0.625rem",
  pill: "9999px",
} as const;

/** Hard offset comic shadows — tanpa blur. */
export const shadows = {
  brutalSm: "2px 2px 0px #000000",
  brutal: "4px 4px 0px #000000",
  brutalLg: "6px 6px 0px #000000",
  brutalXl: "8px 8px 0px #000000",
  pressed: "0px 0px 0px #000000",
} as const;

export const borders = {
  brutal: "3px solid #000000",
  brutalThin: "2px solid #000000",
} as const;

export const layout = {
  maxWidth: "80rem",
  gutterMobile: "1rem",
  gutterDesktop: "1.5rem",
} as const;

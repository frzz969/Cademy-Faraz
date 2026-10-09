/**
 * Typography — Bricolage Grotesque (display) + Plus Jakarta Sans (body) + Space Grotesk (label)
 * Standarisasi: body selalu Plus Jakarta Sans (homepage desktop yang memakai Space Grotesk
 * sebagai body dianggap inkonsisten dan tidak diikuti).
 */
export const fontFamily = {
  display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
  body: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
  label: ['"Space Grotesk"', "monospace", "sans-serif"],
} as const;

export const textStyles = {
  hero: {
    fontFamily: fontFamily.display.join(", "),
    fontSize: "48px",
    lineHeight: "54px",
    fontWeight: 800,
    letterSpacing: "-0.03em",
  },
  heroMobile: {
    fontFamily: fontFamily.display.join(", "),
    fontSize: "32px",
    lineHeight: "38px",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  hLg: {
    fontFamily: fontFamily.display.join(", "),
    fontSize: "36px",
    lineHeight: "44px",
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  hLgMobile: {
    fontFamily: fontFamily.display.join(", "),
    fontSize: "26px",
    lineHeight: "32px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  hMd: {
    fontFamily: fontFamily.display.join(", "),
    fontSize: "24px",
    lineHeight: "30px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  hSm: {
    fontFamily: fontFamily.display.join(", "),
    fontSize: "20px",
    lineHeight: "26px",
    fontWeight: 700,
    letterSpacing: "0em",
  },
  bodyLg: { fontFamily: fontFamily.body.join(", "), fontSize: "18px", lineHeight: "28px", fontWeight: 500 },
  bodyMd: { fontFamily: fontFamily.body.join(", "), fontSize: "16px", lineHeight: "24px", fontWeight: 400 },
  bodySm: { fontFamily: fontFamily.body.join(", "), fontSize: "14px", lineHeight: "20px", fontWeight: 400 },
  labelLg: {
    fontFamily: fontFamily.label.join(", "),
    fontSize: "14px",
    lineHeight: "18px",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  labelMd: {
    fontFamily: fontFamily.label.join(", "),
    fontSize: "12px",
    lineHeight: "16px",
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  labelCaps: {
    fontFamily: fontFamily.label.join(", "),
    fontSize: "11px",
    lineHeight: "14px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
} as const;

/** Kelas Tailwind siap pakai (mobile-first, naikkan di sm:/md:). */
export const typography = {
  fontDisplay: "font-display",
  fontBody: "font-body",
  fontLabel: "font-label",
  hero: "font-display text-[32px] leading-[38px] font-extrabold tracking-[-0.02em] sm:text-5xl sm:leading-[1.1] lg:text-6xl",
  hLg: "font-display text-[26px] leading-8 font-bold tracking-tight sm:text-4xl sm:leading-[44px]",
  hMd: "font-display text-2xl leading-[30px] font-bold",
  hSm: "font-display text-xl leading-[26px] font-bold",
  bodyLg: "font-body text-lg leading-7 font-medium",
  bodyMd: "font-body text-base leading-6",
  bodySm: "font-body text-sm leading-5",
  labelCaps: "font-label text-[11px] leading-[14px] font-extrabold uppercase tracking-[0.08em]",
  labelMd: "font-label text-xs font-bold uppercase tracking-wider",
} as const;

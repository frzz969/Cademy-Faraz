/**
 * Neo-Comic Cyan & Navy — color tokens
 * Sumber: stitch_academic/neo_comic_cyan_navy/DESIGN.md + 6 code.html representatif.
 * Aturan: tanpa gradient/glow/glass. Yellow hanya Beta/highlight, brick hanya external/danger.
 */
export const colors = {
  paper: "#EAF5FC",
  card: "#FFFFFF",
  panel: "#D9EDFA",
  ink: "#000000",
  brand: {
    blue: "#0E4A6E",
    navy: "#0B2E4B",
    muted: "#4E7390",
  },
  accent: {
    yellow: "#FFD02B",
    brick: "#D93A2B",
    brickSoft: "#FFDAD6",
  },
  /** Extended Material-3 tints (opsional, untuk progress/track halus). */
  tint: {
    surface: "#F6F9FF",
    containerLow: "#ECF5FF",
    container: "#E1F0FF",
    containerHigh: "#D6EBFF",
    containerHighest: "#CAE6FF",
  },
} as const;

export type Colors = typeof colors;

/**
 * Token kanonik DESIGN.md v2.4.0 (aditif — nilai visual yang sudah jalan tidak diubah).
 * - primaryHover: state hover tombol primer.
 * - primaryLight: sky blue untuk aksen aktif/link/pill sorotan.
 * - surface / surfaceContainer: kanvas utama & latar kartu.
 * - accentGreen/accentRed: status selesai & peringatan (brick lama tetap dipakai badge external).
 * - slate: badge SEGERA HADIR.
 */
export const canon = {
  primaryHover: "#082F49",
  primaryLight: "#2B7FFF",
  surface: "#F6F9FF",
  surfaceContainer: "#FFFFFF",
  accentGreen: "#10B981",
  accentRed: "#EF4444",
  slate: "#64748B",
} as const;

export type Canon = typeof canon;

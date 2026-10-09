export * from "./academic";
export * from "./dates";
export * from "./citation";
export * from "./thesis";
export * from "./pomodoro";
export * from "./text";
export * from "./pdf";
export * from "./csv";
export * from "./proyek";
export * from "./bimbingan";

export function cn(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function formatMenit(totalMenit: number): string {
  const j = Math.floor(totalMenit / 60);
  const m = totalMenit % 60;
  return j > 0 ? `${j}j ${m}m` : `${m} mnt`;
}

// Util PDF murni — tanpa React/browser/network.
// Diekstrak dari apps/web/app/tools/pdf/view.tsx (tanpa perubahan perilaku).

export function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function estimatePages(buf: ArrayBuffer): number | null {
  try {
    const bytes = new Uint8Array(buf);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk)
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    const m = bin.match(/\/Type\s*\/Page[^s]/g);
    return m ? m.length : null;
  } catch {
    return null;
  }
}

export function naiveText(buf: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buf);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk)
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    const out: string[] = [];
    const re = /\((?:\\.|[^\\()])*\)\s*Tj/g;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(bin)) && count < 500) {
      const raw = m[0].slice(1, m[0].lastIndexOf(")"));
      out.push(
        raw
          .replace(/\\n/g, " ")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\"),
      );
      count++;
    }
    return out.join(" ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

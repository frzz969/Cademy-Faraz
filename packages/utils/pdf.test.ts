import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fmtSize, estimatePages, naiveText } from "./pdf.ts";

describe("pdf utils", () => {
  it("fmtSize", () => {
    assert.equal(fmtSize(500), "500 B");
    assert.equal(fmtSize(2048), "2.0 KB");
    assert.ok(fmtSize(5 * 1024 * 1024).endsWith("MB"));
  });

  it("estimatePages menghitung /Type /Page", () => {
    const enc = new TextEncoder();
    const buf = enc.encode("x /Type /Page y /Type /Pages").buffer as ArrayBuffer;
    assert.equal(estimatePages(buf), 1);
    assert.equal(estimatePages(new ArrayBuffer(0)), null);
  });

  it("naiveText mengekstrak (Tj)", () => {
    const enc = new TextEncoder();
    const buf = enc.encode("(Halo dunia) Tj (Lagi) Tj").buffer as ArrayBuffer;
    const t = naiveText(buf);
    assert.ok(t.includes("Halo dunia"));
    assert.ok(t.includes("Lagi"));
  });
});

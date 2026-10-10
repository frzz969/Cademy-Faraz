import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handoffQuery, scholarUrl, youtubeSearchUrl } from "./handoff";

describe("materi smart handoff", () => {
  it("handoffQuery: gabung topik + matkul, rapi spasi", () => {
    assert.equal(handoffQuery("Normalisasi 3NF", "Basis Data"), "Normalisasi 3NF Basis Data");
    assert.equal(handoffQuery("  Bab  3:  Join ", "  Basis Data "), "Bab 3: Join Basis Data");
    assert.equal(handoffQuery("", "Basis Data"), "Basis Data");
    assert.equal(handoffQuery("Regresi", ""), "Regresi");
    assert.equal(handoffQuery("", ""), "");
  });

  it("scholarUrl: domain + query ter-encode", () => {
    const u = scholarUrl("Normalisasi 3NF Basis Data");
    assert.match(u, /^https:\/\/scholar\.google\.com\/scholar\?q=/);
    assert.match(u, /Normalisasi%203NF%20Basis%20Data/);
  });

  it("youtubeSearchUrl: domain + query ter-encode", () => {
    const u = youtubeSearchUrl("Regresi Linear Statistika");
    assert.match(u, /^https:\/\/www\.youtube\.com\/results\?search_query=/);
    assert.match(u, /Regresi%20Linear%20Statistika/);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  KNOWN_THESIS_IDS,
  buildLaporanMarkdown,
  hitungProgressProyek,
  migrateV1ToV2,
  parseThesisV2,
  resolveRevisionLink,
  revisionTag,
  type ThesisProject,
} from "./thesis";

function proyekCampur(): ThesisProject {
  return {
    id: "p1",
    name: "Skripsi Saya",
    docType: "skripsi",
    states: {
      cover: { status: "selesai" },
      bab1: { status: "perlu", note: "Perbaiki latar" },
    },
    revisionLinks: {},
    createdAt: new Date().toISOString(),
  };
}

describe("migrasi v1→v2", () => {
  it("bool campur: true→selesai, else→belum; key basi dibuang", () => {
    const v2 = migrateV1ToV2({
      cover: true,
      bab1: false,
      basi_lama: true,
    });
    assert.equal(v2.version, 2);
    assert.equal(v2.projects.length, 1);
    const p = v2.projects[0];
    assert.equal(p.name, "Skripsi Saya");
    assert.equal(p.docType, "skripsi");
    assert.equal(p.states["cover"]?.status, "selesai");
    assert.equal(p.states["bab1"]?.status, "belum");
    assert.equal("basi_lama" in p.states, false);
    assert.equal(Object.keys(p.states).length, KNOWN_THESIS_IDS.length);
  });
  it("v1 tak-objek → semua belum", () => {
    const v2 = migrateV1ToV2(null);
    assert.equal(v2.projects[0].states["cover"]?.status, "belum");
  });
});

describe("progress proyek", () => {
  it("selesai/total dikenal saja", () => {
    const { selesai, total, pct } = hitungProgressProyek(proyekCampur());
    assert.equal(total, 17);
    assert.equal(selesai, 1);
    assert.equal(pct, Math.round((1 / 17) * 100));
  });
});

describe("guard rusak", () => {
  it("null/string/version salah → null", () => {
    assert.equal(parseThesisV2(null), null);
    assert.equal(parseThesisV2("rusak"), null);
    assert.equal(parseThesisV2({ version: 1, projects: [] }), null);
    assert.equal(parseThesisV2({ version: 2, projects: [{ id: 1 }] }), null);
  });
  it("status tak dikenal → null", () => {
    assert.equal(
      parseThesisV2({
        version: 2,
        projects: [
          {
            id: "p",
            name: "X",
            docType: "skripsi",
            states: { cover: { status: "done" } },
            revisionLinks: {},
            createdAt: "2026-10-09T00:00:00.000Z",
          },
        ],
      }),
      null,
    );
  });
  it("v2 valid lolos + tag revisi", () => {
    const v2 = migrateV1ToV2({ cover: true });
    assert.ok(parseThesisV2(JSON.parse(JSON.stringify(v2))));
    assert.equal(revisionTag("p1", "bab1"), "revisi:p1:bab1");
  });
});

describe("resolveRevisionLink (tautan basi)", () => {
  const tasks = [{ id: "t1" }, { id: "t2" }];
  it("tugas masih ada → kembalikan id", () => {
    assert.equal(resolveRevisionLink("t1", tasks), "t1");
  });
  it("tugas dihapus manual → null", () => {
    assert.equal(resolveRevisionLink("hilang", tasks), null);
  });
  it("undefined/kosong/daftar kosong → null", () => {
    assert.equal(resolveRevisionLink(undefined, tasks), null);
    assert.equal(resolveRevisionLink("", tasks), null);
    assert.equal(resolveRevisionLink("t1", []), null);
  });
});

describe("laporan .md", () => {
  it("memuat proyek, progress, daftar perlu/belum + note", () => {
    const md = buildLaporanMarkdown(
      proyekCampur(),
      [
        { id: "cover", label: "Cover", group: "Bab" },
        { id: "bab1", label: "Bab 1", group: "Bab" },
      ],
      "2026-10-09",
    );
    assert.ok(md.includes("Skripsi Saya"));
    assert.ok(md.includes("skripsi"));
    assert.ok(md.includes("2026-10-09"));
    assert.ok(md.includes("Perlu direvisi"));
    assert.ok(md.includes("Perbaiki latar"));
  });
});

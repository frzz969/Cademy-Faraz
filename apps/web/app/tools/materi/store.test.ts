import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  freshStore,
  freshWorkspace,
  parseStore,
  isWorkspacesStore,
  searchWorkspaces,
  workspaceProgress,
  migrateLegacyProgress,
  makeBackup,
  parseBackup,
  isValidHttpUrl,
  type WorkspacesStore,
} from "./store";

describe("materi workspaces store", () => {
  it("freshStore kosong dan valid", () => {
    const s = freshStore();
    assert.equal(isWorkspacesStore(s), true);
    assert.deepEqual(s.workspaces, []);
    assert.equal(s.lastId, null);
  });

  it("parseStore: bentuk salah → tidak ok, tidak crash", () => {
    assert.equal(parseStore(null).ok, false);
    assert.equal(parseStore([]).ok, false);
    assert.equal(parseStore({ version: 2, workspaces: [] }).ok, false);
    assert.equal(parseStore({ version: 1, workspaces: "rusak" }).ok, false);
    assert.equal(isWorkspacesStore({ version: 1, workspaces: [], lastId: 123 }), false);
  });

  it("parseStore: entri rusak dibuang, entri bagus lolos", () => {
    const ws = freshWorkspace("Basis Data");
    const r = parseStore({
      version: 1,
      workspaces: [ws, { matkul: "" }, null, "rusak"],
      lastId: ws.id,
    });
    assert.equal(r.ok, true);
    assert.equal(r.store.workspaces.length, 1);
    assert.equal(r.dropped, 3);
  });

  it("parseStore: topik tanpa judul dibuang", () => {
    const ws = freshWorkspace("Jaringan");
    (ws.topik as unknown[]).push(
      { id: "a", title: "TCP/IP", status: "mulai", objective: "", createdAt: "", updatedAt: "" },
      { id: "b", title: "   ", status: "belum" },
      { id: "c", title: "DNS", status: "ngawur" },
    );
    const r = parseStore({ version: 1, workspaces: [ws], lastId: null });
    assert.equal(r.ok, true);
    assert.equal(r.store.workspaces[0].topik.length, 2);
    assert.equal(r.store.workspaces[0].topik[1].status, "belum");
  });

  it("searchWorkspaces: matkul/topik/catatan/sumber/tugas", () => {
    const ws = freshWorkspace("Sistem Operasi");
    ws.catatan = "catatan tentang deadlock";
    ws.topik = [{ id: "t1", title: "Manajemen Memori", status: "belum", objective: "", createdAt: "", updatedAt: "" }];
    ws.sumber = [{ id: "s1", label: "Slide dosen", url: "https://kampus.ac.id/slide.pdf" }];
    ws.tugas = [{ id: "g1", title: "Laporan praktikum", deadline: "", done: false, createdAt: "" }];
    const s: WorkspacesStore = { ...freshStore(), workspaces: [ws] };
    assert.equal(searchWorkspaces(s, "operasi").length, 1);
    assert.equal(searchWorkspaces(s, "memori").length, 1);
    assert.equal(searchWorkspaces(s, "deadlock").length, 1);
    assert.equal(searchWorkspaces(s, "kampus.ac.id").length, 1);
    assert.equal(searchWorkspaces(s, "laporan").length, 1);
    assert.equal(searchWorkspaces(s, "tidak-ada-xyz").length, 0);
    assert.equal(searchWorkspaces(s, "  ").length, 1);
  });

  it("workspaceProgress: dari aktivitas nyata, kosong = 0%", () => {
    const kosong = freshWorkspace("Alpro");
    assert.equal(workspaceProgress(kosong).pct, 0);
    kosong.topik = [
      { id: "a", title: "A", status: "selesai", objective: "", createdAt: "", updatedAt: "" },
      { id: "b", title: "B", status: "mulai", objective: "", createdAt: "", updatedAt: "" },
    ];
    kosong.tugas = [{ id: "g", title: "T", deadline: "", done: true, createdAt: "" }];
    const p = workspaceProgress(kosong);
    assert.equal(p.topikSelesai, 1);
    assert.equal(p.pct, 67);
  });

  it("migrateLegacyProgress: kosong → null; isi → satu arsip", () => {
    assert.equal(migrateLegacyProgress({}), null);
    assert.equal(migrateLegacyProgress({ "modul-07": { tasks: [false, false, false], done: false, comments: [], catatan: "" } }), null);
    const ws = migrateLegacyProgress({
      "modul-07": { tasks: [true, false, false], done: false, comments: [{ nama: "Budi", pesan: "Halo" }], catatan: "catatanku" },
      "modul-09": { tasks: [false, false, false], done: true, comments: [], catatan: "" },
    });
    assert.ok(ws);
    assert.equal(ws!.topik.length, 2);
    assert.match(ws!.matkul, /migrasi otomatis/);
    assert.match(ws!.catatan, /catatanku/);
  });

  it("backup: bundel valid lolos, rusak ditolak", () => {
    const s = freshStore();
    s.workspaces = [freshWorkspace("Kalkulus")];
    const b = makeBackup(s);
    assert.equal(parseBackup(b).ok, true);
    assert.equal(parseBackup(null).ok, false);
    assert.equal(parseBackup({ ...b, app: "salah" }).ok, false);
    assert.equal(parseBackup({ ...b, version: 9 }).ok, false);
    assert.equal(parseBackup({ ...b, store: { rusak: true } }).ok, false);
  });

  it("isValidHttpUrl: hanya http/https", () => {
    assert.equal(isValidHttpUrl("https://example.com/a.pdf"), true);
    assert.equal(isValidHttpUrl("http://kampus.ac.id"), true);
    assert.equal(isValidHttpUrl("javascript:alert(1)"), false);
    assert.equal(isValidHttpUrl("bukan url"), false);
    assert.equal(isValidHttpUrl(""), false);
  });
});

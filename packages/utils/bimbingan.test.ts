import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  emptyBimbinganStore,
  parseBimbinganStore,
  makeBimbingan,
  addBimbingan,
  setStatusBimbingan,
  setTaskBimbingan,
  bimbinganPerProject,
  hitungBimbingan,
  orphanBimbingan,
  bimbinganTag,
  bimbinganTaskInput,
  resolveTaskLink,
  todayLocal,
  BIMBINGAN_KEY,
  type BimbinganStore,
} from "./bimbingan";

describe("bimbingan — kontrak log", () => {
  it("makeBimbingan: default aman (tanggal hari ini, status terbuka, trim)", () => {
    const b = makeBimbingan({ masukan: "  revisi bab 2  ", tindakLanjut: " lengkapi tabel  " });
    assert.equal(b.status, "terbuka");
    assert.equal(b.tanggal, todayLocal());
    assert.equal(b.masukan, "revisi bab 2");
    assert.equal(b.tindakLanjut, "lengkapi tabel");
    assert.ok(b.id);
    assert.ok(b.createdAt);
  });

  it("parse toleran: rusak/versi salah → default; entri rusak dilewati", () => {
    assert.deepEqual(parseBimbinganStore(null).byProject, {});
    assert.deepEqual(parseBimbinganStore("x").byProject, {});
    assert.deepEqual(parseBimbinganStore({ version: 2 }).byProject, {});
    const parsed = parseBimbinganStore({
      version: 1,
      byProject: {
        p1: [
          { id: "b1", tanggal: "2026-10-09", masukan: "m", tindakLanjut: "t", status: "terbuka" },
          { id: "rusak" },
          "bukan-objek",
        ],
      },
    });
    assert.equal(parsed.byProject["p1"].length, 1);
    assert.equal(parsed.byProject["p1"][0].id, "b1");
  });

  it("orphan DITANDAI, tidak diprune walau projectId tak dikenal", () => {
    const s = emptyBimbinganStore();
    addBimbingan(s, "proyek-hilang", makeBimbingan({ masukan: "m", tindakLanjut: "t" }));
    const parsed = parseBimbinganStore(JSON.parse(JSON.stringify(s)));
    assert.deepEqual(orphanBimbingan(parsed, ["p1"]), ["proyek-hilang"]);
    assert.equal(parsed.byProject["proyek-hilang"].length, 1);
  });

  it("status transisi + id tak dikenal = no-op", () => {
    const s = emptyBimbinganStore();
    const b = makeBimbingan({ id: "b1", masukan: "m", tindakLanjut: "t" });
    addBimbingan(s, "p1", b);
    setStatusBimbingan(s, "p1", "b1", "selesai");
    assert.equal(s.byProject["p1"][0].status, "selesai");
    setStatusBimbingan(s, "p1", "tak-ada", "selesai");
    assert.equal(s.byProject["p1"].length, 1);
  });

  it("setTaskBimbingan: set + hapus tautan TIDAK menghapus log", () => {
    const s = emptyBimbinganStore();
    const b = makeBimbingan({ id: "b1", masukan: "m", tindakLanjut: "t" });
    addBimbingan(s, "p1", b);
    setTaskBimbingan(s, "p1", "b1", "task-9");
    assert.equal(s.byProject["p1"][0].taskId, "task-9");
    setTaskBimbingan(s, "p1", "b1", undefined);
    assert.equal(s.byProject["p1"][0].taskId, undefined);
    // Log tetap ada (revisi E: tugas gagal/dihapus ≠ log hilang)
    assert.equal(s.byProject["p1"].length, 1);
    assert.equal(s.byProject["p1"][0].masukan, "m");
  });
});

describe("bimbingan — bridge tugas (revisi E)", () => {
  const b = makeBimbingan({
    id: "log-1",
    tanggal: "2026-10-09",
    masukan: "perbaiki metodologi",
    tindakLanjut: "tulis ulang bab 3",
    deadline: "2026-10-20",
  });

  it("tag STABIL & memakai projectId (bukan nama)", () => {
    assert.equal(bimbinganTag("p1", "log-1"), "bimbingan:p1:log-1");
    assert.equal(bimbinganTag("p1", "log-1"), bimbinganTag("p1", "log-1"));
    assert.notEqual(bimbinganTag("p1", "log-1"), bimbinganTag("p2", "log-1"));
    // Regresi: dulu tag bisa jadi "bimbingan::log-1" (projectId kosong).
    assert.doesNotMatch(bimbinganTag("p1", "log-1"), /bimbingan::/);
  });

  it("bimbinganTaskInput: judul/deskripsi/tenggat + tag pakai projectId", () => {
    const input = bimbinganTaskInput(b, "p1", "Skripsi Sistem Informasi", "Bab 3 — Metode");
    assert.equal(input.tag, "bimbingan:p1:log-1");
    assert.equal(input.title, "Bimbingan: tulis ulang bab 3");
    assert.equal(input.dueDate, "2026-10-20");
    assert.match(input.description, /Tindak lanjut bimbingan \(2026-10-09\)/);
    assert.match(input.description, /proyek Skripsi Sistem Informasi/);
    assert.match(input.description, /Bab: Bab 3 — Metode/);
    assert.match(input.description, /Masukan: perbaiki metodologi/);
  });

  it("bimbinganTaskInput tanpa bab/masukan tetap aman (tanpa undefined)", () => {
    const kosong = makeBimbingan({ id: "l2", masukan: "", tindakLanjut: "cek daftar pustaka" });
    const input = bimbinganTaskInput(kosong, "p1", "Proyek");
    assert.doesNotMatch(input.description, /undefined/);
    assert.match(input.description, /proyek Proyek/);
    assert.equal(input.dueDate, "");
  });

  it("resolveTaskLink: valid → id; basi → null; log tetap utuh", () => {
    const tasks = [{ id: "task-9" }];
    assert.equal(resolveTaskLink("task-9", tasks), "task-9");
    assert.equal(resolveTaskLink("task-hilang", tasks), null);
    assert.equal(resolveTaskLink(undefined, tasks), null);
    // Simulasi: tugas dihapus manual → link basi, log JANGAN hilang.
    const s = emptyBimbinganStore();
    addBimbingan(s, "p1", { ...b, taskId: "task-hilang" });
    const log = bimbinganPerProject(s, "p1")[0];
    assert.equal(resolveTaskLink(log.taskId, []), null);
    assert.equal(log.tindakLanjut, "tulis ulang bab 3");
  });
});

describe("bimbingan — hitungan & round-trip", () => {
  it("hitungBimbingan: terbuka vs selesai", () => {
    const s = emptyBimbinganStore();
    addBimbingan(s, "p1", makeBimbingan({ masukan: "a", tindakLanjut: "x" }));
    addBimbingan(s, "p1", makeBimbingan({ masukan: "b", tindakLanjut: "y" }));
    setStatusBimbingan(s, "p1", s.byProject["p1"][1].id, "selesai");
    assert.deepEqual(hitungBimbingan(bimbinganPerProject(s, "p1")), {
      total: 2,
      terbuka: 1,
      selesai: 1,
    });
  });

  it("round-trip JSON mempertahankan seluruh field", () => {
    const s: BimbinganStore = emptyBimbinganStore();
    addBimbingan(s, "p1", {
      ...makeBimbingan({
        id: "b1",
        tanggal: "2026-10-09",
        masukan: "m",
        tindakLanjut: "t",
        sectionId: "bab2",
        deadline: "2026-10-20",
      }),
      taskId: "task-9",
    });
    const parsed = parseBimbinganStore(JSON.parse(JSON.stringify(s)));
    assert.deepEqual(parsed.byProject["p1"][0], {
      id: "b1",
      tanggal: "2026-10-09",
      masukan: "m",
      tindakLanjut: "t",
      sectionId: "bab2",
      deadline: "2026-10-20",
      status: "terbuka",
      taskId: "task-9",
      createdAt: parsed.byProject["p1"][0].createdAt,
    });
  });

  it("key lokal konsisten", () => {
    assert.equal(BIMBINGAN_KEY, "cademy:bimbingan-v1");
  });
});

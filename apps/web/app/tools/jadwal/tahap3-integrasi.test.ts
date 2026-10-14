import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  arsipkanTugas,
  bacaCadangan,
  buatCadangan,
  bySource,
  createTask,
  gabungCadangan,
  hapusSubtask,
  hitungProgres,
  loadTasks,
  normalizeTask,
  pulihkanTugas,
  removeTask,
  saveTasks,
  setTaskStatus,
  tambahSubtask,
  taskProgress,
  toggleSubtask,
  tugasAktif,
  tugasArsip,
  updateTask,
  pushRiwayat,
  undoTask,
  bisaUndo,
  labelUndo,
  type SharedTask,
} from "../../../components/task-store";
import { adaContoh, bagiTampilJadwal, hapusContoh, pilihTugasAwal, semuaTampil, susunSimpanJadwal, tugasContoh } from "./view";
import {
  bersihkanCatatanFase,
  normalisasiRevisi,
  perluSeedRoadmap,
  susunRoadmap,
  TEMPLATE_ROADMAP,
  terapkanTemplate,
  type Phase,
} from "../flowchart-skripsi/view";

// Tahap 3 — Verifikasi Integrasi & Keamanan Data (skenario 5, 9, 10, 11, 12).
// S1–S4 sudah dicakup roadmap-ownership.test.ts; S6–S8 di dates.test.ts.
// localStorage tidak ada di node: stub minimal seperti file kontrak lain.
const bak = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: (k: string) => (bak.has(k) ? (bak.get(k) as string) : null),
  setItem: (k: string, v: string) => {
    bak.set(k, String(v));
  },
  removeItem: (k: string) => {
    bak.delete(k);
  },
};

beforeEach(() => {
  bak.clear();
});

function tugas(
  overrides: Partial<SharedTask> & { id: string; source: SharedTask["source"] }
): SharedTask {
  return {
    status: "todo",
    prioritas: "sedang",
    title: "Contoh",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("S5 planner lintas-sumber tersinkron balik (satu sumber data)", () => {
  const seed = (): SharedTask[] => [
    tugas({ id: "roadmap:p1:s1", source: "roadmap", title: "Langkah 1" }),
    tugas({ id: "j1", source: "jadwal", title: "Tugas jadwal" }),
    tugas({ id: "m1", source: "materi", title: "Modul 1" }),
    tugas({ id: "p9", source: "planner", title: "Rencana pekan", notes: "catatan" }),
  ];
  // Cermin filter muatLintas di study-planner/view.tsx (fungsi dalam, tak diekspor).
  const lintasDari = (all: SharedTask[]) =>
    all.filter(
      (t) => t.source === "jadwal" || t.source === "roadmap" || t.source === "materi"
    );

  it("lintas memuat jadwal+roadmap+materi, mengecualikan planner", () => {
    saveTasks(seed());
    const lintas = lintasDari(loadTasks());
    assert.equal(lintas.length, 3);
    assert.ok(lintas.every((t) => t.source !== "planner"));
  });

  it("geser status lintas mempertahankan source & terbaca di jadwal", () => {
    saveTasks(seed());
    saveTasks(setTaskStatus(loadTasks(), "roadmap:p1:s1", "done"));
    const sesudah = loadTasks();
    assert.equal(sesudah.find((t) => t.id === "roadmap:p1:s1")?.source, "roadmap");
    const tampil = semuaTampil(bagiTampilJadwal(sesudah));
    assert.equal(tampil.find((t) => t.id === "roadmap:p1:s1")?.status, "done");
  });

  it("edit judul/deadline/catatan lintas mempertahankan source", () => {
    saveTasks(seed());
    saveTasks(
      updateTask(loadTasks(), "m1", {
        title: "Modul 1 revisi",
        dueDate: "2026-11-05",
        notes: "catatan materi",
        prioritas: "tinggi",
      })
    );
    const m = loadTasks().find((t) => t.id === "m1");
    assert.equal(m?.source, "materi");
    assert.equal(m?.title, "Modul 1 revisi");
    assert.equal(m?.dueDate, "2026-11-05");
    assert.equal(m?.notes, "catatan materi");
    assert.equal(m?.prioritas, "tinggi");
  });

  it("hapus lintas hanya menghapus target, planner utuh", () => {
    saveTasks(seed());
    saveTasks(removeTask(loadTasks(), "j1"));
    const sesudah = loadTasks();
    assert.equal(sesudah.find((t) => t.id === "j1"), undefined);
    assert.equal(sesudah.find((t) => t.id === "p9")?.notes, "catatan");
  });
});

describe("S9 backup ekspor/impor (validasi + data lama aman)", () => {
  it("round-trip buat → baca lolos dengan magic + versi", () => {
    const semua = [tugas({ id: "j1", source: "jadwal", title: "A" })];
    const json = JSON.stringify(buatCadangan(semua));
    const hasil = bacaCadangan(json);
    assert.equal(hasil.ok, true);
    if (hasil.ok) assert.equal(hasil.total, 1);
  });

  it("menolak: bukan JSON, bukan cadangan cademy, versi lebih baru", () => {
    assert.equal(bacaCadangan("bukan json {{{").ok, false);
    assert.equal(bacaCadangan(JSON.stringify({ hello: 1 })).ok, false);
    assert.equal(
      bacaCadangan(
        JSON.stringify({ app: "cademy-tasks-backup", version: 99, tasks: [] })
      ).ok,
      false
    );
  });

  it("menolak cadangan tanpa tugas valid (data rusak tidak masuk)", () => {
    const hasil = bacaCadangan(
      JSON.stringify({ app: "cademy-tasks-backup", version: 1, tasks: [{ foo: 1 }] })
    );
    assert.equal(hasil.ok, false);
  });

  it("gabung: dedupe by ID, createdAt baru menang, lama aman", () => {
    const lama = tugas({
      id: "j1",
      source: "jadwal",
      title: "Lama",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const baru = tugas({
      id: "j1",
      source: "jadwal",
      title: "Baru",
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    const tambahan = tugas({
      id: "j2",
      source: "jadwal",
      title: "Tambahan",
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    const gabung = gabungCadangan([lama], [baru, tambahan], "gabung");
    assert.equal(gabung.length, 2);
    assert.equal(gabung.find((t) => t.id === "j1")?.title, "Baru");
    const ganti = gabungCadangan([lama], [tambahan], "ganti");
    assert.equal(ganti.length, 1);
    assert.equal(ganti[0].id, "j2");
  });
});

describe("S10 data rusak & migrasi aman (tanpa crash)", () => {
  it("normalizeTask: non-objek/judul kosong ditolak; field salah jadi default", () => {
    assert.equal(normalizeTask(null), null);
    assert.equal(normalizeTask({ title: "   " }), null);
    const t = normalizeTask({ title: " X ", source: "asing", status: "rusak" });
    assert.equal(t?.title, "X");
    assert.equal(t?.source, "pribadi");
    assert.equal(t?.status, "todo");
    assert.equal(t?.prioritas, "sedang");
  });

  it("loadTasks: total rusak → daftar kosong, bukan error", () => {
    bak.set("cademy:tasks-v1", "{rusak");
    assert.deepEqual(loadTasks(), []);
    bak.set("cademy:tasks-v1", JSON.stringify({ bukan: "array" }));
    assert.deepEqual(loadTasks(), []);
  });

  it("loadTasks: record rusak dibuang per-record, yang bagus lolos", () => {
    bak.set(
      "cademy:tasks-v1",
      JSON.stringify([
        { id: "ok1", source: "jadwal", title: "Bagus", status: "todo", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "bad1", source: "jadwal", title: "", status: "todo" },
        { id: "ok1", source: "jadwal", title: "Duplikat", status: "todo", createdAt: "2026-01-01T00:00:00.000Z" },
      ])
    );
    const semua = loadTasks();
    assert.equal(semua.length, 1);
    assert.equal(semua[0].title, "Bagus");
  });

  it("migrasi legacy planner+jadwal jalan, key lama tidak dihapus", () => {
    bak.set(
      "cademy:planner",
      JSON.stringify([
        { id: "lp1", nama: "Tugas lama", deskripsi: "d", kolom: "doing" },
        { id: "lp2", nama: "Selesai lama", selesai: true },
      ])
    );
    bak.set("cademy:jadwal-tugas", JSON.stringify([{ id: "lj1", judul: "Jadwal lama" }]));
    const semua = loadTasks();
    assert.ok(semua.some((t) => t.id === "lp1" && t.source === "planner" && t.status === "doing"));
    assert.ok(semua.some((t) => t.id === "lp2" && t.source === "planner" && t.status === "done"));
    assert.ok(semua.some((t) => t.id === "lj1" && t.source === "jadwal"));
    assert.ok(bak.has("cademy:planner"));
    assert.ok(bak.has("cademy:jadwal-tugas"));
  });
});

describe("S11 subtugas & progres konsisten", () => {
  it("taskProgress: subtugas menang atas status; tanpa subtugas ikut status", () => {
    const dgn = tugas({
      id: "a",
      source: "jadwal",
      status: "todo",
      subtasks: [
        { id: "s1", title: "satu", done: true },
        { id: "s2", title: "dua", done: false },
      ],
    });
    assert.equal(taskProgress(dgn), 50);
    assert.equal(taskProgress(tugas({ id: "b", source: "jadwal", status: "todo" })), 0);
    assert.equal(taskProgress(tugas({ id: "c", source: "jadwal", status: "doing" })), 50);
    assert.equal(
      taskProgress(tugas({ id: "d", source: "jadwal", status: "doing", progres: 75 })),
      75
    );
    assert.equal(taskProgress(tugas({ id: "e", source: "jadwal", status: "done" })), 100);
  });

  it("hitungProgres aman saat 0 tugas; arsip tidak dihitung", () => {
    assert.deepEqual(hitungProgres([]), { selesai: 0, total: 0, pct: 0 });
    const semua = [
      tugas({ id: "a", source: "jadwal", status: "done" }),
      tugas({ id: "b", source: "jadwal", status: "todo", arsip: true }),
      tugas({ id: "c", source: "jadwal", status: "todo" }),
    ];
    assert.deepEqual(hitungProgres(semua), { selesai: 1, total: 2, pct: 50 });
  });

  it("tambah/toggle/hapus subtugas; judul kosong no-op", () => {
    let semua = [tugas({ id: "a", source: "jadwal" })];
    const n0 = semua.length;
    semua = tambahSubtask(semua, "a", "   ");
    assert.equal(semua[0].subtasks?.length ?? 0, 0);
    semua = tambahSubtask(semua, "a", "Belajar");
    assert.equal(semua.length, n0);
    const subId = semua[0].subtasks?.[0].id as string;
    semua = toggleSubtask(semua, "a", subId);
    assert.equal(semua[0].subtasks?.[0].done, true);
    assert.equal(taskProgress(semua[0]), 100);
    semua = hapusSubtask(semua, "a", subId);
    assert.equal(semua[0].subtasks?.length ?? 0, 0);
  });
});

describe("S12 CRUD + arsip + undo", () => {
  it("createTask: ID stabil berprefiks sumber, judul dirapikan", () => {
    const a = createTask({ source: "roadmap", title: "  Langkah  " });
    assert.ok(a.id.startsWith("roadmap-"));
    assert.equal(a.title, "Langkah");
    const b = createTask({ source: "jadwal", title: "T", status: "done" });
    assert.ok(b.completedAt);
  });

  it("updateTask menambal tanpa ganti id; removeTask hanya target", () => {
    const semua = [
      tugas({ id: "a", source: "jadwal", title: "A" }),
      tugas({ id: "b", source: "jadwal", title: "B" }),
    ];
    const ubah = updateTask(semua, "a", { title: "A2", id: "coba-ganti" });
    assert.equal(ubah.find((t) => t.id === "a")?.title, "A2");
    assert.equal(ubah.find((t) => t.id === "coba-ganti"), undefined);
    assert.equal(removeTask(semua, "a").length, 1);
  });

  it("setTaskStatus mengatur progres + completedAt konsisten", () => {
    const semua = [tugas({ id: "a", source: "jadwal", status: "todo" })];
    const done = setTaskStatus(semua, "a", "done");
    assert.equal(done[0].progres, 100);
    assert.ok(done[0].completedAt);
    const kembali = setTaskStatus(done, "a", "todo");
    assert.equal(kembali[0].progres, 0);
    assert.equal(kembali[0].completedAt, undefined);
  });

  it("arsip menyembunyikan tanpa hapus", () => {
    const semua = [tugas({ id: "a", source: "jadwal" })];
    const arsip = arsipkanTugas(semua, "a");
    assert.equal(arsip[0].arsip, true);
    assert.equal(tugasAktif(arsip).length, 0);
    saveTasks(arsip);
    assert.equal(loadTasks().length, 1);
  });

  it("undo mengembalikan snapshot + label", () => {
    const sebelum = [tugas({ id: "a", source: "jadwal", title: "Awal" })];
    saveTasks(sebelum);
    pushRiwayat("edit tugas", loadTasks());
    assert.equal(bisaUndo(), true);
    assert.equal(labelUndo(), "edit tugas");
    saveTasks(updateTask(loadTasks(), "a", { title: "Berubah" }));
    const kembali = undoTask();
    assert.ok(kembali);
    assert.equal(kembali?.find((t) => t.id === "a")?.title, "Awal");
  });

  it("bySource memisahkan slice per sumber", () => {
    const semua = [
      tugas({ id: "a", source: "roadmap" }),
      tugas({ id: "b", source: "jadwal" }),
      tugas({ id: "c", source: "planner" }),
    ];
    assert.equal(bySource(semua, "roadmap").length, 1);
    assert.equal(bySource(semua, "planner").length, 1);
  });
});

// ── TAHAP 1 — Audit integritas data & sinkronisasi ──────────────────────────

describe("T1 loadTasks bedakan belum-ada vs rusak (jangan timpa saat gagal)", () => {
  it("key belum ada → migrasi legacy + ditulis ke store", () => {
    bak.set(
      "cademy:planner",
      JSON.stringify([{ id: "lp1", nama: "Warisan", kolom: "doing" }])
    );
    const semua = loadTasks();
    assert.ok(semua.some((t) => t.id === "lp1" && t.source === "planner"));
    assert.ok(bak.has("cademy:tasks-v1"));
  });

  it("REGRESI: JSON rusak → daftar kosong TANPA menimpa isi lama", () => {
    bak.set("cademy:tasks-v1", "{rusak");
    assert.deepEqual(loadTasks(), []);
    assert.equal(bak.get("cademy:tasks-v1"), "{rusak");
  });

  it("REGRESI: isi valid tapi bukan array → kosong tanpa menimpa", () => {
    bak.set("cademy:tasks-v1", JSON.stringify({ bukan: "array" }));
    assert.deepEqual(loadTasks(), []);
    assert.equal(bak.get("cademy:tasks-v1"), JSON.stringify({ bukan: "array" }));
  });

  it("REGRESI: legacy tanpa judul dilewati, bukan null di daftar", () => {
    bak.set("cademy:planner", JSON.stringify([{ id: "nol", nama: "" }]));
    const semua: unknown[] = loadTasks();
    assert.ok(semua.every((t) => typeof t === "object" && t !== null));
    assert.deepEqual(semua, []);
  });
});

describe("T2 susunSimpanJadwal mempertahankan arsip + completedAt", () => {
  it("REGRESI: arsip & stempel selesai slice jadwal tidak dibuang", () => {
    const seed = [
      tugas({
        id: "j1",
        source: "jadwal",
        status: "done",
        completedAt: "2026-05-01T00:00:00.000Z",
        arsip: true,
      }),
    ];
    const { jadwalSlice } = susunSimpanJadwal(
      seed,
      semuaTampil(bagiTampilJadwal(seed))
    );
    assert.equal(jadwalSlice.length, 1);
    assert.equal(jadwalSlice[0].arsip, true);
    assert.equal(jadwalSlice[0].completedAt, "2026-05-01T00:00:00.000Z");
  });

  it("tugas biasa tetap tanpa arsip/completedAt (tak dikarang)", () => {
    const seed = [tugas({ id: "j1", source: "jadwal", status: "todo" })];
    const { jadwalSlice } = susunSimpanJadwal(
      seed,
      semuaTampil(bagiTampilJadwal(seed))
    );
    assert.equal(jadwalSlice[0].arsip, undefined);
    assert.equal(jadwalSlice[0].completedAt, undefined);
  });
});

describe("T3 susunRoadmap menulis phaseTitle (tak lagi yatim)", () => {
  const FASE: Phase[] = [
    {
      id: "p1",
      no: "01",
      title: "Fase Uji",
      desc: "d",
      steps: [{ id: "s1", label: "Langkah 1", sub: "sub 1" }],
    },
  ];

  it("REGRESI: phaseTitle terisi nama fase + kartu jadwal berlabel fase", () => {
    const hasil = susunRoadmap(FASE, {}, []);
    assert.equal(hasil[0].phaseTitle, "Fase Uji");
    saveTasks(hasil);
    const kartu = bagiTampilJadwal(loadTasks()).roadmap[0];
    assert.equal(kartu.tag, "Fase Uji");
  });
});

describe("T5/T6 papan bersih default (tanpa seed otomatis)", () => {
  it("pilihTugasAwal: tampil apa adanya, kosong tetap kosong", () => {
    const seed = [tugas({ id: "j1", source: "jadwal" })];
    const tampil = semuaTampil(bagiTampilJadwal(seed));
    assert.equal(pilihTugasAwal(tampil).length, 1);
    assert.deepEqual(pilihTugasAwal([]), []);
  });

  it("tugasContoh: 6 kartu berflag demo, ID awalan contoh-, salinan baru", () => {
    const a = tugasContoh();
    const b = tugasContoh();
    assert.equal(a.length, 6);
    assert.ok(a.every((t) => t.demo === true && t.id.startsWith("contoh-")));
    assert.ok(a.every((t) => t.sumber === "jadwal"));
    assert.notEqual(a[0], b[0]);
  });

  it("hapusContoh hanya buang demo; adaContoh jujur", () => {
    const campur = [...tugasContoh(), ...semuaTampil(bagiTampilJadwal([tugas({ id: "milikku", source: "jadwal" })]))];
    assert.equal(adaContoh(campur), true);
    const sisa = hapusContoh(campur);
    assert.deepEqual(sisa.map((t) => t.id), ["milikku"]);
    assert.equal(adaContoh(sisa), false);
  });

  it("flag demo bertahan lewat simpan papan + save/load", () => {
    saveTasks([]);
    const tampil = [...tugasContoh()];
    const { keep, jadwalSlice, sinkronSlice } = susunSimpanJadwal([], tampil);
    saveTasks([...keep, ...jadwalSlice, ...sinkronSlice]);
    const sesudah = loadTasks();
    assert.equal(sesudah.length, 6);
    assert.ok(sesudah.every((t) => t.demo === true));
  });

  it("perluSeedRoadmap: hanya saat store belum pernah ada + slice kosong", () => {
    assert.equal(perluSeedRoadmap(false, 0), true);
    assert.equal(perluSeedRoadmap(true, 0), false);
    assert.equal(perluSeedRoadmap(false, 3), false);
    assert.equal(perluSeedRoadmap(true, 3), false);
  });
});

describe("Tahap 2A arsip nyata (daftar, pulihkan, hapus permanen)", () => {  it("tugasArsip hanya arsip; tugasAktif hanya non-arsip", () => {
    const semua = [
      tugas({ id: "a", source: "jadwal" }),
      tugas({ id: "b", source: "roadmap", arsip: true }),
    ];
    assert.deepEqual(tugasArsip(semua).map((t) => t.id), ["b"]);
    assert.deepEqual(tugasAktif(semua).map((t) => t.id), ["a"]);
  });

  it("arsipkan lalu pulihkan mengembalikan record yang sama (tanpa salinan)", () => {
    const semua = [tugas({ id: "a", source: "jadwal", title: "Tetap" })];
    const diarsip = arsipkanTugas(semua, "a");
    assert.equal(diarsip[0].arsip, true);
    assert.equal(tugasAktif(diarsip).length, 0);
    const pulih = pulihkanTugas(diarsip, "a");
    assert.equal(pulih[0].arsip, false);
    assert.equal(pulih[0].title, "Tetap");
    assert.equal(tugasAktif(pulih).length, 1);
  });

  it("arsip bertahan lewat save/load (tak dibuang normalisasi)", () => {
    saveTasks([tugas({ id: "a", source: "jadwal", arsip: true })]);
    const semua = loadTasks();
    assert.equal(tugasArsip(semua).length, 1);
    assert.equal(hitungProgres(semua).total, 0);
  });

  it("hapus permanen hanya target; arsip lain utuh", () => {
    const semua = [
      tugas({ id: "a", source: "jadwal", arsip: true }),
      tugas({ id: "b", source: "planner", arsip: true }),
    ];
    const sisa = removeTask(semua, "a");
    assert.deepEqual(tugasArsip(sisa).map((t) => t.id), ["b"]);
  });
});

describe("Tahap 3A template roadmap", () => {
  it("4 template tersedia: kosong, proposal, penelitian-sidang, revisi", () => {
    assert.deepEqual(
      TEMPLATE_ROADMAP.map((t) => t.id),
      ["kosong", "proposal", "penelitian-sidang", "revisi"]
    );
  });
  it("tak dikenal → null; kosong → []", () => {
    assert.equal(terapkanTemplate("tak-ada", () => "x"), null);
    assert.deepEqual(terapkanTemplate("kosong", () => "x"), []);
  });
  it("ID fase & langkah selalu baru, label sesuai template", () => {
    let n = 0;
    const buatId = () => `id${++n}`;
    const hasil = terapkanTemplate("proposal", buatId);
    assert.ok(hasil);
    assert.equal(hasil?.length, 2);
    assert.equal(hasil?.[0].title, "Persiapan Proposal");
    assert.equal(hasil?.[0].no, "01");
    const ids = hasil?.flatMap((p) => [p.id, ...p.steps.map((s) => s.id)]) ?? [];
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => !["judul", "bab13", "sempro"].includes(id)));
    // Terapan kedua tak menabrak yang pertama
    let m = 100;
    const kedua = terapkanTemplate("proposal", () => `id${++m}`);
    const ids2 = kedua?.flatMap((p) => [p.id, ...p.steps.map((s) => s.id)]) ?? [];
    assert.ok(ids2.every((id) => !ids.includes(id)));
  });
});

describe("Tahap 3C catatan fase + revisi", () => {
  it("bersihkanCatatanFase hanya string tak-kosong", () => {
    assert.deepEqual(
      bersihkanCatatanFase({ p1: "  ide  ", p2: "", p3: 42, p4: null }),
      { p1: "  ide  " }
    );
    assert.deepEqual(bersihkanCatatanFase(null), {});
    assert.deepEqual(bersihkanCatatanFase("rusak"), {});
  });

  it("normalisasiRevisi: valid lolos; status tak dikenal → belum; id dibuat", () => {
    const ok = normalisasiRevisi({
      id: "r1",
      judul: " Perkuat teori ",
      detail: "d",
      penguji: "P1",
      mulai: "2026-10-01",
      deadline: "2026-10-14",
      status: "proses",
    });
    assert.equal(ok?.judul, "Perkuat teori");
    assert.equal(ok?.status, "proses");
    const aneh = normalisasiRevisi({ judul: "X", status: "ngawur" });
    assert.equal(aneh?.status, "belum");
    assert.ok((aneh?.id ?? "").startsWith("rev-"));
    const lawas = normalisasiRevisi({ catatan: "Dulu", selesai: true });
    assert.equal(lawas?.judul, "Dulu");
    assert.equal(lawas?.status, "selesai");
    assert.equal(normalisasiRevisi(null), null);
    assert.equal(normalisasiRevisi("x"), null);
  });

  it("susunRoadmap mempertahankan arsip slice roadmap", () => {
    const FASE: Phase[] = [
      {
        id: "p1",
        no: "01",
        title: "Fase",
        desc: "d",
        steps: [{ id: "s1", label: "L1", sub: "" }],
      },
    ];
    const lama = tugas({
      id: "roadmap:p1:s1",
      source: "roadmap",
      status: "todo",
      roadmapStepId: "s1",
      arsip: true,
    });
    const hasil = susunRoadmap(FASE, {}, [lama]);
    assert.equal(hasil[0].arsip, true);
  });
});

describe("T2b aksi kartu menang atas store basi (arsip/demo/stempel)", () => {
  function kartu(id: string, patch: Record<string, unknown> = {}) {
    return {
      id,
      judul: "K",
      deskripsi: "",
      tag: "UMUM",
      prioritas: "sedang",
      status: "todo",
      deadline: "",
      progres: 0,
      catatan: 0,
      notes: "",
      subtasks: [],
      sumber: "jadwal",
      ...patch,
    } as unknown as Parameters<typeof susunSimpanJadwal>[1][number];
  }

  it("klik Arsipkan (kartu true, store belum) → tersimpan", () => {
    const store = [tugas({ id: "a", source: "jadwal" })];
    const { jadwalSlice } = susunSimpanJadwal(store, [kartu("a", { arsip: true })]);
    assert.equal(jadwalSlice[0]?.arsip, true);
  });

  it("klik Pulihkan (kartu false, store arsip) → bersih", () => {
    const store = [tugas({ id: "a", source: "jadwal", arsip: true })];
    const { jadwalSlice } = susunSimpanJadwal(store, [kartu("a", { arsip: false })]);
    assert.equal(jadwalSlice[0]?.arsip, undefined);
  });

  it("kartu demo baru (store belum berflag) → flag tersimpan", () => {
    const store = [tugas({ id: "contoh-x", source: "jadwal" })];
    const { jadwalSlice } = susunSimpanJadwal(store, [kartu("contoh-x", { demo: true })]);
    assert.equal(jadwalSlice[0]?.demo, true);
  });

  it("done tanpa stempel → distempel ISO; kembali todo → stempel hilang", () => {
    const store = [tugas({ id: "a", source: "jadwal", status: "todo" })];
    const jadi = susunSimpanJadwal(store, [kartu("a", { status: "done" })]).jadwalSlice[0];
    assert.match(jadi?.completedAt ?? "", /^\d{4}-\d{2}-\d{2}T/);
    const batal = susunSimpanJadwal(
      [tugas({ id: "b", source: "jadwal", status: "done", completedAt: "2026-01-01T00:00:00.000Z" })],
      [kartu("b", { status: "todo" })]
    ).jadwalSlice[0];
    assert.equal(batal?.completedAt, undefined);
  });

  it("sinkron roadmap: arsip dari kartu menang; false memulihkan", () => {
    const arsipkan = susunSimpanJadwal(
      [tugas({ id: "rm", source: "roadmap" })],
      [kartu("rm", { sumber: "roadmap", arsip: true })]
    ).sinkronSlice[0];
    assert.equal(arsipkan?.arsip, true);
    const pulih = susunSimpanJadwal(
      [tugas({ id: "rm", source: "roadmap", arsip: true })],
      [kartu("rm", { sumber: "roadmap", arsip: false })]
    ).sinkronSlice[0];
    assert.equal(pulih?.arsip, undefined);
  });
});

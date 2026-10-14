import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  asingBaru,
  bisaUndo,
  buatSeriBerulang,
  gabungCadangan,
  hapusSeri,
  kejadianSeri,
  kosongkanArsip,
  labelUndo,
  loadTasks,
  pushRiwayat,
  removeTask,
  saveTasks,
  setTaskStatus,
  undoTask,
  updateTask,
  MAKS_KEJADIAN_SERI,
  type SharedTask,
} from "../../../components/task-store";
import { tugasTerlambat } from "@cademy/utils";
import {
  bagiTampilJadwal,
  semuaTampil,
  susunSimpanJadwal,
} from "./view";

// Tahap 4+5 — tugas berulang, undo jujur, verifikasi akhir (round-trip,
// idempotensi migrasi). localStorage tidak ada di node: stub minimal.
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
  while (undoTask() !== null) {
    /* kosongkan riwayat antar tes */
  }
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

describe("Tahap 4A buat seri berulang", () => {
  it("harian 3 kejadian: tanggal berurutan, ID deterministik", () => {
    const hasil = buatSeriBerulang({
      source: "jadwal",
      title: "Minum obat",
      frekuensi: "harian",
      mulai: "2026-10-12",
      jumlah: 3,
    });
    assert.equal(hasil.ok, true);
    if (!hasil.ok) return;
    assert.equal(hasil.tugas.length, 3);
    assert.deepEqual(
      hasil.tugas.map((t) => t.dueDate),
      ["2026-10-12", "2026-10-13", "2026-10-14"]
    );
    const induk = hasil.tugas[0];
    assert.equal(induk.berulang?.indukId, induk.id);
    assert.equal(induk.berulang?.intervalHari, 1);
    assert.deepEqual(
      hasil.tugas.slice(1).map((t) => t.id),
      [`${induk.id}@2026-10-13`, `${induk.id}@2026-10-14`]
    );
    assert.ok(
      hasil.tugas.every((t) => t.berulang?.indukId === induk.id)
    );
  });

  it("mingguan melangkah 7 hari; interval kustom dipakai", () => {
    const mingguan = buatSeriBerulang({
      source: "jadwal",
      title: "Lari pagi",
      frekuensi: "mingguan",
      mulai: "2026-10-12",
      jumlah: 2,
    });
    assert.equal(mingguan.ok, true);
    if (!mingguan.ok) return;
    assert.equal(mingguan.tugas[1].dueDate, "2026-10-19");
    assert.equal(mingguan.tugas[1].berulang?.intervalHari, 7);
    const interval = buatSeriBerulang({
      source: "jadwal",
      title: "Ganti oli",
      frekuensi: "interval",
      intervalHari: 3,
      mulai: "2026-10-12",
      jumlah: 2,
    });
    assert.equal(interval.ok, true);
    if (!interval.ok) return;
    assert.equal(interval.tugas[1].dueDate, "2026-10-15");
  });

  it("validasi jujur: judul kosong, mulai tak valid, interval 0, jumlah dijepit", () => {
    assert.equal(
      buatSeriBerulang({ source: "jadwal", title: "  ", frekuensi: "harian", mulai: "2026-10-12" }).ok,
      false
    );
    const mulaiRusak = buatSeriBerulang({
      source: "jadwal",
      title: "X",
      frekuensi: "harian",
      mulai: "2026-02-30",
    });
    assert.equal(mulaiRusak.ok, false);
    if (mulaiRusak.ok) return;
    assert.match(mulaiRusak.galat, /tanggal mulai/i);
    const intervalNol = buatSeriBerulang({
      source: "jadwal",
      title: "X",
      frekuensi: "interval",
      intervalHari: 0,
      mulai: "2026-10-12",
    });
    assert.equal(intervalNol.ok, false);
    const raksasa = buatSeriBerulang({
      source: "jadwal",
      title: "X",
      frekuensi: "harian",
      mulai: "2026-10-12",
      jumlah: 100,
    });
    assert.equal(raksasa.ok, true);
    if (!raksasa.ok) return;
    assert.equal(raksasa.tugas.length, MAKS_KEJADIAN_SERI);
  });
});

describe("Tahap 4A anti-duplikat + satu ≠ semua", () => {
  it("simpan ulang / gabung ulang tak menggandakan (ID deterministik)", () => {
    const hasil = buatSeriBerulang({
      source: "jadwal",
      title: "Apel pagi",
      frekuensi: "harian",
      mulai: "2026-10-12",
      jumlah: 3,
    });
    assert.equal(hasil.ok, true);
    if (!hasil.ok) return;
    saveTasks(hasil.tugas);
    const sekali = loadTasks();
    saveTasks([...sekali, ...hasil.tugas]);
    assert.equal(loadTasks().length, 3);
    const gabung = gabungCadangan(sekali, hasil.tugas, "gabung");
    assert.equal(gabung.length, 3);
  });

  it("selesai/ubah 1 kejadian tak menyentuh lainnya", () => {
    const hasil = buatSeriBerulang({
      source: "jadwal",
      title: "Vitamin",
      frekuensi: "harian",
      mulai: "2026-10-12",
      jumlah: 3,
    });
    assert.equal(hasil.ok, true);
    if (!hasil.ok) return;
    const sesudah = setTaskStatus(hasil.tugas, hasil.tugas[1].id, "done");
    assert.equal(sesudah[1].status, "done");
    assert.equal(sesudah[0].status, "todo");
    assert.equal(sesudah[2].status, "todo");
    const ubah = updateTask(sesudah, hasil.tugas[2].id, { title: "Vitamin D" });
    assert.equal(ubah[0].title, "Vitamin");
  });

  it("kejadianSeri terurut tanggal; hapusSeri cabut 1 seri utuh", () => {
    const a = buatSeriBerulang({
      source: "jadwal",
      title: "A",
      frekuensi: "harian",
      mulai: "2026-10-12",
      jumlah: 2,
    });
    const b = buatSeriBerulang({
      source: "jadwal",
      title: "B",
      frekuensi: "harian",
      mulai: "2026-10-12",
      jumlah: 2,
    });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    const semua = [...a.tugas, ...b.tugas];
    const indukA = a.tugas[0].id;
    assert.deepEqual(
      kejadianSeri(semua, indukA).map((t) => t.dueDate),
      ["2026-10-12", "2026-10-13"]
    );
    const sisa = hapusSeri(semua, indukA);
    assert.equal(sisa.length, 2);
    assert.ok(sisa.every((t) => t.title === "B"));
    assert.equal(removeTask(semua, a.tugas[1].id).length, 3);
  });

  it("kejadian lewat tenggat terdeteksi terlambat", () => {
    const hasil = buatSeriBerulang({
      source: "jadwal",
      title: "Lampau",
      frekuensi: "harian",
      mulai: "2026-01-01",
      jumlah: 2,
    });
    assert.equal(hasil.ok, true);
    if (!hasil.ok) return;
    const kini = new Date(2026, 9, 11);
    assert.equal(tugasTerlambat(hasil.tugas[0].status, hasil.tugas[0].dueDate, kini), true);
  });

  it("berulang bertahan lewat save/load; pola rusak dibuang", () => {
    const hasil = buatSeriBerulang({
      source: "jadwal",
      title: "Tahan",
      frekuensi: "mingguan",
      mulai: "2026-10-12",
      jumlah: 2,
    });
    assert.equal(hasil.ok, true);
    if (!hasil.ok) return;
    saveTasks([
      ...hasil.tugas,
      { ...tugas({ id: "rusak", source: "jadwal" }), berulang: { frekuensi: "bulanan", intervalHari: 1, indukId: "x", tanggal: "2026-10-12" } } as unknown as SharedTask,
    ]);
    const semua = loadTasks();
    assert.equal(semua.find((t) => t.id === hasil.tugas[1].id)?.berulang?.frekuensi, "mingguan");
    assert.equal(semua.find((t) => t.id === "rusak")?.berulang, undefined);
  });
});

describe("Tahap 4B undo sesi-tab jujur", () => {
  it("urutan LIFO + label terakhir + kosong → null", () => {
    const a = [tugas({ id: "a", source: "jadwal" })];
    const b = [tugas({ id: "b", source: "jadwal" })];
    assert.equal(bisaUndo(), false);
    assert.equal(labelUndo(), null);
    assert.equal(undoTask(), null);
    pushRiwayat("tambah tugas", a);
    pushRiwayat("hapus tugas", b);
    assert.equal(bisaUndo(), true);
    assert.equal(labelUndo(), "hapus tugas");
    assert.deepEqual(undoTask()?.map((t) => t.id), ["b"]);
    assert.equal(labelUndo(), "tambah tugas");
    assert.deepEqual(undoTask()?.map((t) => t.id), ["a"]);
    assert.equal(bisaUndo(), false);
    assert.equal(undoTask(), null);
  });

  it("kosongkanArsip hanya arsip; aktif utuh", () => {
    const semua = [
      tugas({ id: "a", source: "jadwal", arsip: true }),
      tugas({ id: "b", source: "jadwal" }),
    ];
    const sisa = kosongkanArsip(semua);
    assert.deepEqual(sisa.map((t) => t.id), ["b"]);
  });
});

describe("Tahap 5D verifikasi akhir: refresh + migrasi idempoten", () => {
  it("save→load mempertahankan semua field (refresh)", () => {
    const hasil = buatSeriBerulang({
      source: "jadwal",
      title: "Segar",
      frekuensi: "harian",
      mulai: "2026-10-12",
      jumlah: 2,
    });
    assert.equal(hasil.ok, true);
    if (!hasil.ok) return;
    saveTasks([
      ...hasil.tugas,
      {
        ...tugas({ id: "sub", source: "roadmap", arsip: true }),
        subtasks: [{ id: "s1", title: "satu", done: true }],
        notes: "catatan",
      },
    ]);
    const sesudah = loadTasks();
    assert.equal(sesudah.length, 3);
    assert.equal(sesudah.find((t) => t.id === "sub")?.subtasks?.length, 1);
    assert.equal(sesudah.find((t) => t.id === "sub")?.arsip, true);
    assert.ok(sesudah.find((t) => t.berulang)?.berulang?.indukId);
  });

  it("migrasi legacy idempoten: load ganda hasil sama", () => {
    bak.set(
      "cademy:planner",
      JSON.stringify([{ id: "lp1", nama: "Warisan", kolom: "doing" }])
    );
    const pertama = loadTasks();
    const kedua = loadTasks();
    assert.deepEqual(kedua, pertama);
    assert.equal(pertama.filter((t) => t.id === "lp1").length, 1);
  });
});

describe("Tahap 4A seri lewat papan jadwal (tanpa salinan, tautan utuh)", () => {  it("keTugas membawa indukId + label; simpan papan tak melepas seri", () => {
    const hasil = buatSeriBerulang({
      source: "jadwal",
      title: "Pagi",
      frekuensi: "harian",
      mulai: "2026-10-12",
      jumlah: 2,
    });
    assert.equal(hasil.ok, true);
    if (!hasil.ok) return;
    saveTasks(hasil.tugas);
    const tampil = semuaTampil(bagiTampilJadwal(loadTasks()));
    const kartu = tampil.find((t) => t.id === hasil.tugas[1].id);
    assert.equal(kartu?.indukId, hasil.tugas[0].id);
    assert.equal(kartu?.berulangLabel, "Harian");
    const { keep, jadwalSlice, sinkronSlice } = susunSimpanJadwal(
      loadTasks(),
      tampil
    );
    saveTasks([...keep, ...jadwalSlice, ...sinkronSlice]);
    const sesudah = loadTasks();
    assert.equal(sesudah.length, 2);
    assert.equal(
      sesudah.find((t) => t.id === hasil.tugas[1].id)?.berulang?.indukId,
      hasil.tugas[0].id
    );
  });
});

describe("Tahap 5-P2 race lintas-tab (repro + mitigasi)", () => {
  function kartu(id: string, judul = "Kartu") {
    return tugas({ id, source: "jadwal" as const, title: judul });
  }

  it("REPRO: simpan dari state basi membuang tambahan tab lain (slice tulis-ulang)", () => {
    // Tab A mount saat store = [a]. Tab B menambah b. Tab A menyimpan
    // dari state lamanya (hanya kenal a) → susunSimpanJadwal murni
    // menghasilkan slice tanpa b.
    const storeSegar = [kartu("a"), kartu("b")];
    const stateBasi = semuaTampil(bagiTampilJadwal([kartu("a")]));
    const { keep, jadwalSlice, sinkronSlice } = susunSimpanJadwal(
      storeSegar,
      stateBasi
    );
    const tertulis = [...keep, ...jadwalSlice, ...sinkronSlice];
    assert.equal(
      tertulis.find((t) => t.id === "b"),
      undefined,
      "b hilang tanpa mitigasi asingBaru"
    );
  });

  it("REPRO: kartu basi menimpa suntingan tab lain pada record sama", () => {
    const kaki = (judul: string) =>
      tugas({ id: "rm1", source: "roadmap" as const, title: judul });
    const stateBasi = semuaTampil(bagiTampilJadwal([kaki("Lama")]));
    const { sinkronSlice } = susunSimpanJadwal([kaki("Baru")], stateBasi);
    assert.equal(sinkronSlice[0]?.title, "Lama");
  });

  it("asingBaru: hanya record belum dikenal (beda dari hapus)", () => {
    const segar = [kartu("a"), kartu("b"), kartu("c")];
    const dikenal = new Set(["a", "x"]); // x = sudah dihapus pengguna
    assert.deepEqual(
      asingBaru(segar, dikenal).map((t) => t.id),
      ["b", "c"]
    );
  });

  it("komposisi mitigasi: slice + asing = tambahan tab lain selamat", () => {
    const storeSegar = [kartu("a"), kartu("b")];
    const stateBasi = semuaTampil(bagiTampilJadwal([kartu("a")]));
    const { keep, jadwalSlice, sinkronSlice } = susunSimpanJadwal(
      storeSegar,
      stateBasi
    );
    const asing = asingBaru(storeSegar, new Set(["a"])).filter(
      (t) => t.source === "jadwal" || t.source === "pribadi"
    );
    const tertulis = [...keep, ...jadwalSlice, ...sinkronSlice, ...asing];
    saveTasks(tertulis);
    assert.ok(loadTasks().find((t) => t.id === "b"));
  });
});

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  loadTasks,
  saveTasks,
  type SharedTask,
} from "../../../components/task-store";
import {
  bagiTampilJadwal,
  susunSimpanJadwal,
  type Tugas,
} from "./view";
import {
  susunRoadmap,
  type Phase,
} from "../flowchart-skripsi/view";

// Opsi A — bukti kepemilikan tunggal source:roadmap.
// localStorage tidak ada di node: stub minimal untuk task-store.
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

const FASE_UJI: Phase[] = [
  {
    id: "p1",
    no: "01",
    title: "Fase Uji",
    desc: "d",
    steps: [{ id: "s1", label: "Langkah 1", sub: "sub 1" }],
  },
];

function tugasRoadmap(
  overrides: Partial<SharedTask> = {}
): SharedTask {
  return {
    id: "roadmap:p1:s1",
    source: "roadmap",
    status: "doing",
    prioritas: "tinggi",
    title: "Langkah 1",
    description: "sub 1",
    dueDate: "2026-11-01",
    phaseId: "p1",
    roadmapStepId: "s1",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Opsi A — roadmap diubah di flowchart terlihat di jadwal", () => {
  it("bagiTampilJadwal menampilkan item roadmap read-only apa adanya", () => {
    saveTasks([tugasRoadmap()]);
    const tampil = bagiTampilJadwal(loadTasks());
    assert.equal(tampil.roadmap.length, 1);
    const kartu = tampil.roadmap[0];
    assert.equal(kartu.isRoadmap, true);
    assert.equal(kartu.judul, "Langkah 1");
    assert.equal(kartu.status, "doing");
    assert.equal(kartu.deadline, "2026-11-01");
    assert.equal(kartu.prioritas, "tinggi");
    assert.match(kartu.tag, /^FASE P1$/);
  });
});

describe("Opsi A — save di jadwal tidak merusak roadmap", () => {
  it("susunSimpanJadwal melestarikan slice roadmap byte-identik walau tampilan diubah", () => {
    const sebelum = tugasRoadmap();
    const materi: SharedTask = {
      id: "m1",
      source: "materi",
      status: "todo",
      prioritas: "sedang",
      title: "Modul 1",
      createdAt: "2026-01-02T00:00:00.000Z",
    };
    const planner: SharedTask = {
      id: "p9",
      source: "planner",
      status: "todo",
      prioritas: "sedang",
      title: "Rencana Pekan Ini",
      createdAt: "2026-01-03T00:00:00.000Z",
    };
    saveTasks([sebelum, materi, planner]);

    // Simulasi state board: roadmap tampil (isRoadmap) + usaha ubah status
    // di tampilan + satu tugas jadwal baru.
    const { own, roadmap, materi: mat } = bagiTampilJadwal(loadTasks());
    assert.equal(own.length, 0);
    const dirusak: Tugas = { ...roadmap[0], status: "done", progres: 100 };
    const baru: Tugas = {
      id: "j1",
      judul: "Tugas jadwal baru",
      deskripsi: "",
      tag: "BAB 4",
      prioritas: "sedang",
      status: "todo",
      deadline: "",
      progres: 0,
      catatan: 0,
    };
    const { keep, jadwalSlice, materiSlice } = susunSimpanJadwal(
      loadTasks(),
      [baru, dirusak, ...mat]
    );
    saveTasks([...keep, ...jadwalSlice, ...materiSlice]);

    const sesudah = loadTasks();
    const rm = sesudah.find((t) => t.id === "roadmap:p1:s1");
    assert.deepEqual(rm, sebelum); // byte-identik: doing/tinggi/dueDate utuh
    assert.ok(sesudah.find((t) => t.id === "j1" && t.source === "jadwal"));
    assert.ok(sesudah.find((t) => t.id === "p9" && t.source === "planner"));
    assert.ok(sesudah.find((t) => t.id === "m1" && t.source === "materi"));
    assert.equal(
      sesudah.filter((t) => t.source === "roadmap").length,
      1,
      "tidak ada duplikat roadmap"
    );
  });
});

describe("Opsi A — flowchart tidak rebuild memaksa todo/sedang", () => {
  it("susunRoadmap mempertahankan doing/dueDate/prioritas/createdAt slice", () => {
    const lama = tugasRoadmap();
    const hasil = susunRoadmap(FASE_UJI, { s1: false }, [lama]);
    assert.equal(hasil.length, 1);
    assert.equal(hasil[0].status, "doing");
    assert.equal(hasil[0].prioritas, "tinggi");
    assert.equal(hasil[0].dueDate, "2026-11-01");
    assert.equal(hasil[0].createdAt, lama.createdAt);
  });

  it("toggle menyala → done; toggle mati atas done → todo", () => {
    const lama = tugasRoadmap({ status: "done" });
    assert.equal(susunRoadmap(FASE_UJI, { s1: true }, [lama])[0].status, "done");
    assert.equal(
      susunRoadmap(FASE_UJI, { s1: false }, [lama])[0].status,
      "todo"
    );
  });
});

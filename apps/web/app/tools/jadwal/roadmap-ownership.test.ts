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
  semuaTampil,
  type Tugas,
} from "./view";
import {
  susunRoadmap,
  type Phase,
} from "../flowchart-skripsi/view";

// Kontrak baru: satu sumber data. Jadwal boleh MENGUBAH tugas roadmap
// (status, deadline, catatan) dan perubahan itu tersinkron tanpa duplikat.
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

describe("roadmap tampil di papan jadwal dan bisa diedit", () => {
  it("bagiTampilJadwal memetakan item roadmap ke kartu papan", () => {
    saveTasks([tugasRoadmap()]);
    const part = bagiTampilJadwal(loadTasks());
    assert.equal(part.roadmap.length, 1);
    const kartu = part.roadmap[0];
    assert.equal(kartu.sumber, "roadmap");
    assert.equal(kartu.isRoadmap, true);
    assert.equal(kartu.judul, "Langkah 1");
    assert.equal(kartu.status, "doing");
    assert.equal(kartu.deadline, "2026-11-01");
    assert.equal(kartu.prioritas, "tinggi");
  });

  it("semuaTampil menggabung jadwal + pribadi + roadmap + materi", () => {
    const jadwal: SharedTask = {
      id: "j1",
      source: "jadwal",
      status: "todo",
      prioritas: "sedang",
      title: "Tugas jadwal",
      createdAt: "2026-01-02T00:00:00.000Z",
    };
    saveTasks([tugasRoadmap(), jadwal]);
    const tampil = semuaTampil(bagiTampilJadwal(loadTasks()));
    assert.equal(tampil.length, 2);
    assert.ok(tampil.some((t) => t.sumber === "roadmap"));
    assert.ok(tampil.some((t) => t.sumber === "jadwal"));
  });
});

describe("satu sumber kebenaran — perubahan dari jadwal tersinkron ke roadmap", () => {
  it("ubah status & deadline roadmap dari papan tersimpan di slice roadmap", () => {
    const sebelum = tugasRoadmap();
    const planner: SharedTask = {
      id: "p9",
      source: "planner",
      status: "todo",
      prioritas: "sedang",
      title: "Rencana Pekan Ini",
      notes: "catatan planner",
      createdAt: "2026-01-03T00:00:00.000Z",
    };
    saveTasks([sebelum, planner]);

    const { own, roadmap } = bagiTampilJadwal(loadTasks());
    assert.equal(own.length, 0);

    // Simulasi pengguna menyelesaikan + mengubah deadline kartu roadmap
    const diubah: Tugas = {
      ...roadmap[0],
      status: "done",
      deadline: "2026-11-20",
      progres: 100,
    };
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
      notes: "",
      subtasks: [],
      sumber: "jadwal",
    };
    const { keep, jadwalSlice, sinkronSlice } = susunSimpanJadwal(
      loadTasks(),
      [baru, diubah]
    );
    saveTasks([...keep, ...jadwalSlice, ...sinkronSlice]);

    const sesudah = loadTasks();
    const rm = sesudah.find((t) => t.id === "roadmap:p1:s1");
    // Perubahan dari jadwal TERSINKRON ke roadmap (bukan lagi read-only).
    assert.equal(rm?.status, "done");
    assert.equal(rm?.dueDate, "2026-11-20");
    assert.equal(rm?.source, "roadmap");
    assert.equal(sesudah.filter((t) => t.source === "roadmap").length, 1);
    // Tugas dari sumber lain tetap utuh.
    const pl = sesudah.find((t) => t.id === "p9");
    assert.equal(pl?.notes, "catatan planner");
    assert.ok(sesudah.find((t) => t.id === "j1" && t.source === "jadwal"));
  });

  it("id dari sumber lain tidak disalin ganda jadi source jadwal", () => {
    saveTasks([tugasRoadmap()]);
    const { roadmap } = bagiTampilJadwal(loadTasks());
    const { jadwalSlice } = susunSimpanJadwal(
      loadTasks(),
      [{ ...roadmap[0], sumber: "jadwal" as const }]
    );
    assert.equal(jadwalSlice.length, 0, "roadmap tidak boleh jadi kartu jadwal");
  });
});

describe("flowchart tidak rebuild memaksa todo/sedang", () => {
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

  it("field tambahan (subtugas/catatan) ikut dipertahankan saat susun ulang", () => {
    const lama = tugasRoadmap({
      notes: "ide bab 2",
      subtasks: [{ id: "sub-1", title: "latar belakang", done: true }],
    });
    const hasil = susunRoadmap(FASE_UJI, { s1: true }, [lama]);
    assert.equal(hasil[0].notes, "ide bab 2");
    assert.equal(hasil[0].subtasks?.length, 1);
    assert.equal(hasil[0].subtasks?.[0].done, true);
  });
});

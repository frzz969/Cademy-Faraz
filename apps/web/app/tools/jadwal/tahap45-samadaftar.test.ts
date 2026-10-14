import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  loadTasks,
  samaDaftar,
  saveTasks,
  type SharedTask,
} from "../../../components/task-store";

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

describe("Tahap 5-P2 samaDaftar (anti gema tulis)", () => {
  it("sama: isi setara walau urutan key beda", () => {
    const a = [tugas({ id: "x", source: "jadwal" })];
    const b = [{ title: "Contoh", id: "x", createdAt: "2026-01-01T00:00:00.000Z", prioritas: "sedang", status: "todo", source: "jadwal" } as unknown as SharedTask];
    assert.equal(samaDaftar(a, b), true);
  });
  it("beda: panjang, isi, urutan array", () => {
    const a = [tugas({ id: "x", source: "jadwal" })];
    assert.equal(samaDaftar(a, []), false);
    assert.equal(samaDaftar(a, [tugas({ id: "x", source: "jadwal", status: "done" })]), false);
    assert.equal(
      samaDaftar(
        [tugas({ id: "x", source: "jadwal" }), tugas({ id: "y", source: "jadwal" })],
        [tugas({ id: "y", source: "jadwal" }), tugas({ id: "x", source: "jadwal" })]
      ),
      false
    );
  });
  it("nested subtasks/berulang ikut dibandingkan", () => {
    const a = [
      tugas({
        id: "x",
        source: "jadwal",
        subtasks: [{ id: "s", title: "s", done: false }],
        berulang: { frekuensi: "harian", intervalHari: 1, indukId: "x", tanggal: "2026-10-12" },
      }),
    ];
    const b = JSON.parse(JSON.stringify(a)) as SharedTask[];
    assert.equal(samaDaftar(a, b), true);
    assert.equal(
      samaDaftar(a, [tugas({ id: "x", source: "jadwal", subtasks: [{ id: "s", title: "s", done: true }] })]),
      false
    );
  });
  it("save→load stabil: tulis ulang hasil baca = sama (konvergen, berhenti)", () => {
    bak.clear();
    saveTasks([tugas({ id: "x", source: "jadwal" })]);
    const baca = loadTasks();
    assert.equal(samaDaftar(baca, loadTasks()), true);
  });
});

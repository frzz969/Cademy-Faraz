import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  POMODORO_CAP,
  menitPerHari,
  normalizePomodoroState,
  pushPomodoroSession,
  totalMingguIni,
  type PomodoroState,
} from "./pomodoro";

describe("normalisasi pomodoro (migrasi aman)", () => {
  it("field lama tetap dibaca, sessions default []", () => {
    const s = normalizePomodoroState({ sesi: 3, totalMenit: 75 });
    assert.equal(s.sesi, 3);
    assert.equal(s.totalMenit, 75);
    assert.deepEqual(s.sessions, []);
  });
  it("sessions rusak → [] tanpa throw", () => {
    assert.deepEqual(normalizePomodoroState(null).sessions, []);
    assert.deepEqual(normalizePomodoroState({ sessions: "rusak" }).sessions, []);
  });
  it("menit NaN/Infinity & tanggal tak valid dibuang", () => {
    const s = normalizePomodoroState({
      sessions: [
        { date: "2026-10-09", minutes: 25 },
        { date: "2026-10-09", minutes: NaN },
        { date: "2026-10-09", minutes: Infinity },
        { date: "09-10-2026", minutes: 25 },
        { date: "besok", minutes: 25 },
        { date: "2026-10-09", minutes: "25" },
        null,
      ],
    });
    assert.deepEqual(s.sessions, [{ date: "2026-10-09", minutes: 25 }]);
  });
});

describe("push sesi + cap 100", () => {
  it("sesi+1, menit bertambah, cap 100 terakhir", () => {
    let st: PomodoroState = { sesi: 0, totalMenit: 0, sessions: [] };
    for (let i = 0; i < POMODORO_CAP + 5; i++) {
      st = pushPomodoroSession(st, { date: "2026-10-09", minutes: 25 });
    }
    assert.equal(st.sessions.length, POMODORO_CAP);
    assert.equal(st.sesi, POMODORO_CAP + 5);
    assert.equal(st.totalMenit, (POMODORO_CAP + 5) * 25);
  });
});

describe("agregasi menit", () => {
  const sessions = [
    { date: "2026-10-06", minutes: 25 },
    { date: "2026-10-06", minutes: 25 },
    { date: "2026-10-08", minutes: 50 },
    { date: "2026-09-30", minutes: 25 },
  ];
  it("per hari", () => {
    assert.deepEqual(menitPerHari(sessions), {
      "2026-10-06": 50,
      "2026-10-08": 50,
      "2026-09-30": 25,
    });
  });
  it("minggu ini (Senin 2026-10-05) tak termasuk pekan lalu", () => {
    // 9 Okt 2026 = Kamis; Senin pekan ini 5 Okt.
    assert.equal(totalMingguIni(sessions, new Date(2026, 9, 9)), 100);
  });
  it("menit NaN/Infinity & tanggal tak valid diabaikan", () => {
    const now = new Date(2026, 9, 9);
    assert.equal(
      totalMingguIni(
        [
          { date: "2026-10-06", minutes: 25 },
          { date: "2026-10-06", minutes: NaN },
          { date: "2026-10-06", minutes: Infinity },
          { date: "06-10-2026", minutes: 25 },
          { date: "2026-10-06", minutes: "25" as unknown as number },
        ],
        now,
      ),
      25,
    );
  });
});

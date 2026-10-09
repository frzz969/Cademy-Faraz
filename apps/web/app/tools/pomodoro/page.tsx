import type { Metadata } from "next";
import PomodoroView from "./view";

export const metadata: Metadata = {
  title: "Timer Pomodoro Fokus Belajar — Cademy",
  description:
    "Atur timer fokus dan istirahat custom, mulai-jeda-reset, dan pantau counter sesi belajarmu yang tersimpan otomatis.",
};

export default function PomodoroPage() {
  return <PomodoroView />;
}

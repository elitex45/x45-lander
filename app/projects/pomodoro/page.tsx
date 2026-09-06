import type { Metadata } from "next";
import { PomodoroApp } from "./PomodoroApp";
import styles from "./pomodoro.module.css";

export const metadata: Metadata = {
  title: "Pomodoro — elitex45",
  description: "A calm, useful focus timer with tasks and flexible breaks.",
  openGraph: { title: "Pomodoro — elitex45", description: "A calm, useful focus timer with tasks and flexible breaks.", siteName: "elitex45 workshop", url: "/projects/pomodoro" },
  twitter: { card: "summary_large_image", title: "Pomodoro — elitex45", description: "A calm, useful focus timer with tasks and flexible breaks." },
};

export default function PomodoroPage() {
  return (
    <div className={styles.root}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Focus timer</p>
          <h1>Make time for one thing.</h1>
        </div>
        <p>
          Work with intention, take a real break, and keep the next task close.
          Everything stays in this browser.
        </p>
      </header>
      <PomodoroApp />
    </div>
  );
}

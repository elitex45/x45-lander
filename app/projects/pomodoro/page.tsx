import type { Metadata } from "next";
import { toolBySlug, toolMetadata } from "../../lib/seo";
import { ToolSeo } from "../../components/ToolSeo";
import { PomodoroApp } from "./PomodoroApp";
import styles from "./pomodoro.module.css";

export const metadata: Metadata = toolMetadata(toolBySlug("pomodoro")!, "/projects/pomodoro");

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
      <ToolSeo slug="pomodoro" path="/projects/pomodoro" />
    </div>
  );
}

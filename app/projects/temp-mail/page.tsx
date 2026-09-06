import type { Metadata } from "next";
import { TempMailApp } from "./TempMailApp";

export const metadata: Metadata = {
  title: "Temp mail — elitex45",
  description: "Pick any name at x45.in and get a 10 minute inbox. Then it is gone.",
  openGraph: { title: "Temp mail — elitex45", description: "Pick any name at x45.in and get a 10 minute inbox. Then it is gone.", siteName: "elitex45 workshop", url: "/projects/temp-mail" },
  twitter: { card: "summary_large_image", title: "Temp mail — elitex45", description: "Pick any name at x45.in and get a 10 minute inbox. Then it is gone." },
};

export default function TempMailPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 lg:pt-14">
      <header className="mb-8 grid gap-4 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="font-mono text-xs text-[var(--muted)]">Temp mail</p>
          <h1 className="mt-2 text-3xl font-semibold leading-[1.05] tracking-tighter sm:text-4xl">
            An inbox that forgets.
          </h1>
        </div>
        <p className="max-w-[44ch] text-[15px] leading-relaxed text-[var(--muted)] lg:col-span-5">
          Pick any name at x45.in. Use it for a signup or a download. Ten minutes
          later the address and every mail in it are gone.
        </p>
      </header>
      <TempMailApp />
    </div>
  );
}

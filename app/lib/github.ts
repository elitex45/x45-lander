interface Project {
  emoji: string;
  name: string;
  url: string;
  desc: string;
  label: string;
}

const LABEL_MAP: Record<string, string> = {
  zerufinance: "crypto \u00d7 AI",
  "agentscan.tech": "agent infra",
  dualcode: "dev tooling",
  pmcts: "data",
  "nuke-mac-system-data": "utility",
  polybt: "trading",
};

export async function fetchProjectsFromGitHub(): Promise<Project[]> {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/elitex45/elitex45/main/README.md",
      { next: { revalidate: 3600 } } // revalidate hourly
    );

    if (!res.ok) return [];

    const md = await res.text();

    // Parse the "## Current Projects" section
    const projectSectionMatch = md.match(
      /## Current Projects\n([\s\S]*?)(?=\n## |\n---|\n$)/
    );
    if (!projectSectionMatch) return [];

    const lines = projectSectionMatch[1].trim().split("\n");
    const projects: Project[] = [];

    for (const line of lines) {
      // Match: - 🔐 **[name](url)** – description
      const match = line.match(
        /^-\s+(\S+)\s+\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s+[–—-]\s+(.+)$/
      );
      if (match) {
        const [, emoji, name, url, desc] = match;
        projects.push({
          emoji,
          name,
          url,
          desc: desc.trim(),
          label: LABEL_MAP[name] || "project",
        });
      }
    }

    return projects;
  } catch {
    return [];
  }
}

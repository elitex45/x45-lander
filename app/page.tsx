import { fetchProjectsFromGitHub } from "./lib/github";
import { HomePage } from "./components/HomePage";

export default async function Page() {
  const projects = await fetchProjectsFromGitHub();
  return <HomePage projects={projects.length > 0 ? projects : undefined} />;
}

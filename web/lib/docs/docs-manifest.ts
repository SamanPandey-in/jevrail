// Single source of truth for the docs site structure.
// `source` is the path of the markdown file inside /content/docs.
// `slug` is the URL path under /docs (empty string = /docs itself).
export type DocEntry = {
  slug: string;
  source: string;
  title: string;
  group: string;
};

export const docsManifest: DocEntry[] = [
  { slug: "", source: "README.md", title: "Overview", group: "Getting Started" },
  { slug: "installation", source: "INSTALLATION.md", title: "Installation", group: "Getting Started" },
  { slug: "how-it-works", source: "HOW_IT_WORKS.md", title: "How It Works", group: "Getting Started" },

  { slug: "what-it-checks", source: "WHAT_IT_CHECKS.md", title: "What It Checks", group: "Core Concepts" },
  { slug: "decisions", source: "DECISIONS.md", title: "Decisions", group: "Core Concepts" },
  { slug: "supported-agents", source: "SUPPORTED_AGENTS.md", title: "Supported Agents", group: "Core Concepts" },
  { slug: "privacy", source: "PRIVACY.md", title: "Privacy", group: "Core Concepts" },

  { slug: "usage", source: "USAGE.md", title: "Usage Guide", group: "Guides" },
  { slug: "benchmark", source: "BENCHMARK.md", title: "Evaluation / Benchmark", group: "Guides" },
  { slug: "roadmap", source: "ROADMAP.md", title: "Roadmap", group: "Guides" },
  { slug: "development", source: "DEVELOPMENT.md", title: "Development", group: "Guides" },
  { slug: "deviations", source: "DEVIATIONS.md", title: "Deviations from Plan", group: "Guides" },
  { slug: "proofs", source: "PROOFS.md", title: "Proofs", group: "Guides" },
];

export const docsGroups = ["Getting Started", "Core Concepts", "Guides"] as const;

export function getDocBySlug(slug: string): DocEntry | undefined {
  return docsManifest.find((d) => d.slug === slug);
}

export function getDocBySource(source: string): DocEntry | undefined {
  return docsManifest.find((d) => d.source === source);
}

// Fallback for any doc link we deliberately did not migrate into the app
// (the design doc, license, and example config live outside /docs on
// GitHub) — send the reader to the source on GitHub instead of a 404.
export const GITHUB_DOCS_BASE =
  "https://github.com/SamanPandey-in/jevrail/blob/main/docs/";

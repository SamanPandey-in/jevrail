import fs from "node:fs";
import path from "node:path";
import { docsManifest, getDocBySource, GITHUB_DOCS_BASE, type DocEntry } from "./docs-manifest";

const DOCS_ROOT = path.join(process.cwd(), "content", "docs");

export function getDocSourceText(entry: DocEntry): string {
  const filePath = path.join(DOCS_ROOT, entry.source);
  return fs.readFileSync(filePath, "utf-8");
}

// Resolves a relative markdown link (e.g. "./overview.md", "../auth/README.md#tokens")
// found inside `fromEntry`'s file into either an internal /docs/... route or,
// if the target file was never migrated into the app, the file's URL on GitHub.
export function resolveDocHref(fromEntry: DocEntry, href: string): string {
  // An absolute link — e.g. a GitHub URL pointing directly at a .md file —
  // is already a real destination, not a relative path to resolve against
  // fromEntry's location. Without this check, an absolute href ending in
  // ".md" falls through to the relative-path logic below and gets mangled
  // by path.posix.join treating "https://..." as a path segment.
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) {
    return href;
  }

  if (!href.endsWith(".md") && !href.includes(".md#")) {
    return href; // relative non-markdown link, mailto, anchor-only, etc. — leave untouched
  }

  const hashIndex = href.indexOf("#");
  const pathPart = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);

  const fromDir = path.posix.dirname(fromEntry.source);
  const resolved = path.posix.normalize(path.posix.join(fromDir, pathPart));

  const target = getDocBySource(resolved);
  if (!target) {
    // Doc exists in the repo but wasn't migrated (e.g. internal build logs) —
    // point at the real file on GitHub instead of a dead link.
    return `${GITHUB_DOCS_BASE}${resolved}`;
  }

  const targetRoute = target.slug ? `/docs/${target.slug}` : "/docs";
  return `${targetRoute}${hash}`;
}

export function getAllDocSlugs(): string[] {
  return docsManifest.map((d) => d.slug);
}

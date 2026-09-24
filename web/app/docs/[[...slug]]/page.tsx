import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { docsManifest, getDocBySlug } from "@/lib/docs/docs-manifest";
import { getDocSourceText } from "@/lib/docs/docs-content";
import { extractHeadings } from "@/lib/docs/docs-headings";
import { extractDocDescription } from "@/lib/docs/docs-excerpt";
import { SITE_URL } from "@/lib/site";
import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { OnThisPage } from "@/components/docs/OnThisPage";
import { CopyPageButton } from "@/components/docs/CopyPageButton";
import { Progress } from "@/components/docs/Progress";
import { ShareOnXButton } from "@/components/shared/share-on-x-button";

export function generateStaticParams() {
  return docsManifest.map((doc) => ({
    slug: doc.slug ? doc.slug.split("/") : [],
  }));
}

// Every doc page used to silently inherit the root layout's site-wide
  // title/description, fine for the homepage, but it meant every single doc
// page showed up in search results and link previews with the exact same
// title. Each page now gets its own title (from docsManifest, already the
// display name in the sidebar) and its own description (the doc's own
// first paragraph, via extractDocDescription).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const currentSlug = slug?.join("/") ?? "";
  const entry = getDocBySlug(currentSlug);
  if (!entry) return {};

  const description = extractDocDescription(getDocSourceText(entry)) ?? undefined;
  const url = entry.slug ? `${SITE_URL}/docs/${entry.slug}` : `${SITE_URL}/docs`;

  return {
    title: { absolute: `${entry.title} | JevRail Docs` },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${entry.title} | JevRail Docs`,
      description,
      url,
      type: "article",
      // Placeholder: swap for a per-doc image once one exists; for now
      // every doc page shares the site-wide /public/og.png.
      images: [{ url: "/og.png", width: 1200, height: 630, alt: entry.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${entry.title} | JevRail Docs`,
      description,
      images: ["/og.png"],
    },
  };
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const currentSlug = slug?.join("/") ?? "";

  const entry = getDocBySlug(currentSlug);
  if (!entry) notFound();

  const source = getDocSourceText(entry);
  const headings = extractHeadings(source);
  const progressSections = headings
    .filter((h) => h.depth === 2)
    .map((h) => ({ id: h.id, label: h.label }));

  const index = docsManifest.findIndex((d) => d.slug === entry.slug);
  const prev = index > 0 ? docsManifest[index - 1] : undefined;
  const next = index < docsManifest.length - 1 ? docsManifest[index + 1] : undefined;

  return (
    <div>
      <div className="flex justify-end mb-6">
        <CopyPageButton source={source} slug={entry.slug} />
      </div>

      <div className="flex gap-12">
        <article className="flex-1 min-w-0 max-w-3xl">
          <DocsMarkdown entry={entry} source={source} />

          <div className="flex flex-wrap items-center justify-between gap-4 mt-12 pt-6 border-t border-border">
            <ShareOnXButton
              text={`Reading up on "${entry.title}" in the JevRail docs.`}
              variant="link"
            />
          </div>

          <div className="flex items-center justify-between gap-4 mt-6 pt-8 border-t border-border">
            {prev ? (
              <Link
                href={prev.slug ? `/docs/${prev.slug}` : "/docs"}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card/60 hover:border-primary/40 transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>
                  <span className="block text-xs text-muted-foreground/70">Previous</span>
                  {prev.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={next.slug ? `/docs/${next.slug}` : "/docs"}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card/60 hover:border-primary/40 transition-colors text-sm text-muted-foreground hover:text-foreground text-right ml-auto"
              >
                <span>
                  <span className="block text-xs text-muted-foreground/70">Next</span>
                  {next.title}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </article>

        <aside className="hidden xl:block w-56 shrink-0">
          <div className="sticky top-32">
            <OnThisPage headings={headings} />
          </div>
        </aside>
      </div>

      <Progress sections={progressSections} />
    </div>
  );
}

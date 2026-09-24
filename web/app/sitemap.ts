import type { MetadataRoute } from "next";
import { docsManifest } from "@/lib/docs/docs-manifest";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const docRoutes: MetadataRoute.Sitemap = docsManifest.map((doc) => ({
    url: doc.slug ? `${SITE_URL}/docs/${doc.slug}` : `${SITE_URL}/docs`,
    changeFrequency: "weekly",
    priority: doc.slug === "installation" ? 0.9 : 0.7,
  }));

  return [...staticRoutes, ...docRoutes];
}

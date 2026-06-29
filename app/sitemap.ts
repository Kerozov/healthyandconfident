import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { siteConfig } from "@/lib/site";
import { getAllPublishedSlugs } from "@/lib/blog";
import { PROGRAM_LANDING_SLUGS } from "@/lib/programs/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.domain;
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    staticEntries.push(
      {
        url: `${base}/${locale}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 1,
        alternates: {
          languages: { bg: `${base}/bg`, en: `${base}/en` },
        },
      },
      {
        url: `${base}/${locale}/blog`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      },
    );
    for (const slug of PROGRAM_LANDING_SLUGS) {
      staticEntries.push({
        url: `${base}/${locale}/programs/${slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.9,
      });
    }
  }

  const slugs = await getAllPublishedSlugs();
  const postEntries: MetadataRoute.Sitemap = slugs.map((s) => ({
    url: `${base}/${s.locale}/blog/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...postEntries];
}

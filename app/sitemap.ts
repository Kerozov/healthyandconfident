import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { publicSiteOrigin } from "@/lib/site";
import { getAllPublishedSlugs } from "@/lib/blog";
import { PROGRAM_LANDING_SLUGS, programPath } from "@/lib/programs/types";
import { getProgramLanding } from "@/lib/programs/landings";
import { getSiteGuides, getSiteProducts } from "@/lib/site/content";
import { filterProductsForLocale } from "@/lib/site/product-locale";
import { filterGuidesForLocale } from "@/lib/site/guide-catalog";
import {
  guidePagePath,
  guidesListPath,
  productCheckoutPath,
  productsListPath,
  programsListPath,
} from "@/lib/site/product-placement";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicSiteOrigin();
  const now = new Date();
  const [allProducts, allGuides] = await Promise.all([
    getSiteProducts(),
    getSiteGuides(),
  ]);

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
      {
        url: `${base}${programsListPath(locale)}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.9,
      },
      {
        url: `${base}${productsListPath(locale)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${base}${guidesListPath(locale)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${base}/${locale}/privacy`,
        lastModified: now,
        changeFrequency: "yearly",
        priority: 0.3,
      },
      {
        url: `${base}/${locale}/terms`,
        lastModified: now,
        changeFrequency: "yearly",
        priority: 0.3,
      },
      {
        url: `${base}/${locale}/support`,
        lastModified: now,
        changeFrequency: "yearly",
        priority: 0.4,
      },
    );
    for (const slug of PROGRAM_LANDING_SLUGS) {
      // A programme that is not on sale yet renders with `noindex`; listing it
      // here would hand Google a URL it is told not to index.
      if (getProgramLanding(locale, slug)?.noindex) continue;
      staticEntries.push({
        url: `${base}/${locale}${programPath(slug)}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.9,
      });
    }
    for (const product of filterProductsForLocale(allProducts, locale)) {
      staticEntries.push({
        url: `${base}${productCheckoutPath(product, locale)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const guide of filterGuidesForLocale(allGuides, locale)) {
      staticEntries.push({
        url: `${base}${guidePagePath(guide, locale)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
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

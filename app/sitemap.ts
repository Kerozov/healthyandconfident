import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { publicSiteOrigin } from "@/lib/site";
import { getAllPublishedSlugs } from "@/lib/blog";
import { PROGRAM_LANDING_SLUGS, programPath } from "@/lib/programs/types";
import { getProgramLanding } from "@/lib/programs/landings";
import { getSiteGuides, getSiteProducts } from "@/lib/site/content";
import { filterProductsForLocale } from "@/lib/site/product-locale";
import { filterGuidesForLocale } from "@/lib/site/guide-catalog";
import { freeMenuPath } from "@/lib/site/free-menu";
import {
  guidePagePath,
  guidesListPath,
  productCheckoutPath,
  productsListPath,
  programsListPath,
} from "@/lib/site/product-placement";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicSiteOrigin();
  const [allProducts, allGuides] = await Promise.all([
    getSiteProducts(),
    getSiteGuides(),
  ]);

  // No lastModified on pages without a real edit date: stamping every URL with
  // "now" teaches Google to ignore the field for the whole sitemap.
  const staticEntries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    staticEntries.push(
      {
        url: `${base}/${locale}`,
        changeFrequency: "weekly",
        priority: 1,
        alternates: {
          languages: { bg: `${base}/bg`, en: `${base}/en` },
        },
      },
      {
        url: `${base}/${locale}/blog`,
        changeFrequency: "daily",
        priority: 0.8,
      },
      {
        url: `${base}${programsListPath(locale)}`,
        changeFrequency: "monthly",
        priority: 0.9,
      },
      {
        url: `${base}${productsListPath(locale)}`,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${base}${guidesListPath(locale)}`,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${base}${freeMenuPath(locale)}`,
        changeFrequency: "monthly",
        priority: 0.8,
      },
      {
        url: `${base}/${locale}/privacy`,
        changeFrequency: "yearly",
        priority: 0.3,
      },
      {
        url: `${base}/${locale}/terms`,
        changeFrequency: "yearly",
        priority: 0.3,
      },
      {
        url: `${base}/${locale}/support`,
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
        changeFrequency: "monthly",
        priority: 0.9,
      });
    }
    for (const product of filterProductsForLocale(allProducts, locale)) {
      staticEntries.push({
        url: `${base}${productCheckoutPath(product, locale)}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const guide of filterGuidesForLocale(allGuides, locale)) {
      staticEntries.push({
        url: `${base}${guidePagePath(guide, locale)}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  const slugs = await getAllPublishedSlugs();
  const postEntries: MetadataRoute.Sitemap = slugs.map((s) => ({
    url: `${base}/${s.locale}/blog/${s.slug}`,
    ...(s.updated_at ? { lastModified: new Date(s.updated_at) } : {}),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...postEntries];
}

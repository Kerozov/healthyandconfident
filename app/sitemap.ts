import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { publicSiteOrigin } from "@/lib/site";
import { getAllPublishedSlugs } from "@/lib/blog";
import { PROGRAM_LANDING_SLUGS } from "@/lib/programs/types";
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
    );
    for (const slug of PROGRAM_LANDING_SLUGS) {
      staticEntries.push({
        url: `${base}/${locale}/programs/${slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.9,
      });
    }
    for (const product of filterProductsForLocale(allProducts, locale)) {
      staticEntries.push({
        url: `${base}${productCheckoutPath(product.id, locale)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const guide of filterGuidesForLocale(allGuides, locale)) {
      staticEntries.push({
        url: `${base}${guidePagePath(guide.id, locale)}`,
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

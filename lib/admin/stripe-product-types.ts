import type { StripeCatalogRow } from "@/lib/stripe/catalog-types";

export type StripeCatalogItem = StripeCatalogRow & {
  linkedProductId: string | null;
  linkedProductTitle: string | null;
};

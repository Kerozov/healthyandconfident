import type {
  StripeCatalogRow,
  StripePaymentLinkRow,
} from "@/lib/stripe/catalog-types";

export type StripeCatalogItem = StripeCatalogRow & {
  linkedProductId: string | null;
  linkedProductTitle: string | null;
};

export type StripePaymentLinkItem = StripePaymentLinkRow;

export type StripeCatalogRow = {
  stripeProductId: string;
  stripePriceId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceLabel: string;
  active: boolean;
};

export type StripePaymentLinkRow = {
  id: string;
  url: string;
  name: string;
  priceLabel: string;
  stripeProductId: string | null;
  stripePriceId: string | null;
  active: boolean;
};

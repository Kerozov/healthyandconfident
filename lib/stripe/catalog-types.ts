export type StripeCatalogRow = {
  stripeProductId: string;
  stripePriceId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceLabel: string;
  active: boolean;
};

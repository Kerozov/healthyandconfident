/** A bundle as the site-wide popup lists it, prices already formatted. */
export type BlackFridayPopupDeal = {
  title: string;
  price: string;
  was: string;
  savedPercent: number;
};

/** `/api/black-friday/popup` — whether to show the popup and what to put in it. */
export type BlackFridayPopupData = {
  live: boolean;
  deadline: string | null;
  deals: BlackFridayPopupDeal[];
};

-- 072: the big button at the top of each programme page gets its own row.
--
-- components/site/program-landing.tsx rendered it with the programme's main
-- key (`programs_<n>`), which is also the key of the programme's card on the
-- home page. In the admin the two showed up as one row, so „Включи се днес“ on
-- the page could not be edited apart from the card on the home page.
--
-- Each new row starts as a copy of its base row, so the page keeps the product,
-- labels and offers it has today until someone changes them in the admin.
-- Landing pages keyed `product_<slug>` have no home card and are not split.

insert into public.site_cta_placements (
  key,
  label_bg,
  label_en,
  offer_id,
  offer_headline_bg,
  offer_headline_en,
  offer_enabled,
  downsell_offer_id,
  downsell_headline_bg,
  downsell_headline_en,
  downsell_enabled,
  button_label_bg,
  button_label_en,
  button_url,
  button_url_en,
  stripe_url,
  stripe_product_id,
  stripe_price_id,
  stripe_url_en,
  stripe_product_id_en,
  stripe_price_id_en,
  button_enabled,
  button_enabled_en
)
select
  base.key || '_hero',
  names.label_bg,
  names.label_en,
  base.offer_id,
  base.offer_headline_bg,
  base.offer_headline_en,
  base.offer_enabled,
  base.downsell_offer_id,
  base.downsell_headline_bg,
  base.downsell_headline_en,
  base.downsell_enabled,
  base.button_label_bg,
  base.button_label_en,
  base.button_url,
  base.button_url_en,
  base.stripe_url,
  base.stripe_product_id,
  base.stripe_price_id,
  base.stripe_url_en,
  base.stripe_product_id_en,
  base.stripe_price_id_en,
  base.button_enabled,
  base.button_enabled_en
from (
  values
    (
      'programs_1',
      'Живей без резистентност — „Включи се днес“ (горен бутон на страницата)',
      'Live Without Resistance — “Join today” (top button on the page)'
    ),
    (
      'programs_2',
      'Препрограмирай апетита — главен бутон горе на страницата',
      'Reprogram Your Appetite — top button on the page'
    ),
    (
      'programs_0',
      'Лято – стройна и спокойна — главен бутон горе на страницата',
      'Summer — slim and calm — top button on the page'
    )
) as names (key, label_bg, label_en)
join public.site_cta_placements as base on base.key = names.key
on conflict (key) do nothing;

update public.site_cta_placements
set
  label_bg = 'Живей без резистентност — „Включи се днес“ (карта на началната страница)',
  label_en = 'Live Without Resistance — “Join today” (home page card)'
where key = 'programs_1';

notify pgrst, 'reload schema';

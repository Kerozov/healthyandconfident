-- 071: buttons for the „21 дни по-стройни и щастливи“ landing page.
--
-- The 21-day challenge got its own page again
-- (app/(site)/[locale]/programs/po-stroyni-i-shtastlivi). Its four buttons are
-- rendered with the landing's default placement key `product_<slug>`, and a
-- button only shows up in админ → Сайт → Бутони once it has a row here.
--
-- The programme is not on sale yet: no rows carry a Stripe product, so every
-- button falls back to the page's own anchor or to the contact section until
-- someone picks a product in the admin.

insert into public.site_cta_placements (key, label_bg, label_en) values
  (
    'product_po-stroyni-i-shtastlivi',
    '21 дни по-стройни и щастливи — главен бутон',
    '21 Days Slimmer and Happier — primary button'
  ),
  (
    'product_po-stroyni-i-shtastlivi_secondary',
    '21 дни по-стройни и щастливи — втори бутон горе',
    '21 Days Slimmer and Happier — secondary button'
  ),
  (
    'product_po-stroyni-i-shtastlivi_pricing_0',
    '21 дни по-стройни и щастливи — цена „21-дневно предизвикателство“ (€49)',
    '21 Days Slimmer and Happier — price “21-day challenge” (€49)'
  ),
  (
    'product_po-stroyni-i-shtastlivi_final',
    '21 дни по-стройни и щастливи — последен бутон на страницата',
    '21 Days Slimmer and Happier — last button on the page'
  )
on conflict (key) do nothing;

notify pgrst, 'reload schema';

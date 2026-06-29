-- Clearer placement labels + shop product placements

update public.site_cta_placements set
  label_bg = 'Начало — златен бутон „Виж програмите“ (hero)',
  label_en = 'Home — gold “View programs” button (hero)'
where key = 'hero_primary';

update public.site_cta_placements set
  label_bg = 'Начало — втори бутон „Безплатен наръчник“ (hero)',
  label_en = 'Home — secondary lead magnet button (hero)'
where key = 'hero_secondary';

update public.site_cta_placements set
  label_bg = 'Горно меню — „Запиши безплатен разговор“',
  label_en = 'Top navigation — book a free call CTA'
where key = 'nav_cta';

update public.site_cta_placements set
  label_bg = 'Контакти — основен бутон (WhatsApp / запис)',
  label_en = 'Contact section — main booking button'
where key = 'contact_cta';

update public.site_cta_placements set
  label_bg = 'За мен — бутон към контакт',
  label_en = 'About section — button to contact'
where key = 'about_cta';

update public.site_cta_placements set
  label_bg = 'Програми — бутон на първата карта',
  label_en = 'Programs — first program card button'
where key = 'programs_0';

update public.site_cta_placements set
  label_bg = 'Програми — бутон на втората карта',
  label_en = 'Programs — second program card button'
where key = 'programs_1';

update public.site_cta_placements set
  label_bg = 'Програми — бутон на третата карта',
  label_en = 'Programs — third program card button'
where key = 'programs_2';

insert into public.site_cta_placements (key, label_bg, label_en)
select
  'product_' || id::text,
  'Магазин — ' || title_bg,
  'Shop — ' || title_en
from public.site_products
on conflict (key) do update set
  label_bg = excluded.label_bg,
  label_en = excluded.label_en;

notify pgrst, 'reload schema';

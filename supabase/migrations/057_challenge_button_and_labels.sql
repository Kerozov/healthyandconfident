-- 057: the 21-day challenge button, plus placement names that match the site.
--
-- `challenge_21_cta` is rendered by the site (components/site/sections/challenge-21.tsx)
-- but never had a row, so the button could not be edited in the admin.
-- The remaining labels still named programmes that are no longer on the site.

insert into public.site_cta_placements (key, label_bg, label_en) values
  ('challenge_21_cta', '21-дневно предизвикателство — бутон', '21-day challenge — button')
on conflict (key) do nothing;

update public.site_cta_placements set
  label_bg = 'Лято – стройна и спокойна — главен бутон',
  label_en = 'Summer — slim and calm — primary button'
where key = 'programs_0';

update public.site_cta_placements set
  label_bg = 'Лято – стройна и спокойна — втори бутон горе',
  label_en = 'Summer — slim and calm — secondary button'
where key = 'programs_0_secondary';

update public.site_cta_placements set
  label_bg = 'Лято – стройна и спокойна — цена „Летен пакет“ (€36)',
  label_en = 'Summer — slim and calm — “Summer package” price (€36)'
where key = 'programs_0_pricing_0';

update public.site_cta_placements set
  label_bg = 'Живей без резистентност — главен бутон',
  label_en = 'Live Without Resistance — primary button'
where key = 'programs_1';

update public.site_cta_placements set
  label_bg = 'Живей без резистентност — втори бутон горе',
  label_en = 'Live Without Resistance — secondary button'
where key = 'programs_1_secondary';

update public.site_cta_placements set
  label_bg = 'Живей без резистентност — цена „Месечни вноски“ (3 × 180 €)',
  label_en = 'Live Without Resistance — monthly instalments (3 × €180)'
where key = 'programs_1_pricing_0';

update public.site_cta_placements set
  label_bg = 'Живей без резистентност — цена „Еднократно днес“ (480 €)',
  label_en = 'Live Without Resistance — one-off payment (€480)'
where key = 'programs_1_pricing_1';

update public.site_cta_placements set
  label_bg = 'Препрограмирай апетита — главен бутон',
  label_en = 'Reprogram Your Appetite — primary button'
where key = 'programs_2';

update public.site_cta_placements set
  label_bg = 'Препрограмирай апетита — втори бутон горе',
  label_en = 'Reprogram Your Appetite — secondary button'
where key = 'programs_2_secondary';

update public.site_cta_placements set
  label_bg = 'Препрограмирай апетита — цена „Месечен достъп“ (€38/месец)',
  label_en = 'Reprogram Your Appetite — monthly access (€38/month)'
where key = 'programs_2_pricing_0';

update public.site_cta_placements set
  label_bg = 'Препрограмирай апетита — цена „Вариант 1“ (28 €/месец)',
  label_en = 'Reprogram Your Appetite — plan 1 (€28/month)'
where key = 'programs_2_pricing_1';

update public.site_cta_placements set
  label_bg = 'Препрограмирай апетита — цена „Вариант 2“ (30 €/месец)',
  label_en = 'Reprogram Your Appetite — plan 2 (€30/month)'
where key = 'programs_2_pricing_2';

update public.site_cta_placements set
  label_bg = 'Секция „Резултати“ — бутон',
  label_en = 'Outcomes section — button'
where key = 'outcomes_cta';

notify pgrst, 'reload schema';

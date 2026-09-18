-- 073: the big button at the top of a programme page shares its row with the
-- programme's card on the home page again.
--
-- 072 gave the page's top button its own `programs_<n>_hero` row, but the
-- site was rebuilt before those rows existed and the button fell back to
-- „#pricing“ instead of the link set up in the admin. The split is reverted in
-- components/site/program-landing.tsx; these rows would otherwise sit in the
-- table unused and unreachable from „Бутони“.

delete from public.site_cta_placements
where key in ('programs_0_hero', 'programs_1_hero', 'programs_2_hero');

update public.site_cta_placements
set
  label_bg = 'Живей без резистентност — главен бутон',
  label_en = 'Live Without Resistance — primary button'
where key = 'programs_1';

notify pgrst, 'reload schema';

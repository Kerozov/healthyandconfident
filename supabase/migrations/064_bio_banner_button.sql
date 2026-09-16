-- 064: the "Към общността" banner gets its own button row.
--
-- components/site/sections/home-banners.tsx rendered that banner's button with
-- the `programs_2` placement, so it silently inherited the Reprogram Your
-- Appetite programme's payment: an admin who wired a price to that programme
-- turned the community invite into a checkout button, and there was no way to
-- edit the banner on its own.

insert into public.site_cta_placements (key, label_bg, label_en) values
  (
    'bio_banner_cta',
    'Начална страница — банер „Веси Ней“ (бутон „Към общността“)',
    'Home — “Vessie Nay” banner (community button)'
  )
on conflict (key) do nothing;

notify pgrst, 'reload schema';

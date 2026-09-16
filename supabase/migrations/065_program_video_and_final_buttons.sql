-- 065: the button under the video and the last button of each programme page
-- get their own rows.
--
-- components/site/program-landing.tsx rendered both with the programme's main
-- placement key, so choosing a Stripe product for the main button also turned
-- „Още подробности — видео тук“ and „Свържи се с мен тук“ into payment buttons,
-- and neither could be edited on its own.

insert into public.site_cta_placements (key, label_bg, label_en) values
  (
    'programs_1_video',
    'Живей без резистентност — бутон под видеото',
    'Live Without Resistance — button under the video'
  ),
  (
    'programs_1_final',
    'Живей без резистентност — последен бутон на страницата',
    'Live Without Resistance — last button on the page'
  ),
  (
    'programs_2_final',
    'Препрограмирай апетита — последен бутон на страницата',
    'Reprogram Your Appetite — last button on the page'
  ),
  (
    'programs_0_final',
    'Лято – стройна и спокойна — последен бутон на страницата',
    'Summer — slim and calm — last button on the page'
  )
on conflict (key) do nothing;

notify pgrst, 'reload schema';

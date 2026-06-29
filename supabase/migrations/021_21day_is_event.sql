-- 21-day: programs card → events; keep 3 program popup slots

update public.site_cta_placements set
  label_bg = 'Програми — картичка „21 дни“ (води към събития)',
  label_en = 'Programs — “21 days” card (links to events)'
where key = 'programs_0';

update public.site_cta_placements set
  label_bg = 'Програма „Живей без резистентност“ — бутон „Кандидатствай“',
  label_en = 'Program “Live Without Resistance” — “Apply now” button'
where key = 'programs_1';

update public.site_cta_placements set
  label_bg = 'Програма „Препрограмирай апетита“ — бутон „Научи повече“',
  label_en = 'Program “Reprogram Your Appetite” — “Learn more” button',
  offer_enabled = coalesce(offer_enabled, false)
where key = 'programs_2';

notify pgrst, 'reload schema';

-- Editable button label + URL per CTA placement (program landings, etc.)
alter table public.site_cta_placements
  add column if not exists button_label_bg text not null default '',
  add column if not exists button_label_en text not null default '',
  add column if not exists button_url text not null default '';

insert into public.site_cta_placements (key, label_bg, label_en) values
  ('programs_0_secondary', 'Гарнитури — втори бутон (ако има)', 'Side dishes — secondary button'),
  ('programs_0_pricing_0', 'Гарнитури — бутон за плащане', 'Side dishes — checkout button'),
  ('programs_1_secondary', 'Живей без резистентност — „Виж какво включва“', 'Live Without Resistance — “See what''s included”'),
  ('programs_1_pricing_0', 'Живей без резистентност — месечни вноски', 'Live Without Resistance — monthly plan button'),
  ('programs_1_pricing_1', 'Живей без резистентност — еднократно плащане', 'Live Without Resistance — one-time payment button'),
  ('programs_2_secondary', 'Препрограмирай апетита — втори бутон', 'Reprogram appetite — secondary button'),
  ('programs_2_pricing_0', 'Препрограмирай апетита — месечен достъп', 'Reprogram appetite — monthly access button'),
  ('programs_2_pricing_1', 'Препрограмирай апетита — вариант 1 (12 мес.)', 'Reprogram appetite — plan 1 button'),
  ('programs_2_pricing_2', 'Препрограмирай апетита — вариант 2 (3 мес.)', 'Reprogram appetite — plan 2 button')
on conflict (key) do nothing;

update public.site_cta_placements
set
  label_bg = 'Живей без резистентност — „Включи се днес“ (горен бутон)',
  label_en = 'Live Without Resistance — “Join today” (hero primary)'
where key = 'programs_1';

notify pgrst, 'reload schema';

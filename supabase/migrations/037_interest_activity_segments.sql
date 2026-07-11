-- Ensure interest + activity segments exist for free menu / forms routing.

insert into public.segments (key, name, description) values
  ('insulin-resistance', 'Insulin resistance', 'Interested in IR / blood sugar'),
  ('weight-loss', 'Weight loss', 'Interested in losing weight'),
  ('diabetes', 'Type 2 Diabetes', 'Diabetes remission audience'),
  ('free-menu', 'Free menu', 'Downloaded the free menu lead magnet')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description;

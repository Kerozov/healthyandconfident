-- Ensure free-menu activity + health segments exist.

insert into public.segments (key, name, description) values
  ('free-menu', 'Free menu', 'Signed up for the free menu lead magnet'),
  ('insulin-resistance', 'Insulin resistance', 'Interested in IR / blood sugar'),
  ('weight-loss', 'Weight loss', 'Interested in losing weight'),
  ('diabetes', 'Type 2 Diabetes', 'Diabetes remission audience')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description;

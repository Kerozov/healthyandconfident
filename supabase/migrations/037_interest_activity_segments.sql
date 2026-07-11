-- Ensure interest segments exist (answer on free menu / forms → segment key).

insert into public.segments (key, name, description) values
  ('insulin-resistance', 'Insulin resistance', 'Interested in IR / blood sugar'),
  ('weight-loss', 'Weight loss', 'Interested in losing weight'),
  ('diabetes', 'Type 2 Diabetes', 'Diabetes remission audience')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description;

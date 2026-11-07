-- 090: the entry questionnaire on the public site
--
-- One form can be put in front of visitors as the place to start: an item in
-- the header menu right after „Програми“ and a card under the programmes on the
-- home page, both opening the form. Edited from Въпросници in the admin; the
-- public site reads it with the anon key, so it gets a read-only policy.

create table if not exists public.site_questionnaire_cta (
  id text primary key default 'home' check (id = 'home'),
  form_slug text not null default '',
  show_in_nav boolean not null default false,
  show_on_home boolean not null default false,
  show_en boolean not null default false,
  nav_label_bg text not null default 'Въпросник',
  nav_label_en text not null default 'Questionnaire',
  eyebrow_bg text not null default 'Първата стъпка',
  eyebrow_en text not null default 'The first step',
  title_bg text not null default '',
  title_en text not null default '',
  text_bg text not null default '',
  text_en text not null default '',
  button_bg text not null default 'Попълни въпросника',
  button_en text not null default 'Take the questionnaire',
  image_url text,
  updated_at timestamptz not null default now()
);

alter table public.site_questionnaire_cta enable row level security;

grant select, insert, update, delete on public.site_questionnaire_cta to service_role;
grant select on public.site_questionnaire_cta to anon, authenticated;

drop policy if exists "public read" on public.site_questionnaire_cta;
create policy "public read" on public.site_questionnaire_cta
  for select to anon, authenticated using (true);

notify pgrst, 'reload schema';

-- Renaming a form's slug used to orphan every link already sent: the invite
-- emails, the copied public link, the QR on a flyer — all 404 the moment the
-- slug changed. Every slug a form has ever had is kept here and resolves to it.

create table if not exists public.form_template_slugs (
  slug       text primary key,
  form_id    uuid not null references public.form_templates(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists form_template_slugs_form_idx
  on public.form_template_slugs (form_id);

-- Seed what is live today, so the first rename after this migration is already
-- covered instead of starting the history from the next one.
insert into public.form_template_slugs (slug, form_id)
select slug, id from public.form_templates
on conflict (slug) do nothing;

notify pgrst, 'reload schema';

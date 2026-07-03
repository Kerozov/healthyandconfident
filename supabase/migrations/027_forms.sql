-- Dynamic forms: templates, submissions, email invitations

create table if not exists public.form_templates (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  title_bg         text not null default '',
  title_en         text not null default '',
  description_bg   text not null default '',
  description_en   text not null default '',
  fields           jsonb not null default '[]',
  settings         jsonb not null default '{}',
  email_subject_bg text not null default '',
  email_subject_en text not null default '',
  email_intro_bg   text not null default '',
  email_intro_en   text not null default '',
  enabled          boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public.form_templates(id) on delete cascade,
  subscriber_id uuid references public.subscribers(id) on delete set null,
  email         text,
  answers       jsonb not null default '{}',
  submitted_at  timestamptz not null default now()
);

create index if not exists form_submissions_form_idx
  on public.form_submissions (form_id, submitted_at desc);

create index if not exists form_submissions_email_idx
  on public.form_submissions (email);

create table if not exists public.form_invitations (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public.form_templates(id) on delete cascade,
  subscriber_id uuid references public.subscribers(id) on delete set null,
  email         text not null,
  token         text not null unique,
  sent_at       timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists form_invitations_form_idx
  on public.form_invitations (form_id, sent_at desc);

drop trigger if exists form_templates_updated_at on public.form_templates;
create trigger form_templates_updated_at before update on public.form_templates
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

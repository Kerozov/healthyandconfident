-- 052: Admin profiles with screen-level access + audit log.
-- Service-role only. The shared ADMIN_SECRET remains the owner master password.

create table if not exists public.admin_users (
  id              uuid primary key default gen_random_uuid(),
  username        text not null,
  display_name    text not null,
  password_hash   text,
  role            text not null default 'member'
                    check (role in ('owner', 'member')),
  screens         text[] not null default '{}',
  active          boolean not null default true,
  last_login_at   timestamptz,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists admin_users_username_idx
  on public.admin_users (lower(username));

create unique index if not exists admin_users_one_owner_idx
  on public.admin_users (role)
  where role = 'owner';

drop trigger if exists admin_users_updated_at on public.admin_users;
create trigger admin_users_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

create table if not exists public.admin_audit_log (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid references public.admin_users(id) on delete set null,
  actor_username  text not null,
  actor_name      text not null,
  screen          text not null default '',
  action          text not null,
  summary         text not null,
  entity_type     text,
  entity_id       text,
  created_at      timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_actor_created_idx
  on public.admin_audit_log (actor_id, created_at desc);

alter table public.admin_users enable row level security;
alter table public.admin_audit_log enable row level security;

revoke all on public.admin_users from anon, authenticated;
revoke all on public.admin_audit_log from anon, authenticated;

notify pgrst, 'reload schema';

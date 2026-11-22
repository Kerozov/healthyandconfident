-- Конекторът на Claude (MCP) към админа на сайта.
-- Claude се регистрира сам (mcp_clients), собственикът потвърждава с код по
-- имейл (mcp_email_challenges), Claude сменя еднократния код (mcp_auth_codes)
-- за токен (mcp_tokens). Пазят се само хешове. Чете и пише само сървърът
-- със service_role; anon и authenticated нямат достъп.

create table if not exists public.mcp_clients (
  id text primary key,
  name text not null default '',
  redirect_uris text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.mcp_email_challenges (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null,
  client_id text not null references public.mcp_clients(id) on delete cascade,
  email text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mcp_email_challenges_created_idx
  on public.mcp_email_challenges (created_at desc);

create table if not exists public.mcp_auth_codes (
  code_hash text primary key,
  client_id text not null references public.mcp_clients(id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.mcp_clients(id) on delete cascade,
  email text not null,
  access_hash text not null unique,
  refresh_hash text not null unique,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mcp_tokens_client_idx
  on public.mcp_tokens (client_id, created_at desc);

alter table public.mcp_clients enable row level security;
alter table public.mcp_email_challenges enable row level security;
alter table public.mcp_auth_codes enable row level security;
alter table public.mcp_tokens enable row level security;

revoke all on public.mcp_clients from anon, authenticated;
revoke all on public.mcp_email_challenges from anon, authenticated;
revoke all on public.mcp_auth_codes from anon, authenticated;
revoke all on public.mcp_tokens from anon, authenticated;

grant select, insert, update, delete on public.mcp_clients to service_role;
grant select, insert, update, delete on public.mcp_email_challenges to service_role;
grant select, insert, update, delete on public.mcp_auth_codes to service_role;
grant select, insert, update, delete on public.mcp_tokens to service_role;

notify pgrst, 'reload schema';

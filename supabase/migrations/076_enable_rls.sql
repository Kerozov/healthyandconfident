-- 076: Row level security on every public table.
--
-- 32 tables were created without RLS, and Supabase grants the `anon` role full
-- read/write on anything in `public`. Anyone holding the anon key could list
-- every subscriber (with their health-interest tags), read form answers and
-- purchases, delete rows, or rewrite an automation's HTML and have it mailed
-- to the whole list.
--
-- The app only ever writes through the service role, which bypasses RLS. The
-- anon client is used server-side to read published site content, so those
-- tables get a read-only policy; everything else is closed to anon entirely.

do $$
declare
  t text;
begin
  foreach t in array array[
    'automated_emails',
    'automation_deliveries',
    'automations',
    'blog_posts',
    'campaign_deliveries',
    'contact_events',
    'contact_worker_jobs',
    'contacts',
    'email_campaigns',
    'email_footer_config',
    'email_link_clicks',
    'form_invitations',
    'form_submissions',
    'form_template_slugs',
    'form_templates',
    'popup_config',
    'segment_groups',
    'segments',
    'site_contact_config',
    'site_cta_placements',
    'site_events',
    'site_guides',
    'site_products',
    'site_program_cards',
    'site_sections',
    'site_videos',
    'sms_campaigns',
    'subscriber_purchases',
    'subscribers',
    'zoom_live_config',
    'zoom_session_events',
    'zoom_webhook_log'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end
$$;

-- Read-only access to what the public site renders (lib/blog.ts,
-- lib/site/content.ts, lib/site/contact-config.ts, lib/site/popup-config.ts).
-- Checkout and /buy read disabled rows too, so the site_* policies are not
-- filtered by `enabled`.
do $$
declare
  t text;
begin
  foreach t in array array[
    'popup_config',
    'segments',
    'site_contact_config',
    'site_cta_placements',
    'site_events',
    'site_guides',
    'site_products',
    'site_program_cards',
    'site_sections',
    'site_videos'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "public read" on public.%I', t);
      execute format(
        'create policy "public read" on public.%I for select to anon, authenticated using (true)',
        t
      );
    end if;
  end loop;
end
$$;

drop policy if exists "public read published" on public.blog_posts;
create policy "public read published" on public.blog_posts
  for select to anon, authenticated
  using (status = 'published');

-- RLS does not govern TRUNCATE, and nothing outside the service role should
-- write at all — take the write grants away as a second line.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;

-- Supabase linter: function with a role-mutable search_path.
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    alter function public.set_updated_at() set search_path = pg_catalog, public;
  end if;
end
$$;

notify pgrst, 'reload schema';

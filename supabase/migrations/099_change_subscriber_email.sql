-- 099: Change a person's email from the admin, everywhere at once.
--
-- The person's whole trail is keyed by email: deliveries, clicks, purchases,
-- form answers. Renaming only `subscribers.email` would leave the profile
-- empty and the old address still on every queued email. One transaction moves
-- all of it or nothing.
--
-- Rows the new address already has for the same step or campaign are left on
-- the old address — two rows for one step would break the "already sent"
-- check that stops a step going out twice.
--
-- Mail already queued in the notification worker is moved by the server action
-- that calls this; the database cannot reach the worker.
--
-- Service-role only; the admin server action is the sole caller.

alter table public.subscriber_history
  drop constraint if exists subscriber_history_kind_check;
alter table public.subscriber_history
  add constraint subscriber_history_kind_check
  check (kind in ('status', 'groups', 'sync', 'email'));

create or replace function public.change_subscriber_email(
  p_subscriber_id uuid,
  p_new_email text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_old text;
  v_new text := lower(btrim(coalesce(p_new_email, '')));
  v_moved jsonb := '{}'::jsonb;
  v_count integer;
begin
  if v_new !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  select lower(email) into v_old
  from subscribers
  where id = p_subscriber_id
  for update;

  if v_old is null then
    raise exception 'subscriber_not_found' using errcode = 'P0002';
  end if;

  if v_old = v_new then
    return jsonb_build_object('old_email', v_old, 'new_email', v_new, 'changed', false);
  end if;

  if exists (
    select 1 from subscribers where lower(email) = v_new and id <> p_subscriber_id
  ) or exists (
    select 1 from contacts where lower(email) = v_new and id <> p_subscriber_id
  ) then
    raise exception 'email_taken' using errcode = '23505';
  end if;

  update subscribers set email = v_new where id = p_subscriber_id;
  update contacts set email = v_new where id = p_subscriber_id;

  update automation_deliveries d
  set email = v_new,
      subscriber_id = coalesce(d.subscriber_id, p_subscriber_id)
  where lower(d.email) = v_old
    and not exists (
      select 1 from automation_deliveries x
      where x.automation_id = d.automation_id and lower(x.email) = v_new
    );
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('automation_deliveries', v_count);

  update campaign_deliveries d
  set email = v_new,
      subscriber_id = coalesce(d.subscriber_id, p_subscriber_id)
  where lower(d.email) = v_old
    and not exists (
      select 1 from campaign_deliveries x
      where x.campaign_id = d.campaign_id and lower(x.email) = v_new
    );
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('campaign_deliveries', v_count);

  update delivery_issue_ignores d
  set email = v_new
  where lower(d.email) = v_old
    and not exists (
      select 1 from delivery_issue_ignores x
      where x.automation_id = d.automation_id and lower(x.email) = v_new
    );

  update email_link_clicks set email = v_new where lower(email) = v_old;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('email_link_clicks', v_count);

  update subscriber_purchases set email = v_new where lower(email) = v_old;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('subscriber_purchases', v_count);

  update form_submissions set email = v_new where lower(email) = v_old;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('form_submissions', v_count);

  update form_invitations set email = v_new where lower(email) = v_old;

  return jsonb_build_object(
    'old_email', v_old,
    'new_email', v_new,
    'changed', true,
    'moved', v_moved
  );
end;
$$;

-- Supabase grants new functions to anon/authenticated by default.
revoke all on function public.change_subscriber_email(uuid, text) from public, anon, authenticated;
grant execute on function public.change_subscriber_email(uuid, text) to service_role;

notify pgrst, 'reload schema';

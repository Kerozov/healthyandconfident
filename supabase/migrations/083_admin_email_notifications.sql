-- Opt-in staff notifications. Existing profiles receive nothing until enabled.
alter table public.admin_users
  add column if not exists notification_email text,
  add column if not exists notify_form_submissions boolean not null default false,
  add column if not exists notify_new_subscribers boolean not null default false;

alter table public.admin_users
  drop constraint if exists admin_users_notification_email_required;
alter table public.admin_users
  add constraint admin_users_notification_email_required check (
    not (notify_form_submissions or notify_new_subscribers)
    or (notification_email is not null and btrim(notification_email) <> '')
  );

-- A single invitation may produce only one submission and one staff alert,
-- even when two requests both read completed_at before either saves.
alter table public.form_submissions
  add column if not exists invitation_id uuid
    references public.form_invitations(id) on delete set null;

create unique index if not exists form_submissions_invitation_idx
  on public.form_submissions (invitation_id)
  where invitation_id is not null;

notify pgrst, 'reload schema';

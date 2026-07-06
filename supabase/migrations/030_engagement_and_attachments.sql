-- Engagement: which button was clicked
alter table public.email_link_clicks
  add column if not exists link_label text;

-- PDF attachments on campaigns and automations
alter table public.email_campaigns
  add column if not exists attachment_path text,
  add column if not exists attachment_filename text;

alter table public.automations
  add column if not exists attachment_path_bg text,
  add column if not exists attachment_filename_bg text,
  add column if not exists attachment_path_en text,
  add column if not exists attachment_filename_en text;

alter table public.form_templates
  add column if not exists attachment_path text,
  add column if not exists attachment_filename text;

notify pgrst, 'reload schema';

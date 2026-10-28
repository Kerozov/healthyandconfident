-- Forms store their locale-specific buttons in form_templates.settings (JSONB).
-- Menu/newsletter signups share an optional button with the signup popup.
-- Checkout confirmations have an independent button in the same locale settings.
alter table public.popup_config
  add column if not exists success_button jsonb,
  add column if not exists checkout_button jsonb;

notify pgrst, 'reload schema';

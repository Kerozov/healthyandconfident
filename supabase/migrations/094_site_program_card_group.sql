-- 094: each programme card can show a group link after purchase.
--
-- Until now the thank-you screen after a Stripe payment showed one global
-- button (popup_config.checkout_button). A programme sold through its own
-- landing page can now carry a group invite (Viber/Facebook/Skool) that is
-- shown instead, right after the payment for that programme succeeds.

alter table public.site_program_cards
  add column if not exists group_label_bg text not null default '',
  add column if not exists group_label_en text not null default '',
  add column if not exists group_url text not null default '';

notify pgrst, 'reload schema';

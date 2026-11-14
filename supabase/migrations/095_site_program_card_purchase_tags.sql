-- 095: paying for a programme puts the buyer into the card's groups.
--
-- Same as „Групи след покупка“ on products and guides (purchase_tags): after a
-- paid Stripe Checkout opened from the programme's buttons, the contact gets
-- these segment keys, so the automations of those groups start.
--
-- 094 added a group *invite link* shown as a button on the thank-you screen.
-- That was not what was asked for; its three columns were never filled, so
-- they go.

alter table public.site_program_cards
  add column if not exists purchase_tags text[] not null default '{}';

alter table public.site_program_cards
  drop column if exists group_label_bg,
  drop column if exists group_label_en,
  drop column if exists group_url;

notify pgrst, 'reload schema';

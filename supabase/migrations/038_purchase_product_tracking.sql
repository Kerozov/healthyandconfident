-- Stripe product tracking: prod_… on products, payment status per purchase line.

alter table public.site_products
  add column if not exists stripe_product_id text not null default '';

alter table public.subscriber_purchases
  add column if not exists stripe_product_id text,
  add column if not exists payment_status text not null default 'paid',
  add column if not exists amount_cents int,
  add column if not exists currency text;

alter table public.subscriber_purchases
  drop constraint if exists subscriber_purchases_payment_status_check;

alter table public.subscriber_purchases
  add constraint subscriber_purchases_payment_status_check
  check (payment_status in ('paid', 'refunded', 'failed'));

create unique index if not exists subscriber_purchases_session_stripe_product_idx
  on public.subscriber_purchases (stripe_session_id, stripe_product_id)
  where stripe_session_id is not null
    and stripe_product_id is not null
    and stripe_product_id <> '';

create index if not exists subscriber_purchases_stripe_product_idx
  on public.subscriber_purchases (stripe_product_id, payment_status);

notify pgrst, 'reload schema';

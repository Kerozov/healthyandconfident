-- Automated transactional emails (registration, purchase)
create table if not exists public.automated_emails (
  id         uuid primary key default gen_random_uuid(),
  trigger    text not null check (trigger in ('registration', 'purchase')),
  locale     text not null check (locale in ('bg', 'en')),
  enabled    boolean not null default false,
  subject    text not null default '',
  html       text not null default '',
  updated_at timestamptz not null default now(),
  unique (trigger, locale)
);

insert into public.automated_emails (trigger, locale, enabled, subject, html) values
  (
    'registration',
    'bg',
    false,
    'Добре дошла, {{name}}!',
    '<h1>Здравей, {{name}}!</h1><p>Благодарим ти, че се регистрира при нас. Скоро ще получиш полезни съвети на {{email}}.</p><p>С любов,<br>Vessie Ney</p>'
  ),
  (
    'registration',
    'en',
    false,
    'Welcome, {{name}}!',
    '<h1>Hi {{name}}!</h1><p>Thanks for signing up. We''ll send helpful tips to {{email}}.</p><p>With love,<br>Vessie Ney</p>'
  ),
  (
    'purchase',
    'bg',
    false,
    'Благодарим за покупката, {{name}}!',
    '<h1>Здравей, {{name}}!</h1><p>Получихме поръчката ти. Ако имаш въпроси, просто отговори на този имейл.</p><p>С любов,<br>Vessie Ney</p>'
  ),
  (
    'purchase',
    'en',
    false,
    'Thank you for your purchase, {{name}}!',
    '<h1>Hi {{name}}!</h1><p>We received your order. Reply to this email if you have any questions.</p><p>With love,<br>Vessie Ney</p>'
  )
on conflict (trigger, locale) do nothing;

notify pgrst, 'reload schema';

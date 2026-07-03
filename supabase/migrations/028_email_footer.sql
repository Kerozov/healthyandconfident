-- 028: editable email signature + footer (per locale)
create table if not exists public.email_footer_config (
  id                  uuid primary key default gen_random_uuid(),
  locale              text not null unique check (locale in ('bg', 'en')),
  signature_enabled   boolean not null default true,
  signature_image_url text,
  signature_closing   text not null default '',
  signature_name      text not null default '',
  signature_title     text not null default '',
  signature_email     text not null default '',
  signature_phone     text not null default '',
  brand_name          text not null default '',
  brand_color         text not null default '#2563eb',
  website_url         text not null default '',
  footer_email        text not null default '',
  footer_phone        text not null default '',
  address_line1       text not null default '',
  address_line2       text not null default '',
  facebook_url        text,
  youtube_url         text,
  disclaimer          text not null default '',
  preferences_url     text,
  updated_at          timestamptz not null default now()
);

insert into public.email_footer_config (
  locale,
  signature_closing,
  signature_name,
  signature_title,
  signature_email,
  signature_phone,
  brand_name,
  website_url,
  footer_email,
  footer_phone,
  address_line1,
  address_line2,
  disclaimer
)
values
  (
    'bg',
    '❤️ С обич и подкрепа,',
    'Веси',
    'Холистичен Диетолог B.Med.Sc. (Hons) & СПРАВЯНЕ с Инсулинова резистентност и Диабет 2',
    'vessie@healthyandconfident.co.uk',
    '00 44 7876 565 263',
    'Healthy and Confident',
    'https://www.healthyandconfident.co.uk/bg',
    'vessie@healthyandconfident.co.uk',
    'M: 0044 7876 565 263',
    'Фарнбъро',
    'Обединеното кралство',
    'Получихте този имейл, защото сте се регистрирали на наша платформа или сте участвали в наше обучение или програма.'
  ),
  (
    'en',
    'With love and support,',
    'Vesi',
    'Holistic Dietitian B.Med.Sc. (Hons) — insulin resistance & type 2 diabetes',
    'vessie@healthyandconfident.co.uk',
    '00 44 7876 565 263',
    'Healthy and Confident',
    'https://www.healthyandconfident.co.uk/en',
    'vessie@healthyandconfident.co.uk',
    'M: 0044 7876 565 263',
    'Farnborough',
    'United Kingdom',
    'You received this email because you registered on our platform or took part in one of our trainings or programmes.'
  )
on conflict (locale) do nothing;

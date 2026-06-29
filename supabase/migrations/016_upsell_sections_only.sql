-- Upsell only on content sections (not hero / nav)

insert into public.site_cta_placements (key, label_bg, label_en) values
  ('outcomes_cta', 'Резултати — бутон „Запиши безплатен разговор“', 'Outcomes — book a free call button'),
  ('leadmagnet_cta', 'Безплатно меню — след изпращане на имейл', 'Lead magnet — after email submit')
on conflict (key) do nothing;

update public.site_cta_placements
set offer_enabled = false, offer_id = null
where key in ('hero_primary', 'hero_secondary', 'nav_cta');

notify pgrst, 'reload schema';

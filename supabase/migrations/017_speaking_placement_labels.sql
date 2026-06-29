-- Speaking placement labels; disable popup on contact

update public.site_cta_placements set
  label_bg = 'Програма „Балансирано хранене 21 дни“ — бутон „Вземи днес“',
  label_en = 'Program “Balanced Nutrition 21 Days” — “Get started” button'
where key = 'programs_0';

update public.site_cta_placements set
  label_bg = 'Програма „Живей без резистентност“ — бутон „Кандидатствай“',
  label_en = 'Program “Live Without Resistance” — “Apply now” button'
where key = 'programs_1';

update public.site_cta_placements set
  label_bg = 'Програма „Препрограмирай апетита“ — бутон „Научи повече“',
  label_en = 'Program “Reprogram Your Appetite” — “Learn more” button'
where key = 'programs_2';

update public.site_cta_placements set
  label_bg = 'Секция „За мен“ — бутон „Работи с мен“',
  label_en = 'About section — “Work with me” button'
where key = 'about_cta';

update public.site_cta_placements set
  label_bg = 'Секция „Резултати“ — бутон „Запиши безплатен разговор“',
  label_en = 'Outcomes section — “Book a free call” button'
where key = 'outcomes_cta';

update public.site_cta_placements set
  label_bg = 'Безплатно 2-дневно меню — popup след запис на имейл',
  label_en = 'Free 2-day menu — popup after email signup'
where key = 'leadmagnet_cta';

update public.site_cta_placements set
  label_bg = 'Контакти — WhatsApp (без popup)',
  label_en = 'Contact — WhatsApp (no popup)',
  offer_enabled = false,
  offer_id = null
where key = 'contact_cta';

update public.site_cta_placements p set
  label_bg = 'Магазин: „' || pr.title_bg || '“ — доп. оферта преди Stripe',
  label_en = 'Shop: “' || pr.title_en || '” — extra offer before Stripe checkout'
from public.site_products pr
where p.key = 'product_' || pr.id::text;

notify pgrst, 'reload schema';

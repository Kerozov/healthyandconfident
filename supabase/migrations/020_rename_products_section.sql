-- Rename shop section default title (Upsell/Downsell → Products)

update public.site_sections
set
  title_bg = 'Специални програми',
  title_en = 'Programs & products'
where key = 'products'
  and (title_bg ilike '%upsell%' or title_en ilike '%upsell%' or title_en = 'Products');

notify pgrst, 'reload schema';

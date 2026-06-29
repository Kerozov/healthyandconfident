-- Remove per-offer audience targeting (show all offers to everyone)

update public.site_products set audience_tags = '{}';

notify pgrst, 'reload schema';

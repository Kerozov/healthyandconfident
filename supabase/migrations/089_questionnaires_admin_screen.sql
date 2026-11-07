-- /admin/questionnaires shows the answers people gave in the site's forms -
-- subscriber data. Team members choose screens one by one, so a new screen is
-- hidden from all of them until someone ticks it. Whoever can already see the
-- forms or the subscribers gets this view of the same answers.

update public.admin_users
set screens = array_append(screens, 'questionnaires')
where role <> 'owner'
  and ('forms' = any(screens) or 'subscribers' = any(screens))
  and not ('questionnaires' = any(screens));

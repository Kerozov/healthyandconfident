-- /admin/free-menu lists the people who asked for the free menu and their
-- answers - subscriber data. Team members choose screens one by one, so a new
-- screen is hidden from all of them until someone ticks it. Whoever can already
-- see the subscribers gets this view of the same people.

update public.admin_users
set screens = array_append(screens, 'free-menu')
where role <> 'owner'
  and 'subscribers' = any(screens)
  and not ('free-menu' = any(screens));

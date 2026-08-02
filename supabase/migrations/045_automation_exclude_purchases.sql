-- Изключване на купувачи от автоматизация:
-- всеки, платил някой от тези продукти, не влиза в аудиторията
-- и насрочените му имейли/SMS-и се спират при плащането.
alter table public.automations
  add column if not exists exclude_purchase_product_ids uuid[] not null default '{}';

comment on column public.automations.exclude_purchase_product_ids is
  'Продукти, чиито купувачи се изключват от тази автоматизация (празно = никой не се изключва).';

notify pgrst, 'reload schema';

-- READ ONLY. Save the resolved signature and ACL with deployment records.
select p.oid::regprocedure as resolved_signature,
       p.proowner::regrole as owner, p.prosecdef, p.proconfig, p.proacl,
       pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute,
       pg_catalog.pg_get_functiondef(p.oid) as deployed_definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname='staff_set_order_fulfillment_status';

select c.oid::regclass as relation, c.relrowsecurity, c.relforcerowsecurity
from pg_catalog.pg_class c
where c.oid in ('public.orders'::regclass,'public.staff_users'::regclass);

select policyname, cmd, roles, qual, with_check
from pg_catalog.pg_policies
where schemaname='public' and tablename='orders';

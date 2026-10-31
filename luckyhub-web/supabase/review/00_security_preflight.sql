-- READ ONLY. Return these results before claiming deployment/security verification.
select version(), current_setting('server_version_num') as server_version_num,
       current_user, session_user,
       current_setting('pgrst.db_schemas', true) as configured_api_schemas;
-- If configured_api_schemas is NULL, check the Dashboard API exposed schemas.

select c.oid::regclass as relation, c.relowner::regrole as owner,
       c.relrowsecurity, c.relforcerowsecurity
from pg_catalog.pg_class c
where c.oid in ('public.orders'::regclass, 'public.order_items'::regclass,
               'public.staff_users'::regclass);

select column_name, data_type, udt_schema, udt_name, is_nullable
from information_schema.columns
where table_schema='public' and table_name in ('orders','staff_users')
order by table_name, ordinal_position;

select conrelid::regclass as relation, conname,
       pg_catalog.pg_get_constraintdef(oid) as definition
from pg_catalog.pg_constraint
where conrelid in ('public.orders'::regclass,'public.staff_users'::regclass);

select distinct role, is_active from public.staff_users;
select tablename, policyname, roles, cmd, permissive, qual, with_check
from pg_catalog.pg_policies
where schemaname='public'
  and tablename in ('staff_users','orders','order_items');

select grantee, privilege_type, is_grantable
from information_schema.table_privileges
where table_schema='public' and table_name='staff_users';
select grantee, column_name, privilege_type
from information_schema.column_privileges
where table_schema='public' and table_name='staff_users';

select rolname, rolsuper, rolbypassrls, rolcanlogin
from pg_catalog.pg_roles
where rolname in ('postgres','authenticated','anon');

-- Must not give API callers administrative ownership privileges.
select pg_catalog.pg_has_role('anon','postgres','USAGE') as anon_inherits_postgres,
       pg_catalog.pg_has_role('authenticated','postgres','USAGE') as authenticated_inherits_postgres;

select t.tgrelid::regclass as relation, t.tgname, t.tgenabled,
       pg_catalog.pg_get_triggerdef(t.oid) as trigger_definition,
       pg_catalog.pg_get_functiondef(t.tgfoid) as function_definition
from pg_catalog.pg_trigger t
where t.tgrelid in ('public.orders'::regclass,'public.order_items'::regclass,
                   'public.staff_users'::regclass)
  and not t.tgisinternal;

-- Inventory callable user-defined functions, not merely names containing staff.
-- Review functions in ALL API-exposed schemas, including invoker wrappers and
-- their privileged callees. Arbitrary function bodies require human review.
select n.nspname as schema_name, p.oid::regprocedure as signature,
       p.proowner::regrole as owner, p.prosecdef, p.proconfig, p.proacl,
       pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where p.prokind='f'
  and n.nspname !~ '^pg_'
  and n.nspname <> 'information_schema'
  and (pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    or pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'))
order by n.nspname,p.proname;

select * from pg_catalog.pg_publication_tables
where schemaname='public' and tablename='orders';

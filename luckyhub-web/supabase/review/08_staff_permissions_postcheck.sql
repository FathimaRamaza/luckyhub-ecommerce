-- READ ONLY after hardening. Do not TRUNCATE/INSERT/UPDATE staff as a test.
-- Expected: authenticated table SELECT true; anon SELECT false;
-- all unsafe table/column checks false. Nonempty residual_findings need review.
select r.role_name,
       pg_catalog.has_table_privilege(r.role_name,'public.staff_users','SELECT') as table_select,
       pg_catalog.has_any_column_privilege(r.role_name,'public.staff_users','SELECT') as any_column_select
from (values ('anon'),('authenticated')) r(role_name);

with reachable as (
  select client.role_name as client_role, r.*,
         pg_catalog.pg_has_role(client.role_name,r.oid,'MEMBER WITH ADMIN OPTION') as can_admin_role
  from (values ('anon'),('authenticated')) client(role_name)
  cross join pg_catalog.pg_roles r
  where pg_catalog.pg_has_role(client.role_name,r.oid,'USAGE')
     or pg_catalog.pg_has_role(client.role_name,r.oid,'SET')
     or pg_catalog.pg_has_role(client.role_name,r.oid,'MEMBER WITH ADMIN OPTION')
), residual_findings as (
  select r.client_role,r.rolname as source_role,'table '||p.privilege as finding
  from reachable r
  cross join (values ('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege)
  where pg_catalog.has_table_privilege(r.oid,'public.staff_users',p.privilege)
  union all
  select r.client_role,r.rolname,'column '||p.privilege
  from reachable r cross join (values ('INSERT'),('UPDATE'),('REFERENCES')) p(privilege)
  where pg_catalog.has_any_column_privilege(r.oid,'public.staff_users',p.privilege)
  union all
  select r.client_role,r.rolname,'administrative role authority'
  from reachable r where r.rolsuper or r.rolbypassrls or r.rolcreaterole or r.can_admin_role
    or r.oid=(select relowner from pg_catalog.pg_class where oid='public.staff_users'::regclass)
  union all
  select r.client_role,r.rolname,'anonymous SELECT'
  from reachable r where r.client_role='anon'
    and pg_catalog.has_any_column_privilege(r.oid,'public.staff_users','SELECT')
)
select * from residual_findings order by 1,2,3;

select oid::regclass as relation, relowner::regrole as owner,
       relrowsecurity, relforcerowsecurity
from pg_catalog.pg_class where oid='public.staff_users'::regclass;
select policyname,roles,cmd,qual,with_check
from pg_catalog.pg_policies where schemaname='public' and tablename='staff_users';
-- These checks do NOT certify privileged RPC/view/callee safety.

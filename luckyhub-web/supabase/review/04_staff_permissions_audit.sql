-- READ ONLY. Run before hardening and again afterwards. PostgreSQL 17.6.
select version(), current_user, session_user;
select oid::regclass as relation, relowner::regrole as owner,
       relrowsecurity, relforcerowsecurity, relacl
from pg_catalog.pg_class where oid='public.staff_users'::regclass;

-- Full table ACL, including PUBLIC and grant options/grantors.
select case when a.grantee=0 then 'PUBLIC' else a.grantee::regrole::text end as grantee,
       a.grantor::regrole as grantor, a.privilege_type, a.is_grantable
from pg_catalog.pg_class c
cross join lateral pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
where c.oid='public.staff_users'::regclass;

-- Explicit column ACLs. Table privileges can independently authorize columns.
select x.attname,
       case when a.grantee=0 then 'PUBLIC' else a.grantee::regrole::text end as grantee,
       a.grantor::regrole as grantor, a.privilege_type, a.is_grantable
from pg_catalog.pg_attribute x
cross join lateral pg_catalog.aclexplode(x.attacl) a
where x.attrelid='public.staff_users'::regclass and x.attnum>0 and not x.attisdropped;

-- Effective ordinary table permissions: includes PUBLIC/inherited privileges.
select client.role_name, priv.privilege,
       pg_catalog.has_table_privilege(client.role_name,'public.staff_users',priv.privilege) as effective
from (values ('anon'),('authenticated')) client(role_name)
cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) priv(privilege)
order by 1,2;

-- Any column authorization, including table-level authorization.
select client.role_name, priv.privilege,
       pg_catalog.has_any_column_privilege(client.role_name,'public.staff_users',priv.privilege) as effective
from (values ('anon'),('authenticated')) client(role_name)
cross join (values ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) priv(privilege);

-- Membership graph: SET and INHERIT are distinct on PostgreSQL 17.
select m.member::regrole as member, m.roleid::regrole as granted_role,
       m.grantor::regrole as grantor, m.inherit_option, m.set_option, m.admin_option
from pg_catalog.pg_auth_members m;

-- Roles whose privileges are immediately usable or reachable via SET ROLE.
select client.role_name as client_role, r.rolname as reachable_role,
       pg_catalog.pg_has_role(client.role_name,r.oid,'USAGE') as inherited,
       pg_catalog.pg_has_role(client.role_name,r.oid,'SET') as can_set_role,
       pg_catalog.pg_has_role(client.role_name,r.oid,'MEMBER WITH ADMIN OPTION') as can_admin_role,
       r.rolsuper, r.rolbypassrls, r.rolcreaterole,
       pg_catalog.has_table_privilege(r.oid,'public.staff_users','SELECT') as can_select,
       pg_catalog.has_table_privilege(r.oid,'public.staff_users','TRUNCATE') as can_truncate
from (values ('anon'),('authenticated')) client(role_name)
cross join pg_catalog.pg_roles r
where pg_catalog.pg_has_role(client.role_name,r.oid,'USAGE')
   or pg_catalog.pg_has_role(client.role_name,r.oid,'SET')
   or pg_catalog.pg_has_role(client.role_name,r.oid,'MEMBER WITH ADMIN OPTION');

select policyname, roles, cmd, permissive, qual, with_check
from pg_catalog.pg_policies where schemaname='public' and tablename='staff_users';

-- Updatable views can provide another write path; inspect definitions,
-- ownership, reloptions (security_invoker), grants and transitive dependencies.
select n.nspname, c.relname, c.relowner::regrole, c.relacl, c.reloptions,
       pg_catalog.pg_get_viewdef(c.oid,true) as definition
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where c.relkind='v' and n.nspname !~ '^pg_' and n.nspname<>'information_schema';

-- PUBLIC/inherited function privileges are reflected in has_function_privilege.
-- Review every Dashboard API-exposed schema and invoker-wrapper callees.
select n.nspname, p.oid::regprocedure as signature, p.proowner::regrole,
       p.prosecdef, p.proconfig, p.proacl,
       pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where p.prokind='f' and n.nspname !~ '^pg_' and n.nspname<>'information_schema'
  and (pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    or pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'))
order by n.nspname,p.proname;

select current_setting('pgrst.db_schemas',true) as api_schemas_setting;
-- If NULL, obtain actual Exposed schemas from Supabase Dashboard API settings.
-- pg_depend/text searches alone do NOT prove absence of dynamic SQL write paths.

-- Schema DDL privileges/ownership: audit exposed schemas and auth explicitly.
select n.nspname,n.nspowner::regrole as owner,n.nspacl,
       pg_catalog.has_schema_privilege('anon',n.oid,'CREATE') as anon_create,
       pg_catalog.has_schema_privilege('authenticated',n.oid,'CREATE') as authenticated_create,
       pg_catalog.has_schema_privilege('anon',n.oid,'USAGE') as anon_usage,
       pg_catalog.has_schema_privilege('authenticated',n.oid,'USAGE') as authenticated_usage
from pg_catalog.pg_namespace n
where n.nspname !~ '^pg_' and n.nspname<>'information_schema';

-- Defaults do not override existing ACLs, but affect future/recreated objects.
select d.defaclrole::regrole as grantor,
       case when d.defaclnamespace=0 then '(global)' else n.nspname end as schema_name,
       d.defaclobjtype,d.defaclacl
from pg_catalog.pg_default_acl d
left join pg_catalog.pg_namespace n on n.oid=d.defaclnamespace;

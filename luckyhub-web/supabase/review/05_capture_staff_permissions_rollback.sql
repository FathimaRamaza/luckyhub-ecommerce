-- READ ONLY. Run BEFORE 06_staff_permissions_hardening.sql.
-- Save the returned rollback_sql as a separate .sql file and review it.
-- This restores only direct privileges that the hardening removes, including
-- grant options. It does not change policies, role memberships or PUBLIC ACLs.
-- Hardening refuses non-postgres grantors, so replay as postgres preserves provenance.
with table_grants as (
  select pg_catalog.format('GRANT %s ON TABLE public.staff_users TO %I%s;',
    a.privilege_type,r.rolname,
    case when a.is_grantable then ' WITH GRANT OPTION' else '' end) as statement
  from pg_catalog.pg_class c
  cross join lateral pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
  join pg_catalog.pg_roles r on r.oid=a.grantee
  where c.oid='public.staff_users'::regclass
    and (r.rolname='anon' or (r.rolname='authenticated' and a.privilege_type<>'SELECT'))
    and r.rolname in ('anon','authenticated')
), column_grants as (
  select pg_catalog.format('GRANT %s (%I) ON TABLE public.staff_users TO %I%s;',
    a.privilege_type,x.attname,r.rolname,
    case when a.is_grantable then ' WITH GRANT OPTION' else '' end) as statement
  from pg_catalog.pg_attribute x
  cross join lateral pg_catalog.aclexplode(x.attacl) a
  join pg_catalog.pg_roles r on r.oid=a.grantee
  where x.attrelid='public.staff_users'::regclass and x.attnum>0 and not x.attisdropped
    and (r.rolname='anon' or (r.rolname='authenticated' and a.privilege_type<>'SELECT'))
    and r.rolname in ('anon','authenticated')
), statements as (
  select statement from table_grants union all select statement from column_grants
)
select '-- EMERGENCY ROLLBACK ONLY: restores prior unsafe API grants; explicit review required.' || E'\n'
  || 'begin;' || E'\n'
  || 'set local search_path = pg_catalog, pg_temp;' || E'\n'
  || 'do $guard$ begin if current_user <> ''postgres'' then raise exception ''Run rollback as postgres.''; end if; end; $guard$;' || E'\n'
  || coalesce(string_agg(statement,E'\n' order by statement),'-- No affected direct grants were present.')
  || E'\n' || 'commit;' as rollback_sql
from statements;

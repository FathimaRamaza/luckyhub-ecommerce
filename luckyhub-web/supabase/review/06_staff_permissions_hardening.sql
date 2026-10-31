-- PROPOSAL ONLY. Run manually as postgres AFTER audit and rollback capture.
-- PostgreSQL 17.6. Changes ACLs only; no policy/data/role membership changes.
-- If any guard fails, ROLLBACK the aborted transaction; do not bypass it.
begin;
set local search_path = pg_catalog, pg_temp;

do $guard$
declare
  v_owner oid;
  v_grants record;
begin
  if current_user <> 'postgres' then raise exception 'Run hardening as postgres.'; end if;
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'This hardening script was reviewed for PostgreSQL 17+ (includes MAINTAIN).';
  end if;
  select relowner into strict v_owner from pg_catalog.pg_class
  where oid='public.staff_users'::regclass and relrowsecurity;
  if v_owner <> 'postgres'::regrole::oid then
    raise exception 'Unexpected staff_users owner. Review grant provenance before proceeding.';
  end if;
  if not pg_catalog.has_table_privilege('authenticated','public.staff_users','SELECT') then
    raise exception 'Authenticated SELECT is missing; investigate before hardening.';
  end if;
  -- Do not silently alter grant chains originating from another grantor.
  for v_grants in
    select a.grantor from pg_catalog.pg_class c
    cross join lateral pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
    join pg_catalog.pg_roles r on r.oid=a.grantee
    where c.oid='public.staff_users'::regclass and r.rolname in ('anon','authenticated')
      and (r.rolname='anon' or a.privilege_type<>'SELECT')
    union all
    select a.grantor from pg_catalog.pg_attribute x
    cross join lateral pg_catalog.aclexplode(x.attacl) a
    join pg_catalog.pg_roles r on r.oid=a.grantee
    where x.attrelid='public.staff_users'::regclass and x.attnum>0 and not x.attisdropped
      and r.rolname in ('anon','authenticated')
      and (r.rolname='anon' or a.privilege_type<>'SELECT')
  loop
    if v_grants.grantor <> v_owner then
      raise exception 'Nonowner grantor found. Review captured ACL and downstream grant dependencies.';
    end if;
  end loop;
end;
$guard$;

revoke all privileges on table public.staff_users from anon restrict;
revoke insert, update, delete, truncate, references, trigger, maintain
  on table public.staff_users from authenticated restrict;

-- Table REVOKE does not remove independently granted column privileges.
do $columns$
declare v_column name;
begin
  for v_column in
    select attname from pg_catalog.pg_attribute
    where attrelid='public.staff_users'::regclass and attnum>0 and not attisdropped
  loop
    execute pg_catalog.format(
      'REVOKE ALL PRIVILEGES (%I) ON TABLE public.staff_users FROM anon RESTRICT',v_column);
    execute pg_catalog.format(
      'REVOKE INSERT (%1$I), UPDATE (%1$I), REFERENCES (%1$I) ON TABLE public.staff_users FROM authenticated RESTRICT',v_column);
  end loop;
end;
$columns$;

-- Fail closed: PUBLIC/inherited/SET ROLE paths must not leave unsafe access.
-- No automatic revocation from shared roles/PUBLIC and no CASCADE.
do $assert$
declare
  v_client text;
  v_role record;
  v_priv text;
begin
  foreach v_client in array array['anon','authenticated'] loop
    for v_role in
      select oid,rolname,rolsuper,rolbypassrls,rolcreaterole,
             pg_catalog.pg_has_role(v_client,oid,'MEMBER WITH ADMIN OPTION') as can_admin_role
      from pg_catalog.pg_roles
      where pg_catalog.pg_has_role(v_client,oid,'USAGE')
         or pg_catalog.pg_has_role(v_client,oid,'SET')
         or pg_catalog.pg_has_role(v_client,oid,'MEMBER WITH ADMIN OPTION')
    loop
      if v_role.rolsuper or v_role.rolbypassrls or v_role.rolcreaterole or v_role.can_admin_role
         or v_role.oid=(select relowner from pg_catalog.pg_class where oid='public.staff_users'::regclass) then
        raise exception 'Unsafe administrative role % reachable by %. Transaction refused.',v_role.rolname,v_client;
      end if;
      foreach v_priv in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] loop
        if pg_catalog.has_table_privilege(v_role.oid,'public.staff_users',v_priv) then
          raise exception 'Residual % via role % for %. Review PUBLIC/inherited/SET grants.',v_priv,v_role.rolname,v_client;
        end if;
      end loop;
      foreach v_priv in array array['INSERT','UPDATE','REFERENCES'] loop
        if pg_catalog.has_any_column_privilege(v_role.oid,'public.staff_users',v_priv) then
          raise exception 'Residual column % via role % for %. Review source grants.',v_priv,v_role.rolname,v_client;
        end if;
      end loop;
      if v_client='anon' and pg_catalog.has_any_column_privilege(v_role.oid,'public.staff_users','SELECT') then
        raise exception 'Anonymous SELECT remains via role %. Review PUBLIC/inherited/SET grants.',v_role.rolname;
      end if;
    end loop;
  end loop;
  if not pg_catalog.has_table_privilege('authenticated','public.staff_users','SELECT') then
    raise exception 'Authenticated SELECT was not preserved.';
  end if;
end;
$assert$;
commit;

-- REVIEW ONLY: execute manually after reviewing 00_security_preflight.sql.
-- No order data is changed by installing this function.
begin;
set local search_path = pg_catalog, pg_temp;

do $preflight$
begin
  if pg_catalog.current_setting('server_version_num')::integer < 110000 then
    raise exception 'PostgreSQL 11 or newer is required by this reviewed script.';
  end if;
  if current_user <> 'postgres' then
    raise exception 'Run this migration as the verified postgres administrator.';
  end if;
  if exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'staff_set_order_fulfillment_status'
  ) then
    raise exception 'RPC name already exists. Review it before deployment.';
  end if;
  if exists (
    select 1 from pg_catalog.pg_class c
    where c.oid in ('public.orders'::regclass, 'public.staff_users'::regclass)
      and not c.relrowsecurity
  ) then
    raise exception 'Required RLS is not enabled. Deployment refused.';
  end if;
end;
$preflight$;

create function public.staff_set_order_fulfillment_status(
  p_order_id public.orders.id%TYPE,
  p_expected_status public.orders.status%TYPE,
  p_next_status public.orders.status%TYPE
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_actor uuid;
  v_role text;
  v_current_status public.orders.status%TYPE;
  v_result jsonb;
  v_count bigint;
begin
  v_actor := auth.uid();
  if v_actor is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  -- Prevent concurrent membership changes during authorization/update.
  begin
    select s.role::text into strict v_role
    from public.staff_users s
    where s.user_id = v_actor and s.is_active = true
    for share;
  exception
    when no_data_found then
      raise exception using errcode = '42501', message = 'Active staff access required.';
    when too_many_rows then
      raise exception using errcode = '42501', message = 'Ambiguous staff membership. Contact an administrator.';
  end;
  if v_role is null or v_role not in ('admin', 'shopkeeper') then
    raise exception using errcode = '42501', message = 'This staff role cannot update fulfillment.';
  end if;
  if p_order_id is null or p_expected_status is null or p_next_status is null then
    raise exception using errcode = '22023', message = 'Order ID, expected status, and next status are required.';
  end if;
  if p_expected_status::text not in ('Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled')
     or p_next_status::text not in ('Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled') then
    raise exception using errcode = '22023', message = 'Unsupported fulfillment status.';
  end if;
  if p_next_status::text = 'Cancelled' and v_role <> 'admin' then
    raise exception using errcode = '42501', message = 'Only active admins can cancel orders.';
  end if;

  begin
    select o.status into strict v_current_status
    from public.orders o where o.id = p_order_id for update;
  exception
    when no_data_found then
      raise exception using errcode = 'P0001', message = 'Order not found. Refresh the order list.';
    when too_many_rows then
      raise exception using errcode = 'P0001', message = 'Order ID is not unique. Update refused.';
  end;
  if v_current_status is distinct from p_expected_status then
    raise exception using errcode = 'P0001', message = 'Order status changed. Refresh before trying again.';
  end if;
  if v_current_status is null or v_current_status::text not in ('Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled') then
    raise exception using errcode = '22023', message = 'Existing order status is unsupported.';
  end if;
  if not (
    (v_current_status::text = 'Processing' and p_next_status::text in ('Shipped', 'Cancelled'))
    or (v_current_status::text = 'Shipped' and p_next_status::text in ('Out for Delivery', 'Cancelled'))
    or (v_current_status::text = 'Out for Delivery' and p_next_status::text in ('Delivered', 'Cancelled'))
  ) then
    raise exception using errcode = '22023', message = 'This fulfillment status transition is not allowed.';
  end if;

  -- The existing BEFORE UPDATE trigger maintains updated_at.
  update public.orders o set status = p_next_status
  where o.id = p_order_id and o.status = v_current_status
  returning pg_catalog.jsonb_build_object('id', o.id, 'status', o.status)
  into v_result;
  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception using errcode = 'P0001', message = 'Expected exactly one updated order. Update refused.';
  end if;
  if v_result ->> 'id' is distinct from p_order_id::text
     or v_result ->> 'status' is distinct from p_next_status::text then
    raise exception using errcode = 'P0001', message = 'Stored order did not match the requested update.';
  end if;
  return v_result;
end;
$function$;

-- Resolve real argument types from the newly created catalog entry.
-- Do not use column %TYPE references in ALTER/GRANT/REVOKE signatures.
do $permissions$
declare
  v_signature text;
  v_grantee text;
begin
  select p.oid::regprocedure::text into strict v_signature
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'staff_set_order_fulfillment_status'
    and p.prokind = 'f';

  execute pg_catalog.format('ALTER FUNCTION %s OWNER TO postgres', v_signature);
  execute pg_catalog.format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_signature);
  -- Clear any explicit default grants, including project-specific roles.
  for v_grantee in
    select distinct r.rolname
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    cross join lateral pg_catalog.aclexplode(
      coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) a
    join pg_catalog.pg_roles r on r.oid = a.grantee
    where n.nspname = 'public'
      and p.proname = 'staff_set_order_fulfillment_status'
      and a.grantee <> p.proowner
  loop
    execute pg_catalog.format('REVOKE ALL ON FUNCTION %s FROM %I', v_signature, v_grantee);
  end loop;
  execute pg_catalog.format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_signature);
  raise notice 'Installed function: %', v_signature;
end;
$permissions$;

-- Transactional PostgREST schema-cache refresh; no order changes.
notify pgrst, 'reload schema';
commit;

-- Save this resolved signature with the deployment record.
select p.oid::regprocedure as resolved_signature,
       p.proowner::regrole as owner, p.prosecdef, p.proconfig, p.proacl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'staff_set_order_fulfillment_status';

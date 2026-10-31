-- REVIEW ONLY. Disable/revert the Web Admin fulfillment RPC action first.
-- Resolves deployed types rather than assuming UUID/text or using %TYPE.
begin;
set local search_path = pg_catalog, pg_temp;
do $rollback$
declare
  v_signature text;
  v_owner text;
  v_argnames text[];
begin
  if current_user <> 'postgres' then
    raise exception 'Run rollback as postgres.';
  end if;
  select p.oid::regprocedure::text, p.proowner::regrole::text, p.proargnames
  into strict v_signature, v_owner, v_argnames
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'staff_set_order_fulfillment_status';
  if v_owner <> 'postgres'
     or v_argnames is distinct from array['p_order_id', 'p_expected_status', 'p_next_status']::text[] then
    raise exception 'Unexpected function identity. Review before removal.';
  end if;
  execute pg_catalog.format('REVOKE ALL ON FUNCTION %s FROM authenticated', v_signature);
  execute pg_catalog.format('DROP FUNCTION %s RESTRICT', v_signature);
end;
$rollback$;
notify pgrst, 'reload schema';
commit;
-- Does not reverse committed status changes or alter RLS/policies/triggers.

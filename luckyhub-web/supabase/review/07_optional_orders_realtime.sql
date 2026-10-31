-- SEPARATE PROPOSAL, not required for RPC persistence or manual refresh.
-- Approve only after checking customer orders SELECT RLS and mobile lifecycle.
-- Requires the existing supabase_realtime publication; does not create one,
-- change publication actions, change RLS, or add any SELECT policy/grant.
begin;
set local search_path = pg_catalog, pg_temp;
do $guard$
begin
  if current_user <> 'postgres' then raise exception 'Run as postgres.'; end if;
  if not exists (select 1 from pg_catalog.pg_publication
                 where pubname='supabase_realtime' and pubupdate and not puballtables) then
    raise exception 'Expected existing UPDATE-enabled explicit-table publication. Review configuration.';
  end if;
  if not exists (select 1 from pg_catalog.pg_class where oid='public.orders'::regclass and relrowsecurity) then
    raise exception 'orders RLS must remain enabled.';
  end if;
  if exists (select 1 from pg_catalog.pg_publication_tables
             where pubname='supabase_realtime' and schemaname='public' and tablename='orders') then
    raise exception 'orders is already published. No change needed; do not apply this proposal.';
  end if;
end;
$guard$;
alter publication supabase_realtime add table public.orders;
commit;

-- SEPARATE rollback, ONLY if the ADD above was committed by this deployment:
-- begin;
-- alter publication supabase_realtime drop table public.orders;
-- commit;
-- Do not remove another deployment's publication membership.

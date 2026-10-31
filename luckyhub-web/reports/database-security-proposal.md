# Database security proposal ? review only

No SQL has been executed. This proposal requires explicit approval before application and a review of the current grants, staff_users policies, and trigger definitions.

The user confirmed that public.orders.status permits exactly Processing, Shipped, Out for Delivery, Delivered, Cancelled; orders has customer INSERT and own-order SELECT policies but no UPDATE policy. The Web Admin uses active staff_users records with user_id = auth.uid() and role admin or shopkeeper. Confirm that both roles should manage fulfillment before deployment.

## Proposed policies

The following additive policies preserve existing customer policies. SELECT access is needed for staff to read orders and for UPDATE ... RETURNING to verify an updated row. These are draft definitions, not an applied migration:

```sql
create policy orders_active_staff_select
on public.orders for select to authenticated
using (
  exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid())
      and s.is_active = true
      and s.role in ('admin', 'shopkeeper')
  )
);

create policy orders_active_staff_update
on public.orders for update to authenticated
using (
  exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid())
      and s.is_active = true
      and s.role in ('admin', 'shopkeeper')
  )
)
with check (
  exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid())
      and s.is_active = true
      and s.role in ('admin', 'shopkeeper')
  )
);
```

These policies authorize rows, not columns. Before applying: audit table-level and column-level UPDATE grants for authenticated, anon, PUBLIC and inherited roles. Prefer fulfillment-only UPDATE(status) access, and retain UPDATE(payment_status) only if both staff roles are authorized for the existing Mark Paid action. A broad table UPDATE grant overrides narrower column grants. Do not add a broad UPDATE grant or revoke current grants blindly; prepare an explicit privilege migration after inspecting them. Shared authenticated grants remain gated by RLS.

If granting direct column UPDATE cannot safely fit existing privileges, use a narrowly scoped authenticated RPC that validates active staff membership, the exact target ID, prior status and allowed new status; keep its search_path fixed, qualify all objects, and restrict EXECUTE grants. This alternative requires a coordinated client change and a separately reviewed function definition.

Staff SELECT access to staff_users must allow a staff member to read their own membership without recursion. Customers must never be able to insert or modify their own staff role or is_active flag. Inspect staff_users policies/grants before trusting it as the authorization source. No SECURITY DEFINER helper or service-role key is introduced here.

No changes to customer SELECT or INSERT policies are proposed. Review order_items staff SELECT separately if needed. Do not allow customers to update fulfillment/payment state. Existing policies are permissive by default: inspect all policies for unintended OR paths before rollout.

## Approval and verification

Approve only after confirming role scope, safe staff membership management, full grants and triggers, and any required privilege changes. Then test with two customer accounts, an active staff account, disabled staff and an anonymous client. Only designated test orders may be changed. Confirm staff can read/update, customers cannot update, customers cannot read each other's orders or order_items, and ownership/customer/pricing fields cannot be changed through this pathway.

Realtime requires orders to be in supabase_realtime and appropriate SELECT policies. Publication changes require review; none have been applied. Realtime is an optimization: focus and manual refresh still query Supabase.

# Mobile order status integration

No React Native source is present in this workspace. No mobile changes were made and Expo SDK 57 is unchanged. The following are the required changes to apply to the existing mobile codebase after identifying its actual paths and ownership relationship.

## Shared status contract

Read orders.status directly. Exact values: Processing, Shipped, Out for Delivery, Delivered, Cancelled. Do not lowercase values before writing. Do not use order_status or Completed. The former Web Admin Mark Completed action now explicitly says Mark Delivered and writes Delivered; these are not silently treated as equivalent database states.

Keep payment_status separate: Pending, Paid, Failed, Refunded. An order being Delivered does not imply Paid. No payment state should be used to advance the fulfillment timeline.

## Orders queries and details

1. Resolve the authenticated customer and the actual order ownership foreign key from the mobile schema. It was not supplied here; do not assume it is user_id. If orders uses a customer profile ID, resolve that relationship before filtering.
2. Fetch orders with select of the required fields and eq(actualOwnershipColumn, actualCustomerIdentifier). Do not query before ownership is resolved. Use the existing own-order SELECT RLS as the enforcement boundary; client filters alone do not provide security.
3. For details, filter by both order ID and ownership. Order-item reads must have their own ownership-enforcing RLS. Treat missing or unauthorized rows as unavailable.
4. Display the returned status verbatim in the list and details. Use one shared query/cache source or invalidate both queries on a change so the screens cannot disagree.
5. Timeline sequence: Processing -> Shipped -> Out for Delivery -> Delivered. Show Cancelled as a separate terminal state, without marking later delivery stages successful. Use explicit stage membership; an unknown status must not accidentally complete stages. Show a fallback label for unknown values and prompt refresh.
6. Do not invent event timestamps from the current status. A historical timeline with actual times requires a verified status-history table or timestamp columns.

## Realtime and refresh lifecycle

Subscribe after authentication and ownership resolution:

```js
const channel = supabase
  .channel(`customer-orders:${session.user.id}`)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'orders',
    filter: `${actualOwnershipColumn}=eq.${actualCustomerIdentifier}`,
  }, () => invalidateAndRefetchOrdersAndOpenDetails())
  .subscribe((state) => {
    if (state === 'SUBSCRIBED') invalidateAndRefetchOrdersAndOpenDetails()
  })
// On logout, customer change, or unmount:
// await supabase.removeChannel(channel)
```

The identifiers above must come from the verified ownership mapping, never arbitrary user input. The event is a refetch signal rather than a replacement for authorized queries. Confirm the Realtime publication includes orders; publication configuration is not changed by the web patch.

Connect FlatList/ScrollView RefreshControl to the same refetch function with a finally block that clears refreshing and visible retryable errors. Register an AppState change listener and refetch when the app returns to active; also refetch on Orders/details navigation focus. Remove listeners on cleanup. Ignore responses from stale sessions using an abort signal or request generation token, clear cached orders on logout, and scope cache keys by customer. Handle offline/reconnect and subscription errors without hiding the last successfully loaded data. A successful reconnect must refetch to cover missed events.

## Notifications plan

The Web Admin notification inbox reads public.notifications; it is not evidence of an existing customer push sender. Inspect the mobile token registration, backend worker/Edge Functions, notification RLS and push receipts before implementation.

For durable notifications, create an outbox event transactionally on a real status change (OLD.status IS DISTINCT FROM NEW.status). A trusted server worker resolves the owner and their registered Expo tokens, sends the appropriate message, retries temporary failures, handles invalid tokens and records receipts. Deduplicate by a unique transition-event ID; order ID plus status alone can incorrectly suppress a later legitimate transition. Never accept arbitrary recipient tokens or use client-side push credentials. Keep all server secrets outside VITE_/EXPO_PUBLIC_ variables.

Messages: Shipped -> Your order has been shipped; Out for Delivery -> Your order is out for delivery; Delivered -> Your order has been delivered; Cancelled -> Your order has been cancelled. There is no Completed event in this schema; adding one requires a separately approved status migration. Persist optional customer inbox entries with own-recipient RLS. Opening a notification must refetch the authorized order.

## End-to-end acceptance (not yet performed)

Use designated test users/orders only. Place a test mobile order; confirm Processing in Supabase/admin. An authorized active staff member marks Shipped; verify the same ID and Shipped in the returned row and database. Confirm list/details/timeline update via Realtime, then repeat with Realtime unavailable using pull refresh and background/foreground. Test expired session, offline requests, invalid lowercase status, missing UPDATE policy, concurrent stale updates and a deleted test order. Customer B must be unable to SELECT Customer A orders/items or UPDATE any fulfillment/payment status. Check cleanup after logout and account switching. No real customer data should be touched.

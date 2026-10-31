# Lucky Hub Android finalization audit — 2026-10-31

## Evidence and verification boundary
Audit covers the customer Expo Router app, active src services/screens, configuration and tests. COMPLETED means the roadmap capability is implemented, not that every edge case passed on-device. PARTIAL means missing functionality, deployment, or material verification remains. Staff Web Admin is outside this mobile workspace scope and was not changed or independently audited. No production migrations, account creation, orders, or push messages were executed here. Existing uncommitted work was preserved.

User-confirmed Android evidence: installed development APK, signup/login, COD checkout, order creation, and visibility in Staff Web Admin. Fulfillment RPC is prepared but not deployed (user report). This is not evidence that RLS, stock concurrency, automatic notifications, logout/session restoration, or password recovery now pass end to end.

## All 40 roadmap steps
Paths below are relative to luckyhub-mobile.

| # | Roadmap step | Classification | Source evidence and missing work |
|---|---|---|---|
| 1 | Create Mobile App | COMPLETED | package.json, app.json: Expo 57 / React Native / TypeScript; no upgrade made. |
| 2 | Open in VS Code | COMPLETED | User IDE context and existing workspace; no runtime feature. |
| 3 | Folder structure | COMPLETED | app/, src/screens/, src/services/, src/components/, assets/. |
| 4 | Branding | COMPLETED | src/constants/colors.ts, SplashScreen.tsx, assets/images, app.json. Review launcher/store artwork before release. |
| 5 | Splash | COMPLETED | src/screens/SplashScreen.tsx, app/index.tsx; timed branded splash and session navigation. |
| 6 | Login/signup | PARTIAL | LoginScreen.tsx, SignupScreen.tsx, PasswordRecoveryScreen.tsx, app/check-email.tsx; signup/login user-tested, recovery device result still unconfirmed. |
| 7 | Navigation | COMPLETED | app/_layout.tsx, app/(tabs)/_layout.tsx; protected routes, recovery guard. Re-test notification cold start. |
| 8 | Home | COMPLETED | HomeScreen.tsx; live products/categories/offers/banners with loading/error handling. |
| 9 | Categories | COMPLETED | CategoriesScreen.tsx, categoryService.ts, productService.ts; live category filtering. |
| 10 | Search | PARTIAL | SearchScreen.tsx, productService.ts; live catalog search; large catalog pagination and banner query parameter handling need review. |
| 11 | Product details | COMPLETED | ProductDetailsScreen.tsx; live product/variants, pricing, cart/wishlist actions. |
| 12 | Cart | COMPLETED | CartScreen.tsx, cartService.ts; customer-scoped database cart. Concurrent writes/stock require server guarantees. |
| 13 | Checkout | PARTIAL | CheckoutAddressScreen.tsx, orderService.ts; working COD user-tested. Atomicity, idempotency and server pricing/stock authority remain release concerns. Pickup contact propagation fixed this sprint. |
| 14 | Order success | COMPLETED | OrderSuccessScreen.tsx; confirmation navigation. Removed locally generated push event from route parameters. Display still uses route parameters, so it is not proof of a committed order. |
| 15 | My Orders | COMPLETED | OrdersScreen.tsx, app/(tabs)/orders.tsx; own orders and order_items, focus/manual/foreground refresh. Targeted order route now opens the requested owned order. |
| 16 | Order tracking | PARTIAL | OrdersScreen.tsx internal tracking view, src/lib/orderStatus.ts; exact status progress mapping fixed. Staff RPC deployment and Android transitions still unverified. |
| 17 | Profile | COMPLETED | ProfileScreen.tsx; profile editing, saved addresses and logout. Default-address atomicity and device regression remain. |
| 18 | Supabase project | COMPLETED | src/lib/supabase.ts, publicSupabase.ts; user-confirmed working backend integration. Dashboard not independently inspected. |
| 19 | Database tables | PARTIAL | Existing services and user-confirmed orders prove core integration; no authoritative schema/RLS dump available. New notification contract requires backend review/deployment. |
| 20 | Supabase login | COMPLETED | AuthContext.tsx, LoginScreen.tsx, supabase.ts; persistent storage and validated restoration; auth helper tests pass. Device restore/logout pending. |
| 21 | Connect categories | COMPLETED | categoryService.ts and CategoriesScreen.tsx. |
| 22 | Connect products | COMPLETED | productService.ts and ProductDetailsScreen.tsx; active public catalog queries. |
| 23 | Connect cart | COMPLETED | cartService.ts; auth owner filters and database CRUD. RLS must enforce ownership independently. |
| 24 | Connect orders | PARTIAL | orderService.ts, OrdersScreen.tsx; user-tested mobile-to-admin creation. Transactional checkout and fulfillment synchronization not yet proven. |
| 25 | Admin panel | NOT APPLICABLE | Separate React/Vite staff app, user confirms order visibility; no mobile source implementation expected. |
| 26 | Admin login | NOT APPLICABLE | Staff app owns staff authentication; not audited here. |
| 27 | Admin dashboard | NOT APPLICABLE | Separate staff app; not audited here. |
| 28 | Product management | NOT APPLICABLE | Staff writes belong to Admin; mobile consumes productService.ts. |
| 29 | Order management | NOT APPLICABLE | Staff owns fulfillment; mobile must remain read-only for fulfillment status. RPC deployment pending per user. |
| 30 | Inventory system | PARTIAL | Product stock displayed/checked through productService.ts, cartService.ts, orderService.ts; no verified atomic reservation/decrement. Staff inventory management out of scope. |
| 31 | Printing service | PARTIAL | PrintingServiceScreen.tsx, PrintingRequestsScreen.tsx, printingService.ts; upload/private signed URL/request history implemented. Pricing authority, upload size/type enforcement, storage RLS and device upload need tests. |
| 32 | Wishlist | COMPLETED | WishlistScreen.tsx, wishlistService.ts; customer-scoped saved products. Device/account-isolation regression pending. |
| 33 | Offers | COMPLETED | offerService.ts, bannerService.ts, HomeScreen.tsx, cartService.ts; active/date-sensitive offers. Server must reprice checkout. |
| 34 | Coupons | PARTIAL | couponService.ts and orderService.ts; percentage/fixed/free-delivery display exists. Usage-limit and redemption concurrency need authoritative backend enforcement. |
| 35 | Delivery charges | PARTIAL | deliveryService.ts, CheckoutAddressScreen.tsx; city quote/pickup/free-delivery display. Final charges still supplied by client to order service. |
| 36 | Online payment | NOT STARTED | Active checkout supports COD; no live gateway/tokenization/webhook flow found. Do not advertise online payments at launch. |
| 37 | Push notifications | PARTIAL | notificationService.ts, NotificationBootstrap.tsx, app/notifications.tsx; token registration, inbox and authorized push tap implemented/prepared. Server event/outbox/sender, inbox table/RLS, credentials and end-to-end delivery remain dependencies. |
| 38 | Testing | PARTIAL | tests/authCallback.test.cjs and mobileFinalization.test.cjs; automated helper/service tests, TypeScript and lint. Device/security/concurrency tests remain. |
| 39 | Android release | PARTIAL | eas.json development APK installed per user; release signing/build, permission disclosures, privacy policy, Play listing and production smoke tests remain. |
| 40 | iPhone | PARTIAL | app.json iOS configuration and shared RN code only; no verified iOS build, APNs setup or device testing. |

Inactive standalone OrderDetailsScreen/OrderTrackingScreen and empty payment/review placeholders are not evidence of completed active flows. Active detail/tracking rendering is inside OrdersScreen.tsx.

## Sprint changes
- OrdersScreen.tsx: removes cache-diff-generated local notifications; refreshes on foreground while focused; latest-request guard prevents stale load results; refreshed deleted orders no longer retain stale detail objects; requested owned order route opens detail; preserves exact database status text.
- orderStatus.ts: Processing -> Shipped -> Out for Delivery -> Delivered; Cancelled/unknown do not mark delivery progress. Cancelled remains visible as the actual status.
- OrderSuccessScreen.tsx: removes local notification generation from route parameters.
- CheckoutAddressScreen.tsx: passes entered pickup contact information instead of discarding it; existing service continues to save addresses only for Standard Delivery.
- app/notifications.tsx + customerNotificationService.ts: protected customer inbox, latest 100 entries, read receipts, loading/empty/error and focus/foreground/pull refresh. No fake data or successful empty fallback on database errors.
- app/_layout.tsx and ProfileScreen.tsx: protected inbox route and existing Notifications menu connected.
- NotificationBootstrap.tsx: cold/warm push response listeners; only an owned database notification ID can open the inbox, never arbitrary payload URLs/statuses.
- notificationService.ts: exposes guarded native module loader; removes raw Expo token logging.
- app.json: adds installed expo-notifications config plugin. SDK/package versions unchanged. New native configuration needs a rebuilt development APK.
- tests/mobileFinalization.test.cjs: status mapping and notification owner/error regression tests.
- docs/ANDROID_FINALIZATION.md: this audit, backend handoff and device checklist.

Authentication implementation from earlier work was reviewed and retained: strict callback target/credential validation, OTP/implicit/PKCE processing, server user validation, duplicate callback protection, safe metadata diagnostics, password recovery gate, synchronous auth-event listener and persistent session restoration. No new evidence justifies changing the recovery parser speculatively.

## Backend dependencies — DO NOT APPLY AUTOMATICALLY
Existing RLS is preserved. Backend owner must inspect existing schema/policies and the prepared fulfillment RPC before preparing compatible migrations. The mobile changes do not deploy any of these requirements.

### Notification inbox contract
New mobile query target: public.customer_notifications.
Required columns: id uuid primary key; user_id uuid referencing auth.users; title text not null; body text not null; created_at timestamptz not null default now(); read_at timestamptz nullable.
Recommended server-only columns: order_id matching actual orders ID type; event_key unique for deduplication; event_type; status snapshot. Index (user_id, created_at desc).
- Enable RLS; authenticated SELECT only where user_id = auth.uid().
- Authenticated UPDATE only own rows, with ownership WITH CHECK; grant UPDATE on read_at column only, not title/body/user_id/event fields. Grant SELECT as required for update returning id.
- No anon access; no customer INSERT/DELETE. Only trusted backend produces messages.
- Never replace existing policies blindly. If an existing notification table serves this purpose, adapt this contract after schema review.
- The app deliberately shows an error until this table/permissions exist; it does not imply an empty successful inbox.

### Authorized automatic delivery
Prepared staff fulfillment RPC must verify staff authorization on the server, enforce allowed transitions and update the order transactionally. Exact status values: Processing, Shipped, Out for Delivery, Delivered, Cancelled.
In the SAME transaction, create a unique customer notification/outbox event from the committed transition using the order's database owner. A trusted worker/Edge Function sends through Expo; service-role and FCM credentials stay server-side.
Payload contract: data: { notificationId: '<customer_notifications.id>' }; Android channelId: 'orders'. Do not send arbitrary navigation URLs or use mobile-reported status to generate messages.
Worker needs retries, idempotent event keys, receipt checks, invalid-token cleanup, and observability. Repeated fulfillment requests must not duplicate notifications. Never mark sending successful merely because Expo accepted a request.
Existing push_tokens client contract uses user_id, expo_push_token, platform, is_active, updated_at and conflict key (user_id, expo_push_token). Verify owner RLS AND installation/token ownership across account changes. Current composite key can leave the same device registered to a prior account; the unused all-user deactivation helper is not a safe device logout solution. This is a privacy release blocker: add server-authorized device registration/reassignment/revocation, then wire device-only logout cleanup. Until resolved, send only generic lock-screen content and do not enable production personalized pushes. Incoming tap authorization protects navigation, not already-displayed OS notification text.
Verify EAS project and Android package match app.json, configure FCM v1 credentials with EAS, rebuild APK for plugin changes, and test denied/re-enabled permission and token rotation. No credentials added here.
Official Expo notification reference consulted: https://docs.expo.dev/versions/latest/sdk/notifications/ (repository-required v54 URL redirects there; installed SDK57 typings determine API compatibility).

### Checkout and shared database release blockers
orderService.ts performs separate address/order/items/coupon/cart writes. Network interruption can leave partial commits; retry can duplicate orders. Client prices, delivery fees, discounts, quantities and stock checks are not a security boundary.
Backend checkout RPC should accept product/variant IDs, quantities, delivery/contact data, coupon code and an idempotency key; derive auth.uid(), prices, offer/coupon eligibility, charges and totals server-side; lock/check stock; create order/items and redemption atomically; clear only purchased cart rows. Enforce finite positive integer quantities, active variants, unique order numbers, stock/coupon concurrency, and immutable order snapshots. Return canonical order ID/number/totals. Do not silently fallback to untrusted client inserts after deploying this contract.
Fulfillment RPC does not automatically solve checkout atomicity.
Audit RLS for profiles, addresses, cart_items, wishlist, orders, order_items, printing_requests, push_tokens and storage.objects. Child ownership must follow parent order; customers must not change fulfillment/payment/price/stock fields. Public catalog reads must not expose private/staff columns. Client .eq(user_id) filters complement RLS; they do not replace it.
printingService.ts currently selects staff_notes: decide whether customer-visible notes are intended; use a separate public field/view if internal. Restrict printing-files bucket to owner paths and authorized staff, enforce size/type limits, and treat client printing prices as estimates.

## Critical outstanding issues and next work
1. Deploy/review authorized fulfillment + outbox/sender with staff team, then verify each status on Android.
2. Review/deploy inbox contract and cross-account push token ownership before enabling production notifications.
3. Implement server-authoritative atomic/idempotent checkout; test interrupted writes and concurrent last-stock purchases.
4. Confirm password recovery on a fresh link and actual installed build; local tests cannot diagnose the earlier device failure without safe metadata.
5. Recovery dashboard allowlist must include luckyhubmobile://auth/callback (matches app.json/authRedirect.ts). Earlier supplied luckyhub://auth/callback does not match. Keep separate web URLs unchanged; inspect email template ConfirmationURL/custom token_hash contract.
6. Test login/logout/kill-and-restore, stale/expired sessions, account isolation and offline recovery. Restoration currently fails closed on validation network failure; credentials are retained but protected UI can become unavailable offline.
7. P1: default-address atomicity, search query handoff/pagination, printing limits/prices, coupon limits and delivery repricing. Order detail/tracking refresh errors may leave the last successfully fetched snapshot visible; always reconnect and refresh before judging fulfillment.
8. Release privacy policy/account deletion/support flows and store requirements need product/backend review; don't label the development APK a release.

## Tests and exact Android checklist
Automated results are recorded in the final task response. Node test worker spawning needs elevated execution in this Windows sandbox (EPERM otherwise). Tests are mocked/unit checks, not live RLS or Android UI tests.

1. Rebuild with existing development profile: npx eas-cli build --platform android --profile development. Install resulting APK and start Metro using npx expo start --dev-client. Keep Expo SDK57.
2. Sign up with a test customer, follow a fresh verification email once, login, background/foreground, force-stop/reopen, logout, then attempt direct protected order/inbox links. They must require a valid session.
3. Request a NEW recovery email on the same installed app. Open it once while app is running and once from a killed state using separate new links. Expect New Password, not verification success/home. Change password; confirm new login succeeds and old password fails. Reused/expired links must fail. Collect only callback parameter NAMES and allowlisted type/error_code if it fails; never send URLs/tokens/codes/passwords.
4. Browse live categories/products, search known SKU/name, choose a variant, add/update/remove cart items, verify offer/coupon/delivery breakdown against database. Test out-of-stock and inactive variant while in cart.
5. COD Standard Delivery: check address/contact, item prices/quantities, subtotal-discount+delivery=total, order items, emptied cart and Web Admin record. Repeat Store Pickup with name/phone intentionally different from profile: saved order must use entered contacts and pickup delivery address. No online-payment claim.
6. Staff team applies authorized transitions on a TEST order: Processing -> Shipped -> Out for Delivery -> Delivered. Also cancel a separate eligible order. On Android check list/detail/tracking after pull refresh, leaving/reopening Orders, and returning from background. Text must equal DB status; cancelled must not look delivered. Opening order/<owned orderNumber> must open correct detail; another customer's number must not reveal it.
7. With backend notification contract and sender deployed, approve notification permission, verify owned push token registration server-side without posting token in logs. One staff transition should create one inbox event and one push, even if staff retries. Test foreground/background/killed app; tap opens authorized inbox. Refreshing orders must not generate local status notifications.
8. Inbox: empty state, newest messages, mark read, pull/focus/foreground refresh, deny network then retry. Read status persists. A second customer must not read/update first customer's inbox via direct API calls. Test server RLS separately from client filtering.
9. Account-switch push test is REQUIRED before production: logout customer A, login B on same phone; A's future pushes must not reach this installation. Also verify another device for A remains registered. Current token ownership backend dependency must be resolved first.
10. Wishlist/profile/address persistence, printing PDF/image upload and signed URL ownership, invalid/large files, coupon expiry/limits/free delivery, permission denial, offline/reconnect and duplicate checkout taps. Use test accounts/orders; avoid production financial side effects.

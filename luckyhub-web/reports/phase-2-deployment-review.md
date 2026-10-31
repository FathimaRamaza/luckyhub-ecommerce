# Phase 2 final review and proposed deployment order

Status: NOT DEPLOYED; no SQL was executed, database data/policies changed, or Web Admin deployed during this review. Only local review SQL/report artifacts were changed. This report supersedes the previous direct staff UPDATE policy proposal. Do not execute the review folder as a batch: it contains rollback and optional configuration files.

## Evidence and security findings

The user reports PostgreSQL 17.6, SQL Editor postgres, RLS enabled on staff_users, own-membership authenticated SELECT as its only reported policy, no anon/authenticated inheritance of postgres, broad table grants to both roles, handle_new_user inserting only profiles, and orders absent from publication inventory. These findings were supplied by the user; there is no direct database metadata session available to independently rerun them here.

Confirmed unsafe ACL design: anon/authenticated have unnecessary INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER on staff_users. The existing SELECT-only RLS policy denies ordinary membership writes, but RLS does not protect TRUNCATE or REFERENCES. These privileges are unnecessary for client login and should be removed. This is a confirmed grant exposure, not proof of exploitation through PostgREST: ordinary table REST endpoints do not provide arbitrary TRUNCATE/DDL commands. Broad TRIGGER privileges also warrant inspecting already-installed triggers/DDL-capable RPCs, not merely revoking future access. PostgreSQL 17 MAINTAIN, if present through ALL/default grants, is also unnecessary and included in the audit/revocation.

Keep authenticated SELECT: staff and customers share the authenticated database role. The existing RLS policy determines which membership record a caller sees; SELECT permission alone does not confer staff authority. Anonymous clients need no staff SELECT. No customer receives a role/activation/admin permission and no policy is added, changed or disabled.

## Proposed staff hardening

06_staff_permissions_hardening.sql is one transaction: checks postgres execution, PostgreSQL 17+, expected postgres table ownership, RLS and authenticated SELECT; refuses grant provenance it cannot safely restore; revokes anon table privileges and authenticated non-SELECT table privileges; removes independently granted column privileges (anon all, authenticated INSERT/UPDATE/REFERENCES); preserves authenticated SELECT. Uses RESTRICT rather than CASCADE. No broad schema/default-privilege/role changes and no grants are added.

The two core table revokes are small; the surrounding guards are necessary because direct ACL revocation is not an effective-permission guarantee. Grants are additive: PUBLIC, inherited roles, roles reachable through SET ROLE, table ownership, superuser/BYPASSRLS/CREATEROLE/ADMIN OPTION authority, column ACLs, and privileged functions/views may provide independent access.

Before commit the hardening rejects residual unsafe table/column privileges through immediately usable or SET-reachable roles; it also rejects anonymous SELECT and administrative membership authority and verifies authenticated SELECT still exists. PUBLIC is included in effective privilege checks. If a shared/PUBLIC/inherited grant remains, the transaction fails without hardening being committed. Run ROLLBACK if the editor leaves an aborted transaction. Identify and separately approve a targeted source-grant fix; do not remove guards or use CASCADE to force success. Grant chains or a non-postgres table owner/grantor also stop the proposal for review.

What this cannot guarantee: it does not revoke execution of SECURITY DEFINER functions, inspect arbitrary dynamic SQL, remove pre-existing malicious triggers, change view owners/rules, prevent a trusted administrator from later regranting privileges, or change future-object default privileges. It preserves existing authenticated SELECT grant options; the ACL audit reports whether those are present. No production security approval is implied by a successful ACL transaction alone.

## Rollback without inventing the baseline

05_capture_staff_permissions_rollback.sql is READ ONLY. Run it immediately before hardening; save its single rollback_sql output as the executable emergency rollback and review it. It emits BEGIN/COMMIT plus only the affected pre-existing direct table/column GRANT statements, preserving grant options. It does not invent PUBLIC/inherited grants or add broad privileges beyond the captured baseline. The hardening refuses affected grants whose grantor is not postgres, so the generated rollback can run as postgres with matching provenance. RESTRICT also prevents silently deleting downstream grants.

The rollback is not executed by the capture script. No fixed blanket GRANT ALL rollback is provided because it could grant privileges that were never present. Restoring a successful hardening reintroduces the prior unsafe rights, especially TRUNCATE: use only with separate explicit review. Prefer fixing a genuine missing SELECT dependency over wholesale rollback. Save the baseline results and generated SQL; recapture if grants change before deployment. Rollback restores captured ACL entries, not deleted data, policies, role memberships, or later independent ACL changes. If later changes occur, reconcile them before replay.

## Application and operational dependencies

Workspace search finds staff_users access only in src/services/auth.js: loginStaff and getCurrentStaff SELECT id,user_id,name,role,is_active filtered by authenticated user_id. ProtectedRoute calls getCurrentStaff. No Web Admin staff INSERT/UPDATE/DELETE/provisioning workflow is present. Supabase Auth signInWithPassword is separate from table grants. Preserving authenticated SELECT and the existing policy preserves these code paths by inspection; actual login/session refresh tests remain pending. No application code was changed during this review.

The fulfillment RPC is SECURITY DEFINER owned explicitly by postgres. Revoking client writes to staff_users does not remove the trusted owner's membership lookup/row-lock authority. The RPC checks auth.uid(), exactly one active membership, exact admin/shopkeeper roles, expected current status and a locked order. Admin-only cancellation is enforced before UPDATE. Only status is assigned; the verified timestamp trigger maintains updated_at. Payment fields are not arguments. One returned row and exact ID/status are verified. Delivered/Cancelled are terminal; forward stages are Processing -> Shipped -> Out for Delivery -> Delivered; only admins may cancel nonterminal orders. Installation clears PUBLIC/nonowner explicit default EXECUTE grants and grants authenticated EXECUTE transactionally. Audit effective execution/inheritance after installation. postgres remains a powerful trusted owner, not a customer credential.

src/services/orders.js already uses the RPC for fulfillment with no direct status-update fallback and verifies the returned object. The separate existing payment_status branch remains outside this authorization scope; no staff UPDATE policy is added to orders. The UI is preserved and may offer actions the server correctly rejects. The prior isolated client tests/build passed; they do not validate SQL authorization or deployed transitions.

No mobile source, staff provisioning backend, scheduled jobs or Edge Function source is available in this workspace. Mobile/customer signup is expected to use profiles, supported by the reported handle_new_user body, but cannot be runtime-certified here. Inspect any external provisioning/import/HR/maintenance process that uses anon/authenticated to write staff_users: those writes will lose privileges (and should use a trusted server/admin path). service_role/postgres ACLs are not altered. Do not put their credentials into either client.

## Exposed-function and alternate-path evidence still missing

Review 04_staff_permissions_audit.sql results for ALL Dashboard API Exposed schemas (Dashboard is authoritative when the database setting is NULL), including public, other exposed application schemas, invoker wrappers and privileged callees, generic SQL-execution/role-management RPCs and updatable owner-rights views. Function names or substring searches do not prove safety: dynamic SQL and indirect calls require body review. The reported handle_new_user body closes only that specific function's concern. Also verify existing staff triggers/rules, schema CREATE/ownership and full role graph. The audit includes table/column ACL grantors/options, PUBLIC, effective permissions, membership SET/INHERIT/ADMIN options and view/function definitions. The schema filter now matches the literal pg_ prefix rather than the LIKE wildcard pg_% that could accidentally exclude a user schema beginning with pg.

## PostgreSQL compatibility

The documented constructs are compatible with PostgreSQL 17.6, including MAINTAIN, role membership SET checks, prokind, aclexplode and column %TYPE in CREATE FUNCTION. Owner/grant/rollback statements use the actual catalog-resolved regprocedure signature. No SQL was executed or parser/integration-tested on the deployed server. Static documentation compatibility is PASS; actual migration execution is pending.

## Separate Realtime proposal

orders is reported absent from publications. The RPC and manual/foreground refresh do not require publication membership, but the implemented Postgres Changes subscription requires orders in supabase_realtime. 07_optional_orders_realtime.sql is a separately reviewed transaction that adds only public.orders to an existing UPDATE-enabled explicit-table publication. It refuses unexpected/existing membership, keeps policies/grants/actions unchanged, and includes a commented separate rollback that removes only the membership this deployment added. Do not run the rollback during installation.

Before approval verify customer own-order SELECT RLS, staff SELECT needed by authorized list refresh, orders primary key/replica identity suitable for UPDATE publication, publication settings, and mobile filtering/session cleanup. Do not enable FOR ALL TABLES, publish staff_users, disable RLS or add broad SELECT. Security-definer RPC return access does not automatically give the staff dashboard SELECT access. Realtime is not push delivery; customer notification backend work remains separate.

## Exact safe deployment order (manual; stop on unresolved checks)

1. Run read-only 00_security_preflight.sql and 04_staff_permissions_audit.sql. Save results. Confirm PostgreSQL 17.6, postgres table ownership/grantors, no unsafe inherited/SET/ADMIN paths, full policies, API schemas and callable-function/view safety, trusted trigger bodies, and required staff/customer order SELECT access. Resolve missing security evidence before production approval.
2. Run read-only 05_capture_staff_permissions_rollback.sql immediately before the change; save/review rollback_sql outside the database. Take the usual database backup and avoid concurrent ACL/membership deployment changes. No user/order test data changes are needed for this stage.
3. After explicit approval, manually run 06_staff_permissions_hardening.sql as postgres. If it fails, do not continue; roll back any aborted transaction, review the source privilege/dependency, and obtain approval for an exact targeted fix.
4. Run read-only 08_staff_permissions_postcheck.sql and compare 04 baseline. Expect authenticated SELECT true, anon SELECT false, zero residual findings, RLS/policies unchanged. Test existing active staff login/session refresh and customer login/profile signup using designated accounts. Do not test TRUNCATE by executing it.
5. Only after staff protection and alternate API paths are cleared, manually run 01_fulfillment_rpc.sql as postgres. Then run read-only 03_post_deployment_verification.sql, save the resolved signature/definition/ACL, and verify owner/search_path/effective EXECUTE and unchanged RLS. Do not run 02 rollback during installation.
6. With designated test users/orders, validate forward transitions, admin cancellation, shopkeeper cancellation rejection, inactive/nonstaff/anonymous rejection, lowercase/Completed/null/terminal/reverse/skipped transitions and concurrent expected-status checks. Compare full test rows: only status/updated_at may change. Do not change real customer orders or existing staff membership to create test fixtures.
7. If separately approved and SELECT/replication prerequisites are satisfied, manually run 07_optional_orders_realtime.sql. Confirm membership specifically in supabase_realtime. Test with designated customer sessions; otherwise rely on manual/foreground refresh pending configuration.
8. Only with separate deployment authorization deploy the already-prepared Web Admin RPC client. Inspect network requests for POST /rest/v1/rpc/staff_set_order_fulfillment_status and no fulfillment PATCH to orders. Verify success/error handling, Orders/Dashboard refresh and authorized mobile list/details/timeline updates. No Web Admin deployment is performed by this task.
9. If needed, coordinate RPC rollback by disabling client fulfillment actions before 02_rollback_fulfillment_rpc.sql. Staff hardening rollback is separate and should not be automatic; applying it reopens the unsafe baseline grants. Realtime rollback is separate again. None of these reverse committed order updates.

## PASS / FAIL / NEEDS REVIEW checklist

| Item | Result | Evidence/limit |
|---|---|---|
| Current staff_users ACL least privilege | FAIL | Reported anon/authenticated TRUNCATE and other unnecessary privileges |
| Ordinary customer staff writes under reported RLS | PASS, conditional | Only own-record SELECT policy reported; complete policy inventory still needs confirmation |
| Proposed ACL hardening design | PASS, static | Transactional; preserves authenticated SELECT; handles columns and fails on residual access |
| Live effective grants after hardening | NEEDS REVIEW | No SQL applied; PUBLIC/inherited/SET graph and grant provenance pending |
| Web Admin login dependency | PASS, code inspection | Only authenticated SELECT used; runtime test pending |
| Mobile/external provisioning dependency | NEEDS REVIEW | Source/processes absent |
| RPC authentication/authorization/transitions | PASS, static | Active membership, locked expected-status change, admin cancellation, narrow returned fields |
| RPC owner/search path/EXECUTE deployment | NEEDS REVIEW | Correct proposal, not installed; inherited/effective ACL verification pending |
| PostgreSQL 17.6 syntax design | PASS, documentation review | No deployed SQL execution/parser test performed |
| Other API RPC/view paths cannot promote staff | NEEDS REVIEW | Exposed schemas and full callable/callee bodies not supplied |
| handle_new_user writes staff | PASS, user-supplied finding | Reported body writes profiles only |
| Realtime Postgres Changes configured for orders | FAIL, functional configuration | orders absent; independent of RPC persistence/security |
| Production security approval | NEEDS REVIEW | Do not certify until missing evidence and designated tests are complete |

## Validation and scope

Reviewed all six requested files, current auth/ProtectedRoute call paths and workspace contents. No React/JavaScript, payment, UI, dependencies, live SQL, policies, records or deployment were changed in this task. New artifacts are 04/05/06/07/08 review SQL; 00's schema filter was corrected and this report updated. Existing user changes were preserved. SQL has only been inspected against PostgreSQL 17 documentation; no SQL tests or live authorization tests have run. No lint/build rerun is necessary for this SQL/document-only change; prior client validation was 21 passing mocks, successful build and baseline lint failures (37 errors/26 warnings).

References:
- PostgreSQL 17 RLS: https://www.postgresql.org/docs/17/ddl-rowsecurity.html
- PostgreSQL 17 REVOKE: https://www.postgresql.org/docs/17/sql-revoke.html
- PostgreSQL 17 privilege inquiry: https://www.postgresql.org/docs/17/functions-info.html
- PostgreSQL 17 role membership: https://www.postgresql.org/docs/17/catalog-pg-auth-members.html
- Supabase Postgres Changes: https://supabase.com/docs/guides/realtime/postgres-changes

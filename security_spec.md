# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Global Default-Deny**: All paths not explicitly matched are denied (`allow read, write: if false`).
2. **Verified Identity**: Every mutating operation requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates path IDs via `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Strict Key & Type Validation (`isValid[Entity]`)**: Every `create` and `update` call validates exact keys (`hasAll` & `hasOnly`), string `.size()` limits, numeric bounds, and `ownerId == request.auth.uid`.
5. **PII Isolation**: User email and phone are isolated in `/users/{userId}/private/{docId}`, readable and writable strictly by the owner (`request.auth.uid == userId`) or a verified admin.
6. **Master Gate Relational Integrity**: Subcollection `/sales/{saleId}/items/{itemId}` verifies via `exists()`/`get()` that the parent `/sales/{saleId}` exists and belongs to `request.auth.uid` (or admin).
7. **Terminal State Locking**: Once a `/sales/{saleId}` document reaches terminal status (`status == 'completed'` or `status == 'cancelled'`), non-admin users cannot mutate it.
8. **Temporal Integrity**: `createdAt` must equal `request.time` on `create` and remain immutable on `update`; `updatedAt` must equal `request.time` on `create` and `update`.
9. **Secure List Queries**: Every `allow list` rule enforces `resource.data.ownerId == request.auth.uid || isAdmin()` without calling `get()` or `exists()`.

---

## 2. The "Dirty Dozen" Payloads

1. **Unverified Email Spoof**: Authenticated user with `email: "satshwe36@gmail.com"` and `email_verified: false` attempting to create a product.
2. **Shadow Field Injection (Create)**: Creating `/products/prod_1` with an extra field `"isSuperAdmin": true`.
3. **Shadow Field Injection (Update)**: Updating `/products/prod_1` with an extra field `"hacked": 1`.
4. **Identity Spoofing**: Creating `/products/prod_1` where `ownerId` is set to another user's UID.
5. **Self-Assigned Admin Role**: Creating `/users/user_1` with `role: "admin"` by a non-admin user.
6. **PII Cross-Read**: Authenticated user `user_2` attempting `get` on `/users/user_1/private/info`.
7. **Orphaned Subcollection Write**: Creating `/sales/non_existent_sale/items/item_1` when `/sales/non_existent_sale` does not exist.
8. **Terminal State Mutation**: Non-admin user attempting to update `/sales/sale_1` after `existing().status == 'completed'`.
9. **Immortal Field Mutation**: Attempting to change `createdAt` or `ownerId` during an `update` on `/products/prod_1`.
10. **Client Timestamp Forgery**: Creating `/products/prod_1` with a past/future `createdAt` timestamp instead of `request.time`.
11. **Resource Exhaustion (1MB String)**: Updating `name` on `/products/prod_1` with a 5,000-character string (`size() > 200`).
12. **Unfiltered List Scraping**: Executing a blanket collection list query on `/sales` without filtering `where('ownerId', '==', uid)` as a non-admin.

---

## 3. Test Runner

See `/firestore.rules.test.ts` for the test suite verifying that all 12 Dirty Dozen payloads return `PERMISSION_DENIED`.

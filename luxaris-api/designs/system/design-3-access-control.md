
# Luxaris API system – Access Control (ACL)

This document describes the **Authorization Model (ACL)** within the Luxaris System context:  
permissions, roles, role assignments, direct grants, and permission checking.

---

## 1. Overview

Luxaris uses an **ACL star model**:  
Users/ServiceAccounts → Roles → Permissions → Resources/Actions.

This model provides:

- Fine-grained access control
- Role-based permission bundling
- Direct permission grants for exceptional cases
- Flexible permission evaluation with conditions

---

## 2. Resources and Actions

### 2.1 Resources

**Resource:** a type of thing in the system:

- `user`
- `api_key`
- `post`
- `schedule`
- `channel`
- `system_settings`
- etc.

### 2.2 Actions

**Action:** basic operation:

- `read`  
- `create`
- `update`
- `delete`
- `execute` (generic "perform something")

You can introduce more granular actions if needed, but starting small is better.

---

## 3. Permissions

**Concept:** a single capability, described as `(resource, action, condition?)`.

Main fields:

- `id` – UUID.
- `resource` – string (e.g. `"post"`, `"schedule"`).
- `action` – string (e.g. `"read"`, `"create"`, `"execute"`).
- `condition` – JSON with optional constraint (e.g. `{"ownerOnly": true}` or tenant id scoping).
- `description` – human-readable.

This gives a normalized catalog of *possible* permissions in the system.

---

## 4. Roles

**Concept:** a named bundle of permissions.

Main fields:

- `id` – UUID.
- `name` – e.g. `"owner"`, `"editor"`, `"viewer"`.
- `slug` – stable identifier.
- `description`.
- `scope` – global or tenant-specific (if multi-tenant later).
- `created_at`, `updated_at`.

Relation table:

- `role_permissions`:
  - `role_id`
  - `permission_id`

Roles are used to quickly attach a set of capabilities to a user/service account.

---

## 5. Role Assignments

Bridge between principal and role:

- `principal_type` – `user | service_account`.
- `principal_id`.
- `role_id`.
- `created_at`.

Used heavily by the permission-check logic.

---

## 6. Root User Access

**Root User Privilege:**

- Users with `is_root = true` bypass all ACL permission checks.
- Root users have implicit permission for all resources and actions.
- Permission checking logic must check `is_root` flag before evaluating roles/permissions.
- Root users can access admin-only features:
  - Approve pending user registrations
  - Manage system-wide settings
  - View all users and audit logs
  - Override any access control

**Implementation Note:**

Permission check pseudocode:
```javascript
function hasPermission(principal, resource, action) {
  // Root users bypass all checks
  if (principal.is_root) return true;
  
  // Standard ACL evaluation
  return evaluateRolesAndPermissions(principal, resource, action);
}
```

**Admin Dashboard:**

- Future implementation: Simple admin dashboard for root users only.
- Features:
  - List pending user registrations
  - Approve/reject new users
  - View system health and metrics
  - Manage system-wide configuration

---

## 6. Direct Grants (optional but useful)

Sometimes you want to give one user custom capabilities.

- `principal_type` – `user | service_account`.
- `principal_id`.
- `permission_id`.
- `condition_override` – optional extra constraints.
- `created_at`.

These grants are evaluated in addition to any role-based permissions.

---

## 7. Permission Check (conceptual)

The System context will expose an API like:

```js
can(principal, resource, action, context) -> boolean
```

Where:

- `principal` – user/service account id and type.
- `resource` – e.g. `'schedule'`.
- `action` – e.g. `'update'`.
- `context` – optional: owner id, tenant id, etc.

Internally it aggregates:

1. Roles assigned → role_permissions.
2. Direct grants.
3. Evaluates conditions (e.g. owner-only).

Other contexts (like Posts) call `can()` instead of reading ACL tables directly.

---

## 8. Summary of Access Control Entities

Key entities:

- `permissions`
- `roles`
- `role_permissions`
- `principal_role_assignments`
- `principal_permission_grants` (direct grants)

These form the backbone for authorization and access control across all Luxaris contexts.

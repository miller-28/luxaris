
# Luxaris API system – Identity and Authentication

This document describes **Identity and Authentication** entities within the Luxaris System context:  
users, service accounts, sessions, JWT tokens, and API keys.

---

## 1. Overview

Identity and Authentication provide:

- User and service account management
- Session-based authentication (for dashboards)
- JWT token generation and verification
- API key management for programmatic access

These primitives are used by all other Luxaris contexts for identifying and authenticating principals.

---

## 2. Identity Entities

### 2.1 Users

**Concept:** a human operator using Luxaris (owner of posts, schedules, API keys).

Main fields:

- `id` – UUID.
- `email` – unique, lowercase.
- `password_hash` – hashed password (or `NULL` for SSO-only).
- `name` – display name.
- `status` – `active | disabled | invited | pending_verification`.
- `created_at`, `updated_at`.
- `last_login_at` – last successful auth time.
- `timezone` – default user timezone (used as fallback for scheduling UX).
- `locale` – language preference (future use).

Notes:

- User **does not** carry permissions directly. Those go via roles / explicit grants.
- Email + status determine if user can login; System policies decide if disabled users can access API keys etc.

---

### 2.2 Service Accounts

**Concept:** non-human identity for automation (CI, integrations).

Main fields:

- `id` – UUID.
- `name` – descriptive name (`"github-deploy-bot"`).
- `owner_user_id` – user who created/owns it (for accountability).
- `status` – `active | disabled`.
- `created_at`, `updated_at`.

Service accounts behave like users regarding permissions (roles, API keys), but don't log in with email/password.

---

## 3. Authentication Artifacts

### 3.1 Sessions (for dashboards)

If the web dashboard uses cookie-based sessions:

- `id` – UUID or random token.
- `user_id` or `service_account_id`.
- `created_at`, `expires_at`.
- `ip_address`, `user_agent` – for security, optional.
- `metadata` – JSON (e.g. "logged in via SSO provider").

Sessions are stored either:

- in **Memcached** (token → session data), keyed by `session_id`; or
- in DB if you want persistent sessions.

Used by the API gateway/middleware to attach authenticated principal to each request.

---

### 3.2 JWT Tokens

JWTs are **not stored** as rows, but their payload structure is important:

Suggested payload:

- `sub` – principal id (user or service account).
- `typ` – `user | service_account`.
- `roles` – list of role ids attached to the principal.
- `scopes` or `perms` – optional compressed permission snapshot.
- `iat`, `exp` – issued at / expiry.
- `jti` – token id (for blacklist / revocation if you want).

The System context exposes:

- **`issueToken(principal, options)`**  
- **`verifyToken(token)`**  

Internally using a signing key configured in `config`.

---

### 3.3 API Keys

**Concept:** long-lived secrets for programmatic access.

Main fields:

- `id` – UUID (public id).
- `principal_type` – `user | service_account`.
- `principal_id`.
- `key_prefix` – short non-secret prefix for display (like `lux_1234`).
- `key_hash` – hashed secret key.
- `name` – developer-provided label ("Production Publisher").
- `status` – `active | revoked`.
- `created_at`, `revoked_at`.
- `last_used_at`, `last_used_ip` – optional metrics.

The raw key (e.g. `lux_1234_abcd...`) is only shown once at creation.  
After that, only `key_prefix` + masked value is visible in UI; the hash is used for verification.

---

## 4. Summary of Identity Entities

Key entities:

- `users`
- `service_accounts`
- `sessions` (if persisted)
- `api_keys`

These form the foundation for identifying and authenticating all principals in the Luxaris system.
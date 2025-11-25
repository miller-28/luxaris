
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
- `password_hash` – hashed password (or `NULL` for OAuth-only users).
- `name` – display name.
- `avatar_url` – profile picture URL (from OAuth provider or uploaded).
- `auth_method` – `password | oauth` – primary authentication method.
- `status` – `active | disabled | invited | pending_verification | pending_approval`.
- `is_root` – boolean flag, marks root users with full system access.
- `approved_by_user_id` – references user who approved registration (root user).
- `approved_at` – timestamp of approval.
- `created_at`, `updated_at`.
- `last_login_at` – last successful auth time.
- `timezone` – default user timezone (used as fallback for scheduling UX).
- `locale` – language preference (future use).

**Authentication Methods:**

- **Password:** Traditional email/password authentication. `password_hash` must be set.
- **OAuth:** Authentication via external providers (Google, GitHub, etc.). `password_hash` is NULL.
- Users can have both methods enabled (link OAuth account to existing password account).

**Root User:**

- First user registered in system automatically becomes root user (`is_root = true`).
- Root users have unrestricted access to all system resources and operations.
- Root users can approve new user registrations via admin dashboard.
- Cannot be disabled or deleted through normal means.
- Root status cannot be revoked once granted.

**User Approval Flow:**

- New user registration creates user with `status = pending_approval`.
- User cannot login until approved by root user.
- Root user approves via admin dashboard (future implementation).
- Upon approval: `status` changes to `active`, `approved_by_user_id` and `approved_at` are set.
- Exception: First user (root) is auto-approved during registration.

Notes:

- User **does not** carry permissions directly. Those go via roles / explicit grants (except root users).
- Email + status determine if user can login; System policies decide if disabled users can access API keys etc.
- Root users bypass standard permission checks.

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

### 2.3 OAuth Providers

**Concept:** External authentication providers for OAuth login.

Main fields:

- `id` – UUID.
- `key` – unique identifier (`google`, `github`, `microsoft`, etc.).
- `name` – display name ("Google", "GitHub").
- `status` – `active | disabled`.
- `config` – JSON with provider-specific configuration:
  - `client_id` – OAuth client ID
  - `client_secret` – OAuth client secret (encrypted)
  - `authorization_url` – Provider's auth endpoint
  - `token_url` – Provider's token endpoint
  - `user_info_url` – Provider's user info endpoint
  - `scopes` – Required OAuth scopes
- `created_at`, `updated_at`.

**Supported Providers (Initial):**

- **Google:** Primary implementation for Gmail accounts
  - Scopes: `openid`, `email`, `profile`
  - User info from: `https://www.googleapis.com/oauth2/v3/userinfo`

**Future Providers:**
- GitHub
- Microsoft/Azure AD
- Facebook
- Twitter/X

---

### 2.4 OAuth Accounts

**Concept:** Links user to external OAuth provider account.

Main fields:

- `id` – UUID.
- `user_id` – references users table.
- `provider_id` – references oauth_providers table.
- `provider_user_id` – user's ID on provider's system.
- `provider_email` – email from provider.
- `provider_name` – display name from provider.
- `provider_avatar_url` – profile picture from provider.
- `access_token` – encrypted OAuth access token (optional, if needed for API calls).
- `refresh_token` – encrypted OAuth refresh token (optional).
- `token_expires_at` – when access token expires.
- `created_at`, `updated_at`.
- `last_used_at` – last time used for authentication.

**Purpose:**

- Maps external OAuth identity to internal user
- Allows linking multiple OAuth providers to same user
- Stores provider-specific user data
- Enables "Sign in with Google" functionality

**Account Linking:**

- User can link OAuth account to existing password-based account
- Prevents duplicate accounts when email matches
- First-time OAuth users create new account with `auth_method = oauth`

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

- `users` – Human operators
- `service_accounts` – Automation/bot identities
- `oauth_providers` – External authentication providers (Google, GitHub, etc.)
- `oauth_accounts` – Links users to OAuth providers
- `sessions` – Web dashboard sessions (Memcached or DB)
- `api_keys` – Programmatic access tokens

These form the foundation for identifying and authenticating all principals in the Luxaris system.

---

## 5. Database Schema

### 5.1 Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  auth_method VARCHAR(50) NOT NULL DEFAULT 'password',
  status VARCHAR(50) NOT NULL DEFAULT 'pending_approval',
  is_root BOOLEAN NOT NULL DEFAULT false,
  approved_by_user_id UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP,
  timezone VARCHAR(100) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_auth_method ON users(auth_method);
```

### 5.2 OAuth Providers Table

```sql
CREATE TABLE oauth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  config JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_providers_key ON oauth_providers(key);
CREATE INDEX idx_oauth_providers_status ON oauth_providers(status);
```

**Config JSON Structure:**
```json
{
  "client_id": "xxx.apps.googleusercontent.com",
  "client_secret": "encrypted_secret",
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
  "token_url": "https://oauth2.googleapis.com/token",
  "user_info_url": "https://www.googleapis.com/oauth2/v3/userinfo",
  "scopes": ["openid", "email", "profile"]
}
```

### 5.3 OAuth Accounts Table

```sql
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES oauth_providers(id) ON DELETE CASCADE,
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255) NOT NULL,
  provider_name VARCHAR(255),
  provider_avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP,
  UNIQUE(provider_id, provider_user_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider_id ON oauth_accounts(provider_id);
CREATE INDEX idx_oauth_accounts_provider_user_id ON oauth_accounts(provider_user_id);
```

### 5.4 Service Accounts Table

```sql
CREATE TABLE service_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_accounts_owner_user_id ON service_accounts(owner_user_id);
CREATE INDEX idx_service_accounts_status ON service_accounts(status);
```

### 5.5 API Keys Table

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_type VARCHAR(50) NOT NULL,
  principal_id UUID NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  key_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP,
  last_used_at TIMESTAMP,
  last_used_ip INET
);

CREATE INDEX idx_api_keys_principal ON api_keys(principal_type, principal_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_status ON api_keys(status);
```

---

## 6. OAuth Provider Setup

### 6.1 Google OAuth Configuration

**Initial Setup:**

1. Create Google Cloud Project
2. Enable Google+ API or Google Identity Services
3. Configure OAuth consent screen
4. Create OAuth 2.0 Web Application credentials
5. Add authorized redirect URIs

**Insert Provider Record:**

```sql
INSERT INTO oauth_providers (key, name, status, config) VALUES (
  'google',
  'Google',
  'active',
  '{
    "client_id": "xxx.apps.googleusercontent.com",
    "client_secret": "xxx",
    "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_url": "https://oauth2.googleapis.com/token",
    "user_info_url": "https://www.googleapis.com/oauth2/v3/userinfo",
    "scopes": ["openid", "email", "profile"]
  }'::jsonb
);
```

**Environment Variables:**
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

### 6.2 Future Providers

**GitHub:**
```json
{
  "authorization_url": "https://github.com/login/oauth/authorize",
  "token_url": "https://github.com/login/oauth/access_token",
  "user_info_url": "https://api.github.com/user",
  "scopes": ["read:user", "user:email"]
}
```

**Microsoft:**
```json
{
  "authorization_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  "user_info_url": "https://graph.microsoft.com/v1.0/me",
  "scopes": ["openid", "email", "profile"]
}
```
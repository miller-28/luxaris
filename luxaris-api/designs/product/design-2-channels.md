
# Luxaris API – Channels Domain

This document describes the **Channels domain**: platform definitions, user-specific connections, OAuth authentication, and integration management.

---

## 1. Overview

Channels and Connections provide:

- Platform catalog (X, LinkedIn, etc.)
- User-specific social media account connections
- Authentication state management
- Platform-specific constraints and limits

---

## 2. Channel

**Channel** = destination platform type (e.g. X, LinkedIn; future: others).

### 2.1 Fields

- `id` – UUID.
- `key` – stable identifier (`"x"`, `"linkedin"`).
- `name` – human readable (`"X (Twitter)"`).
- `status` – `active | disabled`.
- `limits` – JSON with platform limits:
  - `max_text_length`
  - `supports_images`
  - `supports_links`
  - per-day rate limits (optional).
- `created_at`, `updated_at`.

### 2.2 Purpose

This is more like a static catalog table used by:
- Validation logic (content length checks)
- Generation logic (platform-specific formatting)
- UI (displaying available platforms)

### 2.3 Example Channels

**X (Twitter)**
```json
{
  "key": "x",
  "name": "X (Twitter)",
  "status": "active",
  "limits": {
    "max_text_length": 280,
    "supports_images": true,
    "supports_links": true,
    "max_images": 4
  }
}
```

**LinkedIn**
```json
{
  "key": "linkedin",
  "name": "LinkedIn",
  "status": "active",
  "limits": {
    "max_text_length": 3000,
    "supports_images": true,
    "supports_links": true,
    "max_images": 9
  }
}
```

---

## 3. Channel Connection

**ChannelConnection** = a user- or account-specific connection to a channel  
(e.g. "Jonathan's X account @miller_28").

### 3.1 Fields

- `id` – UUID.
- `owner_principal_id` – principal id from System domain.
- `channel_id` – FK → `Channel`.
- `display_name` – e.g. `"@miller_28"`.
- `status` – `connected | revoked | error`.
- `auth_state` – JSON with tokens, refresh info, etc (encrypted at rest).
- `created_at`, `updated_at`, `last_used_at`.

### 3.2 Purpose

Publishing logic uses this to know:
- **Where** to send posts (which platform)
- **As whom** to authenticate (which account)
- **Whether valid** (connection status)

### 3.3 Authentication State

The `auth_state` JSON field contains platform-specific authentication data:

**For OAuth platforms (X, LinkedIn):**
```json
{
  "access_token": "encrypted_token_value",
  "refresh_token": "encrypted_refresh_value",
  "expires_at": "2025-12-01T00:00:00Z",
  "scope": ["read", "write"],
  "account_id": "external_platform_user_id"
}
```

**Security notes:**
- All tokens encrypted at rest using application encryption key
- Tokens refreshed automatically before expiry
- Failed authentications transition status to `error`

### 3.4 Connection Status

- **`connected`** – Active and valid, ready to publish
- **`revoked`** – User disconnected or revoked access
- **`error`** – Authentication failed (expired, invalid, rate-limited)

---

## 4. Workflows

### 4.1 Connect New Channel

Flow:

1. User initiates connection to platform (e.g., "Connect X account").
2. Application redirects to OAuth provider.
3. User authorizes Luxaris.
4. OAuth callback receives tokens.
5. Application creates `ChannelConnection`:
   - Stores encrypted tokens in `auth_state`.
   - Sets `status = connected`.
   - Fetches and stores `display_name` from platform API.

### 4.2 Disconnect Channel

Flow:

1. User requests disconnection.
2. Application:
   - Updates `ChannelConnection.status = revoked`.
   - Optionally revokes tokens with platform API.
   - Cancels any pending schedules using this connection.

### 4.3 Refresh Authentication

Background process:

1. Periodically checks connections with `expires_at` approaching.
2. Uses refresh token to get new access token.
3. Updates `auth_state` with new tokens.
4. On failure, sets `status = error`.

---

## 5. Constraints & Rules

**Connection Ownership**
- Only the owner principal can use or manage their connections
- Permissions system can grant access to team members

**Active Connection Required**
- Schedules can only target `status = connected` connections
- Attempting to schedule to `revoked` or `error` connection fails validation

**Platform Limits Enforcement**
- Content validation checks `Channel.limits` before allowing schedule creation
- Exceeding limits returns validation error to user

---

## 6. Summary

Key entities:

- `channels` – Platform catalog
- `channel_connections` – User-specific account connections

These provide the foundation for multi-platform publishing in Luxaris.

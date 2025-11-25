# Connect Channel Flow

## Overview

User connects their social media account (e.g., X/Twitter) to Luxaris for publishing.

---

## Flow Steps

### 1. User Initiates Connection

**Request:** `POST /api/v1/channels/connect`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "channel_id": "x_channel_uuid"
}
```

### 2. API Authenticates User

- Verify JWT token
- Extract user ID from token

### 3. Check Permissions

- Call System context: `can(user, 'channel', 'create')`
- Verify user can create channel connections

### 4. Validate Channel

- Query `channels` table by `channel_id`
- Verify channel exists and status is `active`
- Get channel details (name, OAuth settings)

### 5. Generate OAuth URL

- Generate state token (for CSRF protection)
- Store state in Memcached with user ID and channel ID
- Build OAuth authorization URL:
  ```
  https://api.x.com/oauth/authorize
    ?client_id=<app_id>
    &redirect_uri=<callback_url>
    &state=<state_token>
    &scope=read,write
  ```

### 6. Return OAuth URL

**Success Response:** `200 OK`

```json
{
  "authorization_url": "https://api.x.com/oauth/authorize?client_id=...",
  "state": "random_state_token",
  "expires_in": 300
}
```

### 7. User Authorizes on Platform

- User redirected to X/Twitter
- User logs in and authorizes Luxaris
- Platform redirects back to callback URL

### 8. Handle OAuth Callback

**Request:** `GET /api/v1/channels/callback?code=auth_code&state=state_token`

- Verify state token (CSRF check)
- Retrieve user ID and channel ID from Memcached
- Exchange authorization code for access token
- Call platform API: `POST /oauth/token`

### 9. Fetch Account Details

- Use access token to call platform API
- Get user's account info:
  - Username/display name
  - Account ID
  - Profile details

### 10. Create Channel Connection

- Generate UUID for connection ID
- Encrypt access token and refresh token (at rest)
- Store in `channel_connections` table:
  ```json
  {
    "id": "uuid",
    "owner_principal_id": "user_uuid",
    "channel_id": "x_channel_uuid",
    "display_name": "@username",
    "status": "connected",
    "auth_state": {
      "access_token": "encrypted",
      "refresh_token": "encrypted",
      "expires_at": "2025-12-25T10:00:00Z",
      "account_id": "platform_user_id"
    }
  }
  ```

### 11. Create Audit Log

- Record `CHANNEL_CONNECTED` action
- Store in `audit_logs`

### 12. Redirect User to Dashboard

**Success Response:** Redirect to dashboard with success message

```
https://dashboard.luxaris.com/channels?success=true&channel=x
```

---

## Error Cases

### Invalid Channel

**Response:** `404 Not Found`

```json
{
  "errors": [{
    "error_code": "CHANNEL_NOT_FOUND",
    "error_description": "Channel does not exist",
    "error_severity": "error"
  }]
}
```

### OAuth Failed

**Response:** `400 Bad Request`

```json
{
  "errors": [{
    "error_code": "OAUTH_FAILED",
    "error_description": "Failed to authorize with platform",
    "error_severity": "error"
  }]
}
```

### State Mismatch (CSRF)

**Response:** `403 Forbidden`

```json
{
  "errors": [{
    "error_code": "INVALID_STATE",
    "error_description": "Security check failed. Please try again.",
    "error_severity": "error"
  }]
}
```

### Already Connected

**Response:** `409 Conflict`

```json
{
  "errors": [{
    "error_code": "ALREADY_CONNECTED",
    "error_description": "This account is already connected",
    "error_severity": "warning"
  }]
}
```

---

## Security Considerations

- State token prevents CSRF attacks
- Tokens encrypted at rest using application encryption key
- OAuth callback validates state and user ownership
- Failed attempts logged to audit logs

---

## Database Changes

**Tables Modified:**
- `channel_connections` - New connection record
- `audit_logs` - Connection event
- Memcached - State token (temporary, 5 min TTL)

---

## Context Dependencies

- **System Context:** Authentication (JWT), authorization (ACL), audit logging
- **Posts Context:** Channel repository, OAuth adapters
- **External:** Platform OAuth APIs (X, LinkedIn, etc.)

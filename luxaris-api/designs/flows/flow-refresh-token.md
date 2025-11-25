# Flow: Refresh User Token

**Endpoint:** `POST /api/v1/system/auth/refresh`

**Context:** System - Identity & Authentication

**Purpose:** Refresh an expired or expiring JWT access token using a refresh token.

---

## Request

```json
{
  "refresh_token": "refresh_token_value_here"
}
```

**Alternative:** Refresh token in HTTP-only cookie
```
Cookie: refresh_token=refresh_token_value_here
```

---

## Flow Steps

1. **Extract Refresh Token**
   - Get from request body OR cookie
   - Return 400 if not provided

2. **Validate Token Format**
   - Check token is not empty
   - Validate JWT format

3. **Verify Refresh Token**
   - Decode and verify JWT signature
   - Check token type is `refresh`
   - Check token is not expired
   - Extract `principal_id` and `session_id`
   - Return 401 if invalid or expired

4. **Validate Session**
   - Check session exists in Memcached:
     - Key: `session:{session_id}`
   - Verify session is active (not revoked)
   - Verify session belongs to principal
   - Return 401 if session invalid

5. **Check User Status**
   - Query `users` table by `principal_id`
   - Verify user status is `active`
   - Return 403 if user is suspended or deleted

6. **Generate New Access Token**
   - Create new JWT access token:
     - `principal_id`: User UUID
     - `principal_type`: "user"
     - `session_id`: Same session ID
     - `token_type`: "access"
     - `exp`: Current time + 15 minutes
     - `iat`: Current time

7. **Update Session Activity**
   - Update session in Memcached:
     - `last_activity`: Current timestamp
     - `token_refreshed_at`: Current timestamp

8. **Create Audit Log**
   - Log `TOKEN_REFRESHED` event
   - Include session ID and timestamp

9. **Return Response**
   - Return new access token
   - Return refresh token (same or new)

---

## Response

**Success (200 OK):**
```json
{
  "access_token": "new_access_token_value",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "same_or_new_refresh_token",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "active"
  }
}
```

**Error (401 Unauthorized) - Invalid token:**
```json
{
  "errors": [
    {
      "error_code": "INVALID_REFRESH_TOKEN",
      "error_description": "Refresh token is invalid or expired",
      "error_severity": "error"
    }
  ]
}
```

**Error (401 Unauthorized) - Session revoked:**
```json
{
  "errors": [
    {
      "error_code": "SESSION_REVOKED",
      "error_description": "Your session has been revoked. Please log in again.",
      "error_severity": "error"
    }
  ]
}
```

**Error (403 Forbidden) - User suspended:**
```json
{
  "errors": [
    {
      "error_code": "USER_SUSPENDED",
      "error_description": "Your account has been suspended. Please contact support.",
      "error_severity": "error"
    }
  ]
}
```

---

## Token Rotation (Optional Security Enhancement)

**Automatic Refresh Token Rotation:**

When enabled, each refresh generates a NEW refresh token:

1. **Generate New Refresh Token**
   - Create new JWT refresh token
   - New expiration (30 days from now)
   - Same session_id

2. **Invalidate Old Refresh Token**
   - Store old token in blacklist (Memcached)
   - Key: `token:blacklist:{old_token_hash}`
   - TTL: Original token expiration

3. **Return Both Tokens**
   - New access token
   - New refresh token

**Benefits:**
- Limits exposure window if token is compromised
- Detects token theft (if old token is reused)
- Industry best practice for security

**Response with rotation:**
```json
{
  "access_token": "new_access_token",
  "refresh_token": "brand_new_refresh_token",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token_expires_in": 2592000
}
```

---

## Token Lifetime Strategy

**Access Token:**
- Short-lived: 15 minutes
- Stored in memory (not localStorage)
- Used for API requests

**Refresh Token:**
- Long-lived: 30 days
- Stored in HTTP-only cookie
- Used only for token refresh

**Session:**
- Stored in Memcached
- TTL: 30 days (sliding window)
- Extended on each refresh

---

## Security Considerations

**1. HTTP-Only Cookies (Recommended):**
```javascript
Set-Cookie: refresh_token=value; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/system/auth/refresh; Max-Age=2592000
```

**Benefits:**
- Not accessible via JavaScript (XSS protection)
- Automatic transmission with requests
- Browser handles storage

**2. Refresh Token Fingerprinting:**
```javascript
// Include device/browser fingerprint in token
{
  principal_id: 'user-uuid',
  session_id: 'session-uuid',
  fingerprint: hash(userAgent + ipAddress)
}

// Verify fingerprint on refresh
if (token.fingerprint !== computeFingerprint(req)) {
  throw new Error('Token fingerprint mismatch');
}
```

**3. Rate Limiting:**
```javascript
// Max 10 refresh attempts per session per hour
const key = `refresh:limit:${session_id}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 3600);
if (count > 10) throw new RateLimitError();
```

---

## Session Management

**Session Structure (Memcached):**
```json
{
  "session_id": "session-uuid",
  "principal_id": "user-uuid",
  "principal_type": "user",
  "created_at": "2025-11-25T10:00:00Z",
  "last_activity": "2025-11-25T16:30:00Z",
  "token_refreshed_at": "2025-11-25T16:30:00Z",
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0...",
  "is_active": true
}
```

**Session Revocation:**
```javascript
// Revoke session (logout)
await memcached.delete(`session:${session_id}`);

// Revoke all user sessions (security action)
const sessions = await memcached.getMulti(`session:user:${principal_id}:*`);
await Promise.all(sessions.map(s => memcached.delete(s.key)));
```

---

## Client-Side Implementation

**Automatic Token Refresh:**

```javascript
// Interceptor for API requests
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      
      // Try to refresh token
      const { access_token } = await api.post('/system/auth/refresh');
      
      // Update authorization header
      error.config.headers.Authorization = `Bearer ${access_token}`;
      
      // Retry original request
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## Authorization

- No authorization required (public endpoint)
- Valid refresh token is sufficient authentication
- User status is checked during refresh

---

## Audit Logging

**Logged Events:**
- `TOKEN_REFRESHED`: Successful refresh
- `REFRESH_TOKEN_INVALID`: Failed attempt with invalid token
- `REFRESH_TOKEN_EXPIRED`: Failed attempt with expired token
- `SESSION_REVOKED_ON_REFRESH`: Session was revoked between requests

**Log Data:**
- `principal_id`
- `session_id`
- `ip_address`
- `user_agent`
- `timestamp`

# Flow: Logout (Revoke Session)

**Endpoint:** `POST /api/v1/system/auth/logout`

**Context:** System - Identity & Authentication

**Purpose:** Invalidate the current session and revoke access/refresh tokens.

---

## Request

**Headers:**
```
Authorization: Bearer access_token_value
```

**Body (optional):**
```json
{
  "revoke_all_sessions": false
}
```

- `revoke_all_sessions`: If `true`, revokes all user sessions across all devices

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT access token
   - Extract `principal_id` and `session_id` from token
   - Return 401 if invalid

2. **Validate Input**
   - Validate `revoke_all_sessions` is boolean (if provided)

3. **Revoke Current Session**
   - Delete session from Memcached:
     - Key: `session:{session_id}`
   - Remove session from user's active sessions list

4. **Revoke All Sessions (if requested)**
   - If `revoke_all_sessions` is `true`:
     - Query all sessions for user: `session:user:{principal_id}:*`
     - Delete all sessions from Memcached
     - Invalidate all refresh tokens

5. **Blacklist Current Tokens (optional)**
   - Add access token to blacklist (Memcached):
     - Key: `token:blacklist:{access_token_hash}`
     - TTL: Token remaining lifetime
   - Add refresh token to blacklist:
     - Key: `token:blacklist:{refresh_token_hash}`
     - TTL: Token remaining lifetime

6. **Create Audit Log**
   - Log `USER_LOGGED_OUT` event
   - Include session count if multiple sessions revoked

7. **Clear Session Cookie (if applicable)**
   - Set refresh_token cookie with expired date

8. **Return Response**
   - Confirm successful logout

---

## Response

**Success (200 OK):**
```json
{
  "message": "Successfully logged out",
  "sessions_revoked": 1
}
```

**Success (200 OK) - All sessions revoked:**
```json
{
  "message": "Successfully logged out from all devices",
  "sessions_revoked": 4
}
```

**Error (401 Unauthorized):**
```json
{
  "errors": [
    {
      "error_code": "UNAUTHORIZED",
      "error_description": "Invalid or expired access token",
      "error_severity": "error"
    }
  ]
}
```

---

## Token Blacklisting

**Why blacklist tokens?**
- JWT tokens are stateless and valid until expiration
- Logout should immediately invalidate tokens
- Blacklist prevents token reuse after logout

**Implementation:**

**1. Store token hash (not full token):**
```javascript
const crypto = require('crypto');
const tokenHash = crypto
  .createHash('sha256')
  .update(accessToken)
  .digest('hex');

await memcached.set(
  `token:blacklist:${tokenHash}`,
  true,
  tokenExpirationSeconds
);
```

**2. Check blacklist on authentication:**
```javascript
// In authentication middleware
const tokenHash = hashToken(accessToken);
const isBlacklisted = await memcached.get(`token:blacklist:${tokenHash}`);

if (isBlacklisted) {
  throw new UnauthorizedError('Token has been revoked');
}
```

**3. TTL matches token expiration:**
- Access token: 15 minutes
- Refresh token: 30 days
- After TTL, token naturally expires anyway

---

## Session Revocation Strategies

**Strategy 1: Delete from Memcached (Recommended)**
```javascript
// Simple and effective
await memcached.delete(`session:${session_id}`);
```

**Strategy 2: Mark as Revoked**
```javascript
// Keep session data for audit
await memcached.set(
  `session:${session_id}`,
  { ...session, is_active: false },
  session.ttl
);
```

**Strategy 3: Hybrid (Best for compliance)**
```javascript
// Move to audit log, delete from active sessions
await auditLog.create({
  event: 'SESSION_REVOKED',
  session_data: session
});
await memcached.delete(`session:${session_id}`);
```

---

## Logout All Sessions

**Use Cases:**
- User reports account compromise
- Password changed (security best practice)
- User wants to logout from all devices
- Admin action (suspend user)

**Implementation:**
```javascript
// Find all user sessions
const sessionKeys = await memcached.getKeys(`session:user:${principal_id}:*`);

// Delete all sessions
await Promise.all(
  sessionKeys.map(key => memcached.delete(key))
);

// Blacklist all active tokens (optional, expensive)
// Better: Check session validity on each request
```

**Optimization:**
- Store user's session IDs in a Set:
  - Key: `sessions:user:{principal_id}`
  - Value: Set of session IDs
- On logout all: Iterate set and delete each session

---

## Client-Side Cleanup

**Dashboard should:**
1. Delete access token from memory
2. Clear any cached user data
3. Redirect to login page
4. Show confirmation message

**Example:**
```javascript
async function logout(revokeAll = false) {
  try {
    await api.post('/system/auth/logout', {
      revoke_all_sessions: revokeAll
    });
  } catch (error) {
    // Logout anyway (token might be invalid)
    console.error('Logout API error:', error);
  } finally {
    // Clear client state
    localStorage.removeItem('user');
    sessionStorage.clear();
    delete api.defaults.headers.common['Authorization'];
    
    // Redirect
    window.location.href = '/login';
  }
}
```

---

## Security Considerations

**1. Always authenticate logout:**
- Require valid token (even if expired recently)
- Prevents unauthorized session revocation

**2. Audit all logouts:**
- Log who, when, where
- Detect unusual patterns
- Compliance requirements

**3. Handle expired tokens gracefully:**
```javascript
if (token.isExpired() && token.expiredWithin(minutes: 5)) {
  // Allow logout for recently expired tokens
  principal_id = token.payload.principal_id;
} else if (token.isExpired()) {
  // Token too old, session likely already expired
  return { message: 'Session already expired' };
}
```

**4. Rate limiting:**
```javascript
// Prevent logout abuse (DoS attack vector)
const key = `logout:limit:${principal_id}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60);
if (count > 10) throw new RateLimitError();
```

---

## Authorization

- Requires valid JWT access token
- User can only logout their own sessions
- Admins can force-logout users via separate endpoint

---

## Related Operations

**Force Logout (Admin):**
```
POST /api/v1/system/admin/users/:user_id/force-logout
```

**List Active Sessions:**
```
GET /api/v1/system/auth/sessions
```

**Revoke Specific Session:**
```
DELETE /api/v1/system/auth/sessions/:session_id
```

---

## Audit Logging

**Single Session Logout:**
```json
{
  "event": "USER_LOGGED_OUT",
  "principal_id": "user-uuid",
  "session_id": "session-uuid",
  "timestamp": "2025-11-25T17:00:00Z",
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0..."
}
```

**Multiple Sessions Logout:**
```json
{
  "event": "USER_LOGGED_OUT_ALL",
  "principal_id": "user-uuid",
  "sessions_revoked": 4,
  "session_ids": ["session-1", "session-2", "session-3", "session-4"],
  "timestamp": "2025-11-25T17:00:00Z",
  "ip_address": "203.0.113.42"
}
```

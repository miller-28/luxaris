# Flow: OAuth Registration/Login (Google)

**Endpoints:** 
- `GET /api/v1/system/auth/oauth/:provider/authorize` - Initiate OAuth flow
- `POST /api/v1/system/auth/oauth/:provider/callback` - Handle OAuth callback

**Context:** System - Identity & Authentication

**Purpose:** Register or login users using OAuth providers (Google as primary implementation).

---

## OAuth Flow Overview

```
User → Dashboard → API (authorize) → Google OAuth → API (callback) → Dashboard
```

---

## Step 1: Initiate OAuth Flow

**Endpoint:** `GET /api/v1/system/auth/oauth/google/authorize`

**Query Parameters:**
- `redirect_uri` (optional): Where to redirect after completion (default: dashboard)

### Flow Steps

1. **Validate Provider**
   - Check `oauth_providers` table for `key = 'google'`
   - Verify `status = active`
   - Return 404 if provider not found or disabled

2. **Generate OAuth State**
   - Create random state token (32 bytes, base64)
   - Store in Memcached with TTL (5 minutes):
     - Key: `oauth:state:{state_token}`
     - Value: `{ redirect_uri, timestamp, ip_address }`

3. **Build Authorization URL**
   - Get provider config from database
   - Construct Google OAuth URL:
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id={client_id}&
     redirect_uri={api_callback_url}&
     response_type=code&
     scope=openid email profile&
     state={state_token}&
     access_type=offline
   ```

4. **Return Redirect Response**

**Response (302 Redirect):**
```
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
```

**Or JSON Response (for SPA):**
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "state": "random_state_token",
  "expires_in": 300
}
```

---

## Step 2: User Authorizes on Google

- User redirected to Google login page
- User authenticates and grants permissions
- Google redirects back to: `{api_callback_url}?code=...&state=...`

---

## Step 3: Handle OAuth Callback

**Endpoint:** `POST /api/v1/system/auth/oauth/google/callback`

**Request Body:**
```json
{
  "code": "oauth_authorization_code",
  "state": "random_state_token"
}
```

### Flow Steps

1. **Validate State Token**
   - Retrieve state from Memcached: `oauth:state:{state_token}`
   - Return 400 if not found (expired or invalid)
   - Verify not older than 5 minutes
   - Delete state from cache (one-time use)

2. **Exchange Code for Tokens**
   - POST to Google token endpoint:
   ```
   POST https://oauth2.googleapis.com/token
   Content-Type: application/x-www-form-urlencoded
   
   code={code}&
   client_id={client_id}&
   client_secret={client_secret}&
   redirect_uri={api_callback_url}&
   grant_type=authorization_code
   ```

3. **Receive Tokens from Google**
   ```json
   {
     "access_token": "ya29.xxx",
     "refresh_token": "1//xxx",
     "expires_in": 3600,
     "scope": "openid email profile",
     "token_type": "Bearer",
     "id_token": "eyJhbGc..."
   }
   ```

4. **Fetch User Info from Google**
   - GET to user info endpoint:
   ```
   GET https://www.googleapis.com/oauth2/v3/userinfo
   Authorization: Bearer {access_token}
   ```
   
   Response:
   ```json
   {
     "sub": "google_user_id_123",
     "email": "user@gmail.com",
     "email_verified": true,
     "name": "John Doe",
     "picture": "https://lh3.googleusercontent.com/..."
   }
   ```

5. **Check if OAuth Account Exists**
   - Query `oauth_accounts` table:
     - `provider_id` = Google provider ID
     - `provider_user_id` = Google's `sub` field
   
6. **Scenario A: Existing OAuth Account (Login)**
   - Get linked `user_id`
   - Update `oauth_accounts`:
     - `last_used_at` = now
     - Optionally update tokens if needed
   - Skip to Step 9 (Create Session)

7. **Scenario B: Email Exists (Link Account)**
   - Query `users` table by `email`
   - If user exists with same email:
     - User must be in `pending_approval` or `active` status
     - Create `oauth_accounts` record linking OAuth to existing user
     - Update user: `auth_method = 'oauth'` (or keep 'password' if already set)
     - Skip to Step 9

8. **Scenario C: New User (Registration)**
   - Check if this is first user in system:
     - If first: `is_root = true`, `status = active`
     - If not first: `is_root = false`, `status = pending_approval`
   
   - Create user record:
     - `email` = from Google
     - `name` = from Google
     - `avatar_url` = from Google
     - `password_hash` = NULL
     - `auth_method` = 'oauth'
     - `status` = as determined above
   
   - Create `oauth_accounts` record:
     - Link to new user
     - Store provider info
     - Encrypt and store tokens (optional)
   
   - Assign default role (if activated)
   
   - Record system event: `USER_REGISTERED_VIA_OAUTH` via EventRegistry
   
   - Create audit log: `USER_REGISTERED_VIA_OAUTH`
   
   - Log info: `systemLogger.info('system.auth', 'User registered via OAuth')`

9. **Check User Status**
   - If `status = pending_approval`:
     - Return 403 with pending approval message
   - If `status = disabled`:
     - Return 403 with account disabled message
   - If `status = active`:
     - Continue to create session

10. **Generate JWT Token**
    - Create access token with user info
    - Include roles and permissions

11. **Create Session**
    - Generate session ID
    - Store in Memcached

12. **Update User Login Timestamp**
    - Set `last_login_at` = now

13. **Record System Event**
    - Create event via EventRegistry
    - `USER_LOGIN` or `USER_REGISTERED_VIA_OAUTH` depending on scenario
    - Include OAuth provider in metadata

14. **Create Audit Log**
    - Log `USER_LOGGED_IN_VIA_OAUTH`

15. **Log Info to System Logs**
    - `systemLogger.info('system.auth', 'OAuth login successful')`
    - Include user ID and provider in context

16. **Return Response**

**Success Response (200 OK) - Active User:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@gmail.com",
    "name": "John Doe",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "auth_method": "oauth",
    "status": "active",
    "is_root": false
  },
  "expires_at": "2025-11-26T10:00:00Z",
  "message": "Successfully authenticated via Google"
}
```

**Success Response (200 OK) - First User (Root):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "admin@gmail.com",
    "name": "Admin User",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "auth_method": "oauth",
    "status": "active",
    "is_root": true
  },
  "expires_at": "2025-11-26T10:00:00Z",
  "message": "Successfully registered as system administrator via Google"
}
```

**Error Response (403 Forbidden) - Pending Approval:**
```json
{
  "errors": [{
    "error_code": "ACCOUNT_PENDING_APPROVAL",
    "error_description": "Your account is pending administrator approval. Please wait for confirmation.",
    "error_severity": "error"
  }]
}
```

---

## Error Cases

### Invalid State Token

**Response:** `400 Bad Request`
```json
{
  "errors": [{
    "error_code": "INVALID_OAUTH_STATE",
    "error_description": "Invalid or expired OAuth state token",
    "error_severity": "error"
  }]
}
```

### Provider Disabled

**Response:** `404 Not Found`
```json
{
  "errors": [{
    "error_code": "OAUTH_PROVIDER_NOT_AVAILABLE",
    "error_description": "Google authentication is currently unavailable",
    "error_severity": "error"
  }]
}
```

### Token Exchange Failed

**Response:** `502 Bad Gateway`
```json
{
  "errors": [{
    "error_code": "OAUTH_TOKEN_EXCHANGE_FAILED",
    "error_description": "Failed to exchange authorization code with Google",
    "error_severity": "error"
  }]
}
```

**Error Handling:**
- Log error via SystemLogger: `systemLogger.error('system.auth', 'OAuth token exchange failed', error)`
- Record failed event via EventRegistry: `OAUTH_LOGIN_FAILED`
- Include provider and error details in context

### Email Not Verified

**Response:** `403 Forbidden`
```json
{
  "errors": [{
    "error_code": "EMAIL_NOT_VERIFIED",
    "error_description": "Please verify your email address with Google first",
    "error_severity": "error"
  }]
}
```

---

## Security Notes

**State Token:**
- Prevents CSRF attacks
- One-time use only
- 5-minute expiration
- Stored in Memcached, not cookies

**Token Storage:**
- OAuth tokens encrypted at rest
- Refresh tokens optional (only if needed for future API calls)
- Store minimal data required

**Email Verification:**
- Must check `email_verified = true` from Google
- Reject unverified emails

**Account Linking:**
- Match by email to prevent duplicates
- User can later set password to enable both auth methods

---

## Database Changes

**Tables Modified:**
- `users` - Create new user or update existing
- `oauth_accounts` - Create OAuth account link
- `principal_role_assignments` - Assign default role
- `audit_logs` - Log registration/login event

**Memcached:**
- `oauth:state:{token}` - Temporary state storage

---

## Provider Configuration

**Google OAuth Setup:**

1. Create project in Google Cloud Console
2. Enable Google+ API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `https://api.luxaris.com/api/v1/system/auth/oauth/google/callback`
6. Store in `oauth_providers` table

**Environment Variables:**
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
OAUTH_CALLBACK_BASE_URL=https://api.luxaris.com
```

---

## Extensibility

**Adding New Providers:**

1. Insert provider config in `oauth_providers` table
2. Implement provider-specific adapter:
   - `buildAuthorizationUrl()`
   - `exchangeCodeForTokens()`
   - `fetchUserInfo()`
3. Same flow works for all providers
4. Provider-specific logic isolated in adapter pattern

**Example for GitHub:**
- Authorization URL: `https://github.com/login/oauth/authorize`
- Token URL: `https://github.com/login/oauth/access_token`
- User Info URL: `https://api.github.com/user`

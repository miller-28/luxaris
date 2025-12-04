# User Login Flow

## Overview

Existing user authenticates and receives JWT token for API access.

---

## Flow Steps

### 1. User Submits Credentials

**Request:** `POST /api/v1/system/auth/login`

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### 2. API Validates Credentials

- Query `users` table by email
- Verify user exists and status is `active`
- Compare password hash using Argon2

### 3. Check User Status

- If `disabled`: Return 403 Forbidden
- If `pending_verification`: Return 401 with message
- If `active`: Continue

### 4. Generate JWT Token

- Create token payload:
  ```json
  {
    "sub": "user_uuid",
    "typ": "user",
    "roles": ["role_id_1", "role_id_2"],
    "iat": 1700000000,
    "exp": 1700086400
  }
  ```
- Sign with `JWT_SECRET`
- Set expiration (24 hours)

### 5. Create Session (Optional)

- If session management enabled:
  - Generate session ID
  - Store in Memcached with user data
  - Set expiration

### 6. Update User Record

- Set `last_login_at` to current timestamp
- Update in `users` table

### 7. Record System Event

- Create `USER_LOGIN` event via EventRegistry
- Store in `system_events` table
- Include:
  - `event_type: "auth"`
  - `event_name: "USER_LOGIN"`
  - `principal_id`: User's ID
  - `resource_type: "user"`
  - `resource_id`: User's ID
  - `status: "success"`
  - IP address, user agent

### 8. Create Audit Log

- Record `USER_LOGIN` action
- Store in `audit_logs` table
- Include IP address, user agent

### 9. Log Info to System Logs

- Log successful login via SystemLogger
- `systemLogger.info('system.auth', 'User login successful')`
- Include user ID and email in context

### 10. Return Response

**Success Response:** `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["viewer"],
    "timezone": "America/New_York"
  },
  "expires_at": "2025-11-26T10:00:00Z"
}
```

---

## Error Cases

### Invalid Credentials

**Response:** `401 Unauthorized`

```json
{
  "errors": [{
    "error_code": "INVALID_CREDENTIALS",
    "error_description": "Invalid email or password",
    "error_severity": "error"
  }]
}
```

**Error Handling:**
- Record failed login event via EventRegistry: `USER_LOGIN_FAILED`
- Log warning via SystemLogger: `systemLogger.warning('system.auth', 'Failed login attempt')`
- Include IP address and attempted email (not password) in context
- Store in `system_events` with `status: "failed"`

### Account Pending Approval

**Response:** `403 Forbidden`

```json
{
  "errors": [{
    "error_code": "ACCOUNT_PENDING_APPROVAL",
    "error_description": "Your account is pending administrator approval. Please wait for confirmation.",
    "error_severity": "error"
  }]
}
```

### Account Disabled

**Response:** `403 Forbidden`

```json
{
  "errors": [{
    "error_code": "ACCOUNT_DISABLED",
    "error_description": "Your account has been disabled. Contact support.",
    "error_severity": "error"
  }]
}
```

### Email Not Verified

**Response:** `401 Unauthorized`

```json
{
  "errors": [{
    "error_code": "EMAIL_NOT_VERIFIED",
    "error_description": "Please verify your email address before logging in",
    "error_severity": "warning"
  }]
}
```

---

## Security Measures

- Rate limiting: Max 5 attempts per 15 minutes per IP
- Password timing attack prevention (constant-time comparison)
- Failed login attempts logged for monitoring
- Optional: Account lockout after N failed attempts

---

## Database Changes

**Tables Modified:**
- `users` - Update `last_login_at`
- `audit_logs` - Login event
- Memcached - Session data (if enabled)

---

## Context Dependencies

- **System Domain:** Authentication service, JWT generation, session management, audit logging
- **No external services required**

# User Registration Flow

## Overview

New user creates an account in the Luxaris system.

---

## Flow Steps

### 1. User Submits Registration

**Request:** `POST /api/v1/system/auth/register`

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "timezone": "America/New_York"
}
```

### 2. API Validates Input

- Email format validation (via Zod)
- Password strength check (Argon2 requirements)
- Email uniqueness check (database query)

### 3. Create User Record

- Hash password using Argon2
- Generate UUID for user ID
- Check if this is the first user in system:
  - If first user: Set `is_root = true` and `status = active` (auto-approved)
  - If not first user: Set `is_root = false` and `status = pending_approval`
- Store in `users` table

### 4. Assign Default Role

- Query `roles` table for "viewer" role (default)
- Create entry in `principal_role_assignments`
- Links user to basic permissions

### 5. Record System Event

- Create `USER_REGISTERED` event via EventRegistry
- Store in `system_events` table
- Include:
  - `event_type: "auth"`
  - `event_name: "USER_REGISTERED"`
  - `principal_id`: New user's ID
  - `resource_type: "user"`
  - `resource_id`: New user's ID
  - `status: "success"`
  - `metadata`: { `auth_method: "password"`, `is_root: <boolean>` }
  - IP address, user agent

### 6. Create Audit Log

- Record `USER_REGISTERED` action
- Store in `audit_logs` table
- Include IP address, user agent

### 7. Log Info to System Logs

- Log successful registration via SystemLogger
- `systemLogger.info('system.auth', 'User registered successfully')`
- Include user ID and email in context

### 8. Send Verification Email (Optional)

- Generate verification token
- Send email via email service
- Token expires in 24 hours

### 9. Return Response

**Success Response:** `201 Created`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "pending_approval",
    "created_at": "2025-11-25T10:00:00Z"
  },
  "message": "Registration successful. Your account is pending approval by administrator."
}
```

**Root User Response (First Registration):** `201 Created`

```json
{
  "user": {
    "id": "uuid",
    "email": "root@example.com",
    "name": "Root User",
    "status": "active",
    "is_root": true,
    "created_at": "2025-11-25T10:00:00Z"
  },
  "message": "Registration successful. You are now the system administrator."
}
```

---

## Error Cases

### Email Already Exists

**Response:** `409 Conflict`

```json
{
  "errors": [{
    "error_code": "EMAIL_EXISTS",
    "error_description": "Email address already registered",
    "error_severity": "error"
  }]
}
```

### Weak Password

**Response:** `400 Bad Request`

```json
{
  "errors": [{
    "error_code": "WEAK_PASSWORD",
    "error_description": "Password must be at least 8 characters with uppercase, lowercase, and number",
    "error_severity": "error"
  }]
}
```

**Error Handling:**
- Log error via SystemLogger: `systemLogger.error('system.auth', 'Registration failed - weak password', error)`
- Do NOT create system event for validation failures (only successful operations or critical failures)

---

## Database Changes

**Tables Modified:**
- `users` - New user record
- `principal_role_assignments` - Default role assignment
- `audit_logs` - Registration event

---

## Context Dependencies

- **System Domain:** Authentication service, password hashing, role assignment, ACL initialization
- **No external services required** (except optional email)

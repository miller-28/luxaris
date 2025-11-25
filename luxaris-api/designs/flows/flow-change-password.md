# Flow: Change Password

**Endpoint:** `POST /api/v1/system/auth/change-password`

**Context:** System - Identity & Authentication

**Purpose:** Change authenticated user's password with current password verification.

---

## Request

**Headers:**
```
Authorization: Bearer access_token_value
```

**Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePassword456!",
  "new_password_confirm": "NewSecurePassword456!",
  "revoke_all_sessions": true
}
```

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT access token
   - Extract `principal_id` from token

2. **Validate Input**
   - Validate all fields are provided
   - Validate `new_password` matches `new_password_confirm`
   - Validate `new_password` meets security requirements:
     - Minimum 8 characters
     - At least one uppercase letter
     - At least one lowercase letter
     - At least one number
     - At least one special character
   - Validate `new_password` is different from `current_password`

3. **Fetch User**
   - Query `users` table by `principal_id`
   - Return 404 if not found

4. **Verify Current Password**
   - Get `password_hash` from user record
   - Verify `current_password` using argon2:
     ```javascript
     const isValid = await argon2.verify(
       user.password_hash,
       current_password
     );
     ```
   - Return 401 if incorrect
   - Log failed attempt (security monitoring)

5. **Check Password History (optional)**
   - Query `password_history` table
   - Verify `new_password` hasn't been used in last 5 passwords
   - Return 400 if password was recently used

6. **Hash New Password**
   - Hash `new_password` using argon2:
     ```javascript
     const newHash = await argon2.hash(new_password, {
       type: argon2.argon2id,
       memoryCost: 65536,
       timeCost: 3,
       parallelism: 4
     });
     ```

7. **Update User Record**
   - Update `users` table:
     - `password_hash` = new hash
     - `password_changed_at` = current timestamp
     - `updated_at` = current timestamp

8. **Store in Password History**
   - Insert into `password_history` table:
     - `user_id`
     - `password_hash` (old hash for history check)
     - `changed_at`

9. **Revoke Sessions (if requested)**
   - If `revoke_all_sessions` is `true`:
     - Delete all user sessions except current one
     - Force re-login on all other devices
   - If `false`:
     - Keep current session active
     - Other sessions remain valid

10. **Create Audit Log**
    - Log `PASSWORD_CHANGED` event

11. **Send Notification Email**
    - Email user about password change
    - Include timestamp and IP address
    - Provide "wasn't me?" link for compromise reporting

12. **Return Response**
    - Confirm password change
    - Indicate sessions revoked (if applicable)

---

## Response

**Success (200 OK):**
```json
{
  "message": "Password successfully changed",
  "sessions_revoked": 3,
  "password_changed_at": "2025-11-25T17:30:00Z"
}
```

**Error (401 Unauthorized) - Wrong current password:**
```json
{
  "errors": [
    {
      "error_code": "INVALID_CURRENT_PASSWORD",
      "error_description": "Current password is incorrect",
      "error_severity": "error",
      "meta": {
        "attempts_remaining": 2
      }
    }
  ]
}
```

**Error (400 Bad Request) - Weak password:**
```json
{
  "errors": [
    {
      "error_code": "WEAK_PASSWORD",
      "error_description": "Password does not meet security requirements",
      "error_severity": "error",
      "meta": {
        "requirements": {
          "min_length": 8,
          "uppercase": true,
          "lowercase": true,
          "number": true,
          "special_char": true
        },
        "missing": ["special_char"]
      }
    }
  ]
}
```

**Error (400 Bad Request) - Password mismatch:**
```json
{
  "errors": [
    {
      "error_code": "PASSWORD_MISMATCH",
      "error_description": "New password and confirmation do not match",
      "error_severity": "error"
    }
  ]
}
```

**Error (400 Bad Request) - Recently used:**
```json
{
  "errors": [
    {
      "error_code": "PASSWORD_RECENTLY_USED",
      "error_description": "This password was recently used. Please choose a different password.",
      "error_severity": "error"
    }
  ]
}
```

**Error (429 Too Many Requests) - Rate limit:**
```json
{
  "errors": [
    {
      "error_code": "TOO_MANY_ATTEMPTS",
      "error_description": "Too many password change attempts. Please try again in 15 minutes.",
      "error_severity": "error",
      "meta": {
        "retry_after": "2025-11-25T17:45:00Z"
      }
    }
  ]
}
```

---

## Password Requirements

**Minimum Security Requirements:**
```javascript
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  preventCommon: true, // Check against common passwords list
  preventUserInfo: true // Prevent using name, email parts
};
```

**Validation Implementation:**
```javascript
function validatePassword(password, user) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check against common passwords (e.g., "Password123!")
  if (isCommonPassword(password)) {
    errors.push('Password is too common. Please choose a stronger password.');
  }
  
  // Prevent using parts of email or name
  const emailParts = user.email.split('@')[0].toLowerCase();
  if (password.toLowerCase().includes(emailParts)) {
    errors.push('Password should not contain parts of your email');
  }
  
  return errors;
}
```

---

## Password History

**Schema:**
```sql
CREATE TABLE password_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  password_hash TEXT NOT NULL,
  changed_at TIMESTAMP NOT NULL,
  changed_by UUID, -- For admin password resets
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_password_history_user_id ON password_history(user_id);
```

**Check History:**
```javascript
async function isPasswordRecentlyUsed(userId, newPassword) {
  // Get last 5 password hashes
  const history = await db('password_history')
    .where({ user_id: userId })
    .orderBy('changed_at', 'desc')
    .limit(5);
  
  // Check if new password matches any historical password
  for (const entry of history) {
    const matches = await argon2.verify(entry.password_hash, newPassword);
    if (matches) return true;
  }
  
  return false;
}
```

---

## Rate Limiting

**Failed Current Password Attempts:**
```javascript
// Max 5 incorrect attempts per 15 minutes
const key = `password_change:attempts:${principal_id}`;
const attempts = await redis.incr(key);

if (attempts === 1) {
  await redis.expire(key, 900); // 15 minutes
}

if (attempts > 5) {
  throw new RateLimitError('Too many failed attempts');
}

// On successful password change, clear counter
await redis.del(key);
```

**Overall Change Limit:**
```javascript
// Max 3 password changes per day
const key = `password_change:daily:${principal_id}`;
const changes = await redis.incr(key);

if (changes === 1) {
  await redis.expire(key, 86400); // 24 hours
}

if (changes > 3) {
  throw new RateLimitError('Maximum password changes per day exceeded');
}
```

---

## Session Management

**Revoke All Sessions (Recommended):**
- Forces re-login everywhere
- Invalidates any stolen tokens
- Security best practice after password change

**Keep Current Session:**
- Better UX (user stays logged in)
- Still provides security (password changed)
- Other devices require re-login on next token refresh

---

## Security Notifications

**Email Notification:**
```
Subject: Your Luxaris password was changed

Hi [User Name],

Your password was successfully changed on [Date] at [Time] from IP address [IP Address].

If you made this change, no action is needed.

If you didn't make this change, your account may be compromised. Please:
1. Reset your password immediately: [Reset Link]
2. Contact our security team: security@luxaris.com

Best regards,
Luxaris Security Team
```

---

## Authorization

- Requires valid JWT access token
- User can only change their own password
- Cannot change password for service accounts

---

## Audit Logging

**Successful Change:**
```json
{
  "event": "PASSWORD_CHANGED",
  "principal_id": "user-uuid",
  "timestamp": "2025-11-25T17:30:00Z",
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0...",
  "sessions_revoked": 3
}
```

**Failed Attempt:**
```json
{
  "event": "PASSWORD_CHANGE_FAILED",
  "principal_id": "user-uuid",
  "timestamp": "2025-11-25T17:29:45Z",
  "reason": "INVALID_CURRENT_PASSWORD",
  "attempts": 2,
  "ip_address": "203.0.113.42"
}
```

---

## Related Operations

**Forgot Password (Public):**
```
POST /api/v1/system/auth/forgot-password
```

**Reset Password (Public, with token):**
```
POST /api/v1/system/auth/reset-password
```

**Admin Force Password Reset:**
```
POST /api/v1/system/admin/users/:user_id/force-password-reset
```

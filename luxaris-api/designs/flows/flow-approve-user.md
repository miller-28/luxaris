# Flow: Approve User Registration (Root Only)

**Endpoint:** `POST /api/v1/system/admin/users/:user_id/approve`

**Context:** System - Identity & Admin Operations

**Purpose:** Root user approves a pending user registration, activating their account.

---

## Request

**Path Parameter:**
- `user_id`: User UUID to approve

**Headers:**
```
Authorization: Bearer access_token_value
```

**Body (optional):**
```json
{
  "send_notification": true
}
```

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT access token
   - Extract `principal_id` from token

2. **Verify Root User Authorization**
   - Query `users` table by `principal_id`
   - Check `is_root = true`
   - Return 403 if not root user

3. **Validate User ID**
   - Validate `user_id` is valid UUID
   - Query `users` table by `user_id`
   - Return 404 if user not found

4. **Check User Status**
   - Verify user `status = pending_approval`
   - Cannot approve users that are already `active`, `disabled`, or other statuses
   - Return 400 if status prevents approval

5. **Update User Record**
   - Set `status = active`
   - Set `approved_by_user_id = principal_id` (root user who approved)
   - Set `approved_at = current timestamp`
   - Update `updated_at`

6. **Assign Default Role**
   - Query `roles` table for default role (e.g., "viewer")
   - Create entry in `principal_role_assignments`
   - Links approved user to basic permissions

7. **Record System Event**
   - Create `USER_APPROVED` event via EventRegistry
   - Store in `system_events` table
   - Include:
     - `event_type: "auth"`
     - `event_name: "USER_APPROVED"`
     - `principal_id`: Root user ID (approver)
     - `resource_type: "user"`
     - `resource_id`: Approved user ID
     - `status: "success"`
     - `metadata`: { `approved_by`: root_user_id, `approved_at`: timestamp }

8. **Create Audit Log**
   - Log `USER_APPROVED` event
   - Include both approver and approved user IDs

9. **Log Info to System Logs**
   - Log approval via SystemLogger
   - `systemLogger.info('system.admin', 'User approved by root')`
   - Include both user IDs in context

10. **Send Notification Email (if enabled)**
   - Email user that account is now active
   - Include login link

11. **Return Response**
   - Confirm successful approval

---

## Response

**Success (200 OK):**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "active",
    "approved_by": {
      "id": "root-user-uuid",
      "email": "admin@example.com",
      "name": "Admin User"
    },
    "approved_at": "2025-11-25T18:00:00Z",
    "created_at": "2025-11-25T10:00:00Z",
    "updated_at": "2025-11-25T18:00:00Z"
  },
  "message": "User successfully approved and activated"
}
```

**Error (403 Forbidden) - Not root user:**
```json
{
  "errors": [
    {
      "error_code": "INSUFFICIENT_PRIVILEGES",
      "error_description": "Only root users can approve user registrations",
      "error_severity": "error"
    }
  ]
}
```

**Error (404 Not Found):**
```json
{
  "errors": [
    {
      "error_code": "USER_NOT_FOUND",
      "error_description": "User not found",
      "error_severity": "error"
    }
  ]
}
```

**Error (400 Bad Request) - Already approved:**
```json
{
  "errors": [
    {
      "error_code": "USER_ALREADY_APPROVED",
      "error_description": "User is already active",
      "error_severity": "error"
    }
  ]
}
```

**Error (400 Bad Request) - Invalid status:**
```json
{
  "errors": [
    {
      "error_code": "INVALID_USER_STATUS",
      "error_description": "Cannot approve user with status 'disabled'. Only 'pending_approval' users can be approved.",
      "error_severity": "error"
    }
  ]
}
```

---

## Authorization

- **Root users only** (`is_root = true`)
- Standard users and service accounts cannot access this endpoint
- Permission check must verify root status before any operation

---

## Database Changes

**Tables Modified:**
- `users` - Update status, approved_by_user_id, approved_at
- `principal_role_assignments` - Add default role assignment
- `audit_logs` - Log approval event

---

## Related Operations

**List Pending Users:**
```
GET /api/v1/system/admin/users/pending
```

**Reject User Registration:**
```
POST /api/v1/system/admin/users/:user_id/reject
```

---

## Email Notification

**Subject:** Your Luxaris account has been activated

**Body:**
```
Hi [User Name],

Good news! Your Luxaris account has been approved and is now active.

You can now log in at: [Login URL]

Email: [User Email]

If you have any questions, please contact us at support@luxaris.com

Welcome aboard!
Best regards,
The Luxaris Team
```

---

## Admin Dashboard (Future Implementation)

**Features for Root Users:**
- View list of pending user registrations
- Approve/reject users with one click
- View approval history
- Search and filter users by status
- Bulk approval operations
- View user activity after approval

**Access Control:**
- Dashboard accessible only to users with `is_root = true`
- Redirect non-root users to standard dashboard
- All admin actions logged in audit trail

---

## Audit Logging

**Approval Event:**
```json
{
  "event": "USER_APPROVED",
  "actor_id": "root-user-uuid",
  "actor_type": "user",
  "target_id": "approved-user-uuid",
  "target_type": "user",
  "timestamp": "2025-11-25T18:00:00Z",
  "ip_address": "203.0.113.42",
  "metadata": {
    "previous_status": "pending_approval",
    "new_status": "active",
    "default_role_assigned": "viewer"
  }
}
```

---

## Security Notes

- Root user check happens at start of flow (fail fast)
- Cannot approve own account (prevented by business logic)
- Approval is irreversible (user becomes active permanently)
- All approvals logged for compliance
- Email notification informs user of activation

# Create Schedule Flow

## Overview

User schedules a post variant to be published at a specific time.

---

## Flow Steps

### 1. User Submits Schedule

**Request:** `POST /api/v1/schedules`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "post_variant_id": "variant_uuid",
  "channel_connection_id": "connection_uuid",
  "run_at": "2025-11-26T15:00:00",
  "timezone": "America/New_York"  // Optional: defaults to user's timezone setting (users.timezone, defaults to 'UTC')
}
```

### 2. API Authenticates User

- Verify JWT token
- Extract user ID from token

### 3. Check Permissions

- Call System domain ACL: `can(user, 'schedule', 'create')`
- Verify user has permission to create schedules

### 4. Validate Post Variant

- Query `post_variants` table by `post_variant_id`
- Verify variant exists
- Check variant `status` is `ready` (not `draft` or already `published`)
- Verify user owns the post (via `posts.owner_principal_id`)

### 5. Validate Channel Connection

- Query `channel_connections` table by `channel_connection_id`
- Verify connection exists
- Check connection `status` is `connected` (not `revoked` or `error`)
- Verify user owns the connection

### 6. Validate Schedule Time

Apply domain rules:

- If `timezone` not provided, use user's timezone setting (from `users.timezone`, defaults to 'UTC')
- Convert `run_at` from provided/defaulted timezone to UTC
- Verify `run_at` is in the future (> now)
- Verify `run_at` is within maximum horizon (e.g., < now + 90 days)
- Optional: Check rate limiting (max N posts per hour per connection)
- Optional: Check minimum gap between posts on same connection

### 7. Create Schedule Record

- Generate UUID for schedule ID
- Store original timezone for UX
- Set `status` to `pending`
- Initialize `attempt_count` to 0
- Insert into `schedules` table

### 8. Update Post Status

- If post status is `draft`, update to `scheduled`
- Update in `posts` table

### 9. Record System Event

- Create `SCHEDULE_CREATED` event via EventRegistry
- Store in `system_events` table
- Include:
  - `event_type: "schedule"`
  - `event_name: "SCHEDULE_CREATED"`
  - `principal_id`: Authenticated user ID
  - `resource_type: "schedule"`
  - `resource_id`: New schedule ID
  - `status: "success"`
  - `metadata`: { `post_variant_id`, `channel_connection_id`, `run_at` }

### 10. Create Audit Log

- Record `SCHEDULE_CREATED` action
- Store in `audit_logs`
- Include schedule ID, post ID, run time

### 11. Log Info to System Logs

- Log successful schedule creation via SystemLogger
- `systemLogger.info('schedules.creation', 'Schedule created successfully')`
- Include schedule ID, post ID, and run_at in context

### 12. Return Response

**Success Response:** `201 Created`

```json
{
  "schedule": {
    "id": "uuid",
    "post_variant_id": "variant_uuid",
    "channel_connection_id": "connection_uuid",
    "run_at": "2025-11-26T20:00:00Z",
    "timezone": "America/New_York",
    "status": "pending",
    "attempt_count": 0,
    "created_at": "2025-11-25T10:00:00Z",
    "updated_at": "2025-11-25T10:00:00Z"
  },
  "post": {
    "id": "post_uuid",
    "status": "scheduled"
  }
}
```

---

## Error Cases

### Post Variant Not Ready

**Response:** `400 Bad Request`

```json
{
  "errors": [{
    "error_code": "VARIANT_NOT_READY",
    "error_description": "Post variant must have status 'ready' before scheduling",
    "error_severity": "error"
  }]
}
```

### Invalid Schedule Time

**Response:** `400 Bad Request`

```json
{
  "errors": [{
    "error_code": "INVALID_SCHEDULE_TIME",
    "error_description": "Schedule time must be in the future",
    "error_severity": "error"
  }]
}
```

### Connection Not Active

**Response:** `400 Bad Request`

```json
{
  "errors": [{
    "error_code": "CONNECTION_INACTIVE",
    "error_description": "Channel connection is not active. Please reconnect.",
    "error_severity": "error"
  }]
}
```

### Not Owner

**Response:** `403 Forbidden`

```json
{
  "errors": [{
    "error_code": "FORBIDDEN",
    "error_description": "You don't have permission to schedule this post",
    "error_severity": "error"
  }]
}
```

### Rate Limit Exceeded

**Response:** `429 Too Many Requests`

```json
{
  "errors": [{
    "error_code": "RATE_LIMIT_EXCEEDED",
    "error_description": "Too many posts scheduled for this time window. Try a different time.",
    "error_severity": "warning"
  }]
}
```

---

## Domain Rules Applied

- **Future time check:** `run_at > now()`
- **Maximum horizon:** `run_at < now() + 90 days`
- **Connection active:** `channel_connection.status = 'connected'`
- **Variant ready:** `post_variant.status = 'ready'`
- **Ownership:** `post.owner_principal_id = user_id`

---

## Database Changes

**Tables Modified:**
- `schedules` - New schedule record
- `posts` - Update status to `scheduled`
- `audit_logs` - Schedule creation event

---

## What Happens Next?

Once created, the schedule enters the publishing pipeline:

1. **Scanner Runner** (heartbeat every minute):
   - Finds schedules with `status = pending` and `run_at <= now`
   - Transitions to `queued`
   - Publishes to RabbitMQ

2. **Publisher Runner** (queue consumer):
   - Consumes message from queue
   - Publishes to social platform
   - Updates schedule status to `success` or `failed`

---

## Context Dependencies

- **System Domain:** Authentication (JWT), authorization (ACL), audit logging
- **Posts Domain:** Post repository, post variant repository
- **Scheduling Domain:** Schedule repository, validation rules, timezone handling
- **External:** None (actual publishing happens later via runners)

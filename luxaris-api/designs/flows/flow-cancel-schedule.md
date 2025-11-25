# Flow: Cancel Schedule

**Endpoint:** `POST /api/v1/schedules/:id/cancel`

**Context:** Posts - Scheduling & Publishing

**Purpose:** Cancel a pending or queued schedule before it publishes.

---

## Request

**Path Parameter:**
- `id`: Schedule UUID

**Body:**
```json
{
  "reason": "Changed marketing strategy"
}
```

`reason` is optional but recommended for audit trail.

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT token
   - Extract `principal_id` from token

2. **Validate Input**
   - Validate `id` is valid UUID

3. **Fetch Schedule**
   - Query `schedules` table by `id`
   - Return 404 if not found
   - Join with post variant to get owner information

4. **Check Authorization**
   - Verify schedule owner matches principal or has permission
   - Return 403 if not authorized

5. **Validate Schedule Status**
   - Check current status is `pending` or `queued`
   - Cannot cancel schedules with status:
     - `publishing` (currently being published)
     - `success` (already published)
     - `failed` (already attempted)
     - `cancelled` (already cancelled)
   - Return 400 if status prevents cancellation

6. **Remove from Queue (if queued)**
   - If status is `queued`:
     - Remove message from RabbitMQ queue
     - OR mark as cancelled in queue handler

7. **Update Schedule Status**
   - Set `status` = `cancelled`
   - Set `cancelled_at` = current timestamp
   - Set `cancellation_reason` = provided reason
   - Update `updated_at` timestamp

8. **Update Post Status (if applicable)**
   - If this was the only schedule for the post:
     - Change post status from `scheduled` back to `ready`

9. **Create Audit Log**
   - Log `SCHEDULE_CANCELLED` event with reason

10. **Return Response**
    - Return updated schedule with cancellation details

---

## Response

**Success (200 OK):**
```json
{
  "id": "schedule-uuid",
  "post_variant_id": "variant-uuid-123",
  "channel_connection_id": "connection-uuid-456",
  "run_at": "2025-11-26T19:00:00Z",
  "timezone": "America/New_York",
  "run_at_local": "2025-11-26T14:00:00",
  "status": "cancelled",
  "attempt_count": 0,
  "created_at": "2025-11-25T10:00:00Z",
  "updated_at": "2025-11-25T14:00:00Z",
  "cancelled_at": "2025-11-25T14:00:00Z",
  "cancellation_reason": "Changed marketing strategy",
  "post_variant": {
    "id": "variant-uuid-123",
    "content": "Excited to announce...",
    "channel_id": "x-channel-uuid"
  },
  "channel_connection": {
    "id": "connection-uuid-456",
    "display_name": "@username"
  }
}
```

**Error (404 Not Found):**
```json
{
  "errors": [
    {
      "error_code": "SCHEDULE_NOT_FOUND",
      "error_description": "Schedule not found",
      "error_severity": "error"
    }
  ]
}
```

**Error (400 Bad Request) - Cannot cancel:**
```json
{
  "errors": [
    {
      "error_code": "SCHEDULE_CANNOT_BE_CANCELLED",
      "error_description": "Cannot cancel schedule with status 'success'. Only 'pending' or 'queued' schedules can be cancelled.",
      "error_severity": "error"
    }
  ]
}
```

**Error (400 Bad Request) - Already cancelled:**
```json
{
  "errors": [
    {
      "error_code": "SCHEDULE_ALREADY_CANCELLED",
      "error_description": "Schedule is already cancelled",
      "error_severity": "error"
    }
  ]
}
```

---

## Status Lifecycle with Cancellation

```
pending --------> queued --------> publishing --> success
   |                  |                       \--> failed
   |                  |
   +---> cancelled <--+
```

**Cancellable:** `pending`, `queued`

**Not Cancellable:** `publishing`, `success`, `failed`, `cancelled`

---

## Race Condition Handling

**Scenario:** User cancels while Publisher Runner is processing

**Solution:**
1. **Database Transaction**: Update status with WHERE clause:
   ```sql
   UPDATE schedules 
   SET status = 'cancelled' 
   WHERE id = ? AND status IN ('pending', 'queued')
   ```
2. **Publisher Runner Check**: Before publishing, verify status is still `queued`:
   ```sql
   SELECT status FROM schedules WHERE id = ? FOR UPDATE
   ```
3. **If status changed**: Skip publishing, log event

---

## Bulk Cancellation

**Endpoint:** `POST /api/v1/schedules/bulk-cancel`

**Request:**
```json
{
  "schedule_ids": [
    "schedule-uuid-1",
    "schedule-uuid-2",
    "schedule-uuid-3"
  ],
  "reason": "Campaign postponed"
}
```

**Response:**
```json
{
  "cancelled": 2,
  "failed": 1,
  "errors": [
    {
      "schedule_id": "schedule-uuid-3",
      "error_code": "SCHEDULE_ALREADY_PUBLISHED",
      "error_description": "Cannot cancel schedule that has already been published"
    }
  ]
}
```

---

## Authorization

- User must own the post associated with the schedule
- OR user must have `cancel_schedule` permission for the post
- Service accounts with appropriate permissions can cancel schedules

---

## Audit Trail

**Logged Information:**
- Who cancelled (principal_id)
- When cancelled (timestamp)
- Reason (if provided)
- Original schedule details
- Previous status

# Flow: Update Schedule

**Endpoint:** `PATCH /api/v1/schedules/:id`

**Context:** Posts - Scheduling & Publishing

**Purpose:** Update an existing schedule (change time, channel, or cancel).

---

## Request

**Path Parameter:**
- `id`: Schedule UUID

**Body (partial update):**
```json
{
  "run_at": "2025-11-27T15:00:00",
  "timezone": "America/New_York",
  "channel_connection_id": "new-connection-uuid"
}
```

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT token
   - Extract `principal_id` from token

2. **Validate Input**
   - Validate `id` is valid UUID
   - Validate provided fields (if any)
   - Validate `run_at` is valid datetime (if provided)
   - Validate `timezone` is valid IANA timezone (if provided)

3. **Fetch Schedule**
   - Query `schedules` table by `id`
   - Return 404 if not found
   - Join with post variant to get owner information

4. **Check Authorization**
   - Verify schedule owner matches principal or has permission
   - Return 403 if not authorized

5. **Validate Schedule Status**
   - Check current status is `pending`
   - Cannot update schedules with status:
     - `queued` (already in queue)
     - `publishing` (currently being published)
     - `success` (already published)
     - `failed` (already attempted)
     - `cancelled` (already cancelled)
   - Return 400 if status prevents update

6. **Validate New Time (if provided)**
   - Convert to UTC
   - Check is in future
   - Check is within max horizon (e.g., 90 days)
   - Return 400 if validation fails

7. **Validate New Channel Connection (if provided)**
   - Query `channel_connections` table
   - Return 404 if not found
   - Check connection `status` is `connected`
   - Check connection owner matches principal or has permission
   - Verify post variant is compatible with new channel

8. **Update Schedule**
   - Update provided fields in `schedules` table
   - Update `updated_at` timestamp

9. **Create Audit Log**
   - Log `SCHEDULE_UPDATED` event with changes

10. **Return Response**
    - Return updated schedule

---

## Response

**Success (200 OK):**
```json
{
  "id": "schedule-uuid",
  "post_variant_id": "variant-uuid-123",
  "channel_connection_id": "new-connection-uuid",
  "run_at": "2025-11-27T20:00:00Z",
  "timezone": "America/New_York",
  "run_at_local": "2025-11-27T15:00:00",
  "status": "pending",
  "attempt_count": 0,
  "created_at": "2025-11-25T10:00:00Z",
  "updated_at": "2025-11-25T12:00:00Z",
  "post_variant": {
    "id": "variant-uuid-123",
    "content": "Excited to announce...",
    "channel_id": "x-channel-uuid"
  },
  "channel_connection": {
    "id": "new-connection-uuid",
    "display_name": "@new_account"
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

**Error (400 Bad Request) - Cannot update status:**
```json
{
  "errors": [
    {
      "error_code": "SCHEDULE_CANNOT_BE_UPDATED",
      "error_description": "Cannot update schedule with status 'queued'. Only 'pending' schedules can be updated.",
      "error_severity": "error"
    }
  ]
}
```

**Error (400 Bad Request) - Time in past:**
```json
{
  "errors": [
    {
      "error_code": "INVALID_SCHEDULE_TIME",
      "error_description": "Schedule time must be in the future",
      "error_severity": "error"
    }
  ]
}
```

**Error (400 Bad Request) - Incompatible channel:**
```json
{
  "errors": [
    {
      "error_code": "INCOMPATIBLE_CHANNEL",
      "error_description": "Post variant is not compatible with the selected channel",
      "error_severity": "error"
    }
  ]
}
```

---

## Allowed Update Scenarios

**1. Change Time:**
```json
{
  "run_at": "2025-11-28T10:00:00",
  "timezone": "America/Los_Angeles"
}
```

**2. Change Channel:**
```json
{
  "channel_connection_id": "different-connection-uuid"
}
```

**3. Change Both:**
```json
{
  "run_at": "2025-11-28T10:00:00",
  "timezone": "America/Los_Angeles",
  "channel_connection_id": "different-connection-uuid"
}
```

---

## Status Lifecycle

```
pending --> queued --> publishing --> success
                                 \--> failed
        \--> cancelled
```

**Editable:** Only `pending` status

**Read-only:** All other statuses

---

## Authorization

- User must own the post associated with the schedule
- OR user must have `update_schedule` permission for the post
- Service accounts with appropriate permissions can update schedules

# Flow: Disconnect Channel

**Endpoint:** `DELETE /api/v1/channels/connections/:id`

**Context:** Posts - Channel Management

**Purpose:** Disconnect a social media account and revoke access.

---

## Request

**Path Parameter:**
- `id`: Channel connection UUID

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT token
   - Extract `principal_id` from token

2. **Validate Input**
   - Validate `id` is valid UUID

3. **Fetch Connection**
   - Query `channel_connections` table by `id`
   - Return 404 if not found

4. **Check Authorization**
   - Verify connection owner matches principal
   - Return 403 if not authorized

5. **Check for Active Schedules**
   - Query `schedules` table for pending/queued schedules using this connection
   - If found:
     - Return 400 with error
     - User must cancel schedules first

6. **Revoke OAuth Token (optional)**
   - Decrypt `access_token` from `auth_state`
   - Call platform's token revocation endpoint:
     ```http
     POST https://platform-oauth.com/revoke
     
     token=access_token_value&
     client_id=xxx&
     client_secret=yyy
     ```
   - Continue even if revocation fails (platform may have already revoked)

7. **Update Connection Status**
   - Set `status` = `disconnected`
   - Set `disconnected_at` = current timestamp
   - Clear `auth_state` (delete tokens)
   - Update `updated_at` timestamp

8. **OR Soft Delete (alternative approach)**
   - Keep record for audit trail
   - Set `deleted_at` = current timestamp
   - Keep connection in database but hidden from list queries

9. **Create Audit Log**
   - Log `CHANNEL_DISCONNECTED` event

10. **Return Response**
    - Return success confirmation

---

## Response

**Success (200 OK):**
```json
{
  "id": "connection-uuid",
  "status": "disconnected",
  "disconnected_at": "2025-11-25T15:00:00Z",
  "message": "Channel connection successfully disconnected"
}
```

**Error (404 Not Found):**
```json
{
  "errors": [
    {
      "error_code": "CONNECTION_NOT_FOUND",
      "error_description": "Channel connection not found",
      "error_severity": "error"
    }
  ]
}
```

**Error (400 Bad Request) - Active schedules:**
```json
{
  "errors": [
    {
      "error_code": "CONNECTION_HAS_ACTIVE_SCHEDULES",
      "error_description": "Cannot disconnect channel with active schedules. Please cancel or complete 3 pending schedules first.",
      "error_severity": "error",
      "meta": {
        "active_schedules_count": 3,
        "schedule_ids": [
          "schedule-uuid-1",
          "schedule-uuid-2",
          "schedule-uuid-3"
        ]
      }
    }
  ]
}
```

---

## Disconnect Options

**Option 1: Status Change (Recommended)**
```sql
UPDATE channel_connections 
SET 
  status = 'disconnected',
  auth_state = NULL,
  disconnected_at = NOW(),
  updated_at = NOW()
WHERE id = ?
```

**Benefits:**
- Keeps audit trail
- Can reconnect later
- Historical data preserved

**Option 2: Soft Delete**
```sql
UPDATE channel_connections 
SET deleted_at = NOW()
WHERE id = ?
```

**Benefits:**
- Standard deletion pattern
- Can be restored if needed
- Excluded from normal queries

---

## Pre-Disconnect Validation

**1. Check Active Schedules:**
```sql
SELECT COUNT(*) 
FROM schedules 
WHERE channel_connection_id = ? 
  AND status IN ('pending', 'queued')
```

**2. Warn User:**
- Show count of active schedules
- Provide option to cancel all schedules
- OR force user to handle schedules first

**3. Check Published Posts:**
- Keep record of posts published via this connection
- Don't delete historical data

---

## OAuth Token Revocation

**Example (X/Twitter):**
```http
POST https://api.twitter.com/oauth/revoke
Content-Type: application/x-www-form-urlencoded

token=access_token_value&
token_type_hint=access_token
```

**Example (LinkedIn):**
```http
POST https://www.linkedin.com/oauth/v2/revoke
Content-Type: application/x-www-form-urlencoded

token=access_token_value&
client_id=xxx&
client_secret=yyy
```

**Error Handling:**
- If revocation fails: Log warning, continue with disconnect
- Platform may have already revoked token
- User may have revoked access manually

---

## Cascade Delete Considerations

**DO NOT delete:**
- Historical publish events
- Published posts metadata
- Audit logs
- Analytics data

**DO clean up:**
- OAuth tokens (always)
- Pending schedules (only if explicitly requested)
- Cached data related to this connection

---

## Reconnection

**User can reconnect same account later:**

1. Go through OAuth flow again
2. Create new connection record
3. Previous connection remains as `disconnected` for audit
4. OR reuse same connection record (update status back to `connected`)

**Approach:** New connection record is recommended for clear audit trail.

---

## Authorization

- Only connection owner can disconnect
- Service accounts cannot disconnect user connections
- Requires valid JWT token

---

## Security Notes

- **Token Deletion**: Always delete tokens from database
- **Revocation**: Best effort to revoke on platform
- **Audit Trail**: Log who disconnected and when
- **No Re-auth**: Once disconnected, tokens cannot be recovered

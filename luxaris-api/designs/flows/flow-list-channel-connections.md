# Flow: List Channel Connections

**Endpoint:** `GET /api/v1/channels/connections`

**Context:** Posts - Channel Management

**Purpose:** List all connected social media accounts for the authenticated user.

---

## Request

**Query Parameters:**
- `status` (optional): Filter by status (`connected`, `error`, `disconnected`)
- `channel_id` (optional): Filter by specific channel (e.g., `x-channel-uuid`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example:**
```
GET /api/v1/channels/connections?status=connected
```

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT token
   - Extract `principal_id` from token

2. **Validate Query Parameters**
   - Validate `status` is valid enum value
   - Validate `channel_id` is valid UUID (if provided)
   - Validate pagination parameters

3. **Build Database Query**
   - Query `channel_connections` table
   - Filter by `owner_principal_id` (authorization)
   - Join with `channels` table for channel details
   - Apply status filter (if provided)
   - Apply channel_id filter (if provided)

4. **Apply Pagination**
   - Order by `created_at DESC`
   - Calculate offset: `(page - 1) * limit`
   - Apply LIMIT and OFFSET

5. **Execute Query**
   - Fetch connections with channel details
   - Count total matching records

6. **Sanitize Auth State**
   - Remove sensitive data from `auth_state`:
     - Never return `access_token`
     - Never return `refresh_token`
   - Include only safe metadata:
     - `account_id`
     - `expires_at`
     - `scope`

7. **Return Response**
   - Return paginated list with metadata

---

## Response

**Success (200 OK):**
```json
{
  "data": [
    {
      "id": "connection-uuid-1",
      "channel_id": "x-channel-uuid",
      "display_name": "@miller_28",
      "status": "connected",
      "created_at": "2025-11-20T10:00:00Z",
      "updated_at": "2025-11-25T08:00:00Z",
      "auth_state": {
        "account_id": "123456789",
        "expires_at": "2025-12-25T10:00:00Z",
        "scope": ["read", "write"]
      },
      "channel": {
        "id": "x-channel-uuid",
        "key": "x",
        "name": "X (Twitter)",
        "icon_url": "https://cdn.luxaris.com/icons/x.svg"
      }
    },
    {
      "id": "connection-uuid-2",
      "channel_id": "linkedin-channel-uuid",
      "display_name": "Acme Corp",
      "status": "connected",
      "created_at": "2025-11-22T14:30:00Z",
      "updated_at": "2025-11-24T16:00:00Z",
      "auth_state": {
        "account_id": "company-page-id",
        "expires_at": "2025-12-22T14:30:00Z",
        "scope": ["write"]
      },
      "channel": {
        "id": "linkedin-channel-uuid",
        "key": "linkedin",
        "name": "LinkedIn",
        "icon_url": "https://cdn.luxaris.com/icons/linkedin.svg"
      }
    },
    {
      "id": "connection-uuid-3",
      "channel_id": "instagram-channel-uuid",
      "display_name": "@brand_official",
      "status": "error",
      "created_at": "2025-11-15T09:00:00Z",
      "updated_at": "2025-11-25T12:00:00Z",
      "auth_state": {
        "account_id": "instagram-user-id",
        "expires_at": "2025-11-20T09:00:00Z",
        "scope": ["read", "write"],
        "error": "Token expired - please reconnect"
      },
      "channel": {
        "id": "instagram-channel-uuid",
        "key": "instagram",
        "name": "Instagram",
        "icon_url": "https://cdn.luxaris.com/icons/instagram.svg"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "filters": {
    "status": "all"
  }
}
```

**Empty Result (200 OK):**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 0,
    "has_next": false,
    "has_prev": false
  },
  "filters": {}
}
```

---

## Connection Status Meanings

**`connected`:**
- OAuth tokens are valid
- Can publish to this account
- Token refresh is working

**`error`:**
- OAuth tokens expired or invalid
- User revoked access
- Platform API errors
- Requires user to reconnect

**`disconnected`:**
- User manually disconnected
- Soft-deleted but kept for audit history

---

## Filter Examples

**All connected accounts:**
```
GET /api/v1/channels/connections?status=connected
```

**All X (Twitter) connections:**
```
GET /api/v1/channels/connections?channel_id=x-channel-uuid
```

**Accounts with errors:**
```
GET /api/v1/channels/connections?status=error
```

---

## Authorization

- User can only see their own connections
- Query always filtered by `owner_principal_id` from JWT token
- Service accounts cannot list connections (user-specific operation)

---

## Performance Optimization

- **Database Indexes**:
  - Index on `owner_principal_id`
  - Index on `status`
  - Composite index on `(owner_principal_id, status)`

- **Caching**:
  - Cache results for 60 seconds (Memcached)
  - Cache key: `connections:list:{principal_id}:{filters_hash}`
  - Invalidate on connection changes

---

## Security Notes

- **Never expose tokens**: `access_token` and `refresh_token` are NEVER returned
- **Sanitize response**: Only safe metadata from `auth_state` is included
- **Encryption at rest**: Tokens stored encrypted in database
- **Token refresh**: Background job refreshes tokens before expiry
- **Error detection**: Background job detects expired/invalid tokens and sets status to `error`

---

## Related Operations

**Connect new account:**
```
POST /api/v1/channels/connect
```

**Disconnect account:**
```
DELETE /api/v1/channels/connections/:id
```

**Refresh connection (manual):**
```
POST /api/v1/channels/connections/:id/refresh
```

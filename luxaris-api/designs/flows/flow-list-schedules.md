# Flow: List Schedules

**Endpoint:** `GET /api/v1/schedules`

**Context:** Posts - Scheduling & Publishing

**Purpose:** List all schedules for the authenticated user with filtering and pagination.

---

## Request

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status (`pending`, `queued`, `publishing`, `success`, `failed`, `cancelled`)
- `post_id` (optional): Filter by post ID
- `channel_connection_id` (optional): Filter by channel connection
- `from_date` (optional): Filter schedules from this date (ISO 8601)
- `to_date` (optional): Filter schedules until this date (ISO 8601)
- `sort` (optional): Sort field (`run_at`, `created_at`, default: `run_at`)
- `order` (optional): Sort order (`asc`, `desc`, default: `asc`)

**Example:**
```
GET /api/v1/schedules?status=pending&page=1&limit=20&sort=run_at&order=asc
```

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT token
   - Extract `principal_id` from token

2. **Validate Query Parameters**
   - Validate `page` is positive integer
   - Validate `limit` is within bounds (1-100)
   - Validate `status` is valid enum value
   - Validate dates are valid ISO 8601 format
   - Validate `sort` and `order` are valid values

3. **Build Database Query**
   - Start with base query: `SELECT * FROM schedules`
   - Join with `post_variants`, `posts`, `channel_connections`, `channels`
   - Filter by `owner_principal_id` (authorization)
   - Apply status filter if provided
   - Apply post_id filter if provided
   - Apply channel_connection_id filter if provided
   - Apply date range filters if provided

4. **Apply Sorting & Pagination**
   - Order by specified field and direction
   - Calculate offset: `(page - 1) * limit`
   - Apply LIMIT and OFFSET

5. **Execute Query**
   - Fetch schedules with related data
   - Count total matching records (for pagination metadata)

6. **Format Response**
   - Transform database records to API format
   - Convert UTC times to local times for display
   - Include related post variant and channel connection details

7. **Return Response**
   - Return paginated list with metadata

---

## Response

**Success (200 OK):**
```json
{
  "data": [
    {
      "id": "schedule-uuid-1",
      "post_variant_id": "variant-uuid-123",
      "channel_connection_id": "connection-uuid-456",
      "run_at": "2025-11-26T19:00:00Z",
      "timezone": "America/New_York",
      "run_at_local": "2025-11-26T14:00:00",
      "status": "pending",
      "attempt_count": 0,
      "created_at": "2025-11-25T10:00:00Z",
      "updated_at": "2025-11-25T10:00:00Z",
      "post": {
        "id": "post-uuid-789",
        "title": "Launch Announcement"
      },
      "post_variant": {
        "id": "variant-uuid-123",
        "content": "Excited to announce...",
        "channel_id": "x-channel-uuid"
      },
      "channel_connection": {
        "id": "connection-uuid-456",
        "display_name": "@username",
        "channel": {
          "id": "x-channel-uuid",
          "key": "x",
          "name": "X (Twitter)"
        }
      }
    },
    {
      "id": "schedule-uuid-2",
      "post_variant_id": "variant-uuid-124",
      "channel_connection_id": "connection-uuid-457",
      "run_at": "2025-11-27T15:30:00Z",
      "timezone": "Europe/London",
      "run_at_local": "2025-11-27T15:30:00",
      "status": "pending",
      "attempt_count": 0,
      "created_at": "2025-11-25T11:00:00Z",
      "updated_at": "2025-11-25T11:00:00Z",
      "post": {
        "id": "post-uuid-790",
        "title": "Product Update"
      },
      "post_variant": {
        "id": "variant-uuid-124",
        "content": "New features available...",
        "channel_id": "linkedin-channel-uuid"
      },
      "channel_connection": {
        "id": "connection-uuid-457",
        "display_name": "Company Page",
        "channel": {
          "id": "linkedin-channel-uuid",
          "key": "linkedin",
          "name": "LinkedIn"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  },
  "filters": {
    "status": "pending",
    "sort": "run_at",
    "order": "asc"
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

**Error (400 Bad Request) - Invalid status:**
```json
{
  "errors": [
    {
      "error_code": "INVALID_FILTER",
      "error_description": "Invalid status value. Must be one of: pending, queued, publishing, success, failed, cancelled",
      "error_severity": "error"
    }
  ]
}
```

---

## Authorization

- **User can only see their own schedules**
- Query always filtered by `owner_principal_id` from JWT token
- Service accounts can see schedules for posts they have permission to access

---

## Performance Optimization

- **Database Indexes**:
  - Index on `owner_principal_id`
  - Index on `status`
  - Index on `run_at`
  - Composite index on `(owner_principal_id, status, run_at)`

- **Caching** (optional):
  - Cache results for 30 seconds (Memcached)
  - Cache key: `schedules:list:{principal_id}:{filters_hash}:{page}`
  - Invalidate on schedule creation/update

---

## Filter Examples

**Upcoming schedules:**
```
GET /api/v1/schedules?status=pending&sort=run_at&order=asc
```

**Failed schedules:**
```
GET /api/v1/schedules?status=failed
```

**Schedules for specific post:**
```
GET /api/v1/schedules?post_id=post-uuid-789
```

**Schedules in date range:**
```
GET /api/v1/schedules?from_date=2025-11-26T00:00:00Z&to_date=2025-11-30T23:59:59Z
```

**Recent schedules:**
```
GET /api/v1/schedules?sort=created_at&order=desc
```

# Flow: Get Publishing History

**Endpoint:** `GET /api/v1/posts/:post_id/publish-events`

**Context:** Posts - Publishing & Analytics

**Purpose:** Retrieve publishing history and status for a post's scheduled publishes.

---

## Request

**Path Parameter:**
- `post_id`: Post UUID

**Query Parameters:**
- `status` (optional): Filter by publish status (`success`, `failed`, `pending`)
- `channel_id` (optional): Filter by specific channel
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example:**
```
GET /api/v1/posts/post-uuid-789/publish-events
GET /api/v1/posts/post-uuid-789/publish-events?status=failed
```

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT token
   - Extract `principal_id` from token

2. **Validate Input**
   - Validate `post_id` is valid UUID
   - Validate query parameters

3. **Fetch Post**
   - Query `posts` table by `post_id`
   - Return 404 if not found

4. **Check Authorization**
   - Verify post owner matches principal or has permission
   - Return 403 if not authorized

5. **Build Query**
   - Query `publish_events` table
   - Filter by `post_id`
   - Join with `schedules`, `post_variants`, `channel_connections`, `channels`
   - Apply status filter (if provided)
   - Apply channel_id filter (if provided)

6. **Apply Pagination**
   - Order by `published_at DESC` (most recent first)
   - Calculate offset
   - Apply LIMIT and OFFSET

7. **Execute Query**
   - Fetch publish events with related data
   - Count total matching records

8. **Format Response**
   - Include detailed error information for failed publishes
   - Include platform-specific response data for successful publishes
   - Calculate success rate

9. **Return Response**
   - Return paginated list with summary statistics

---

## Response

**Success (200 OK):**
```json
{
  "post": {
    "id": "post-uuid-789",
    "title": "Product Launch Announcement"
  },
  "summary": {
    "total_publishes": 8,
    "successful": 6,
    "failed": 2,
    "pending": 0,
    "success_rate": 0.75
  },
  "data": [
    {
      "id": "event-uuid-1",
      "schedule_id": "schedule-uuid-1",
      "post_variant_id": "variant-uuid-123",
      "channel_connection_id": "connection-uuid-456",
      "status": "success",
      "published_at": "2025-11-25T14:00:05Z",
      "attempt_number": 1,
      "response_time_ms": 1234,
      "platform_post_id": "123456789",
      "platform_post_url": "https://twitter.com/username/status/123456789",
      "post_variant": {
        "id": "variant-uuid-123",
        "content": "Excited to announce...",
        "channel": {
          "id": "x-channel-uuid",
          "key": "x",
          "name": "X (Twitter)"
        }
      },
      "channel_connection": {
        "id": "connection-uuid-456",
        "display_name": "@miller_28"
      },
      "platform_response": {
        "id": "123456789",
        "created_at": "2025-11-25T14:00:04Z",
        "engagement": {
          "likes": 42,
          "retweets": 8,
          "replies": 3
        }
      }
    },
    {
      "id": "event-uuid-2",
      "schedule_id": "schedule-uuid-2",
      "post_variant_id": "variant-uuid-124",
      "channel_connection_id": "connection-uuid-457",
      "status": "failed",
      "published_at": "2025-11-24T10:30:02Z",
      "attempt_number": 3,
      "response_time_ms": 5678,
      "error_code": "AUTHENTICATION_FAILED",
      "error_message": "OAuth token expired. Please reconnect your account.",
      "error_details": {
        "platform_error": "Invalid or expired token",
        "platform_error_code": 401,
        "retry_allowed": false,
        "action_required": "reconnect_account"
      },
      "post_variant": {
        "id": "variant-uuid-124",
        "content": "New features available...",
        "channel": {
          "id": "linkedin-channel-uuid",
          "key": "linkedin",
          "name": "LinkedIn"
        }
      },
      "channel_connection": {
        "id": "connection-uuid-457",
        "display_name": "Company Page",
        "status": "error"
      }
    },
    {
      "id": "event-uuid-3",
      "schedule_id": "schedule-uuid-3",
      "post_variant_id": "variant-uuid-125",
      "channel_connection_id": "connection-uuid-458",
      "status": "success",
      "published_at": "2025-11-23T16:00:01Z",
      "attempt_number": 1,
      "response_time_ms": 890,
      "platform_post_id": "post-abc123",
      "platform_post_url": "https://www.instagram.com/p/abc123",
      "post_variant": {
        "id": "variant-uuid-125",
        "content": "Check out our latest...",
        "media": [
          {
            "url": "https://cdn.luxaris.com/media/product-image.jpg",
            "type": "image"
          }
        ],
        "channel": {
          "id": "instagram-channel-uuid",
          "key": "instagram",
          "name": "Instagram"
        }
      },
      "channel_connection": {
        "id": "connection-uuid-458",
        "display_name": "@brand_official"
      },
      "platform_response": {
        "id": "post-abc123",
        "permalink": "https://www.instagram.com/p/abc123",
        "engagement": {
          "likes": 156,
          "comments": 12
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "filters": {}
}
```

**Error (404 Not Found):**
```json
{
  "errors": [
    {
      "error_code": "POST_NOT_FOUND",
      "error_description": "Post not found",
      "error_severity": "error"
    }
  ]
}
```

---

## Publish Event Status

**`success`:**
- Post published successfully to platform
- `platform_post_id` and `platform_post_url` available
- Platform response data included

**`failed`:**
- Publish attempt failed
- Error code and message included
- Action required information provided

**`pending`:**
- Publish in progress
- Waiting for platform response

---

## Error Categories

**Authentication Errors:**
- `AUTHENTICATION_FAILED`: Token expired or invalid
- `PERMISSION_DENIED`: Insufficient permissions
- **Action:** Reconnect account

**Content Errors:**
- `CONTENT_REJECTED`: Content violates platform policies
- `CONTENT_TOO_LONG`: Content exceeds character limit
- `MEDIA_INVALID`: Media format not supported
- **Action:** Modify content and retry

**Rate Limit Errors:**
- `RATE_LIMIT_EXCEEDED`: Too many requests to platform
- **Action:** Automatic retry after backoff period

**Platform Errors:**
- `PLATFORM_ERROR`: Platform API issue
- `NETWORK_ERROR`: Network connectivity issue
- **Action:** Automatic retry

---

## Retry Logic

**Automatic Retries:**
```
Attempt 1: Immediate
Attempt 2: After 5 minutes
Attempt 3: After 30 minutes
Final: Mark as failed
```

**Retry Allowed:**
- Rate limits: Yes (with backoff)
- Network errors: Yes (exponential backoff)
- Auth errors: No (requires user action)
- Content errors: No (requires content modification)

---

## Platform Response Data

**X (Twitter):**
```json
{
  "id": "123456789",
  "created_at": "2025-11-25T14:00:04Z",
  "text": "...",
  "engagement": {
    "likes": 42,
    "retweets": 8,
    "replies": 3,
    "views": 1234
  }
}
```

**LinkedIn:**
```json
{
  "id": "urn:li:share:123456",
  "created_at": "2025-11-25T14:00:04Z",
  "engagement": {
    "likes": 28,
    "comments": 5,
    "shares": 2
  }
}
```

**Instagram:**
```json
{
  "id": "post-abc123",
  "permalink": "https://www.instagram.com/p/abc123",
  "engagement": {
    "likes": 156,
    "comments": 12
  }
}
```

---

## Filter Examples

**Failed publishes only:**
```
GET /api/v1/posts/post-uuid-789/publish-events?status=failed
```

**X (Twitter) publishes:**
```
GET /api/v1/posts/post-uuid-789/publish-events?channel_id=x-channel-uuid
```

**Recent publishes:**
```
GET /api/v1/posts/post-uuid-789/publish-events?limit=5
```

---

## Authorization

- User must own the post
- OR user must have `view_publish_events` permission
- Service accounts can view events with appropriate permissions

---

## Use Cases

**1. Troubleshooting:**
- Identify why publish failed
- View detailed error messages
- Determine action required

**2. Analytics:**
- Track success rate across platforms
- Compare response times
- Monitor engagement metrics

**3. Audit Trail:**
- Complete history of all publish attempts
- Timestamp and user information
- Platform responses

**4. Performance Monitoring:**
- Identify problematic channels
- Track platform API reliability
- Monitor retry patterns

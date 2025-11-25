# List Posts Flow

## Overview

Authenticated user retrieves their posts with optional filtering.

---

## Flow Steps

### 1. User Requests Posts

**Request:** `GET /api/v1/posts?status=draft&tags=announcement&limit=20&offset=0`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status` - Filter by post status (draft, scheduled, published)
- `tags` - Filter by tags (comma-separated or multiple params)
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)
- `sort` - Sort field (created_at, updated_at, title)
- `order` - Sort order (asc, desc)

### 2. API Authenticates User

- Verify JWT token
- Extract user ID from token

### 3. Check Permissions

- Call System context: `can(user, 'post', 'read')`
- Determine if user can read own posts vs all posts
- Apply ownership filter if not admin

### 4. Build Query

- Start with base query on `posts` table
- Apply ownership filter: `owner_principal_id = user_id`
- Apply status filter if provided
- Apply tag filter if provided (array contains)
- Apply sorting and pagination

### 5. Execute Query

- Fetch posts from database
- Include related data:
  - Count of variants per post
  - Count of schedules per post
  - Latest schedule date (if any)

### 6. Return Response

**Success Response:** `200 OK`

```json
{
  "posts": [
    {
      "id": "uuid",
      "owner_principal_id": "user_uuid",
      "title": "My First Post",
      "base_content": "This is the main content",
      "tags": ["announcement", "feature"],
      "status": "draft",
      "created_at": "2025-11-25T10:00:00Z",
      "updated_at": "2025-11-25T10:00:00Z",
      "published_at": null,
      "metadata": {
        "campaign": "product_launch_2025"
      },
      "variants_count": 2,
      "schedules_count": 0
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

## Error Cases

### Unauthorized

**Response:** `401 Unauthorized`

```json
{
  "errors": [{
    "error_code": "UNAUTHORIZED",
    "error_description": "Invalid or expired token",
    "error_severity": "error"
  }]
}
```

### Invalid Parameters

**Response:** `400 Bad Request`

```json
{
  "errors": [{
    "error_code": "INVALID_PARAMETER",
    "error_description": "limit must be between 1 and 100",
    "error_severity": "error"
  }]
}
```

---

## Query Optimization

- Index on `owner_principal_id` for fast filtering
- Index on `status` for status filtering
- Index on `created_at` for sorting
- Use pagination to avoid large result sets

---

## Database Access

**Tables Queried:**
- `posts` - Main query
- `post_variants` - Count aggregation
- `schedules` - Count aggregation

---

## Context Dependencies

- **System Context:** Authentication (JWT), authorization (ACL)
- **Posts Context:** Post repository, filtering logic

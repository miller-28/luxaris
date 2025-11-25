# Flow: Get Post by ID

**Endpoint:** `GET /api/v1/posts/:id`

**Context:** Posts - Content Retrieval

**Purpose:** Retrieve a single post with all its details and variants.

---

## Request

```
GET /api/v1/posts/post-uuid-123
```

**Optional Query Parameters:**
- `include_variants` (boolean): Include post variants (default: false)
- `include_schedules` (boolean): Include schedules (default: false)

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT token
   - Extract `principal_id` from token

2. **Validate Post ID**
   - Ensure valid UUID format

3. **Fetch Post**
   - Query `posts` table by `id`
   - Return 404 if not found

4. **Check Permissions**
   - If post owner matches principal: allow
   - Otherwise: call System context `can(principal, 'post', 'read')`
   - Return 403 if not authorized

5. **Load Related Data (if requested)**
   - If `include_variants=true`:
     - Load all `post_variants` for this post
   - If `include_schedules=true`:
     - Load all `schedules` for post variants

6. **Return Response**
   - Return post with requested related data

---

## Response

**Success (200 OK) - Basic:**
```json
{
  "id": "post-uuid",
  "owner_principal_id": "user-uuid",
  "title": "Product Launch Announcement",
  "base_content": "Excited to announce our new feature!",
  "tags": ["product", "launch", "feature"],
  "status": "scheduled",
  "metadata": {
    "campaign_id": "spring-2025"
  },
  "created_at": "2025-11-25T10:00:00Z",
  "updated_at": "2025-11-25T11:00:00Z",
  "published_at": null
}
```

**Success (200 OK) - With Variants:**
```json
{
  "id": "post-uuid",
  "title": "Product Launch Announcement",
  "base_content": "Excited to announce our new feature!",
  "status": "scheduled",
  "variants": [
    {
      "id": "variant-uuid-1",
      "channel_id": "x-channel-uuid",
      "content": "🚀 Excited to announce our new feature! Check it out →",
      "status": "ready",
      "created_at": "2025-11-25T10:30:00Z"
    },
    {
      "id": "variant-uuid-2",
      "channel_id": "linkedin-channel-uuid",
      "content": "We're thrilled to announce the launch of our latest feature...",
      "status": "ready",
      "created_at": "2025-11-25T10:35:00Z"
    }
  ],
  "created_at": "2025-11-25T10:00:00Z",
  "updated_at": "2025-11-25T11:00:00Z"
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

**Error (403 Forbidden):**
```json
{
  "errors": [
    {
      "error_code": "FORBIDDEN",
      "error_description": "You don't have permission to view this post",
      "error_severity": "error"
    }
  ]
}
```

---

## Use Cases

**Dashboard:**
```
GET /api/v1/posts/post-uuid?include_variants=true&include_schedules=true
```

**Quick preview:**
```
GET /api/v1/posts/post-uuid
```

**Edit form:**
```
GET /api/v1/posts/post-uuid?include_variants=true
```

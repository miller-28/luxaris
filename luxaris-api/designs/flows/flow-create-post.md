# Create Post Flow

## Overview

Authenticated user creates a new draft post in the system.

---

## Flow Steps

### 1. User Submits Post Data

**Request:** `POST /api/v1/posts`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "title": "My First Post",
  "base_content": "This is the main content of my post",
  "tags": ["announcement", "feature"],
  "metadata": {
    "campaign": "product_launch_2025"
  }
}
```

### 2. API Authenticates User

- Verify JWT token
- Extract user ID from token
- Check if token is expired

### 3. Check Permissions

- Call System domain ACL: `can(user, 'post', 'create')`
- Verify user has permission to create posts
- Check role assignments

### 4. Validate Input

- Validate required fields (Zod schema)
- Validate `base_content` length (basic constraints)
- Validate `tags` format (array of strings)
- Validate `metadata` structure (JSON)

### 5. Create Post Record

- Generate UUID for post ID
- Set `owner_principal_id` to authenticated user
- Set `status` to `draft`
- Set timestamps (`created_at`, `updated_at`)
- Insert into `posts` table

### 6. Record System Event

- Create `POST_CREATED` event via EventRegistry
- Store in `system_events` table
- Include:
  - `event_type: "post"`
  - `event_name: "POST_CREATED"`
  - `principal_id`: Authenticated user ID
  - `resource_type: "post"`
  - `resource_id`: New post ID
  - `status: "success"`
  - `metadata`: { `title`, `tags`, `status: "draft"` }

### 7. Create Audit Log

- Record `POST_CREATED` action
- Store in `audit_logs` table
- Include post ID, user ID

### 8. Log Info to System Logs

- Log successful post creation via SystemLogger
- `systemLogger.info('posts.creation', 'Post created successfully')`
- Include post ID and user ID in context

### 9. Return Response

**Success Response:** `201 Created`

```json
{
  "post": {
    "id": "uuid",
    "owner_principal_id": "user_uuid",
    "title": "My First Post",
    "base_content": "This is the main content of my post",
    "tags": ["announcement", "feature"],
    "status": "draft",
    "created_at": "2025-11-25T10:00:00Z",
    "updated_at": "2025-11-25T10:00:00Z",
    "published_at": null,
    "metadata": {
      "campaign": "product_launch_2025"
    }
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

### Forbidden

**Response:** `403 Forbidden`

```json
{
  "errors": [{
    "error_code": "FORBIDDEN",
    "error_description": "You don't have permission to create posts",
    "error_severity": "error"
  }]
}
```

### Validation Error

**Response:** `400 Bad Request`

```json
{
  "errors": [{
    "error_code": "VALIDATION_ERROR",
    "error_description": "base_content is required",
    "error_severity": "error"
  }]
}
```

---

## Optional: Create Default Variant

If user provides `default_channel_id`:

```json
{
  "title": "My First Post",
  "base_content": "This is the main content",
  "default_channel_id": "channel_uuid"
}
```

API will also create a `PostVariant`:
- Copy `base_content` to variant `content`
- Set `channel_id` to provided channel
- Set variant `status` to `draft`
- Apply channel-specific formatting if needed

---

## Database Changes

**Tables Modified:**
- `posts` - New post record
- `audit_logs` - Post creation event
- `post_variants` - Optional default variant

---

## Context Dependencies

- **System Domain:** Authentication (JWT), authorization (ACL)
- **Posts Domain:** Post repository, validation rules, lifecycle management

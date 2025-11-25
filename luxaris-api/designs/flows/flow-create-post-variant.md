# Flow: Create Post Variant

**Endpoint:** `POST /api/v1/posts/:post_id/variants`

**Context:** Posts - Content Management

**Purpose:** Create a new variant of an existing post, adapted for a specific channel.

---

## Request

**Path Parameter:**
- `post_id`: Post UUID

**Body:**
```json
{
  "channel_id": "x-channel-uuid",
  "content": "Exciting news! Check out our new product launch 🚀\n\n#ProductLaunch #Innovation",
  "media": [
    {
      "url": "https://cdn.luxaris.com/media/product-image.jpg",
      "type": "image",
      "alt_text": "Product screenshot"
    }
  ],
  "metadata": {
    "hashtags": ["#ProductLaunch", "#Innovation"],
    "mentions": ["@partner_company"]
  }
}
```

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT token
   - Extract `principal_id` from token

2. **Validate Input**
   - Validate `post_id` is valid UUID
   - Validate `channel_id` is valid UUID
   - Validate `content` meets requirements:
     - Not empty
     - Within character limits for channel
   - Validate `media` array (if provided):
     - Valid URLs
     - Supported media types
     - Within count limits for channel

3. **Fetch Post**
   - Query `posts` table by `post_id`
   - Return 404 if not found

4. **Check Authorization**
   - Verify post owner matches principal or has permission
   - Return 403 if not authorized

5. **Fetch Channel**
   - Query `channels` table by `channel_id`
   - Return 404 if not found
   - Check channel `status` is `active`

6. **Validate Channel-Specific Rules**
   - Check content length against channel limits:
     - X (Twitter): 280 characters
     - LinkedIn: 3000 characters
     - Instagram: 2200 characters
   - Check media requirements:
     - X: Max 4 images or 1 video
     - Instagram: Max 10 images, required for posts
     - LinkedIn: Max 9 images or 1 video
   - Check hashtag limits:
     - Instagram: Recommended max 30
     - X: Best practice max 2-3
   - Return 400 if validation fails

7. **Check for Duplicate Variant**
   - Check if variant already exists for this post + channel
   - If exists and status is `draft` or `ready`:
     - Return 400 with option to update existing variant
   - If exists and published:
     - Allow creating new variant

8. **Process Media (if provided)**
   - Validate media URLs are accessible
   - Check file sizes are within limits
   - Store media references

9. **Create Variant Record**
   - Insert into `post_variants` table:
     - `id` (UUID)
     - `post_id`
     - `channel_id`
     - `content`
     - `media` (JSON array)
     - `metadata` (JSON object)
     - `status` = `draft`
     - `created_at`, `updated_at`

10. **Create Audit Log**
    - Log `POST_VARIANT_CREATED` event

11. **Return Response**
    - Return created variant

---

## Response

**Success (201 Created):**
```json
{
  "id": "variant-uuid-123",
  "post_id": "post-uuid-789",
  "channel_id": "x-channel-uuid",
  "content": "Exciting news! Check out our new product launch 🚀\n\n#ProductLaunch #Innovation",
  "media": [
    {
      "url": "https://cdn.luxaris.com/media/product-image.jpg",
      "type": "image",
      "alt_text": "Product screenshot"
    }
  ],
  "metadata": {
    "hashtags": ["#ProductLaunch", "#Innovation"],
    "mentions": ["@partner_company"]
  },
  "status": "draft",
  "created_at": "2025-11-25T15:00:00Z",
  "updated_at": "2025-11-25T15:00:00Z",
  "channel": {
    "id": "x-channel-uuid",
    "key": "x",
    "name": "X (Twitter)",
    "icon_url": "https://cdn.luxaris.com/icons/x.svg"
  },
  "validation": {
    "character_count": 85,
    "character_limit": 280,
    "media_count": 1,
    "media_limit": 4,
    "hashtag_count": 2
  }
}
```

**Error (400 Bad Request) - Content too long:**
```json
{
  "errors": [
    {
      "error_code": "CONTENT_TOO_LONG",
      "error_description": "Content exceeds character limit for X (Twitter). Maximum 280 characters, got 315.",
      "error_severity": "error",
      "meta": {
        "character_count": 315,
        "character_limit": 280,
        "channel_key": "x"
      }
    }
  ]
}
```

**Error (400 Bad Request) - Duplicate variant:**
```json
{
  "errors": [
    {
      "error_code": "VARIANT_ALREADY_EXISTS",
      "error_description": "A variant for this post and channel already exists",
      "error_severity": "error",
      "meta": {
        "existing_variant_id": "variant-uuid-existing",
        "existing_variant_status": "draft"
      }
    }
  ]
}
```

**Error (400 Bad Request) - Too many images:**
```json
{
  "errors": [
    {
      "error_code": "TOO_MANY_MEDIA_ITEMS",
      "error_description": "Too many media items for X (Twitter). Maximum 4 images, got 5.",
      "error_severity": "error",
      "meta": {
        "media_count": 5,
        "media_limit": 4,
        "channel_key": "x"
      }
    }
  ]
}
```

---

## Channel-Specific Validation Rules

**X (Twitter):**
```javascript
{
  character_limit: 280,
  media_limits: {
    images: 4,
    videos: 1,
    gifs: 1
  },
  supported_media_types: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
  max_video_size_mb: 512,
  hashtag_recommendation: 2-3
}
```

**LinkedIn:**
```javascript
{
  character_limit: 3000,
  media_limits: {
    images: 9,
    videos: 1
  },
  supported_media_types: ['image/jpeg', 'image/png', 'video/mp4'],
  max_video_size_mb: 200,
  hashtag_recommendation: 3-5
}
```

**Instagram:**
```javascript
{
  character_limit: 2200,
  media_limits: {
    images: 10,
    videos: 1
  },
  media_required: true,
  supported_media_types: ['image/jpeg', 'image/png', 'video/mp4'],
  max_video_size_mb: 100,
  hashtag_limit: 30,
  aspect_ratio_requirements: {
    square: '1:1',
    portrait: '4:5',
    landscape: '1.91:1'
  }
}
```

---

## Variant Status Lifecycle

```
draft --> ready --> scheduled --> published
  |                      |            |
  +-----> rejected       +----> cancelled
```

**`draft`:** Being edited, not ready for scheduling

**`ready`:** Approved and ready to schedule

**`rejected`:** Failed validation or approval

**`scheduled`:** Queued for publishing

**`published`:** Successfully published to platform

**`cancelled`:** Schedule cancelled before publishing

---

## Authorization

- User must own the post
- OR user must have `create_variant` permission for the post
- Service accounts with appropriate permissions can create variants

---

## Use Cases

**1. Adapt post for different platforms:**
- Create shorter version for X (Twitter)
- Create longer version for LinkedIn
- Add platform-specific hashtags

**2. A/B Testing:**
- Create multiple variants with different content
- Schedule at different times
- Analyze performance

**3. Localization:**
- Create variants in different languages
- Adapt content for different regions

**4. Media Optimization:**
- Create variants with different images
- Optimize aspect ratios for each platform

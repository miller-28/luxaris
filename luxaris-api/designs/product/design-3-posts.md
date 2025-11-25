
# Luxaris API – Posts & Variants

This document describes **Posts and Post Variants** within the Posts context:  
content creation, multi-platform variants, and post lifecycle.

---

## 1. Overview

Posts and Variants provide:

- Platform-agnostic content storage
- Channel-specific content variants
- Multi-platform publishing support
- Post lifecycle management

---

## 2. Post

**Post** is the central content unit in Luxaris:  
a conceptual message/idea independent of channel formatting.

### 2.1 Fields

- `id` – UUID.
- `owner_principal_id` – who owns it.
- `title` – optional, for internal use / calendar.
- `base_content` – base text (channel-agnostic).
- `tags` – list of strings (for filtering, not social hashtags).
- `status` – `draft | scheduled | published | cancelled | archived`.
- `created_at`, `updated_at`, `published_at` (optional).
- `metadata` – JSON (custom fields, grouping, campaign id, etc).

### 2.2 Purpose

Posts represent the **conceptual content**, not the final published form:
- One post can have multiple variants for different platforms
- Base content serves as template/starting point
- Status reflects overall post state across all variants

### 2.3 Post Status

- **`draft`** – Being authored, not scheduled
- **`scheduled`** – Has active schedules pending
- **`published`** – Successfully published to at least one platform
- **`cancelled`** – User cancelled before publishing
- **`archived`** – Housekeeping, removed from active views

---

## 3. Post Variant

**PostVariant** = channel-targeted representation of a post.

### 3.1 Fields

- `id` – UUID.
- `post_id` – FK → `Post`.
- `channel_id` – FK → `Channel`.
- `channel_connection_id` – target account (optional; may be chosen later).
- `content` – final channel-specific text.
- `media` – JSON references (images, video links, etc).
- `tone` – optional label (`"neutral"`, `"provocative"`, `"short"`, etc).
- `source` – `manual | generated | imported`.
- `status` – `draft | ready | published | failed`.
- `created_at`, `updated_at`, `published_at` (optional).
- `metadata` – JSON (UTM codes, short-url mapping, etc).

### 3.2 Purpose

Variants are the **actual publishable content**:
- Content adapted to platform constraints (length, formatting)
- Each variant targets specific channel
- Scheduling happens at variant level
- Tracks publishing status independently

### 3.3 Variant Status

- **`draft`** – Being edited, not ready for scheduling
- **`ready`** – Approved and ready to schedule
- **`published`** – Successfully posted to platform
- **`failed`** – Publishing attempt failed

### 3.4 Media References

The `media` JSON field contains references to media assets:

```json
{
  "images": [
    {
      "url": "https://cdn.example.com/images/abc123.jpg",
      "alt_text": "Product screenshot",
      "width": 1200,
      "height": 630
    }
  ],
  "video": {
    "url": "https://cdn.example.com/videos/xyz789.mp4",
    "thumbnail": "https://cdn.example.com/thumbs/xyz789.jpg",
    "duration": 30
  }
}
```

---

## 4. Workflows

### 4.1 Create Draft Post (Manual)

Flow:

1. User requests to create new post with base content.
2. Application validates:
   - User has permission to create posts.
   - Content meets basic constraints.
3. Creates `Post` with `status = draft`.
4. Returns post data to client.

**Optional:** Immediately create a `PostVariant` if default channel selected.

### 4.2 Create Variant for Post

Flow:

1. User selects existing post.
2. Chooses target channel.
3. Application:
   - Copies `base_content` from Post as starting point.
   - Applies channel-specific formatting/truncation.
   - Creates `PostVariant` with `status = draft`.
4. User edits variant content as needed.
5. Marks variant as `ready` when satisfied.

### 4.3 Edit Post or Variant

**Edit Post:**
- Updates `base_content`, `title`, `tags`, or `metadata`.
- Does NOT affect existing variants (they remain independent).

**Edit Variant:**
- Updates variant-specific `content` and `media`.
- If variant has active schedules, requires confirmation.
- Published variants cannot be edited (status prevents it).

### 4.4 Publish Variant

Handled by scheduling system (see `design-scheduling.md`):
1. Variant must be `status = ready`.
2. Schedule created pointing to variant.
3. Runner publishes at scheduled time.
4. On success, variant transitions to `published`.

---

## 5. Post Lifecycle

Typical lifecycle:

1. **Draft** – `Post` created with `status = draft`.
2. **Variant Creation** – One or more `PostVariant` created.
3. **Scheduling** – Variants scheduled (Post becomes `scheduled`).
4. **Publishing** – Runner publishes variants.
5. **Published** – Variant and Post transition to `published`.
6. **Archiving** – Post can be archived for housekeeping.

### 5.1 Status Transitions

**Post status derivation:**
- Has any pending schedules → `scheduled`
- All schedules published → `published`
- All schedules cancelled → returns to `draft` or `cancelled`
- User manually archives → `archived`

**Variant status transitions:**
```
draft → ready → published
      ↓        ↓
   cancelled  failed
```

---

## 6. Constraints & Rules

**Variant Uniqueness**
- One Post can have multiple variants
- Each variant targets one Channel
- Multiple variants can target same Channel (different tones/versions)

**Ownership**
- Only owner or permitted team members can edit
- Permissions checked via System context

**Content Validation**
- Variant content must respect `Channel.limits.max_text_length`
- Media must meet platform requirements

**Publishing Prerequisites**
- Post must have at least one variant with `status = ready`
- Variant must have valid channel_connection_id
- Cannot publish to disconnected channels

---

## 7. Summary

Key entities:

- `posts` – Platform-agnostic content
- `post_variants` – Channel-specific publishable content

These form the core content model for Luxaris, enabling multi-platform publishing with platform-specific optimization.

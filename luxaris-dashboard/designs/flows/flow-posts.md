# Post Management Flows

Complete flows for managing posts and post variants in the Luxaris Dashboard.

---

## Flow Pattern

All post flows follow the standard pattern:

**Side Menu → Grid → Edit Panel → Save → Return to Grid**

Posts support:
- Multi-platform variants (X, LinkedIn, etc.)
- Draft/published states
- Tags and categorization
- Schedule management
- Publishing history

---

## 1. List Posts

**Route:** `/dashboard/posts`  
**Components:** `PostsView.vue`, `PostsGrid.vue`  
**API:** `GET /api/v1/posts`  
**Permission:** `posts:read`

### Flow Steps

1. **Navigation**
   - User clicks "Posts" in sidebar
   - Navigate to `/dashboard/posts`
   - Show loading skeleton

2. **API Request**
   ```javascript
   GET /api/v1/posts?page=1&limit=20&status=all
   ```

3. **Display Grid**
   - Show posts in card/grid layout
   - Each card displays:
     - Title
     - Content preview (first 100 chars)
     - Status badge (draft/published)
     - Tags
     - Created date
     - Variant count
     - Action buttons (Edit, Delete, Schedule)

4. **Toolbar Features**
   - **Search**: Real-time text search (debounced 500ms)
   - **Status Filter**: All / Draft / Published
   - **Tag Filter**: Multi-select dropdown
   - **Sort**: Created date, Updated date, Title
   - **View**: Grid / List toggle
   - **New Post**: Primary action button

5. **Pagination**
   - Show 20 posts per page
   - Page numbers at bottom
   - "Previous" / "Next" buttons
   - Jump to page input

### Empty State

**No Posts**
- Display empty state illustration
- Message: "No posts yet"
- Call-to-action: "Create your first post" button

**No Results (Filtered)**
- Display "No posts match your filters"
- "Clear filters" button

---

## 2. Create Post

**Trigger:** "New Post" button in PostsView  
**Components:** `PostsView.vue`, `PostEditPanel.vue`  
**API:** `POST /api/v1/posts`  
**Permission:** `posts:create`

### Flow Steps

1. **Open Create Panel**
   - Click "New Post" button
   - Right panel slides in (600px width)
   - Form is empty
   - Focus on title field

2. **Form Fields**
   - **Title** (required)
     - Text input, max 200 characters
     - Character counter
     - Real-time validation
   
   - **Content** (required)
     - Rich text editor or textarea
     - Max 5000 characters
     - Character counter
     - Markdown support (optional)
   
   - **Tags** (optional)
     - Tag input with autocomplete
     - Existing tags suggested
     - Create new tags inline
     - Max 10 tags per post
   
   - **Status** (optional)
     - Radio buttons: Draft / Published
     - Default: Draft
     - Info: "Published posts can be scheduled"

3. **Real-time Validation**
   - Title: Required, min 3 chars, max 200 chars
   - Content: Required, min 10 chars, max 5000 chars
   - Tags: Valid format (alphanumeric, hyphens)
   - Show validation errors inline

4. **Submit Action**
   - Click "Save" button
   - Disable form during submission
   - Show loading spinner on button

5. **API Request**
   ```javascript
   POST /api/v1/posts
   Body: {
       title: "My Post Title",
       content: "Post content here...",
       tags: ["tag1", "tag2"],
       status: "draft"
   }
   ```

6. **Success Response**
   ```json
   {
       "id": "uuid",
       "title": "My Post Title",
       "content": "Post content here...",
       "tags": ["tag1", "tag2"],
       "status": "draft",
       "created_at": "2025-12-04T10:00:00Z",
       "updated_at": "2025-12-04T10:00:00Z"
   }
   ```

7. **Success Actions**
   - Close edit panel
   - Show success toast: "Post created successfully"
   - Refresh posts grid
   - New post appears at top
   - Optional: Navigate to post detail

### Validation Errors

```json
{
    "errors": [
        {
            "error_code": "REQUIRED_FIELD",
            "error_description": "Title is required",
            "error_severity": "error"
        },
        {
            "error_code": "CONTENT_TOO_SHORT",
            "error_description": "Content must be at least 10 characters",
            "error_severity": "error"
        }
    ]
}
```
- Display errors below respective fields
- Highlight fields with errors in red
- Keep valid data intact
- Keep panel open for correction

---

## 3. Edit Post

**Trigger:** "Edit" button on post card  
**Components:** `PostsView.vue`, `PostEditPanel.vue`  
**API:** `PATCH /api/v1/posts/:id`  
**Permission:** `posts:update`

### Flow Steps

1. **Open Edit Panel**
   - Click "Edit" on post card
   - Right panel slides in
   - Show loading spinner while fetching
   - Pre-fill form with post data

2. **API Request (Load Post)**
   ```javascript
   GET /api/v1/posts/:id
   ```

3. **Form Pre-filled**
   - Title field contains post title
   - Content field contains post content
   - Tags are displayed as chips
   - Status reflects current state
   - Show "Last updated: [date]" info

4. **Modify Fields**
   - User changes title, content, tags, or status
   - Validation runs in real-time
   - Unsaved changes indicator (*)
   - "Discard changes" warning if closing

5. **Submit Changes**
   - Click "Save" button
   - Only send changed fields (PATCH)

6. **API Request**
   ```javascript
   PATCH /api/v1/posts/:id
   Body: {
       title: "Updated Title",
       content: "Updated content..."
   }
   ```

7. **Success Actions**
   - Close edit panel
   - Show success toast: "Post updated successfully"
   - Update post in grid (in-place)
   - Maintain scroll position

### Concurrent Edit Warning

If post was modified by another user:
```json
{
    "errors": [{
        "error_code": "CONCURRENT_MODIFICATION",
        "error_description": "Post was modified by another user",
        "error_severity": "warning"
    }]
}
```
- Show warning modal
- Display current server version
- Options: "Overwrite" / "Cancel" / "Merge"

---

## 4. Delete Post

**Trigger:** "Delete" button on post card  
**Components:** `PostsView.vue`, `DeleteConfirmModal.vue`  
**API:** `DELETE /api/v1/posts/:id`  
**Permission:** `posts:delete`

### Flow Steps

1. **Trigger Delete**
   - Click "Delete" button (trash icon)
   - Confirmation modal appears
   - Modal overlays current view

2. **Confirmation Modal**
   - Title: "Delete Post?"
   - Message: "Are you sure you want to delete '{post.title}'? This action cannot be undone."
   - Warning: If post has schedules, show:
     - "This post has X active schedules that will be cancelled."
   - Buttons:
     - "Cancel" (secondary, default focus)
     - "Delete" (danger, red)

3. **Confirm Deletion**
   - User clicks "Delete" button
   - Disable buttons
   - Show loading state

4. **API Request**
   ```javascript
   DELETE /api/v1/posts/:id
   ```

5. **Success Actions**
   - Close modal
   - Show success toast: "Post deleted successfully"
   - Remove post from grid with fade animation
   - If on last page and no more posts, go to previous page

### Error Handling

**Post Has Active Schedules**
```json
{
    "errors": [{
        "error_code": "POST_HAS_ACTIVE_SCHEDULES",
        "error_description": "Cannot delete post with active schedules. Cancel schedules first.",
        "error_severity": "error"
    }]
}
```
- Show error in modal
- Provide "View Schedules" link
- Keep post in grid

**Post Not Found (Already Deleted)**
- Show info toast: "Post was already deleted"
- Remove from grid
- No error state

---

## 5. View Post Detail

**Route:** `/dashboard/posts/:id`  
**Components:** `PostDetailView.vue`  
**API:** `GET /api/v1/posts/:id`  
**Permission:** `posts:read`

### Flow Steps

1. **Navigation**
   - Click post title in grid
   - Navigate to `/dashboard/posts/:id`
   - Show loading skeleton

2. **API Request**
   ```javascript
   GET /api/v1/posts/:id?include=variants,schedules
   ```

3. **Display Post Detail**
   - **Header**
     - Post title
     - Status badge
     - Created/updated dates
     - Action buttons: Edit, Delete, Schedule
   
   - **Main Content** (Tabs)
     - **Content Tab** (default)
       - Full post content
       - Formatted display
       - Tags list
       - Author info
     
     - **Variants Tab**
       - List of platform-specific variants
       - Channel icons
       - Content preview
       - Actions: Edit, Delete
       - "Add Variant" button
     
     - **Schedules Tab**
       - List of schedules for this post
       - Scheduled date/time
       - Channel
       - Status
       - Actions: Edit, Cancel
     
     - **History Tab**
       - Publish history
       - Timeline view
       - Success/failure events
       - Platform responses

4. **Breadcrumbs**
   - Dashboard > Posts > [Post Title]
   - Clickable navigation

---

## 6. List Post Variants

**Location:** Post detail page → "Variants" tab  
**Components:** `PostDetailView.vue`, `VariantsTab.vue`  
**API:** `GET /api/v1/posts/:post_id` (includes variants)  
**Permission:** `posts:read`

### Flow Steps

1. **Switch to Variants Tab**
   - Click "Variants" tab in post detail
   - Display variants list
   - Show loading if not cached

2. **Variants Display**
   - Card layout for each variant
   - Each card shows:
     - Channel icon and name (X, LinkedIn)
     - Content preview (first 100 chars)
     - Character count with limit
     - Media thumbnail (if attached)
     - Created date
     - Actions: Edit, Delete

3. **Character Limits Indicator**
   - X: 280 characters
   - LinkedIn: 3000 characters
   - Visual indicator: Green (OK) / Yellow (near limit) / Red (over limit)

4. **Empty State**
   - No variants yet
   - Message: "No variants for this post"
   - Call-to-action: "Add Variant" button
   - Info: "Create platform-specific versions of your post"

---

## 7. Create Post Variant

**Trigger:** "Add Variant" button in post detail  
**Components:** `VariantEditPanel.vue`  
**API:** `POST /api/v1/posts/:post_id/variants`  
**Permission:** `posts:update`

### Flow Steps

1. **Open Create Variant Panel**
   - Click "Add Variant" button
   - Right panel slides in
   - Focus on channel selector

2. **Form Fields**
   - **Channel** (required)
     - Dropdown: X, LinkedIn, etc.
     - Show channel icon
     - Disabled if variant already exists
   
   - **Content** (required)
     - Textarea
     - Pre-filled with base post content
     - Character counter with limit
     - Live character count updates
   
   - **Media** (optional)
     - File upload (images, videos)
     - Drag-and-drop support
     - Format validation
     - Size limit display
     - Preview thumbnail

3. **Channel-Specific Constraints**
   - **X (Twitter)**
     - Max 280 characters
     - Max 4 images or 1 video
     - Image format: JPG, PNG, GIF
     - Video max 512MB
   
   - **LinkedIn**
     - Max 3000 characters
     - Max 9 images or 1 video
     - Image format: JPG, PNG, GIF
     - Video max 5GB

4. **Real-time Validation**
   - Character count with visual indicator
   - Media size check
   - Format validation
   - Warn if over limit

5. **Submit Variant**
   ```javascript
   POST /api/v1/posts/:post_id/variants
   Body: {
       channel_slug: "x",
       content: "Variant content for X...",
       media_urls: ["https://..."]
   }
   ```

6. **Success Actions**
   - Close edit panel
   - Success toast: "Variant created for X"
   - Refresh variants list
   - New variant appears in list

### Validation Errors

**Content Over Limit**
```json
{
    "errors": [{
        "error_code": "CONTENT_TOO_LONG",
        "error_description": "Content exceeds 280 character limit for X",
        "error_severity": "error"
    }]
}
```
- Highlight content field
- Show character count in red
- Suggest trimming content

**Variant Already Exists**
```json
{
    "errors": [{
        "error_code": "VARIANT_ALREADY_EXISTS",
        "error_description": "A variant for X already exists",
        "error_severity": "error"
    }]
}
```
- Show error message
- Suggest editing existing variant
- Provide "Edit Existing" link

---

## 8. Edit Post Variant

**Trigger:** "Edit" button on variant card  
**Components:** `VariantEditPanel.vue`  
**API:** `PATCH /api/v1/posts/:post_id/variants/:id`  
**Permission:** `posts:update`

### Flow Steps

1. **Open Edit Variant Panel**
   - Click "Edit" on variant card
   - Right panel slides in
   - Pre-fill with variant data

2. **Form Pre-filled**
   - Channel (read-only, cannot change)
   - Content with current text
   - Media thumbnails if attached
   - Character counter

3. **Modify Content**
   - User edits content
   - Character count updates live
   - Real-time validation
   - Unsaved changes indicator

4. **Media Management**
   - Remove existing media
   - Add new media
   - Replace media
   - Validation on upload

5. **Submit Changes**
   ```javascript
   PATCH /api/v1/posts/:post_id/variants/:id
   Body: {
       content: "Updated variant content...",
       media_urls: ["https://..."]
   }
   ```

6. **Success Actions**
   - Close edit panel
   - Success toast: "Variant updated"
   - Update variant in list
   - Maintain scroll position

---

## 9. Delete Post Variant

**Trigger:** "Delete" button on variant card  
**Components:** `DeleteConfirmModal.vue`  
**API:** `DELETE /api/v1/posts/:post_id/variants/:id`  
**Permission:** `posts:update`

### Flow Steps

1. **Trigger Delete**
   - Click "Delete" on variant
   - Confirmation modal appears

2. **Confirmation Modal**
   - Title: "Delete Variant?"
   - Message: "Are you sure you want to delete the [Channel] variant?"
   - Warning: If variant has schedules:
     - "This variant has X active schedules that will be cancelled."
   - Buttons: "Cancel" / "Delete"

3. **Confirm Deletion**
   - API request: `DELETE /api/v1/posts/:post_id/variants/:id`
   - Success: Remove from list with fade animation
   - Success toast: "Variant deleted"

---

## Summary

**Post Management Flows:** 8 flows

**Main Post Operations:**
1. **List Posts** - Grid view with filters and search
2. **Create Post** - Create new post with validation
3. **Edit Post** - Update existing post
4. **Delete Post** - Remove post with confirmation
5. **View Post Detail** - Full post view with tabs

**Variant Operations:**
6. **List Post Variants** - View platform-specific variants
7. **Create Post Variant** - Add channel-specific content
8. **Edit Post Variant** - Modify variant content
9. **Delete Post Variant** - Remove variant (implied)

**Key Features:**
- ✅ Side Menu → Grid → Edit Panel pattern
- ✅ Real-time validation and character counting
- ✅ Platform-specific constraints (X, LinkedIn)
- ✅ Rich text editing support
- ✅ Tag management with autocomplete
- ✅ Media upload and preview
- ✅ Draft/published states
- ✅ Confirmation modals for destructive actions
- ✅ Inline error handling
- ✅ Optimistic UI updates

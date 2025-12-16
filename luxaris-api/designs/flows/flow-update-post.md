# Flow: Update Post

**Endpoint:** `PATCH /api/v1/posts/:id`

**Context:** Posts - Content Modification

**Purpose:** Update an existing post's content or metadata.

---

## Request

```
PATCH /api/v1/posts/post-uuid-123
```

```json
{
  "title": "Updated Product Launch Announcement",
  "description": "Excited to announce our revolutionary new feature!",
  "tags": ["product", "launch", "feature", "innovation"],
  "metadata": {
    "campaign_id": "spring-2025",
    "priority": "critical"
  }
}
```

**Note:** All fields are optional. Only provided fields are updated.

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
   - Otherwise: call System domain ACL `can(principal, 'post', 'update')`
   - Return 403 if not authorized

5. **Validate Update Rules**
   - Check if post status allows updates:
     - `draft`: ✅ Can update freely
     - `scheduled`: ✅ Can update (may require confirmation)
     - `published`: ❌ Cannot update (create new post instead)
     - `archived`: ❌ Cannot update
   - Return 409 if status doesn't allow updates

6. **Validate Input**
   - If `description` provided: validate length
   - If `tags` provided: validate format
   - If `metadata` provided: validate JSON

7. **Update Post Record**
   - Update only provided fields in `posts` table
   - Update `updated_at` timestamp
   - Keep audit trail of changes

8. **Check Variant Impact**
   - If `description` changed:
     - Warn user that variants are not auto-updated
     - Variants remain independent

9. **Create Audit Log**
   - Log `POST_UPDATED` event with changed fields

10. **Return Response**
    - Return updated post

---

## Response

**Success (200 OK):**
```json
{
  "id": "post-uuid",
  "owner_principal_id": "user-uuid",
  "title": "Updated Product Launch Announcement",
  "description": "Excited to announce our revolutionary new feature!",
  "tags": ["product", "launch", "feature", "innovation"],
  "status": "draft",
  "metadata": {
    "campaign_id": "spring-2025",
    "priority": "critical"
  },
  "created_at": "2025-11-25T10:00:00Z",
  "updated_at": "2025-11-25T12:30:00Z",
  "published_at": null
}
```

**Error (409 Conflict):**
```json
{
  "errors": [
    {
      "error_code": "CANNOT_UPDATE_PUBLISHED_POST",
      "error_description": "Published posts cannot be edited. Create a new post instead.",
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
      "error_description": "You don't have permission to update this post",
      "error_severity": "error"
    }
  ]
}
```

---

## Important Notes

**Variant Independence:**
- Updating post `description` does NOT update existing variants
- Variants remain independent once created
- User must manually update variants if needed

**Status Constraints:**
- `published` posts cannot be edited (immutability for audit)
- To "edit" published post: create new post, archive old one
- `scheduled` posts can be updated but may require confirmation

**Partial Updates:**
- Only send fields you want to update
- Omitted fields remain unchanged
- Empty string `""` clears the field
- `null` also clears the field (depending on schema)

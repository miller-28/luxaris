# Flow: Delete Post

**Endpoint:** `DELETE /api/v1/posts/:id`

**Context:** Posts - Content Deletion

**Purpose:** Delete (archive) a post and optionally its variants and schedules.

---

## Request

```
DELETE /api/v1/posts/post-uuid-123
```

**Optional Query Parameters:**
- `force` (boolean): Force delete even if scheduled (default: false)
- `cascade` (boolean): Delete variants and schedules (default: true)

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
   - Otherwise: call System domain ACL `can(principal, 'post', 'delete')`
   - Return 403 if not authorized

5. **Check Post Status**
   - If status is `scheduled`:
     - Check if `force=true` parameter provided
     - If not: return 409 (cannot delete scheduled post)
   - If status is `published`:
     - Check if `force=true` parameter provided
     - If not: return 409 (cannot delete published post)

6. **Check Active Schedules**
   - Query `schedules` for post variants with status `pending` or `queued`
   - If found and `force=false`: return 409
   - If `force=true`: cancel all pending schedules

7. **Soft Delete Post**
   - Update `posts.status` to `archived` (soft delete, not physical delete)
   - Update `deleted_at` timestamp (if column exists)
   - Keep data for audit trail

8. **Handle Variants (if cascade=true)**
   - Update all `post_variants.status` to `archived`
   - Keep variant data for audit

9. **Handle Schedules (if cascade=true)**
   - Cancel all pending schedules (status → `cancelled`)
   - Keep schedule records for audit

10. **Create Audit Log**
    - Log `POST_DELETED` event

11. **Return Response**
    - Return 204 No Content

---

## Response

**Success (204 No Content):**
```
(Empty response body)
```

**Error (409 Conflict) - Has active schedules:**
```json
{
  "errors": [
    {
      "error_code": "CANNOT_DELETE_SCHEDULED_POST",
      "error_description": "Post has active schedules. Cancel schedules first or use force=true",
      "error_severity": "error",
      "meta": {
        "active_schedules": 3
      }
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
      "error_description": "You don't have permission to delete this post",
      "error_severity": "error"
    }
  ]
}
```

---

## Delete Scenarios

### 1. Delete Draft (Simple)
```
DELETE /api/v1/posts/post-uuid
```
- ✅ Allowed immediately
- Variants archived
- No schedules to worry about

### 2. Delete Scheduled Post (Requires Force)
```
DELETE /api/v1/posts/post-uuid?force=true
```
- ⚠️ Requires `force=true`
- Cancels all pending schedules
- Variants archived

### 3. Delete Published Post (Requires Force)
```
DELETE /api/v1/posts/post-uuid?force=true
```
- ⚠️ Requires `force=true`
- Post archived (not physically deleted)
- Historical data preserved for audit

### 4. Delete Without Cascade
```
DELETE /api/v1/posts/post-uuid?cascade=false
```
- Post archived
- Variants remain (orphaned)
- Schedules remain (may fail if executed)
- **Not recommended** in most cases

---

## Important Notes

**Soft Delete (Archiving):**
- Posts are **never physically deleted** from database
- Status changed to `archived`
- Data preserved for audit and compliance
- Can be restored by admin if needed

**Cascade Behavior:**
- Default: cascade=true (delete variants and schedules)
- Ensures data consistency
- Prevents orphaned records

**Force Delete:**
- Required for scheduled or published posts
- Safety mechanism to prevent accidental deletion
- Logs warning in audit trail

**Hard Delete (Admin Only):**
- Physical deletion from database
- Separate admin endpoint (not documented here)
- Requires special permission
- GDPR compliance use case

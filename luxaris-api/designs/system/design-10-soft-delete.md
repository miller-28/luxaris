# System Design: Soft Delete Implementation

## Overview

Soft delete is implemented across all main entities in the Luxaris system to enable data recovery, maintain referential integrity, and provide audit trails for deleted records.

## Motivation

**Problems Solved:**
- **Data Recovery**: Ability to restore accidentally deleted records
- **Referential Integrity**: Maintain relationships without CASCADE DELETE issues
- **Audit Trail**: Track when and what was deleted for compliance
- **User Experience**: "Trash" functionality for users to recover deleted content
- **Analytics**: Analyze deletion patterns and user behavior

**Benefits:**
- Records are never permanently lost (unless explicitly purged)
- Faster delete operations (UPDATE vs DELETE with cascades)
- Simpler rollback of delete operations
- Historical data preserved for analytics

## Database Schema

### Soft Delete Columns

All main entities have two columns added:

```sql
is_deleted BOOLEAN NOT NULL DEFAULT false
deleted_at TIMESTAMP
```

**Column Semantics:**
- `is_deleted`: Boolean flag indicating if record is deleted
  - `false` (default): Record is active
  - `true`: Record is soft-deleted
- `deleted_at`: Timestamp when record was soft-deleted
  - `NULL`: Record is active
  - Timestamp: When delete operation occurred

**Indexed Columns:**
- All `is_deleted` columns are indexed for query performance
- Index pattern: `idx_{table_name}_is_deleted`

### Affected Entities

Soft delete is implemented on the following tables:

#### System Context
1. **users** - User accounts
2. **acl_roles** - Custom access control roles
3. **user_ui_stateful_presets** - UI customization presets

#### Posts Context
4. **posts** - Base post records
5. **post_variants** - Channel-specific post variations
6. **post_templates** - Reusable post templates

#### Channels Context
7. **channel_connections** - User OAuth channel connections

#### Scheduling Context
8. **schedules** - Publishing schedules

#### Generation Context
9. **generation_sessions** - AI generation attempts
10. **generation_suggestions** - AI-generated content suggestions

## Implementation Patterns

### Repository Layer

All repositories follow these patterns:

#### 1. Query Filtering

**All SELECT queries must filter out deleted records:**

```javascript
// Before
const query = 'SELECT * FROM users WHERE id = $1';

// After
const query = 'SELECT * FROM users WHERE id = $1 AND is_deleted = false';
```

**Pattern applies to:**
- `find_by_id()`
- `find_by_email()`
- `find_all()`
- `list_by_owner()`
- `count_*()` methods
- Any custom query methods

#### 2. Soft Delete Method

**Replace DELETE with UPDATE:**

```javascript
// Before
async delete(id) {
    const query = 'DELETE FROM table_name WHERE id = $1';
    await db.query(query, [id]);
}

// After
async delete(id) {
    const query = `
        UPDATE table_name 
        SET is_deleted = true, deleted_at = NOW(), updated_at = NOW() 
        WHERE id = $1 AND is_deleted = false 
        RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
}
```

**Key Points:**
- Always set both `is_deleted = true` and `deleted_at = NOW()`
- Update `updated_at` timestamp
- Check `is_deleted = false` to prevent double-delete
- Return boolean indicating success
- Use `RETURNING *` for audit logging if needed

#### 3. Existence Checks

**Update existence checks to exclude deleted:**

```javascript
// Before
async exists(id) {
    const query = 'SELECT EXISTS(SELECT 1 FROM table WHERE id = $1)';
    const result = await db.query(query, [id]);
    return result.rows[0].exists;
}

// After
async exists(id) {
    const query = 'SELECT EXISTS(SELECT 1 FROM table WHERE id = $1 AND is_deleted = false)';
    const result = await db.query(query, [id]);
    return result.rows[0].exists;
}
```

### Service Layer

Services should:
1. Use repository methods (which handle soft delete automatically)
2. Emit domain events for soft delete operations
3. Handle cascading soft deletes for related entities

**Example Service Method:**

```javascript
async delete_post(post_id, user_id) {
    // 1. Verify post exists and user has permission
    const post = await this.post_repository.find_by_id(post_id);
    if (!post) {
        throw new Error('Post not found');
    }
    
    // 2. Check authorization
    await this.acl_service.check_permission(user_id, 'posts.delete', post_id);
    
    // 3. Soft delete post (repository handles is_deleted)
    const deleted = await this.post_repository.delete(post_id);
    
    // 4. Cascade soft delete to variants
    await this.post_variant_repository.delete_by_post_id(post_id);
    
    // 5. Emit event
    await this.event_service.emit({
        event_type: 'posts',
        event_name: 'POST_DELETED',
        entity_type: 'post',
        entity_id: post_id,
        user_id: user_id
    });
    
    return deleted;
}
```

### API Layer

API endpoints remain unchanged - soft delete is transparent to clients:

```javascript
// DELETE /api/v1/posts/:post_id
// Still returns 204 No Content on success
// Still returns 404 if post already deleted or doesn't exist
```

## Test Considerations

### Test Data Cleanup

Tests must account for soft delete:

```javascript
// Before (hard delete)
afterEach(async () => {
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%test.com']);
});

// After (still works - use DELETE for test cleanup)
afterEach(async () => {
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%test.com']);
});

// OR update soft-deleted records
afterEach(async () => {
    await db.query('UPDATE users SET is_deleted = true WHERE email LIKE $1', ['%test.com']);
});
```

### Testing Soft Delete

```javascript
test('Delete user soft deletes record', async () => {
    // Create user
    const user = await user_repository.create({ email: 'test@example.com', ... });
    
    // Soft delete
    await user_repository.delete(user.id);
    
    // Verify user not found (is_deleted = true)
    const found = await user_repository.find_by_id(user.id);
    expect(found).toBeNull();
    
    // Verify user still exists in database
    const result = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].is_deleted).toBe(true);
    expect(result.rows[0].deleted_at).toBeDefined();
});
```

## Query Performance

### Index Strategy

All soft delete columns are indexed:

```sql
CREATE INDEX idx_users_is_deleted ON luxaris.users(is_deleted);
```

**Query Optimization:**
- Composite indexes may be beneficial for common queries:
  ```sql
  CREATE INDEX idx_posts_owner_not_deleted 
  ON luxaris.posts(owner_principal_id, is_deleted);
  ```
- Always include `is_deleted = false` in WHERE clauses
- PostgreSQL query planner uses these indexes efficiently

### Performance Considerations

**Benefits:**
- Soft delete (UPDATE) is faster than hard delete with cascades
- No need to delete related records immediately
- Queries slightly slower due to additional WHERE clause

**Mitigation:**
- Indexes keep query performance acceptable
- Periodic purge of old soft-deleted records if needed
- Monitor query plans for slow queries

## Future Enhancements

### 1. Restore Functionality

Add restore methods to repositories:

```javascript
async restore(id) {
    const query = `
        UPDATE table_name 
        SET is_deleted = false, deleted_at = NULL, updated_at = NOW() 
        WHERE id = $1 AND is_deleted = true
        RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
}
```

### 2. Purge Old Soft-Deleted Records

Implement background job to permanently delete old records:

```javascript
async purge_deleted(older_than_days = 90) {
    const query = `
        DELETE FROM table_name
        WHERE is_deleted = true 
        AND deleted_at < NOW() - INTERVAL '${older_than_days} days'
    `;
    const result = await db.query(query);
    return result.rowCount;
}
```

### 3. Soft Delete Views

Create database views for active records:

```sql
CREATE VIEW active_users AS
SELECT * FROM users WHERE is_deleted = false;

CREATE VIEW active_posts AS  
SELECT * FROM posts WHERE is_deleted = false;
```

### 4. Admin Interface for Deleted Records

API endpoints for admins to:
- List soft-deleted records
- Restore specific records
- Permanently delete (purge) specific records

```http
GET /api/v1/admin/users/deleted      # List deleted users
POST /api/v1/admin/users/:id/restore  # Restore user
DELETE /api/v1/admin/users/:id/purge  # Permanently delete
```

## Migration

Soft delete was implemented via migration:

**Migration File:** `20251207170532-add-soft-delete-columns.js`

**Adds:**
- `is_deleted BOOLEAN NOT NULL DEFAULT false`
- `deleted_at TIMESTAMP`
- Index on `is_deleted` column

**Rollback:** Available via `down()` migration

## Security Considerations

1. **Authorization**: Verify user has permission to delete before soft delete
2. **Audit Logging**: Log all soft delete operations
3. **Data Privacy**: Consider GDPR/privacy laws - may need hard delete for user data
4. **Access Control**: Prevent access to soft-deleted records via normal queries

## Compliance

**GDPR "Right to be Forgotten":**
- Soft delete alone may not satisfy GDPR
- Implement purge functionality for user data
- Document data retention policies

**Audit Requirements:**
- Soft delete provides audit trail
- Track who deleted what and when
- Restore capability for compliance scenarios

## Summary

Soft delete is comprehensively implemented across all main entities in Luxaris:

✅ Database columns added (`is_deleted`, `deleted_at`)  
✅ Indexes created for performance  
✅ Repository methods updated to filter deleted records  
✅ Delete operations converted to UPDATE  
✅ Tests account for soft delete behavior  

All queries automatically exclude soft-deleted records, maintaining data integrity while enabling recovery and audit capabilities.

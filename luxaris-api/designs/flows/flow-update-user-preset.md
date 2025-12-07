# Flow: Update User UI Preset

**Endpoint:** `PATCH /api/v1/system/ui-presets/:preset_id`

**Context:** System - UI Stateful Presets

**Purpose:** Update existing UI preset settings with auto-save support (debounced from client).

---

## Flow Overview

```
Client (Auto-Save) → API → Deep Merge → Database Update → Cache Invalidation → Response
```

---

## Request

**Method:** `PATCH /api/v1/system/ui-presets/:preset_id`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "settings": {
    "grids": {
      "posts": {
        "columns": [
          {
            "field": "title",
            "visible": true,
            "width": 250,
            "order": 0
          },
          {
            "field": "status",
            "visible": true,
            "width": 120,
            "order": 1
          }
        ]
      }
    }
  }
}
```

**Note:** Only modified sections of settings need to be sent. Deep merge preserves unmodified sections.

---

## Flow Steps

### Step 1: Request Validation

1. **Extract Preset ID**
   - Get `:preset_id` from URL path

2. **Authenticate Request**
   - Verify JWT token from Authorization header
   - Extract authenticated user ID and permissions

3. **Validate Request Body**
   - Check `settings` field present
   - Validate JSONB structure
   - Enforce maximum size (100KB)
   
**Validation Errors:**

```json
{
  "errors": [
    {
      "error_code": "INVALID_SETTINGS_STRUCTURE",
      "error_description": "Settings must be a valid JSON object",
      "error_severity": "error"
    },
    {
      "error_code": "SETTINGS_TOO_LARGE",
      "error_description": "Settings size exceeds maximum allowed (100KB)",
      "error_severity": "error"
    }
  ]
}
```

---

### Step 2: Load Existing Preset

1. **Query Database**
   ```sql
   SELECT 
     id, 
     user_id, 
     role_id, 
     is_global, 
     settings, 
     updated_at
   FROM user_ui_stateful_presets
   WHERE id = :preset_id;
   ```

2. **Check if Preset Exists**
   - Return 404 if not found

**Error Response (404 Not Found):**
```json
{
  "errors": [{
    "error_code": "PRESET_NOT_FOUND",
    "error_description": "UI preset not found",
    "error_severity": "error"
  }]
}
```

---

### Step 3: Authorization Check

1. **Determine Preset Type**
   - **User Preset:** `user_id` is not NULL
   - **Role Preset:** `role_id` is not NULL
   - **Global Preset:** `is_global` is true

2. **Check Authorization**
   - **User Preset:**
     - User can update their own preset: `authenticated_user_id === preset.user_id`
     - OR admin can update any preset: `has_permission('system:admin')`
   
   - **Role Preset:**
     - Only admin can update: `has_permission('system:admin')`
   
   - **Global Preset:**
     - Only admin can update: `has_permission('system:admin')`

3. **Return 403 if Unauthorized**

**Error Response (403 Forbidden):**
```json
{
  "errors": [{
    "error_code": "FORBIDDEN",
    "error_description": "You are not authorized to update this preset",
    "error_severity": "error"
  }]
}
```

---

### Step 4: Deep Merge Settings

1. **Load Existing Settings**
   - Extract `settings` JSONB from database result

2. **Deep Merge New Settings**
   - Recursively merge new settings with existing
   - Preserve unmodified sections
   - Overwrite modified sections

**Deep Merge Algorithm:**

```javascript
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      // Recursively merge objects
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      // Overwrite primitives and arrays
      result[key] = source[key];
    }
  }
  
  return result;
}
```

**Example:**

```javascript
// Existing settings
{
  "menu": { "collapsed": false, "openedGroups": ["posts"] },
  "grids": {
    "posts": { "columns": [...], "filters": { "status": ["draft"] } },
    "schedules": { "columns": [...] }
  },
  "preferences": { "theme": "light", "locale": "en" }
}

// New settings (partial update)
{
  "grids": {
    "posts": { "columns": [NEW_COLUMNS] }
  }
}

// Merged result
{
  "menu": { "collapsed": false, "openedGroups": ["posts"] },  // preserved
  "grids": {
    "posts": { 
      "columns": [NEW_COLUMNS],  // replaced
      "filters": { "status": ["draft"] }  // preserved
    },
    "schedules": { "columns": [...] }  // preserved
  },
  "preferences": { "theme": "light", "locale": "en" }  // preserved
}
```

---

### Step 5: Update Database

1. **Execute Update Query**
   ```sql
   UPDATE user_ui_stateful_presets
   SET 
     settings = :merged_settings,
     updated_at = NOW()
   WHERE id = :preset_id
   RETURNING 
     id, 
     name, 
     user_id, 
     role_id, 
     is_global, 
     settings, 
     created_at, 
     updated_at;
   ```

2. **Verify Update Success**
   - Check affected rows = 1

---

### Step 6: Invalidate Cache

1. **Identify Cache Keys to Invalidate**
   - **User Preset:** `ui-preset:user:{user_id}`
   - **Role Preset:** `ui-preset:role:{role_id}`
   - **Global Preset:** `ui-preset:global`

2. **Delete from Memcached**
   ```javascript
   if (preset.user_id) {
     await memcached.delete(`ui-preset:user:${preset.user_id}`);
   } else if (preset.role_id) {
     await memcached.delete(`ui-preset:role:${preset.role_id}`);
     // Also invalidate all users with this role
     await invalidateUsersWithRole(preset.role_id);
   } else if (preset.is_global) {
     await memcached.delete('ui-preset:global');
     // Invalidate all users without custom presets
     await invalidateGlobalPresetUsers();
   }
   ```

3. **Log Cache Invalidation**
   - `systemLogger.debug('system.ui-presets', 'Cache invalidated', { preset_id })`

---

### Step 7: Record Observability

1. **Record System Event**
   - Event: `UI_PRESET_UPDATED`
   - Metadata:
     ```json
     {
       "preset_id": "preset-uuid",
       "user_id": "user-uuid",
       "updated_by": "authenticated-user-uuid",
       "preset_type": "user|role|global",
       "modified_sections": ["grids.posts.columns"]
     }
     ```
   - Via EventRegistry

2. **Log Info**
   - `systemLogger.info('system.ui-presets', 'Preset updated', { preset_id, user_id })`

3. **Audit Log (if Admin Update)**
   - If admin updating another user's preset:
   - `auditService.log('PRESET_UPDATED_BY_ADMIN', { admin_id, preset_id, user_id })`

---

### Step 8: Return Response

**Success Response (200 OK):**
```json
{
  "id": "preset-uuid-123",
  "name": "Personal Settings",
  "user_id": "user-uuid-456",
  "role_id": null,
  "is_global": false,
  "settings": {
    "menu": {
      "collapsed": false,
      "openedGroups": ["posts"]
    },
    "grids": {
      "posts": {
        "columns": [
          {
            "field": "title",
            "visible": true,
            "width": 250,
            "order": 0
          },
          {
            "field": "status",
            "visible": true,
            "width": 120,
            "order": 1
          }
        ],
        "filters": {
          "status": ["draft"]
        }
      },
      "schedules": {
        "columns": [...]
      }
    },
    "preferences": {
      "theme": "light",
      "locale": "en"
    }
  },
  "created_at": "2025-12-05T10:00:00Z",
  "updated_at": "2025-12-05T14:30:00Z"
}
```

---

## Error Cases

### Preset Not Found

**Response:** `404 Not Found`
```json
{
  "errors": [{
    "error_code": "PRESET_NOT_FOUND",
    "error_description": "UI preset not found",
    "error_severity": "error"
  }]
}
```

### Unauthorized

**Response:** `403 Forbidden`
```json
{
  "errors": [{
    "error_code": "FORBIDDEN",
    "error_description": "You are not authorized to update this preset",
    "error_severity": "error"
  }]
}
```

### Invalid Settings Structure

**Response:** `400 Bad Request`
```json
{
  "errors": [{
    "error_code": "INVALID_SETTINGS_STRUCTURE",
    "error_description": "Settings must be a valid JSON object",
    "error_severity": "error"
  }]
}
```

### Settings Size Exceeded

**Response:** `400 Bad Request`
```json
{
  "errors": [{
    "error_code": "SETTINGS_TOO_LARGE",
    "error_description": "Settings size exceeds maximum allowed (100KB)",
    "error_severity": "error"
  }]
}
```

### Database Error

**Response:** `500 Internal Server Error`
```json
{
  "errors": [{
    "error_code": "DATABASE_ERROR",
    "error_description": "Failed to update preset",
    "error_severity": "error"
  }]
}
```

**Error Handling:**
- Log error: `systemLogger.error('system.ui-presets', 'Failed to update preset', error)`
- Record event: `UI_PRESET_UPDATE_FAILED`
- Return generic error (don't expose internal details)

---

## Performance Notes

**Debouncing:**
- Client debounces auto-save calls (2-second delay)
- Prevents excessive API requests during rapid UI changes

**Deep Merge Performance:**
- Efficient recursive merge algorithm
- Handles nested objects up to 10 levels deep
- Early exit for identical values

**Database Optimization:**
- JSONB partial update (only modified sections)
- Prepared statements for query caching
- Index on `id` for fast lookup

**Cache Strategy:**
- Invalidate cache immediately after update
- Next load will rebuild cache from database
- Prevents stale data

---

## Security Notes

**Authorization:**
- Users can only update their own presets
- Admins can update any preset
- Role/global presets require admin permission

**Input Validation:**
- Sanitize JSONB structure
- Enforce size limits (100KB max)
- Prevent deeply nested objects (max 10 levels)
- Strip dangerous keys (`__proto__`, `constructor`, etc.)

**Audit Trail:**
- Log all admin modifications
- Track who modified what and when
- Compliance for data protection regulations

---

## Client Integration

**Frontend Auto-Save:**

```javascript
// Debounced auto-save (2-second delay)
const debouncedSave = debounce(async (modifications) => {
  try {
    const presetId = presetStore.presetId;
    
    if (!presetId) {
      // No preset yet, need to clone first
      console.log('No preset, cloning required');
      return;
    }
    
    const response = await luminara.patch(
      `/api/v1/system/ui-presets/${presetId}`,
      { settings: modifications }
    );
    
    // Update local store with merged settings
    presetStore.updateSettings(response.settings);
    presetStore.setUpdatedAt(response.updated_at);
    
    console.log('Preset saved successfully');
    
  } catch (error) {
    console.error('Failed to save preset', error);
    // Show retry option to user
    notificationStore.showError('Failed to save UI settings. Retry?');
  }
}, 2000);

// Trigger save on column reorder
function onColumnReorder(newColumns) {
  // Update local state immediately
  presetStore.updateGridColumns('posts', newColumns);
  
  // Debounced save to API
  debouncedSave({
    grids: {
      posts: {
        columns: newColumns
      }
    }
  });
}
```

**Partial Updates:**

```javascript
// Only send modified sections
async function saveColumnVisibility(gridName, columnField, visible) {
  await debouncedSave({
    grids: {
      [gridName]: {
        columns: presetStore.grids[gridName].columns.map(col => 
          col.field === columnField 
            ? { ...col, visible } 
            : col
        )
      }
    }
  });
}
```

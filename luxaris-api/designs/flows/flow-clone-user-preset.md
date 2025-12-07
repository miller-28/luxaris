# Flow: Clone UI Preset on First Modification

**Endpoint:** `POST /api/v1/system/ui-presets/:preset_id/clone`

**Context:** System - UI Stateful Presets

**Purpose:** Automatically clone role/global preset to user preset when user makes first UI modification.

---

## Flow Overview

```
Client (First Modification) → Check User Preset → Clone Role/Global → Apply Modifications → Response
```

---

## Trigger

User with role or global preset makes their first UI modification:
- Reorder grid columns
- Toggle column visibility
- Change filters
- Modify menu state
- Adjust preferences

---

## Request

**Method:** `POST /api/v1/system/ui-presets/:preset_id/clone`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "user-uuid-456",
  "modifications": {
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

**Parameters:**
- `:preset_id` - ID of role/global preset to clone
- `user_id` - Target user ID for new preset
- `modifications` - Initial modifications to apply to cloned preset

---

## Flow Steps

### Step 1: Request Validation

1. **Extract Parameters**
   - Get `:preset_id` from URL path
   - Get `user_id` and `modifications` from request body

2. **Authenticate Request**
   - Verify JWT token
   - Extract authenticated user ID

3. **Validate User Authorization**
   - Check authenticated user matches `user_id` in request
   - OR authenticated user has `system:admin` permission
   - Return 403 if unauthorized

4. **Validate Modifications**
   - Check `modifications` is valid JSONB object
   - Enforce size limits (100KB max)

**Error Response (400 Bad Request):**
```json
{
  "errors": [{
    "error_code": "INVALID_REQUEST",
    "error_description": "Missing required field: user_id or modifications",
    "error_severity": "error"
  }]
}
```

---

### Step 2: Validate Source Preset

1. **Load Source Preset**
   ```sql
   SELECT 
     id, 
     name, 
     user_id, 
     role_id, 
     is_global, 
     settings
   FROM user_ui_stateful_presets
   WHERE id = :preset_id;
   ```

2. **Check Preset Exists**
   - Return 404 if not found

3. **Validate Preset Type**
   - **Must be role or global preset** (not user preset)
   - Check: `user_id IS NULL`
   - Return 400 if trying to clone user preset

**Error Response (400 Bad Request):**
```json
{
  "errors": [{
    "error_code": "INVALID_PRESET_TYPE",
    "error_description": "Cannot clone user preset. Only role or global presets can be cloned.",
    "error_severity": "error"
  }]
}
```

**Error Response (404 Not Found):**
```json
{
  "errors": [{
    "error_code": "PRESET_NOT_FOUND",
    "error_description": "Source preset not found",
    "error_severity": "error"
  }]
}
```

---

### Step 3: Check User Preset Existence

1. **Query for Existing User Preset**
   ```sql
   SELECT id 
   FROM user_ui_stateful_presets
   WHERE user_id = :user_id;
   ```

2. **If User Preset Already Exists**
   - Return 409 Conflict
   - Client should use PATCH endpoint instead

**Error Response (409 Conflict):**
```json
{
  "errors": [{
    "error_code": "USER_PRESET_EXISTS",
    "error_description": "User already has a custom preset. Use PATCH /ui-presets/:preset_id to update.",
    "error_severity": "error",
    "existing_preset_id": "existing-preset-uuid"
  }]
}
```

---

### Step 4: Clone Preset

1. **Create New User Preset**
   ```sql
   INSERT INTO user_ui_stateful_presets (
     id,
     name,
     user_id,
     role_id,
     is_global,
     is_default,
     settings,
     created_at,
     updated_at
   )
   SELECT
     gen_random_uuid(),
     'Personal Settings',
     :user_id,
     NULL,
     false,
     false,
     settings,
     NOW(),
     NOW()
   FROM user_ui_stateful_presets
   WHERE id = :source_preset_id
   RETURNING 
     id, 
     name, 
     user_id, 
     settings, 
     created_at, 
     updated_at;
   ```

2. **Verify Clone Success**
   - Check row inserted
   - Capture new preset ID

---

### Step 5: Apply Modifications

1. **Load Cloned Settings**
   - Extract `settings` JSONB from cloned preset

2. **Deep Merge Modifications**
   - Use same deep merge algorithm as update flow
   - Merge `modifications` with cloned settings

3. **Update Cloned Preset**
   ```sql
   UPDATE user_ui_stateful_presets
   SET 
     settings = :merged_settings,
     updated_at = NOW()
   WHERE id = :new_preset_id
   RETURNING 
     id, 
     name, 
     user_id, 
     settings, 
     created_at, 
     updated_at;
   ```

---

### Step 6: Invalidate Cache

1. **Invalidate User Cache**
   - Delete cache key: `ui-preset:user:{user_id}`
   - User will load new preset on next request

2. **Log Cache Invalidation**
   - `systemLogger.debug('system.ui-presets', 'User cache invalidated after clone', { user_id })`

---

### Step 7: Record Observability

1. **Record System Event**
   - Event: `UI_PRESET_CLONED`
   - Metadata:
     ```json
     {
       "source_preset_id": "source-uuid",
       "new_preset_id": "new-uuid",
       "user_id": "user-uuid",
       "source_type": "role|global",
       "modifications_applied": true
     }
     ```
   - Via EventRegistry

2. **Log Info**
   - `systemLogger.info('system.ui-presets', 'Preset cloned for user', { user_id, source_preset_id, new_preset_id })`

---

### Step 8: Return Response

**Success Response (201 Created):**
```json
{
  "id": "new-preset-uuid-789",
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
      }
    },
    "preferences": {
      "theme": "light",
      "locale": "en"
    }
  },
  "created_at": "2025-12-05T15:00:00Z",
  "updated_at": "2025-12-05T15:00:00Z",
  "cloned_from": {
    "preset_id": "source-preset-uuid-123",
    "type": "role"
  }
}
```

---

## Error Cases

### Source Preset Not Found

**Response:** `404 Not Found`
```json
{
  "errors": [{
    "error_code": "PRESET_NOT_FOUND",
    "error_description": "Source preset not found",
    "error_severity": "error"
  }]
}
```

### Invalid Preset Type

**Response:** `400 Bad Request`
```json
{
  "errors": [{
    "error_code": "INVALID_PRESET_TYPE",
    "error_description": "Cannot clone user preset. Only role or global presets can be cloned.",
    "error_severity": "error"
  }]
}
```

### User Preset Already Exists

**Response:** `409 Conflict`
```json
{
  "errors": [{
    "error_code": "USER_PRESET_EXISTS",
    "error_description": "User already has a custom preset. Use PATCH /ui-presets/:preset_id to update.",
    "error_severity": "error",
    "existing_preset_id": "existing-preset-uuid"
  }]
}
```

### Unauthorized

**Response:** `403 Forbidden`
```json
{
  "errors": [{
    "error_code": "FORBIDDEN",
    "error_description": "You can only clone presets for your own account",
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
    "error_description": "Failed to clone preset",
    "error_severity": "error"
  }]
}
```

**Error Handling:**
- Log error: `systemLogger.error('system.ui-presets', 'Failed to clone preset', error)`
- Record event: `UI_PRESET_CLONE_FAILED`
- Rollback transaction if partially created

---

## Client Integration

**Auto-Clone Logic:**

```javascript
// PresetManager class
class PresetManager {
  constructor() {
    this.presetId = null;
    this.presetSource = null;  // 'user', 'role', 'global', 'none'
  }
  
  async updateSetting(path, value) {
    // Build modifications object
    const modifications = this.buildModifications(path, value);
    
    // Check if user has custom preset
    if (this.presetSource === 'user') {
      // User has custom preset, update directly
      await this.updatePreset(this.presetId, modifications);
      
    } else if (this.presetSource === 'role' || this.presetSource === 'global') {
      // User using role/global preset, clone first
      const clonedPreset = await this.clonePreset(this.presetId, modifications);
      
      // Update local state with new preset
      this.presetId = clonedPreset.id;
      this.presetSource = 'user';
      presetStore.setPresetId(clonedPreset.id);
      presetStore.setPresetSource('user');
      
      console.log('Preset cloned successfully. Future changes will update user preset.');
      
    } else {
      // No preset loaded, error state
      console.error('No preset loaded, cannot save changes');
    }
  }
  
  async clonePreset(sourcePresetId, modifications) {
    try {
      const response = await luminara.post(
        `/api/v1/system/ui-presets/${sourcePresetId}/clone`,
        {
          user_id: authStore.user.id,
          modifications: modifications
        }
      );
      
      return response;
      
    } catch (error) {
      if (error.response?.data?.errors?.[0]?.error_code === 'USER_PRESET_EXISTS') {
        // User preset was created between load and now
        // Switch to update mode
        const existingPresetId = error.response.data.errors[0].existing_preset_id;
        this.presetId = existingPresetId;
        this.presetSource = 'user';
        
        // Retry as update
        await this.updatePreset(existingPresetId, modifications);
        
      } else {
        throw error;
      }
    }
  }
  
  async updatePreset(presetId, modifications) {
    const response = await luminara.patch(
      `/api/v1/system/ui-presets/${presetId}`,
      { settings: modifications }
    );
    
    // Update local store
    presetStore.updateSettings(response.settings);
  }
  
  buildModifications(path, value) {
    // Convert path like 'grids.posts.columns' to nested object
    const keys = path.split('.');
    const modifications = {};
    let current = modifications;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    return modifications;
  }
}
```

**Usage Example:**

```javascript
// When user reorders columns
async function onColumnReorder(newColumns) {
  // Update local state immediately (optimistic update)
  presetStore.updateGridColumns('posts', newColumns);
  
  // Debounced save (handles clone if needed)
  await debouncedSave('grids.posts.columns', newColumns);
}

const debouncedSave = debounce(async (path, value) => {
  await presetManager.updateSetting(path, value);
}, 2000);
```

---

## Performance Notes

**Transaction Safety:**
- Clone and update operations in single transaction
- Rollback on failure ensures consistency

**Conflict Prevention:**
- Check for existing user preset before clone
- Handle race condition if preset created concurrently

**Cache Strategy:**
- Invalidate user cache after clone
- Future loads will use new user preset

---

## Security Notes

**Authorization:**
- Users can only clone for themselves
- Admins can clone for any user

**Data Validation:**
- Validate modifications structure
- Enforce size limits
- Prevent injection attacks

**Audit Trail:**
- Log all clone operations
- Track source preset and modifications

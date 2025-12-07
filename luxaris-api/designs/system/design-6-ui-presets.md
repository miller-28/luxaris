# Luxaris API System – UI Stateful Presets

This document describes **UI Stateful Presets** within the Luxaris System domain:  
persistent user interface configurations for dashboard personalization.

---

## 1. Overview

UI Stateful Presets provide:

- Persistent user interface configurations (grid columns, filters, menu state, preferences)
- Hierarchical preset resolution (user → role → global)
- Automatic cloning on first modification
- Role-based default configurations
- Admin management of global and role defaults

These primitives enable users to personalize their dashboard experience and maintain consistency across sessions and devices.

---

## 2. Preset Entities

### 2.1 UI Stateful Presets

**Concept:** Stores UI configuration state for users, roles, or globally.

Main fields:

- `id` – UUID.
- `name` – preset name (e.g., "My Custom Layout", "Sales Team Default").
- `user_id` – references users table (NULL for role/global presets).
- `role_id` – references roles table (NULL for user/global presets).
- `is_global` – boolean, marks system-wide default preset.
- `is_default` – boolean, marks default preset for role.
- `settings` – JSONB containing all UI state.
- `created_at`, `updated_at` – timestamps.

**Settings JSONB Structure:**

```json
{
  "menu": {
    "collapsed": false,
    "openedGroups": ["posts", "admin"]
  },
  "grids": {
    "posts": {
      "columns": [
        {
          "field": "title",
          "visible": true,
          "width": 200,
          "order": 0
        },
        {
          "field": "status",
          "visible": true,
          "width": 120,
          "order": 1
        },
        {
          "field": "created_at",
          "visible": false,
          "width": 150,
          "order": 2
        }
      ],
      "filters": {
        "status": ["draft", "published"],
        "tags": ["marketing"]
      },
      "sorting": {
        "field": "created_at",
        "direction": "desc"
      },
      "pagination": {
        "page": 1,
        "pageSize": 20
      }
    },
    "schedules": {
      "columns": [...],
      "filters": {...}
    }
  },
  "components": {
    "dashboard": {
      "widgets": [
        {
          "id": "recent-posts",
          "visible": true,
          "order": 0,
          "collapsed": false
        },
        {
          "id": "schedule-calendar",
          "visible": true,
          "order": 1,
          "collapsed": false
        }
      ]
    }
  },
  "preferences": {
    "theme": "light",
    "locale": "en",
    "timezone": "America/New_York",
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "12h"
  }
}
```

**Preset Hierarchy:**

1. **User Custom Preset** (highest priority)
   - `user_id` is set, `role_id` is NULL
   - Personal customizations
   - Created automatically on first modification
   
2. **Role Default Preset** (medium priority)
   - `role_id` is set, `user_id` is NULL, `is_default = true`
   - Admin-defined default for role
   - One default per role
   
3. **Global Default Preset** (lowest priority)
   - `is_global = true`, `user_id` and `role_id` are NULL
   - System-wide default
   - Single global preset

**Preset Resolution Logic:**

When user logs in:
1. Check for user's custom preset (`user_id = :user_id`)
2. If not found, check for role's default preset (`role_id IN (:user_roles) AND is_default = true`)
3. If not found, use global default preset (`is_global = true`)
4. If no presets exist, return empty settings (client applies hardcoded defaults)

**Automatic Cloning:**

When user with role/global preset makes first UI modification:
1. Clone current preset (role or global)
2. Set `user_id` to current user
3. Clear `role_id` and `is_global`
4. Apply modification to new user preset
5. All future modifications update user preset

---

## 3. API Endpoints

### 3.1 Get User Preset

**Endpoint:** `GET /api/v1/system/users/:user_id/ui-preset`

**Purpose:** Load user's UI preset with hierarchical resolution.

**Authorization:** User can only access their own preset OR admin can access any user's preset.

**Flow:**

1. **Validate User Access**
   - Check if authenticated user is requesting their own preset
   - OR authenticated user has `system:admin` permission
   - Return 403 if unauthorized

2. **Resolve Preset Hierarchy**
   ```sql
   -- Check for user custom preset
   SELECT * FROM user_ui_stateful_presets
   WHERE user_id = :user_id
   LIMIT 1;
   
   -- If not found, check for role default preset
   SELECT p.* FROM user_ui_stateful_presets p
   INNER JOIN principal_role_assignments pra ON p.role_id = pra.role_id
   WHERE pra.principal_id = :user_id
     AND pra.principal_type = 'user'
     AND p.is_default = true
   LIMIT 1;
   
   -- If not found, get global default
   SELECT * FROM user_ui_stateful_presets
   WHERE is_global = true
   LIMIT 1;
   ```

3. **Return Preset**
   - Return found preset or empty settings
   - Include preset metadata (id, source: user/role/global)

**Response (200 OK):**
```json
{
  "id": "preset-uuid",
  "source": "user",
  "user_id": "user-uuid",
  "role_id": null,
  "is_global": false,
  "settings": {
    "menu": {...},
    "grids": {...},
    "components": {...},
    "preferences": {...}
  },
  "created_at": "2025-12-05T10:00:00Z",
  "updated_at": "2025-12-05T12:30:00Z"
}
```

**Response (200 OK) - No Preset:**
```json
{
  "id": null,
  "source": "none",
  "settings": {}
}
```

---

### 3.2 Update User Preset

**Endpoint:** `PATCH /api/v1/system/ui-presets/:preset_id`

**Purpose:** Update existing preset settings (auto-save from client).

**Authorization:** 
- User can update their own preset
- Admin can update any preset

**Request Body:**
```json
{
  "settings": {
    "grids": {
      "posts": {
        "columns": [...]
      }
    }
  }
}
```

**Flow:**

1. **Validate Authorization**
   - Check preset ownership or admin permission
   - Return 403 if unauthorized

2. **Deep Merge Settings**
   - Load existing settings
   - Deep merge new settings with existing (preserve unmodified sections)
   ```javascript
   // Example: Only update posts grid columns, keep other settings
   mergedSettings = deepMerge(existingSettings, newSettings);
   ```

3. **Update Preset**
   ```sql
   UPDATE user_ui_stateful_presets
   SET settings = :merged_settings,
       updated_at = NOW()
   WHERE id = :preset_id;
   ```

4. **Record System Event**
   - `UI_PRESET_UPDATED` via EventRegistry
   - Include user_id and modified sections

5. **Log Info**
   - `systemLogger.info('system.ui-presets', 'Preset updated')`

**Response (200 OK):**
```json
{
  "id": "preset-uuid",
  "settings": {...},
  "updated_at": "2025-12-05T12:45:00Z"
}
```

---

### 3.3 Clone Preset (Automatic on First Modification)

**Endpoint:** `POST /api/v1/system/ui-presets/:preset_id/clone`

**Purpose:** Clone role/global preset to user preset on first modification.

**Authorization:** Authenticated user.

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "modifications": {
    "grids": {
      "posts": {
        "columns": [...]
      }
    }
  }
}
```

**Flow:**

1. **Validate Source Preset**
   - Check preset exists
   - Verify it's a role or global preset (not user preset)
   - Return 400 if invalid

2. **Check if User Preset Already Exists**
   - Query for existing user preset
   - Return 409 if already exists (should use update instead)

3. **Clone Preset**
   ```sql
   INSERT INTO user_ui_stateful_presets (
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
     'Personal Settings',
     :user_id,
     NULL,
     false,
     false,
     settings,
     NOW(),
     NOW()
   FROM user_ui_stateful_presets
   WHERE id = :source_preset_id;
   ```

4. **Apply Modifications**
   - Deep merge modifications with cloned settings
   - Update cloned preset

5. **Record System Event**
   - `UI_PRESET_CLONED` via EventRegistry

6. **Log Info**
   - `systemLogger.info('system.ui-presets', 'Preset cloned for user')`

**Response (201 Created):**
```json
{
  "id": "new-preset-uuid",
  "source": "user",
  "user_id": "user-uuid",
  "settings": {...},
  "created_at": "2025-12-05T12:50:00Z"
}
```

---

### 3.4 Create Role Default Preset (Admin Only)

**Endpoint:** `POST /api/v1/system/admin/roles/:role_id/ui-preset`

**Purpose:** Create or update default preset for role.

**Authorization:** `system:admin` permission required.

**Request Body:**
```json
{
  "name": "Sales Team Default Layout",
  "settings": {
    "menu": {...},
    "grids": {...}
  }
}
```

**Flow:**

1. **Validate Admin Permission**
   - Check `system:admin` permission
   - Return 403 if unauthorized

2. **Validate Role Exists**
   - Check role_id exists in roles table
   - Return 404 if not found

3. **Check Existing Default**
   - Query for existing default preset for role
   - If exists: Update existing
   - If not exists: Create new

4. **Create/Update Preset**
   ```sql
   -- If new
   INSERT INTO user_ui_stateful_presets (
     name, role_id, is_default, settings, created_at, updated_at
   ) VALUES (
     :name, :role_id, true, :settings, NOW(), NOW()
   );
   
   -- If updating
   UPDATE user_ui_stateful_presets
   SET name = :name,
       settings = :settings,
       updated_at = NOW()
   WHERE role_id = :role_id AND is_default = true;
   ```

5. **Record System Event**
   - `ROLE_PRESET_CREATED` or `ROLE_PRESET_UPDATED`

6. **Create Audit Log**
   - `ROLE_PRESET_MODIFIED` with admin user_id

7. **Log Info**
   - `systemLogger.info('system.ui-presets', 'Role preset created/updated')`

**Response (201 Created or 200 OK):**
```json
{
  "id": "preset-uuid",
  "name": "Sales Team Default Layout",
  "role_id": "role-uuid",
  "is_default": true,
  "settings": {...},
  "created_at": "2025-12-05T13:00:00Z"
}
```

---

### 3.5 Create Global Default Preset (Admin Only)

**Endpoint:** `POST /api/v1/system/admin/ui-preset/global`

**Purpose:** Create or update system-wide default preset.

**Authorization:** `system:admin` permission required.

**Request Body:**
```json
{
  "name": "Luxaris Default Layout",
  "settings": {
    "menu": {...},
    "grids": {...}
  }
}
```

**Flow:**

1. **Validate Admin Permission**
   - Check `system:admin` permission
   - Return 403 if unauthorized

2. **Check Existing Global Preset**
   - Query for existing global preset
   - If exists: Update existing
   - If not exists: Create new

3. **Create/Update Preset**
   ```sql
   -- If new
   INSERT INTO user_ui_stateful_presets (
     name, is_global, settings, created_at, updated_at
   ) VALUES (
     :name, true, :settings, NOW(), NOW()
   );
   
   -- If updating
   UPDATE user_ui_stateful_presets
   SET name = :name,
       settings = :settings,
       updated_at = NOW()
   WHERE is_global = true;
   ```

4. **Record System Event & Audit**
   - Similar to role preset creation

**Response:** Similar to role preset response.

---

### 3.6 Delete User Preset

**Endpoint:** `DELETE /api/v1/system/ui-presets/:preset_id`

**Purpose:** Delete user's custom preset (revert to role/global default).

**Authorization:** User can delete their own preset OR admin.

**Flow:**

1. **Validate Authorization**
   - Check preset ownership or admin permission
   - Return 403 if unauthorized

2. **Validate Not Role/Global Preset**
   - Prevent deletion of role or global presets
   - Return 400 if attempting to delete role/global preset

3. **Delete Preset**
   ```sql
   DELETE FROM user_ui_stateful_presets
   WHERE id = :preset_id AND user_id IS NOT NULL;
   ```

4. **Record System Event**
   - `UI_PRESET_DELETED`

**Response (204 No Content)**

---

## 4. Database Schema

### 4.1 User UI Stateful Presets Table

```sql
CREATE TABLE user_ui_stateful_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_preset_type CHECK (
    (user_id IS NOT NULL AND role_id IS NULL AND is_global = false) OR
    (user_id IS NULL AND role_id IS NOT NULL AND is_global = false) OR
    (user_id IS NULL AND role_id IS NULL AND is_global = true)
  ),
  CONSTRAINT unique_user_preset UNIQUE (user_id) WHERE user_id IS NOT NULL,
  CONSTRAINT unique_role_default_preset UNIQUE (role_id) WHERE is_default = true,
  CONSTRAINT unique_global_preset UNIQUE (is_global) WHERE is_global = true
);

-- Indexes
CREATE INDEX idx_user_ui_presets_user_id ON user_ui_stateful_presets(user_id);
CREATE INDEX idx_user_ui_presets_role_id ON user_ui_stateful_presets(role_id);
CREATE INDEX idx_user_ui_presets_global ON user_ui_stateful_presets(is_global) WHERE is_global = true;
CREATE INDEX idx_user_ui_presets_default ON user_ui_stateful_presets(role_id, is_default) WHERE is_default = true;

-- GIN index for JSONB settings queries (optional, for advanced filtering)
CREATE INDEX idx_user_ui_presets_settings ON user_ui_stateful_presets USING GIN (settings);

-- Trigger for updated_at
CREATE TRIGGER update_user_ui_presets_updated_at
BEFORE UPDATE ON user_ui_stateful_presets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Constraint Explanations:**

- `check_preset_type`: Ensures preset is either user, role, or global (mutually exclusive)
- `unique_user_preset`: Each user can have only one custom preset
- `unique_role_default_preset`: Each role can have only one default preset
- `unique_global_preset`: System can have only one global default

---

## 5. Business Logic

### 5.1 Preset Resolution Service

**Class:** `PresetResolutionService`

**Method:** `resolvePreset(userId: string): PresetData`

**Logic:**

```typescript
class PresetResolutionService {
  async resolvePreset(userId: string): Promise<PresetData> {
    // 1. Try user custom preset
    const userPreset = await this.db.query(
      'SELECT * FROM user_ui_stateful_presets WHERE user_id = $1',
      [userId]
    );
    if (userPreset.length > 0) {
      return {
        id: userPreset[0].id,
        source: 'user',
        settings: userPreset[0].settings
      };
    }
    
    // 2. Try role default preset
    const rolePreset = await this.db.query(`
      SELECT p.* FROM user_ui_stateful_presets p
      INNER JOIN principal_role_assignments pra ON p.role_id = pra.role_id
      WHERE pra.principal_id = $1 
        AND pra.principal_type = 'user'
        AND p.is_default = true
      LIMIT 1
    `, [userId]);
    if (rolePreset.length > 0) {
      return {
        id: rolePreset[0].id,
        source: 'role',
        settings: rolePreset[0].settings
      };
    }
    
    // 3. Try global default
    const globalPreset = await this.db.query(
      'SELECT * FROM user_ui_stateful_presets WHERE is_global = true'
    );
    if (globalPreset.length > 0) {
      return {
        id: globalPreset[0].id,
        source: 'global',
        settings: globalPreset[0].settings
      };
    }
    
    // 4. No preset found
    return {
      id: null,
      source: 'none',
      settings: {}
    };
  }
}
```

---

### 5.2 Auto-Clone Service

**Class:** `PresetCloneService`

**Method:** `cloneOnFirstModification(userId: string, sourcePresetId: string, modifications: object): PresetData`

**Logic:**

```typescript
class PresetCloneService {
  async cloneOnFirstModification(
    userId: string, 
    sourcePresetId: string, 
    modifications: object
  ): Promise<PresetData> {
    // 1. Check if user already has custom preset
    const existing = await this.db.query(
      'SELECT id FROM user_ui_stateful_presets WHERE user_id = $1',
      [userId]
    );
    if (existing.length > 0) {
      throw new Error('User already has custom preset. Use update instead.');
    }
    
    // 2. Get source preset
    const source = await this.db.query(
      'SELECT * FROM user_ui_stateful_presets WHERE id = $1',
      [sourcePresetId]
    );
    if (source.length === 0) {
      throw new Error('Source preset not found');
    }
    if (source[0].user_id !== null) {
      throw new Error('Cannot clone user preset');
    }
    
    // 3. Clone preset
    const cloned = await this.db.query(`
      INSERT INTO user_ui_stateful_presets (
        name, user_id, settings, created_at, updated_at
      ) VALUES (
        'Personal Settings', $1, $2, NOW(), NOW()
      ) RETURNING *
    `, [userId, source[0].settings]);
    
    // 4. Apply modifications
    const mergedSettings = this.deepMerge(
      cloned[0].settings, 
      modifications
    );
    
    await this.db.query(
      'UPDATE user_ui_stateful_presets SET settings = $1, updated_at = NOW() WHERE id = $2',
      [mergedSettings, cloned[0].id]
    );
    
    // 5. Record event
    await eventRegistry.recordEvent('UI_PRESET_CLONED', {
      user_id: userId,
      source_preset_id: sourcePresetId,
      new_preset_id: cloned[0].id
    });
    
    return {
      id: cloned[0].id,
      source: 'user',
      settings: mergedSettings
    };
  }
  
  private deepMerge(target: any, source: any): any {
    // Deep merge implementation
    // Recursively merge objects, overwrite primitives
    // ...
  }
}
```

---

### 5.3 Deep Merge Strategy

**Purpose:** Merge partial settings updates without losing existing configuration.

**Strategy:**

- For objects: Recursively merge keys
- For arrays: Replace entire array (don't merge array elements)
- For primitives: Overwrite with new value
- Preserve keys not present in update

**Example:**

```javascript
// Existing settings
{
  "grids": {
    "posts": { "columns": [...], "filters": {...} },
    "schedules": { "columns": [...] }
  },
  "preferences": { "theme": "light", "locale": "en" }
}

// Update (only change posts columns)
{
  "grids": {
    "posts": { "columns": [NEW_COLUMNS] }
  }
}

// Result after deep merge
{
  "grids": {
    "posts": { 
      "columns": [NEW_COLUMNS],  // replaced
      "filters": {...}           // preserved
    },
    "schedules": { "columns": [...] }  // preserved
  },
  "preferences": { "theme": "light", "locale": "en" }  // preserved
}
```

---

## 6. Security & Authorization

### 6.1 Access Control Rules

**User Presets:**
- Users can read/update/delete their own preset only
- Admins can read/update/delete any user preset

**Role Presets:**
- Only admins can create/update/delete role presets
- All users with role can read role preset (implicit via hierarchy resolution)

**Global Preset:**
- Only admins can create/update global preset
- All users can read global preset (implicit via hierarchy resolution)

**Permission Required:**
- `system:admin` for all admin operations

---

### 6.2 Validation Rules

**Settings Structure:**
- Validate JSONB structure on create/update
- Enforce maximum size (e.g., 100KB per preset)
- Sanitize nested objects to prevent injection

**Preset Naming:**
- Name required, 1-255 characters
- No special characters in role/global preset names

**Uniqueness:**
- One user preset per user
- One default preset per role
- One global preset for system

---

### 6.3 Data Isolation

**Multi-tenancy:**
- If multi-tenant, add `tenant_id` to presets table
- Filter all queries by `tenant_id`
- Prevent cross-tenant preset access

**User Data Protection:**
- Encrypt sensitive settings if needed
- Audit all admin access to user presets

---

## 7. Performance Considerations

### 7.1 Caching Strategy

**User Preset Cache:**
- Cache resolved preset in Memcached on first load
- Key: `ui-preset:user:{user_id}`
- TTL: 1 hour
- Invalidate on update

**Role Preset Cache:**
- Cache role default presets
- Key: `ui-preset:role:{role_id}`
- TTL: 1 hour
- Invalidate on admin update

**Global Preset Cache:**
- Cache global default
- Key: `ui-preset:global`
- TTL: 24 hours
- Invalidate on admin update

---

### 7.2 Database Optimization

**Indexes:**
- B-tree indexes on user_id, role_id, is_global
- Partial indexes for is_default and is_global
- GIN index on settings JSONB (optional, for filtering)

**Query Optimization:**
- Use prepared statements
- Limit preset size (100KB max)
- Avoid deep nesting in JSONB

---

## 8. Client Integration

### 8.1 Load Preset on Login

**Flow:**

1. User logs in successfully
2. Frontend calls `GET /api/v1/system/users/:user_id/ui-preset`
3. API returns resolved preset (user → role → global → empty)
4. Frontend stores preset in Pinia store
5. Components apply settings on mount

---

### 8.2 Auto-Save on Modification

**Flow:**

1. User modifies UI (reorder columns, toggle visibility, etc.)
2. Frontend debounces changes (2-second delay)
3. Check if user has custom preset:
   - **If yes:** `PATCH /api/v1/system/ui-presets/:preset_id`
   - **If no (using role/global):** `POST /api/v1/system/ui-presets/:preset_id/clone` with modifications
4. API updates/clones preset
5. Frontend updates local Pinia store

---

### 8.3 Preset Reset

**Flow:**

1. User clicks "Reset to Default" in settings
2. Frontend calls `DELETE /api/v1/system/ui-presets/:preset_id`
3. API deletes user preset
4. User reverts to role/global default
5. Frontend reloads preset via `GET` endpoint

---

## 9. Observability

### 9.1 System Events

**Events to Record via EventRegistry:**

- `UI_PRESET_LOADED` - User loaded preset
- `UI_PRESET_UPDATED` - User updated preset
- `UI_PRESET_CLONED` - Role/global preset cloned to user
- `UI_PRESET_DELETED` - User preset deleted
- `ROLE_PRESET_CREATED` - Admin created role preset
- `ROLE_PRESET_UPDATED` - Admin updated role preset
- `GLOBAL_PRESET_UPDATED` - Admin updated global preset

---

### 9.2 System Logs

**Log via SystemLogger:**

- Info: Preset loaded, updated, cloned
- Warning: Preset size approaching limit
- Error: Invalid settings structure, failed to save

---

### 9.3 Audit Logs

**Audit via AuditService:**

- All admin modifications of role/global presets
- User preset deletions
- Access to other users' presets by admins

---

## 10. Migration Strategy

### 10.1 Initial Setup

1. Create `user_ui_stateful_presets` table
2. Create global default preset with sensible defaults
3. Create role default presets for existing roles (optional)

### 10.2 Existing Users

**Option A: Lazy Migration**
- Users continue with global default
- Create user preset on first modification

**Option B: Proactive Migration**
- Generate user presets based on current role
- Clone role defaults for all users

---

## 11. Future Enhancements

### 11.1 Preset Sharing

- Allow users to share presets with team
- Public preset marketplace
- Import/export preset configurations

### 11.2 Preset Versioning

- Track preset history
- Rollback to previous versions
- Compare preset changes

### 11.3 Advanced Filtering

- Query presets by specific settings
- Find users with specific configurations
- Analytics on popular preset configurations

---

## 12. Summary

**Key Features:**

- ✅ Hierarchical preset resolution (user → role → global)
- ✅ Automatic cloning on first modification
- ✅ Role-based default configurations
- ✅ Admin management interface
- ✅ Auto-save with debouncing
- ✅ Deep merge for partial updates
- ✅ Caching for performance
- ✅ Full observability integration

**Database Tables:**

- `user_ui_stateful_presets` - Stores all presets

**API Endpoints:**

- `GET /api/v1/system/users/:user_id/ui-preset` - Load user preset
- `PATCH /api/v1/system/ui-presets/:preset_id` - Update preset
- `POST /api/v1/system/ui-presets/:preset_id/clone` - Clone preset
- `POST /api/v1/system/admin/roles/:role_id/ui-preset` - Create role preset
- `POST /api/v1/system/admin/ui-preset/global` - Create global preset
- `DELETE /api/v1/system/ui-presets/:preset_id` - Delete preset

**Integration Points:**

- Authentication flow (load on login)
- Dashboard components (apply settings)
- Admin interface (manage role/global presets)

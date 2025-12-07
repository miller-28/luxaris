# Flow: Get User UI Preset

**Endpoint:** `GET /api/v1/system/users/:user_id/ui-preset`

**Context:** System - UI Stateful Presets

**Purpose:** Load user's UI preset configuration with hierarchical resolution (user → role → global).

---

## Flow Overview

```
Client → API → Database (Hierarchy Query) → Cache → Response
```

---

## Flow Steps

### Step 1: Request Validation

1. **Extract User ID from Path**
   - Get `:user_id` parameter from URL

2. **Authenticate Request**
   - Verify JWT token from Authorization header
   - Extract authenticated user ID from token

3. **Authorize Access**
   - Check if authenticated user is requesting their own preset:
     - `authenticated_user_id === requested_user_id`
   - OR authenticated user has `system:admin` permission
   - Return 403 if unauthorized

**Error Response (403 Forbidden):**
```json
{
  "errors": [{
    "error_code": "FORBIDDEN",
    "error_description": "You can only access your own UI preset",
    "error_severity": "error"
  }]
}
```

---

### Step 2: Check Cache

1. **Query Memcached**
   - Key: `ui-preset:user:{user_id}`
   - TTL: 1 hour
   
2. **If Cache Hit**
   - Return cached preset
   - Skip database queries
   - Log cache hit: `systemLogger.debug('system.ui-presets', 'Preset loaded from cache')`

3. **If Cache Miss**
   - Continue to database resolution

---

### Step 3: Resolve Preset Hierarchy

**Priority Order:** User Custom → Role Default → Global Default → Empty

#### 3.1 Check User Custom Preset

```sql
SELECT 
  id, 
  name, 
  user_id, 
  role_id, 
  is_global, 
  settings, 
  created_at, 
  updated_at
FROM user_ui_stateful_presets
WHERE user_id = :user_id
LIMIT 1;
```

- If found: Use this preset (highest priority)
- If not found: Continue to role preset

#### 3.2 Check Role Default Preset

```sql
SELECT 
  p.id, 
  p.name, 
  p.user_id, 
  p.role_id, 
  p.is_global, 
  p.settings, 
  p.created_at, 
  p.updated_at
FROM user_ui_stateful_presets p
INNER JOIN principal_role_assignments pra 
  ON p.role_id = pra.role_id
WHERE pra.principal_id = :user_id
  AND pra.principal_type = 'user'
  AND p.is_default = true
ORDER BY pra.created_at DESC
LIMIT 1;
```

- If found: Use this preset (medium priority)
- If not found: Continue to global preset
- **Note:** If user has multiple roles, use most recently assigned role's preset

#### 3.3 Check Global Default Preset

```sql
SELECT 
  id, 
  name, 
  user_id, 
  role_id, 
  is_global, 
  settings, 
  created_at, 
  updated_at
FROM user_ui_stateful_presets
WHERE is_global = true
LIMIT 1;
```

- If found: Use this preset (lowest priority)
- If not found: Return empty preset

#### 3.4 No Preset Found

- Return empty settings object
- Client will apply hardcoded defaults

---

### Step 4: Prepare Response

1. **Determine Preset Source**
   - `user` - User's custom preset
   - `role` - Role default preset
   - `global` - Global default preset
   - `none` - No preset found

2. **Format Response**
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

3. **Cache Result**
   - Store in Memcached
   - Key: `ui-preset:user:{user_id}`
   - TTL: 1 hour (3600 seconds)
   - Only cache if preset found (don't cache "none")

---

### Step 5: Record Observability

1. **Record System Event**
   - Event: `UI_PRESET_LOADED`
   - Metadata:
     ```json
     {
       "user_id": "user-uuid",
       "preset_id": "preset-uuid",
       "source": "user|role|global|none"
     }
     ```
   - Via EventRegistry

2. **Log Info**
   - `systemLogger.info('system.ui-presets', 'User preset loaded', { user_id, preset_id, source })`

---

### Step 6: Return Response

**Success Response (200 OK) - User Preset:**
```json
{
  "id": "preset-uuid-123",
  "source": "user",
  "user_id": "user-uuid-456",
  "role_id": null,
  "is_global": false,
  "settings": {
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
          }
        ],
        "filters": {
          "status": ["draft", "published"]
        },
        "sorting": {
          "field": "created_at",
          "direction": "desc"
        },
        "pagination": {
          "page": 1,
          "pageSize": 20
        }
      }
    },
    "preferences": {
      "theme": "light",
      "locale": "en",
      "timezone": "America/New_York"
    }
  },
  "created_at": "2025-12-05T10:00:00Z",
  "updated_at": "2025-12-05T12:30:00Z"
}
```

**Success Response (200 OK) - Role Preset:**
```json
{
  "id": "preset-uuid-789",
  "source": "role",
  "user_id": null,
  "role_id": "role-uuid-101",
  "is_global": false,
  "settings": {...},
  "created_at": "2025-12-01T08:00:00Z",
  "updated_at": "2025-12-03T14:00:00Z"
}
```

**Success Response (200 OK) - Global Preset:**
```json
{
  "id": "preset-uuid-999",
  "source": "global",
  "user_id": null,
  "role_id": null,
  "is_global": true,
  "settings": {...},
  "created_at": "2025-11-01T00:00:00Z",
  "updated_at": "2025-11-15T10:00:00Z"
}
```

**Success Response (200 OK) - No Preset:**
```json
{
  "id": null,
  "source": "none",
  "user_id": null,
  "role_id": null,
  "is_global": false,
  "settings": {},
  "created_at": null,
  "updated_at": null
}
```

---

## Error Cases

### User Not Found

**Response:** `404 Not Found`
```json
{
  "errors": [{
    "error_code": "USER_NOT_FOUND",
    "error_description": "User not found",
    "error_severity": "error"
  }]
}
```

### Unauthorized Access

**Response:** `403 Forbidden`
```json
{
  "errors": [{
    "error_code": "FORBIDDEN",
    "error_description": "You can only access your own UI preset",
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
    "error_description": "Failed to load UI preset",
    "error_severity": "error"
  }]
}
```

**Error Handling:**
- Log error: `systemLogger.error('system.ui-presets', 'Failed to load preset', error)`
- Record event: `UI_PRESET_LOAD_FAILED`
- Return generic error message (don't expose internal details)

---

## Performance Notes

**Caching Strategy:**
- Cache resolved preset for 1 hour
- Invalidate cache on preset update
- Significantly reduces database load

**Query Optimization:**
- Use prepared statements
- Indexes on `user_id`, `role_id`, `is_global`
- Efficient hierarchy resolution with early exit

**Response Size:**
- Settings JSONB limited to 100KB
- Compress response if settings > 10KB

---

## Security Notes

**Authorization:**
- Users can only access their own preset
- Admins can access any user's preset
- No cross-user data exposure

**Data Privacy:**
- User settings may contain sensitive preferences
- Audit admin access via AuditService

---

## Client Integration

**Frontend Usage:**

```javascript
// Load preset on user login
async function loadUserPreset(userId) {
  try {
    const response = await luminara.get(`/api/v1/system/users/${userId}/ui-preset`);
    
    if (response.source === 'none') {
      // Apply hardcoded defaults
      presetStore.applyDefaults();
    } else {
      // Apply loaded preset
      presetStore.applyPreset(response.settings);
    }
    
    // Store preset metadata for future updates
    presetStore.setPresetId(response.id);
    presetStore.setPresetSource(response.source);
    
  } catch (error) {
    console.error('Failed to load preset', error);
    // Apply defaults on error
    presetStore.applyDefaults();
  }
}
```

**Vue Router Guard:**

```javascript
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth && authStore.isAuthenticated) {
    // Load preset if not already loaded
    if (!presetStore.isLoaded) {
      await loadUserPreset(authStore.user.id);
    }
  }
  next();
});
```

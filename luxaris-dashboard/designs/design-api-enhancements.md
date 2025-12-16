# Luxaris API - Dashboard Enhancement Support

**Version:** 1.0.0  
**Purpose:** API-side implementation to support dashboard features  
**Related:** luxaris-dashboard design.md enhancements

---

## 1. Overview

This document defines API-side implementations needed to support the enhanced Luxaris Dashboard features:
- **UI Stateful Presets** - Persist user interface configurations
- **Google OAuth Authentication** - Social login/registration
- **Enhanced User Management** - Root admin, approval workflow, permission-based access
- **Internationalization Support** - Multi-language, RTL support metadata

---

## 2. Database Schema Changes

### 2.1 New Table: `user_ui_stateful_presets`

**Purpose:** Store UI configuration presets (grid columns, filters, menu state, preferences)

```sql
CREATE TABLE user_ui_stateful_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL for global/role presets
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,  -- NULL for user-specific presets
    preset_name VARCHAR(255) NOT NULL,
    is_global BOOLEAN DEFAULT FALSE,      -- Global preset for all users
    is_default BOOLEAN DEFAULT FALSE,     -- Default preset for role
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,  -- UI configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_preset_owner CHECK (
        (user_id IS NOT NULL AND role_id IS NULL) OR
        (user_id IS NULL AND role_id IS NOT NULL) OR
        (user_id IS NULL AND role_id IS NULL AND is_global = TRUE)
    ),
    CONSTRAINT unique_user_preset_name UNIQUE (user_id, preset_name),
    CONSTRAINT unique_role_default_preset UNIQUE (role_id, is_default) WHERE is_default = TRUE
);

-- Indexes
CREATE INDEX idx_user_ui_presets_user_id ON user_ui_stateful_presets(user_id);
CREATE INDEX idx_user_ui_presets_role_id ON user_ui_stateful_presets(role_id);
CREATE INDEX idx_user_ui_presets_global ON user_ui_stateful_presets(is_global) WHERE is_global = TRUE;

-- Trigger for updated_at
CREATE TRIGGER update_user_ui_presets_updated_at
BEFORE UPDATE ON user_ui_stateful_presets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Settings JSONB Structure:**

```json
{
  "menu": {
    "collapsed": false,
    "openedGroups": ["posts", "channels"]
  },
  "grids": {
    "posts-grid": {
      "columns": [
        { "field": "title", "order": 1, "visible": true, "width": 300 },
        { "field": "status", "order": 2, "visible": true, "width": 120 },
        { "field": "created_at", "order": 3, "visible": true, "width": 180 },
        { "field": "tags", "order": 4, "visible": false, "width": 200 }
      ],
      "filters": {
        "status": "draft",
        "search": "",
        "tags": []
      },
      "sorting": {
        "field": "created_at",
        "order": "desc"
      },
      "pageSize": 20
    }
  },
  "components": {
    "dashboard-widgets": {
      "recent-posts": { "visible": true, "order": 1 },
      "schedule-calendar": { "visible": true, "order": 2 },
      "analytics-chart": { "visible": false, "order": 3 }
    }
  },
  "preferences": {
    "theme": "light",
    "locale": "en",
    "timezone": "UTC",
    "dateFormat": "YYYY-MM-DD",
    "compactMode": false
  }
}
```

---

### 2.2 Modified Table: `users`

**Add new columns (if not exists) for enhanced authentication:**

```sql
ALTER TABLE users
ADD COLUMN is_root BOOLEAN DEFAULT FALSE,         -- First user, permanent admin
ADD COLUMN status VARCHAR(50) DEFAULT 'pending',       -- pending, approved, suspended
ADD COLUMN google_id VARCHAR(255) UNIQUE,              -- Google OAuth user ID
ADD COLUMN avatar_url TEXT,                            -- Profile picture URL
ADD COLUMN locale VARCHAR(10) DEFAULT 'en',            -- Preferred language
ADD COLUMN timezone VARCHAR(100) DEFAULT 'UTC',        -- User timezone
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;     -- Last login timestamp

-- Add check constraint for status
ALTER TABLE users
ADD CONSTRAINT check_user_status CHECK (status IN ('pending', 'approved', 'suspended'));

-- Index for Google OAuth lookups
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Index for status filtering
CREATE INDEX idx_users_status ON users(status);
```

---

### 2.3 Modified Table: `roles`

**Add root_admin role (if not exists):**

```sql
-- Insert root_admin role
INSERT INTO roles (id, name, description)
VALUES 
    (uuid_generate_v4(), 'root_admin', 'Root administrator with full permanent access'),
    (uuid_generate_v4(), 'user', 'Regular user with basic permissions')
ON CONFLICT (name) DO NOTHING;
```

---

### 2.4 New Table: `oauth_providers` (optional, for multi-provider support)

**Purpose:** Store OAuth provider configurations and user connections

```sql
CREATE TABLE oauth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,   -- google, github, facebook, etc.
    enabled BOOLEAN DEFAULT TRUE,
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,  -- Encrypted
    auth_url TEXT NOT NULL,
    token_url TEXT NOT NULL,
    user_info_url TEXT NOT NULL,
    scopes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE TRIGGER update_oauth_providers_updated_at
BEFORE UPDATE ON oauth_providers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 3. API Endpoints

### 3.1 Authentication Endpoints (Enhanced)

**Base Path:** `/api/v1/system/auth`

#### 3.1.1 Email/Password Registration (Enhanced)

**Endpoint:** `POST /api/v1/system/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "locale": "en",
  "timezone": "America/New_York"
}
```

**Business Logic:**
1. Validate input (email format, password strength)
2. Check if user with email exists
3. Check if this is the **first user** in the system:
   - **First user:**
     - Set `is_root = true`
     - Set `status = 'approved'`
     - Assign `root_admin` role
     - Generate JWT tokens
     - Create default UI preset
     - Return tokens + user data
   - **Subsequent users:**
     - Set `is_root = false`
     - Set `status = 'pending'`
     - Assign `user` role
     - Create default UI preset (but inactive)
     - Return user data WITHOUT tokens
4. Hash password
5. Create user record
6. Send email notification to admins (for pending approval)

**Response (First User):**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "is_root": true,
    "status": "approved",
    "roles": ["root_admin"],
    "permissions": ["*"],
    "locale": "en",
    "timezone": "America/New_York"
  },
  "access_token": "jwt_token",
  "refresh_token": "jwt_refresh_token",
  "expires_in": 86400
}
```

**Response (Pending User):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "is_root": false,
    "status": "pending",
    "roles": ["user"],
    "permissions": []
  },
  "message": "Your account is pending administrator approval"
}
```

**HTTP Status Codes:**
- `201 Created` - User registered successfully
- `400 Bad Request` - Validation error
- `409 Conflict` - Email already exists

---

#### 3.1.2 Google OAuth Initiation

**Endpoint:** `GET /api/v1/system/auth/google`

**Purpose:** Initiate Google OAuth 2.0 flow

**Query Parameters:**
- `redirect_uri` (optional) - Frontend callback URL

**Business Logic:**
1. Generate random `state` parameter (CSRF protection)
2. Store state in session or temporary cache (Redis, 5min TTL)
3. Build Google OAuth URL with:
   - `client_id`
   - `redirect_uri` (API callback)
   - `scope` (email, profile, openid)
   - `state`
   - `response_type=code`
4. Redirect user to Google OAuth consent screen

**Response:**
```http
HTTP/1.1 302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=xxx&redirect_uri=xxx&scope=email+profile+openid&state=xxx&response_type=code
```

---

#### 3.1.3 Google OAuth Callback

**Endpoint:** `GET /api/v1/system/auth/google/callback`

**Purpose:** Handle Google OAuth callback and create/login user

**Query Parameters:**
- `code` - Authorization code from Google
- `state` - CSRF protection state

**Business Logic:**
1. Validate `state` parameter (match stored state)
2. Exchange `code` for access token with Google:
   ```
   POST https://oauth2.googleapis.com/token
   {
     "code": "xxx",
     "client_id": "xxx",
     "client_secret": "xxx",
     "redirect_uri": "xxx",
     "grant_type": "authorization_code"
   }
   ```
3. Fetch user info from Google:
   ```
   GET https://www.googleapis.com/oauth2/v2/userinfo
   Authorization: Bearer {google_access_token}
   ```
4. Check if user exists by `google_id` or `email`:
   - **Existing user:**
     - Update `last_login_at`
     - Generate JWT tokens
     - Return tokens + user data
   - **New user (first in system):**
     - Create user with:
       - `google_id = google_user_id`
       - `email = google_email`
       - `name = google_name`
       - `avatar_url = google_picture`
       - `is_root = true`
       - `status = 'approved'`
     - Assign `root_admin` role
     - Create default UI preset
     - Generate JWT tokens
     - Return tokens + user data
   - **New user (subsequent):**
     - Create user with:
       - `google_id = google_user_id`
       - `email = google_email`
       - `name = google_name`
       - `avatar_url = google_picture`
       - `is_root = false`
       - `status = 'pending'`
     - Assign `user` role
     - Create default UI preset
     - Send admin notification
     - Return pending message
5. Redirect to frontend with result

**Response (Redirect):**
```http
HTTP/1.1 302 Found
Location: https://dashboard.luxaris.com/auth/callback?success=true&token=jwt_token

OR (for pending users):

Location: https://dashboard.luxaris.com/auth/callback?pending=true
```

**Frontend Handling:**
- Frontend parses query parameters
- If `success=true` and `token` present: Store token, load preset, redirect to dashboard
- If `pending=true`: Show pending approval message

---

#### 3.1.4 Email/Password Login (Enhanced)

**Endpoint:** `POST /api/v1/system/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Business Logic:**
1. Find user by email
2. Verify password
3. Check user status:
   - If `status = 'pending'`: Return 403 with pending message
   - If `status = 'suspended'`: Return 403 with suspended message
   - If `status = 'approved'`: Proceed
4. Update `last_login_at`
5. Generate JWT tokens (include permissions, roles, is_root in payload)
6. Return tokens + user data

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "is_root": true,
    "status": "approved",
    "roles": ["root_admin"],
    "permissions": ["*"],
    "locale": "en",
    "timezone": "America/New_York",
    "avatar_url": "https://..."
  },
  "access_token": "jwt_token",
  "refresh_token": "jwt_refresh_token",
  "expires_in": 86400
}
```

**HTTP Status Codes:**
- `200 OK` - Login successful
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Account pending approval or suspended

---

### 3.2 UI Stateful Presets Endpoints

**Base Path:** `/api/v1/system/ui-presets`

#### 3.2.1 Get User's Active Preset

**Endpoint:** `GET /api/v1/system/users/:user_id/ui-preset`

**Purpose:** Get the active preset for a user (user's custom preset or role default)

**Authorization:** JWT token required, `user_id` must match authenticated user or admin

**Business Logic:**
1. Check if user has custom preset (`user_id` not null)
2. If not, check for role default preset (`role_id` matches user's role, `is_default = true`)
3. If not, return global default preset (`is_global = true`)
4. Return preset with settings

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "role_id": null,
  "preset_name": "My Custom Layout",
  "is_global": false,
  "is_default": false,
  "settings": {
    "menu": { ... },
    "grids": { ... },
    "components": { ... },
    "preferences": { ... }
  },
  "created_at": "2025-12-05T10:00:00Z",
  "updated_at": "2025-12-05T12:30:00Z"
}
```

**HTTP Status Codes:**
- `200 OK` - Preset retrieved
- `404 Not Found` - No preset found (should not happen if defaults exist)

---

#### 3.2.2 Update User's Preset

**Endpoint:** `PATCH /api/v1/system/ui-presets/:preset_id`

**Purpose:** Update user's custom preset settings (auto-save)

**Request Body:**
```json
{
  "settings": {
    "grids": {
      "posts-grid": {
        "filters": {
          "status": "published"
        }
      }
    }
  }
}
```

**Business Logic:**
1. Verify user owns the preset
2. Merge new settings with existing settings (deep merge)
3. Update `updated_at` timestamp
4. Return updated preset

**Response:**
```json
{
  "id": "uuid",
  "settings": { ... },
  "updated_at": "2025-12-05T12:35:00Z"
}
```

**HTTP Status Codes:**
- `200 OK` - Preset updated
- `403 Forbidden` - User doesn't own preset
- `404 Not Found` - Preset not found

---

#### 3.2.3 Clone Preset for User

**Endpoint:** `POST /api/v1/system/ui-presets/:preset_id/clone`

**Purpose:** Clone a preset (admin role preset) for user customization

**Request Body:**
```json
{
  "user_id": "uuid"
}
```

**Business Logic:**
1. Load source preset (role default or global)
2. Create new preset:
   - `user_id = request.user_id`
   - `role_id = null`
   - `preset_name = "Copy of {source_name}"`
   - `is_global = false`
   - `is_default = false`
   - `settings = deep copy of source settings`
3. Return new preset

**Response:**
```json
{
  "id": "new_uuid",
  "user_id": "uuid",
  "preset_name": "Copy of Default Layout",
  "settings": { ... }
}
```

**HTTP Status Codes:**
- `201 Created` - Preset cloned
- `404 Not Found` - Source preset not found

---

#### 3.2.4 List Presets (Admin Only)

**Endpoint:** `GET /api/v1/system/ui-presets`

**Purpose:** List all presets (global, role defaults, user customs) for admin management

**Query Parameters:**
- `user_id` (optional) - Filter by user
- `role_id` (optional) - Filter by role
- `is_global` (optional) - Filter global presets
- `is_default` (optional) - Filter default presets

**Authorization:** Requires `system:admin` permission

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": null,
      "role_id": "admin_role_id",
      "preset_name": "Admin Default Layout",
      "is_global": false,
      "is_default": true,
      "settings": { ... }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

---

#### 3.2.5 Create Preset (Admin Only)

**Endpoint:** `POST /api/v1/system/ui-presets`

**Purpose:** Create global or role default preset

**Request Body:**
```json
{
  "role_id": "uuid",
  "preset_name": "Manager Default Layout",
  "is_default": true,
  "settings": {
    "menu": { ... },
    "grids": { ... }
  }
}
```

**Authorization:** Requires `system:admin` permission

**Business Logic:**
1. Validate role_id exists
2. If `is_default = true`, unset existing default for that role
3. Create preset
4. Return created preset

**Response:**
```json
{
  "id": "uuid",
  "role_id": "uuid",
  "preset_name": "Manager Default Layout",
  "is_default": true,
  "settings": { ... }
}
```

---

#### 3.2.6 Delete Preset

**Endpoint:** `DELETE /api/v1/system/ui-presets/:preset_id`

**Purpose:** Delete user's custom preset or admin deletes any preset

**Authorization:** User can delete own preset, admin can delete any

**Response:**
```json
{
  "message": "Preset deleted successfully"
}
```

**HTTP Status Codes:**
- `200 OK` - Preset deleted
- `403 Forbidden` - User doesn't own preset
- `404 Not Found` - Preset not found

---

### 3.3 User Management Endpoints (Enhanced)

**Base Path:** `/api/v1/system/admin/users`

#### 3.3.1 List Users (Enhanced)

**Endpoint:** `GET /api/v1/system/admin/users`

**Purpose:** List all users with status, roles, and approval state

**Query Parameters:**
- `status` (optional) - Filter by status (pending, approved, suspended)
- `role_id` (optional) - Filter by role
- `search` (optional) - Search by name or email
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Authorization:** Requires `users:read` permission (or root admin)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "is_root": false,
      "status": "pending",
      "roles": ["user"],
      "permissions": [],
      "avatar_url": null,
      "created_at": "2025-12-05T10:00:00Z",
      "last_login_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

---

#### 3.3.2 Approve User

**Endpoint:** `POST /api/v1/system/admin/users/:user_id/approve`

**Purpose:** Approve pending user and assign role/permissions

**Request Body:**
```json
{
  "role_id": "uuid",
  "permissions": ["posts:read", "posts:write", "channels:read"]
}
```

**Authorization:** Requires `users:approve` permission or root admin

**Business Logic:**
1. Verify user status is `pending`
2. Update user:
   - Set `status = 'approved'`
   - Assign role
   - Grant permissions
3. Activate user's UI preset
4. Send approval email to user
5. Return updated user

**Response:**
```json
{
  "id": "uuid",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "status": "approved",
  "roles": ["editor"],
  "permissions": ["posts:read", "posts:write", "channels:read"]
}
```

**HTTP Status Codes:**
- `200 OK` - User approved
- `400 Bad Request` - User not pending
- `404 Not Found` - User not found

---

#### 3.3.3 Suspend User

**Endpoint:** `POST /api/v1/system/admin/users/:user_id/suspend`

**Purpose:** Suspend user account (revoke access)

**Request Body:**
```json
{
  "reason": "Terms of service violation"
}
```

**Authorization:** Requires `users:suspend` permission or root admin

**Business Logic:**
1. Check user is not root admin (cannot suspend root admin)
2. Update `status = 'suspended'`
3. Revoke all active sessions/tokens
4. Send suspension email
5. Return updated user

**HTTP Status Codes:**
- `200 OK` - User suspended
- `403 Forbidden` - Cannot suspend root admin
- `404 Not Found` - User not found

---

#### 3.3.4 Update User Permissions

**Endpoint:** `PATCH /api/v1/system/admin/users/:user_id/permissions`

**Purpose:** Update user's permissions (root admin unaffected)

**Request Body:**
```json
{
  "permissions": ["posts:read", "posts:write", "posts:delete", "channels:read"]
}
```

**Authorization:** Requires `users:manage` permission or root admin

**Business Logic:**
1. If user is root admin, return warning (permissions don't apply to root admin)
2. Update user permissions
3. Invalidate user's cached permissions (if using cache)
4. Return updated user

**Response:**
```json
{
  "id": "uuid",
  "permissions": ["posts:read", "posts:write", "posts:delete", "channels:read"]
}
```

---

### 3.4 Internationalization Support Endpoints

**Base Path:** `/api/v1/system/i18n`

#### 3.4.1 Get Available Locales

**Endpoint:** `GET /api/v1/system/i18n/locales`

**Purpose:** Get list of supported locales with RTL info

**Response:**
```json
{
  "locales": [
    {
      "code": "en",
      "name": "English",
      "rtl": false,
      "enabled": true
    },
    {
      "code": "ar",
      "name": "العربية",
      "rtl": true,
      "enabled": false
    },
    {
      "code": "he",
      "name": "עברית",
      "rtl": true,
      "enabled": false
    }
  ]
}
```

---

#### 3.4.2 Get Translations (Future)

**Endpoint:** `GET /api/v1/system/i18n/translations/:locale`

**Purpose:** Get translation strings for locale (future implementation for dynamic translations)

**Response:**
```json
{
  "locale": "en",
  "translations": {
    "common.save": "Save",
    "common.cancel": "Cancel",
    "posts.title": "Posts"
  }
}
```

---

## 4. JWT Token Structure (Enhanced)

**Access Token Payload:**

```json
{
  "sub": "user_uuid",
  "email": "john@example.com",
  "name": "John Doe",
  "is_root": true,
  "status": "approved",
  "roles": ["root_admin"],
  "permissions": ["*"],
  "locale": "en",
  "timezone": "UTC",
  "iat": 1733400000,
  "exp": 1733486400
}
```

**Note:** Root admin has `permissions: ["*"]` or permission checks should skip for `is_root = true`

---

## 5. Permission System Enhancement

### 5.1 Root Admin Bypass

**Rule:** If `user.is_root = true`, skip ALL permission checks. Root admin always has access.

**Implementation in Permission Middleware:**

```javascript
function checkPermission(requiredPermission) {
  return (req, res, next) => {
    const user = req.user; // From JWT
    
    // Root admin bypasses all permission checks
    if (user.is_root) {
      return next();
    }
    
    // Check permission for non-root users
    if (!user.permissions.includes(requiredPermission)) {
      return res.status(403).json({
        errors: [{
          error_code: 'FORBIDDEN',
          error_description: 'You do not have permission to perform this action',
          error_severity: 'error'
        }]
      });
    }
    
    next();
  };
}
```

---

### 5.2 New Permissions

**Add these permissions to support new features:**

```
users:read          - View users list
users:approve       - Approve pending users
users:suspend       - Suspend users
users:manage        - Full user management
roles:read          - View roles
roles:manage        - Manage roles
ui-presets:read     - View UI presets
ui-presets:manage   - Manage UI presets (admin)
system:admin        - Full system administration
```

---

## 6. Business Rules Summary

### 6.1 User Registration & Approval

1. **First User:**
   - Automatically `is_root = true`
   - Status = `approved`
   - Role = `root_admin`
   - Full access immediately
   - Cannot be suspended or have permissions revoked

2. **Subsequent Users:**
   - `is_root = false`
   - Status = `pending`
   - Role = `user` (default)
   - No permissions until approved
   - Requires admin approval

3. **Approval Process:**
   - Admin reviews pending users
   - Admin assigns role and permissions
   - Status changes to `approved`
   - User receives approval email with login link

---

### 6.2 UI Preset Hierarchy

1. **User Custom Preset** (highest priority)
   - User modifies UI → Creates/updates custom preset
   - Cloned from role default on first modification

2. **Role Default Preset** (medium priority)
   - Admin creates preset for role
   - Applied to all users in role without custom preset

3. **Global Default Preset** (lowest priority)
   - System-wide default
   - Applied when no user/role preset exists

---

### 6.3 Permission Enforcement

1. **Root Admin:**
   - All permissions always granted
   - Cannot be modified
   - Cannot be suspended

2. **Regular Users:**
   - Permissions checked for every action
   - Permissions can be granted/revoked by admin
   - Menu items hidden if no permission

---

## 7. Migration Script

**File:** `migrations/YYYYMMDDHHMMSS_add_dashboard_enhancements.sql`

```sql
-- Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_root BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Add check constraint for status
ALTER TABLE users
ADD CONSTRAINT check_user_status CHECK (status IN ('pending', 'approved', 'suspended'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Create user_ui_stateful_presets table
CREATE TABLE IF NOT EXISTS user_ui_stateful_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    preset_name VARCHAR(255) NOT NULL,
    is_global BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_preset_owner CHECK (
        (user_id IS NOT NULL AND role_id IS NULL) OR
        (user_id IS NULL AND role_id IS NOT NULL) OR
        (user_id IS NULL AND role_id IS NULL AND is_global = TRUE)
    ),
    CONSTRAINT unique_user_preset_name UNIQUE (user_id, preset_name),
    CONSTRAINT unique_role_default_preset UNIQUE (role_id, is_default) WHERE is_default = TRUE
);

-- Create indexes for presets
CREATE INDEX IF NOT EXISTS idx_user_ui_presets_user_id ON user_ui_stateful_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ui_presets_role_id ON user_ui_stateful_presets(role_id);
CREATE INDEX IF NOT EXISTS idx_user_ui_presets_global ON user_ui_stateful_presets(is_global) WHERE is_global = TRUE;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_ui_presets_updated_at
BEFORE UPDATE ON user_ui_stateful_presets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles if not exist
INSERT INTO roles (name, description)
VALUES 
    ('root_admin', 'Root administrator with full permanent access'),
    ('user', 'Regular user with basic permissions')
ON CONFLICT (name) DO NOTHING;

-- Create global default UI preset
INSERT INTO user_ui_stateful_presets (preset_name, is_global, is_default, settings)
VALUES (
    'Global Default Layout',
    TRUE,
    TRUE,
    '{
      "menu": {
        "collapsed": false,
        "openedGroups": []
      },
      "grids": {},
      "components": {},
      "preferences": {
        "theme": "light",
        "locale": "en",
        "timezone": "UTC",
        "dateFormat": "YYYY-MM-DD",
        "compactMode": false
      }
    }'::jsonb
)
ON CONFLICT DO NOTHING;
```

---

## 8. Environment Variables (API)

**Add to `.env` file:**

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/system/auth/google/callback

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRATION=86400
JWT_REFRESH_EXPIRATION=604800

# Application
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@luxaris.com

# Feature Flags
ENABLE_GOOGLE_OAUTH=true
ENABLE_USER_APPROVAL_WORKFLOW=true
```

---

## 9. Implementation Priority

**Phase 1 - Core Authentication:**
1. ✅ Enhance `users` table with new columns
2. ✅ Implement root admin logic (first user)
3. ✅ Implement user approval workflow
4. ✅ Update JWT token structure
5. ✅ Update permission middleware

**Phase 2 - Google OAuth:**
1. ✅ Create OAuth endpoints
2. ✅ Implement Google OAuth flow
3. ✅ Handle OAuth callbacks
4. ✅ Link Google accounts to users

**Phase 3 - UI Presets:**
1. ✅ Create `user_ui_stateful_presets` table
2. ✅ Implement preset CRUD endpoints
3. ✅ Implement preset cloning logic
4. ✅ Create default presets

**Phase 4 - Admin Features:**
1. ✅ Enhance user management endpoints
2. ✅ Implement approval endpoints
3. ✅ Implement permission management
4. ✅ Add admin dashboard APIs

---

## 10. Testing Requirements

### 10.1 Unit Tests

- ✅ Root admin permission bypass
- ✅ User approval workflow
- ✅ Google OAuth token exchange
- ✅ Preset hierarchy resolution
- ✅ Preset cloning logic

### 10.2 Integration Tests

- ✅ First user registration → Root admin
- ✅ Second user registration → Pending approval
- ✅ Google OAuth complete flow
- ✅ Admin approves pending user
- ✅ User modifies UI → Preset auto-save
- ✅ Permission-based API access

### 10.3 E2E Tests

- ✅ Complete registration and approval flow
- ✅ Google OAuth login flow
- ✅ UI preset persistence across sessions
- ✅ Admin permission management

---

## 11. Security Considerations

1. **OAuth State Validation:** Always validate OAuth state parameter to prevent CSRF
2. **Root Admin Protection:** Root admin status cannot be revoked programmatically
3. **Token Security:** Store tokens securely, use HTTPS only
4. **Rate Limiting:** Apply rate limiting to auth endpoints
5. **Password Policy:** Enforce strong password requirements
6. **Session Management:** Implement session timeout and refresh token rotation
7. **Audit Logging:** Log all admin actions (approval, suspension, permission changes)

---

## 12. API Error Responses (Enhanced)

**Standard Error Format:**

```json
{
  "errors": [
    {
      "error_code": "USER_PENDING_APPROVAL",
      "error_description": "Your account is pending administrator approval. You will receive an email once approved.",
      "error_severity": "warning"
    }
  ]
}
```

**New Error Codes:**

- `USER_PENDING_APPROVAL` - User account not yet approved
- `USER_SUSPENDED` - User account is suspended
- `INVALID_OAUTH_STATE` - OAuth state validation failed
- `OAUTH_PROVIDER_ERROR` - Error communicating with OAuth provider
- `CANNOT_MODIFY_ROOT_ADMIN` - Cannot modify root admin user
- `PRESET_NOT_FOUND` - UI preset not found
- `INVALID_PRESET_SETTINGS` - Invalid preset settings structure

---

## Summary

This API design provides complete backend support for:

✅ **Google OAuth Login/Register** with first user as root admin  
✅ **User Approval Workflow** for subsequent registrations  
✅ **Root Admin Protection** with permission bypass  
✅ **UI Stateful Presets** with hierarchy (user → role → global)  
✅ **Permission-Based Access** with dynamic menu visibility  
✅ **Enhanced Authentication** with status tracking  
✅ **Internationalization Support** with RTL metadata  

**Next Steps:**
1. Review and approve API design
2. Implement database migrations
3. Develop API endpoints
4. Write tests
5. Integrate with dashboard frontend

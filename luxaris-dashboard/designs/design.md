# Luxaris Dashboard - General Design

**Version:** 1.0.0  
**Framework:** Vue 3.5.25 (Composition API)  
**Architecture:** Modular MVC + DDD + SPA  
**HTTP Client:** Luminara 1.2.2  
**Authentication:** JWT (via luxaris-api)  

---

## 1. Overview

The Luxaris Dashboard is a single-page application (SPA) that provides a comprehensive user interface for managing social media content across multiple platforms. It communicates with the luxaris-api backend via RESTful HTTP endpoints using JWT authentication.

### 1.1 Key Features

- **Multi-Channel Post Management** - Create, edit, schedule posts for X, LinkedIn, and other platforms
- **AI Content Generation** - Generate platform-optimized content using templates
- **Calendar View** - Visual schedule management with drag-and-drop
- **Channel Management** - Connect and manage social media accounts
- **User Administration** - Role-based access control and team management
- **Analytics Dashboard** - Publishing statistics and performance metrics

### 1.2 Design Inspiration

The dashboard follows a modern, clean design pattern with:
- **Left sidebar navigation** - Primary navigation with collapsible menu
- **Top bar** - User profile, notifications, search
- **Main content area** - Grid/list views with action panels
- **Right edit panel** - Slide-in forms for create/edit operations
- **Responsive layout** - Mobile-friendly with adaptive breakpoints

---

## 2. Architectural Principles

### 2.1 Modular MVC + Domain-Driven Design

The application is structured into **domain contexts** that mirror the luxaris-api backend:

```
src/
├── contexts/                    # Domain contexts (DDD)
│   ├── system/                 # Authentication, users, permissions
│   ├── posts/                  # Post management
│   ├── channels/               # Social platform connections
│   ├── generation/             # AI content generation
│   └── scheduling/             # Schedule management
├── core/                        # Shared infrastructure
│   ├── http/                   # Luminara HTTP client
│   ├── router/                 # Vue Router configuration
│   ├── store/                  # Pinia state management
│   └── auth/                   # JWT authentication
├── shared/                      # Shared utilities
│   ├── components/             # Reusable UI components
│   ├── composables/            # Vue composition functions
│   └── utils/                  # Helper functions
└── layouts/                     # Page layouts
    ├── DashboardLayout.vue     # Main dashboard layout
    ├── AuthLayout.vue          # Login/register layout
    └── BlankLayout.vue         # Minimal layout
```

### 2.2 Context Structure (MVC + DDD)

Each context follows a consistent structure:

```
contexts/posts/
├── domain/                      # Domain layer (business logic)
│   ├── models/                 # Domain models (Post, PostVariant)
│   └── rules/                  # Business rules and validations
├── application/                 # Application layer (use cases)
│   ├── services/               # Service classes
│   └── composables/            # Vue composables (use-cases)
├── infrastructure/              # Infrastructure layer (adapters)
│   ├── api/                    # API repositories
│   └── store/                  # Pinia stores
└── presentation/                # Presentation layer (UI)
    ├── views/                  # Page components
    ├── components/             # Feature-specific components
    └── routes.js               # Route definitions
```

### 2.3 Flow Pattern: Side Menu → Grid → Edit Panel → Save → Return

**Standard CRUD Flow:**

1. **Side Menu Navigation** - User clicks menu item (e.g., "Posts")
2. **Grid View** - List/grid of items with filters, search, pagination
3. **Edit Panel (Slide-in)** - Right-side panel opens for create/edit
4. **Save Action** - Submit to API, show loading state
5. **Return to Grid** - Panel closes, grid refreshes with new data

**Example: Create Post Flow**

```
1. Click "Posts" in sidebar
2. Grid loads with existing posts
3. Click "New Post" button
4. Right panel slides in with post form
5. User fills title, content, tags
6. Click "Save"
7. API call to POST /api/v1/posts
8. Success: Panel closes, grid refreshes
9. Error: Show validation messages in panel
```

---

## 3. Technology Stack

### 3.1 Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Vue.js** | 3.5.25 | UI framework (Composition API) |
| **Vue Router** | 4.x | SPA routing |
| **Pinia** | 2.x | State management |
| **Luminara** | 1.2.2 | HTTP client with retry/hedge strategies |
| **Vite** | 5.x | Build tool and dev server |
| **TypeScript** | 5.x | Type safety (optional, gradual adoption) |

### 3.2 UI Component Libraries

| Library | Purpose |
|---------|---------|
| **PrimeVue** or **Element Plus** | Component library (DataTable, Calendar, Forms) |
| **Tailwind CSS** | Utility-first CSS framework |
| **VueUse** | Collection of Vue composition utilities |
| **date-fns** or **Day.js** | Date/time manipulation |
| **Chart.js** or **Apache ECharts** | Charts and analytics |

### 3.3 Development Tools

- **ESLint** - Code linting with Vue plugin
- **Prettier** - Code formatting
- **Vitest** - Unit testing
- **Playwright** or **Cypress** - E2E testing

---

## 3.4 Internationalization (i18n) Configuration

**Multi-Language Support with RTL**

**File:** `src/core/i18n/index.js`

```javascript
import { createI18n } from 'vue-i18n';
import en from './locales/en.json';

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: 'en', // Default locale
  fallbackLocale: 'en',
  messages: {
    en
  },
  // RTL support
  rtl: {
    ar: true, // Arabic (future)
    he: true  // Hebrew (future)
  }
});

export default i18n;
```

**File:** `src/core/i18n/locales/en.json`

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "filter": "Filter",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "auth": {
    "login": "Login",
    "register": "Register",
    "logout": "Logout",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "name": "Name",
    "loginWithGoogle": "Login with Google",
    "registerWithGoogle": "Register with Google",
    "firstUserWillBeAdmin": "First registered user will be the root administrator",
    "pendingApproval": "Your account is pending administrator approval"
  },
  "posts": {
    "title": "Posts",
    "createPost": "Create Post",
    "editPost": "Edit Post",
    "deletePost": "Delete Post",
    "postTitle": "Post Title",
    "postContent": "Post Content",
    "tags": "Tags",
    "status": "Status",
    "draft": "Draft",
    "published": "Published"
  }
}
```

**RTL Layout Support:**

```javascript
// src/core/i18n/rtl.js
export function setupRTL(locale) {
  const isRTL = ['ar', 'he'].includes(locale);
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', locale);
}
```

**Usage in Components:**

```vue
<template>
  <div>
    <h1>{{ $t('posts.title') }}</h1>
    <Button :label="$t('posts.createPost')" @click="create" />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

// Access translations
console.log(t('posts.title'));

// Change locale
locale.value = 'en';
</script>
```

---

## 3.5 UI Stateful Presets System

**Purpose:** Persist user UI preferences (grid column order, component visibility, menu state, filters, etc.)

### Architecture

**Storage Flow:**
1. Admin creates default preset for role/user
2. User loads preset on login
3. User modifies UI (reorder columns, change filters, etc.)
4. System auto-saves changes to user's private preset
5. On next login, user's custom preset is loaded

**Data Structure:**

```javascript
// UI Stateful Preset Model
{
  id: 'uuid',
  user_id: 'uuid', // null for global/role presets
  role_id: 'uuid', // null for user-specific presets
  preset_name: 'My Custom Layout',
  is_global: false,
  is_default: false,
  settings: {
    // Main menu state
    menu: {
      collapsed: false,
      openedGroups: ['posts', 'channels']
    },
    
    // Grid configurations per view
    grids: {
      'posts-grid': {
        columns: [
          { field: 'title', order: 1, visible: true, width: 300 },
          { field: 'status', order: 2, visible: true, width: 120 },
          { field: 'created_at', order: 3, visible: true, width: 180 },
          { field: 'tags', order: 4, visible: false, width: 200 }
        ],
        filters: {
          status: 'draft',
          search: '',
          tags: []
        },
        sorting: {
          field: 'created_at',
          order: 'desc'
        },
        pageSize: 20
      },
      'schedules-grid': {
        columns: [...],
        filters: {...}
      }
    },
    
    // Component visibility
    components: {
      'dashboard-widgets': {
        'recent-posts': { visible: true, order: 1 },
        'schedule-calendar': { visible: true, order: 2 },
        'analytics-chart': { visible: false, order: 3 }
      }
    },
    
    // User preferences
    preferences: {
      theme: 'light', // light, dark
      locale: 'en',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      compactMode: false
    }
  },
  created_at: '2025-12-05T10:00:00Z',
  updated_at: '2025-12-05T12:30:00Z'
}
```

### Implementation

**File:** `src/core/presets/presetManager.js`

```javascript
import apiClient from '@/core/http/client';
import { debounce } from 'lodash-es';

export class PresetManager {
  constructor() {
    this.currentPreset = null;
    this.autoSaveEnabled = true;
    this.saveDelay = 2000; // 2 seconds debounce
  }
  
  // Load user's preset on login
  async loadUserPreset(userId) {
    try {
      const preset = await apiClient.get(`/system/users/${userId}/ui-preset`);
      this.currentPreset = preset;
      this.applyPreset(preset);
      return preset;
    } catch (error) {
      console.error('Failed to load user preset:', error);
      // Load default preset
      return this.loadDefaultPreset();
    }
  }
  
  // Apply preset settings to UI
  applyPreset(preset) {
    if (!preset?.settings) return;
    
    // Apply menu state
    if (preset.settings.menu) {
      const menuStore = useMenuStore();
      menuStore.setCollapsed(preset.settings.menu.collapsed);
      menuStore.setOpenedGroups(preset.settings.menu.openedGroups);
    }
    
    // Grid and component settings applied when views mount
    // Store preset in Pinia for components to access
    const presetStore = usePresetStore();
    presetStore.setCurrentPreset(preset);
  }
  
  // Update specific setting and auto-save
  updateSetting(path, value) {
    if (!this.currentPreset) return;
    
    // Update nested setting using path (e.g., 'grids.posts-grid.filters.status')
    this.setNestedValue(this.currentPreset.settings, path, value);
    
    // Auto-save with debounce
    if (this.autoSaveEnabled) {
      this.debouncedSave();
    }
  }
  
  // Debounced save to API
  debouncedSave = debounce(async () => {
    try {
      await this.savePreset();
    } catch (error) {
      console.error('Failed to auto-save preset:', error);
    }
  }, this.saveDelay);
  
  // Save current preset to API
  async savePreset() {
    if (!this.currentPreset) return;
    
    try {
      const updated = await apiClient.patch(
        `/system/ui-presets/${this.currentPreset.id}`,
        { settings: this.currentPreset.settings }
      );
      this.currentPreset = updated;
      return updated;
    } catch (error) {
      throw error;
    }
  }
  
  // Clone admin preset for user customization
  async clonePreset(sourcePresetId, userId) {
    try {
      const cloned = await apiClient.post(
        `/system/ui-presets/${sourcePresetId}/clone`,
        { user_id: userId }
      );
      return cloned;
    } catch (error) {
      throw error;
    }
  }
  
  // Helper to set nested object value
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
    target[lastKey] = value;
  }
}

export const presetManager = new PresetManager();
```

**Pinia Store for Presets:**

**File:** `src/core/store/presetStore.js`

```javascript
import { defineStore } from 'pinia';
import { presetManager } from '@/core/presets/presetManager';

export const usePresetStore = defineStore('preset', {
  state: () => ({
    currentPreset: null,
    loading: false
  }),
  
  getters: {
    getGridSettings: (state) => (gridId) => {
      return state.currentPreset?.settings?.grids?.[gridId] || null;
    },
    
    getMenuSettings: (state) => {
      return state.currentPreset?.settings?.menu || {};
    },
    
    getPreferences: (state) => {
      return state.currentPreset?.settings?.preferences || {};
    }
  },
  
  actions: {
    async loadPreset(userId) {
      this.loading = true;
      try {
        const preset = await presetManager.loadUserPreset(userId);
        this.currentPreset = preset;
      } finally {
        this.loading = false;
      }
    },
    
    setCurrentPreset(preset) {
      this.currentPreset = preset;
    },
    
    updateSetting(path, value) {
      presetManager.updateSetting(path, value);
    }
  }
});
```

**Usage in Grid Component:**

```vue
<template>
  <DataTable
    :value="posts"
    :columns="visibleColumns"
    @column-reorder="handleColumnReorder"
    @filter="handleFilter"
  >
    <!-- columns -->
  </DataTable>
</template>

<script setup>
import { computed, watch } from 'vue';
import { usePresetStore } from '@/core/store/presetStore';

const presetStore = usePresetStore();
const gridId = 'posts-grid';

// Load saved grid settings
const gridSettings = computed(() => presetStore.getGridSettings(gridId));

// Apply saved column configuration
const visibleColumns = computed(() => {
  if (!gridSettings.value?.columns) return defaultColumns;
  
  return gridSettings.value.columns
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order);
});

// Save column reorder
function handleColumnReorder(event) {
  const newColumnOrder = event.columns.map((col, index) => ({
    ...col,
    order: index + 1
  }));
  
  presetStore.updateSetting(`grids.${gridId}.columns`, newColumnOrder);
}

// Save filter changes
function handleFilter(event) {
  presetStore.updateSetting(`grids.${gridId}.filters`, event.filters);
}
</script>
```

---

## 4. HTTP Client Configuration (Luminara)

### 4.1 Luminara Setup

**File:** `src/core/http/client.js`

```javascript
import { Luminara } from 'luminara';

const apiClient = new Luminara({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
    timeout: 30000,
    
    // Retry strategy for transient failures
    retry: {
        enabled: true,
        maxRetries: 3,
        retryDelay: (attemptNumber) => Math.min(1000 * Math.pow(2, attemptNumber), 10000),
        retryOn: [408, 429, 500, 502, 503, 504], // Retry on these status codes
        shouldRetry: (error) => {
            // Retry on network errors
            return error.code === 'ECONNABORTED' || !error.response;
        }
    },
    
    // Hedging strategy for critical read operations
    hedge: {
        enabled: true,
        hedgeDelay: 2000, // Send duplicate request after 2s
        maxHedges: 1,
        hedgeOn: ['GET'], // Only hedge GET requests
        shouldHedge: (config) => {
            // Hedge critical read operations
            return config.url?.includes('/posts') || 
                   config.url?.includes('/schedules') ||
                   config.url?.includes('/channels');
        }
    },
    
    // Request interceptors
    interceptors: {
        request: (config) => {
            // Add JWT token to headers
            const token = localStorage.getItem('access_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        
        response: (response) => {
            return response.data;
        },
        
        error: async (error) => {
            // Handle 401 - Refresh token
            if (error.response?.status === 401) {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    // Retry original request
                    return apiClient.request(error.config);
                }
                // Redirect to login
                router.push('/login');
            }
            
            // Handle 403 - Forbidden
            if (error.response?.status === 403) {
                // Show permission error
                showNotification('error', 'You do not have permission to perform this action');
            }
            
            throw error;
        }
    }
});

export default apiClient;
```

### 4.2 Retry Strategy Application

**Use retry for:**
- POST/PUT/PATCH requests (create, update operations)
- Network failures
- Server errors (5xx)
- Rate limiting (429)

**Example: Create Post with Retry**

```javascript
// POST /api/v1/posts
// Will retry up to 3 times on failure
await apiClient.post('/posts', postData);
```

### 4.3 Hedge Strategy Application

**Use hedging for:**
- Critical GET requests (posts, schedules, channels)
- Dashboard data loading
- Calendar view data

**Example: Load Posts with Hedging**

```javascript
// GET /api/v1/posts
// Will send duplicate request after 2s if no response
const posts = await apiClient.get('/posts', {
    params: { status: 'draft', page: 1, limit: 20 }
});
```

---

## 5. Authentication & Authorization

### 5.1 Initial Landing & Registration Rules

**Application Entry:**
- **Unauthenticated users** are redirected to `/login` or `/register` page
- **First registered user** automatically becomes **root administrator** with permanent admin rights
- **Subsequent users** are created with status `pending` and require admin approval
- Users pending approval see message: "Your account is pending administrator approval"

**Root Admin Rules:**
- First user is permanently root admin
- Root admin status cannot be revoked
- Permissions do not apply to root admin (full access always)
- Root admin can approve/reject pending users
- Root admin can grant/revoke permissions to other users

### 5.2 JWT Token Management

**Storage:**
- `access_token` - localStorage (short-lived, 24h)
- `refresh_token` - localStorage (long-lived, 7d)
- User profile - Pinia store

**Authentication Flows:**

**1. Email/Password Login** - POST `/api/v1/system/auth/login`
   - User enters email and password
   - Receive `access_token` and `refresh_token`
   - Store in localStorage
   - Decode JWT to get user info and permissions
   - Store user in Pinia store
   - Load user UI preset
   - Redirect to dashboard

**2. Email/Password Registration** - POST `/api/v1/system/auth/register`
   - User enters name, email, password
   - API checks if first user:
     - **First user:** Status = `approved`, Role = `root_admin`, auto-login
     - **Subsequent users:** Status = `pending`, Role = `user`, show pending message
   - Store tokens if approved
   - Redirect accordingly

**3. Google OAuth Login/Register** - OAuth 2.0 Flow
   
   **Flow Steps:**
   - User clicks "Login with Google" or "Register with Google"
   - Redirect to: `GET /api/v1/system/auth/google`
   - API redirects to Google OAuth consent screen
   - User authorizes application
   - Google redirects back to: `GET /api/v1/system/auth/google/callback?code=xxx&state=xxx`
   - API validates state, exchanges code for Google tokens
   - API checks if user exists by Google ID or email:
     - **Existing user:** Generate JWT tokens, return
     - **New user (first):** Create with status `approved`, role `root_admin`, return tokens
     - **New user (subsequent):** Create with status `pending`, show pending message
   - Frontend receives tokens or pending status
   - Store tokens if approved
   - Load user UI preset
   - Redirect to dashboard or show pending page

   **API Endpoints:**
   ```
   GET  /api/v1/system/auth/google           - Initiate Google OAuth
   GET  /api/v1/system/auth/google/callback  - Handle OAuth callback
   ```

**4. Authenticated Request** - Every API call
   - Luminara interceptor adds `Authorization: Bearer {token}`
   - If 401 response, attempt token refresh

**5. Token Refresh** - Automatic on 401
   - POST `/api/v1/system/auth/refresh` with `refresh_token`
   - Update `access_token`
   - Retry original request

**6. Logout** - POST `/api/v1/system/auth/logout`
   - Revoke tokens on server
   - Clear localStorage
   - Clear Pinia store
   - Redirect to login

### 5.3 Route Guards

**File:** `src/core/router/guards.js`

```javascript
export function setupRouteGuards(router) {
    router.beforeEach(async (to, from, next) => {
        const authStore = useAuthStore();
        const presetStore = usePresetStore();
        
        // Check if route requires authentication
        if (to.meta.requiresAuth && !authStore.isAuthenticated) {
            return next('/login');
        }
        
        // Load user preset on first authenticated navigation
        if (authStore.isAuthenticated && !presetStore.currentPreset) {
            await presetStore.loadPreset(authStore.user.id);
        }
        
        // Root admin bypasses all permission checks
        if (authStore.isRootAdmin) {
            return next();
        }
        
        // Check permissions for non-root users
        if (to.meta.permissions) {
            const hasPermission = authStore.hasAnyPermission(to.meta.permissions);
            if (!hasPermission) {
                return next('/403'); // Forbidden
            }
        }
        
        // Check roles
        if (to.meta.roles) {
            const hasRole = authStore.hasRole(to.meta.roles);
            if (!hasRole) {
                return next('/403');
            }
        }
        
        next();
    });
}
```

### 5.4 Permission Checks in UI

**Enhanced Permission System:**

**File:** `src/shared/composables/usePermissions.js`

```javascript
import { computed } from 'vue';
import { useAuthStore } from '@/contexts/system/infrastructure/store/authStore';

export function usePermissions() {
  const authStore = useAuthStore();
  
  // Root admin always has permission
  const isRootAdmin = computed(() => authStore.isRootAdmin);
  
  // Check single permission
  function can(permission) {
    if (isRootAdmin.value) return true;
    return authStore.hasPermission(permission);
  }
  
  // Check any of multiple permissions (OR logic)
  function canAny(permissions) {
    if (isRootAdmin.value) return true;
    return permissions.some(p => authStore.hasPermission(p));
  }
  
  // Check all permissions (AND logic)
  function canAll(permissions) {
    if (isRootAdmin.value) return true;
    return permissions.every(p => authStore.hasPermission(p));
  }
  
  return {
    can,
    canAny,
    canAll,
    isRootAdmin
  };
}
```

**Usage in Components:**

```vue
<template>
  <div>
    <!-- Show delete button only if user has permission -->
    <Button 
      v-if="can('posts:delete')"
      :label="$t('common.delete')"
      icon="pi pi-trash"
      severity="danger"
      @click="deletePost(post.id)"
    />
    
    <!-- Show admin panel if user can manage users OR roles -->
    <Panel v-if="canAny(['users:manage', 'roles:manage'])">
      <!-- Admin content -->
    </Panel>
  </div>
</template>

<script setup>
import { usePermissions } from '@/shared/composables/usePermissions';

const { can, canAny } = usePermissions();
</script>
```

**Permission-Based Menu Visibility:**

**File:** `src/layouts/components/SidebarNav.vue`

```vue
<template>
  <PanelMenu :model="visibleMenuItems" />
</template>

<script setup>
import { computed } from 'vue';
import { usePermissions } from '@/shared/composables/usePermissions';
import { useI18n } from 'vue-i18n';

const { can, isRootAdmin } = usePermissions();
const { t } = useI18n();

// Define all menu items with required permissions
const allMenuItems = [
  {
    label: t('menu.dashboard'),
    icon: 'pi pi-home',
    to: '/dashboard',
    permissions: [] // No permissions needed
  },
  {
    label: t('menu.posts'),
    icon: 'pi pi-file',
    to: '/dashboard/posts',
    permissions: ['posts:read']
  },
  {
    label: t('menu.channels'),
    icon: 'pi pi-share-alt',
    to: '/dashboard/channels',
    permissions: ['channels:read']
  },
  {
    label: t('menu.schedules'),
    icon: 'pi pi-calendar',
    to: '/dashboard/schedules',
    permissions: ['schedules:read']
  },
  {
    label: t('menu.templates'),
    icon: 'pi pi-clone',
    to: '/dashboard/templates',
    permissions: ['templates:read']
  },
  {
    label: t('menu.administration'),
    icon: 'pi pi-cog',
    items: [
      {
        label: t('menu.users'),
        icon: 'pi pi-users',
        to: '/dashboard/admin/users',
        permissions: ['users:read'] // Regular users won't see this
      },
      {
        label: t('menu.roles'),
        icon: 'pi pi-shield',
        to: '/dashboard/admin/roles',
        permissions: ['roles:read']
      },
      {
        label: t('menu.featureFlags'),
        icon: 'pi pi-flag',
        to: '/dashboard/admin/feature-flags',
        permissions: ['system:admin']
      },
      {
        label: t('menu.health'),
        icon: 'pi pi-heart',
        to: '/dashboard/admin/health',
        permissions: ['system:admin']
      }
    ]
  }
];

// Filter menu items based on permissions
const visibleMenuItems = computed(() => {
  return filterMenuItems(allMenuItems);
});

function filterMenuItems(items) {
  return items.filter(item => {
    // Root admin sees everything
    if (isRootAdmin.value) return true;
    
    // Check permissions
    if (item.permissions && item.permissions.length > 0) {
      const hasPermission = item.permissions.some(p => can(p));
      if (!hasPermission) return false;
    }
    
    // Filter child items recursively
    if (item.items && item.items.length > 0) {
      item.items = filterMenuItems(item.items);
      // Hide parent if no visible children
      if (item.items.length === 0) return false;
    }
    
    return true;
  });
}
</script>
```

---

## 6. State Management (Pinia)

### 6.1 Store Structure

Each context has its own Pinia store:

```
src/contexts/posts/infrastructure/store/
├── postsStore.js           # Posts list, filters, pagination
├── postEditorStore.js      # Currently editing post
└── postVariantsStore.js    # Variants for current post

src/contexts/system/infrastructure/store/
├── authStore.js            # Authentication, user, permissions
└── usersStore.js           # Users management

src/core/store/
├── presetStore.js          # UI stateful presets
└── notificationStore.js    # Toast notifications
```

### 6.1.1 Authentication Store (Enhanced)

**File:** `src/contexts/system/infrastructure/store/authStore.js`

```javascript
import { defineStore } from 'pinia';
import { authApi } from '../api/authApi';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    accessToken: localStorage.getItem('access_token'),
    refreshToken: localStorage.getItem('refresh_token'),
    permissions: [],
    roles: []
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
    
    // Check if user is root admin (first registered user)
    isRootAdmin: (state) => {
      return state.user?.is_root_admin === true || 
             state.roles.includes('root_admin');
    },
    
    // Check if user is approved
    isApproved: (state) => {
      return state.user?.status === 'approved';
    },
    
    // Check if user is pending approval
    isPending: (state) => {
      return state.user?.status === 'pending';
    },
    
    userFullName: (state) => state.user?.name || 'Unknown User'
  },
  
  actions: {
    // Email/Password Login
    async login(credentials) {
      try {
        const response = await authApi.login(credentials);
        this.setAuthData(response);
        return response;
      } catch (error) {
        throw error;
      }
    },
    
    // Email/Password Register
    async register(userData) {
      try {
        const response = await authApi.register(userData);
        
        // If first user (root admin) or approved, set auth data
        if (response.user.status === 'approved') {
          this.setAuthData(response);
        } else {
          // User is pending approval
          this.user = response.user;
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    },
    
    // Google OAuth Login/Register
    async loginWithGoogle() {
      try {
        // Redirect to Google OAuth endpoint
        const authUrl = await authApi.getGoogleAuthUrl();
        window.location.href = authUrl;
      } catch (error) {
        throw error;
      }
    },
    
    // Handle Google OAuth Callback
    async handleGoogleCallback(code, state) {
      try {
        const response = await authApi.googleCallback(code, state);
        
        if (response.user.status === 'approved') {
          this.setAuthData(response);
        } else {
          this.user = response.user;
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    },
    
    // Set authentication data
    setAuthData(data) {
      this.user = data.user;
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.permissions = data.permissions || [];
      this.roles = data.roles || [];
      
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
    },
    
    // Refresh access token
    async refreshAccessToken() {
      try {
        const response = await authApi.refreshToken(this.refreshToken);
        this.accessToken = response.access_token;
        localStorage.setItem('access_token', response.access_token);
        return response.access_token;
      } catch (error) {
        this.logout();
        throw error;
      }
    },
    
    // Logout
    async logout() {
      try {
        await authApi.logout();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        this.clearAuthData();
      }
    },
    
    // Clear authentication data
    clearAuthData() {
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;
      this.permissions = [];
      this.roles = [];
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    },
    
    // Check single permission
    hasPermission(permission) {
      // Root admin always has permission
      if (this.isRootAdmin) return true;
      return this.permissions.includes(permission);
    },
    
    // Check any permission (OR logic)
    hasAnyPermission(permissions) {
      if (this.isRootAdmin) return true;
      return permissions.some(p => this.permissions.includes(p));
    },
    
    // Check all permissions (AND logic)
    hasAllPermissions(permissions) {
      if (this.isRootAdmin) return true;
      return permissions.every(p => this.permissions.includes(p));
    },
    
    // Check role
    hasRole(role) {
      return this.roles.includes(role);
    }
  }
});
```

### 6.2 Example: Posts Store

**File:** `src/contexts/posts/infrastructure/store/postsStore.js`

```javascript
import { defineStore } from 'pinia';
import { postsApi } from '../api/postsApi';

export const usePostsStore = defineStore('posts', {
    state: () => ({
        posts: [],
        currentPost: null,
        filters: {
            status: null,
            search: '',
            tags: []
        },
        pagination: {
            page: 1,
            limit: 20,
            total: 0
        },
        loading: false,
        error: null
    }),
    
    getters: {
        filteredPosts: (state) => {
            // Client-side filtering if needed
            return state.posts;
        },
        
        hasMore: (state) => {
            const { page, limit, total } = state.pagination;
            return page * limit < total;
        }
    },
    
    actions: {
        async fetchPosts() {
            this.loading = true;
            this.error = null;
            
            try {
                const response = await postsApi.list({
                    ...this.filters,
                    page: this.pagination.page,
                    limit: this.pagination.limit
                });
                
                this.posts = response.data;
                this.pagination.total = response.pagination.total;
            } catch (error) {
                this.error = error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        },
        
        async createPost(postData) {
            try {
                const newPost = await postsApi.create(postData);
                this.posts.unshift(newPost);
                return newPost;
            } catch (error) {
                throw error;
            }
        },
        
        async updatePost(postId, updates) {
            try {
                const updated = await postsApi.update(postId, updates);
                const index = this.posts.findIndex(p => p.id === postId);
                if (index !== -1) {
                    this.posts[index] = updated;
                }
                return updated;
            } catch (error) {
                throw error;
            }
        },
        
        async deletePost(postId) {
            try {
                await postsApi.delete(postId);
                this.posts = this.posts.filter(p => p.id !== postId);
            } catch (error) {
                throw error;
            }
        },
        
        setFilters(filters) {
            this.filters = { ...this.filters, ...filters };
            this.pagination.page = 1; // Reset to first page
            this.fetchPosts();
        }
    }
});
```

---

## 7. Routing Structure

### 7.1 Route Organization

**File:** `src/core/router/index.js`

```javascript
import { createRouter, createWebHistory } from 'vue-router';
import { setupRouteGuards } from './guards';

// Import context routes
import systemRoutes from '@/contexts/system/presentation/routes';
import postsRoutes from '@/contexts/posts/presentation/routes';
import channelsRoutes from '@/contexts/channels/presentation/routes';
import generationRoutes from '@/contexts/generation/presentation/routes';
import schedulingRoutes from '@/contexts/scheduling/presentation/routes';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            redirect: '/dashboard'
        },
        {
            path: '/login',
            component: () => import('@/contexts/system/presentation/views/LoginView.vue'),
            meta: { layout: 'auth' }
        },
        {
            path: '/dashboard',
            component: () => import('@/layouts/DashboardLayout.vue'),
            meta: { requiresAuth: true },
            children: [
                {
                    path: '',
                    name: 'dashboard',
                    component: () => import('@/contexts/system/presentation/views/DashboardView.vue')
                },
                ...systemRoutes,
                ...postsRoutes,
                ...channelsRoutes,
                ...generationRoutes,
                ...schedulingRoutes
            ]
        },
        {
            path: '/403',
            component: () => import('@/shared/views/ForbiddenView.vue')
        },
        {
            path: '/:pathMatch(.*)*',
            component: () => import('@/shared/views/NotFoundView.vue')
        }
    ]
});

setupRouteGuards(router);

export default router;
```

### 7.2 Example: Posts Routes

**File:** `src/contexts/posts/presentation/routes.js`

```javascript
export default [
    {
        path: 'posts',
        name: 'posts',
        component: () => import('./views/PostsView.vue'),
        meta: { 
            requiresAuth: true,
            permissions: ['posts:read']
        }
    },
    {
        path: 'posts/:id',
        name: 'post-detail',
        component: () => import('./views/PostDetailView.vue'),
        meta: { 
            requiresAuth: true,
            permissions: ['posts:read']
        }
    }
];
```

---

## 8. UI Component Architecture

### 8.1 Layout Components

**DashboardLayout.vue** - Main application layout

```
┌─────────────────────────────────────────────┐
│  TopBar (user, notifications, search)       │
├──────┬──────────────────────────────────────┤
│      │                                       │
│ Side │  Main Content Area                    │
│ Nav  │  (router-view)                        │
│      │                                       │
│      │                                       │
└──────┴──────────────────────────────────────┘
```

**Components:**
- `<SidebarNav />` - Left navigation menu
- `<TopBar />` - Header with user menu
- `<MainContent />` - Content area with breadcrumbs
- `<NotificationCenter />` - Toast notifications

### 8.2 Standard View Pattern

**PostsView.vue** - Grid with edit panel

```
┌─────────────────────────────────┬──────────┐
│ Filters & Actions               │          │
│ ┌─────────────────────────────┐ │          │
│ │  Search: [________]  [+New] │ │          │
│ │  Status: [All ▼]            │ │          │
│ └─────────────────────────────┘ │          │
│                                 │  Edit    │
│ Posts Grid                      │  Panel   │
│ ┌─────────────┬─────────────┐  │  (slide) │
│ │ Post 1      │ Post 2      │  │          │
│ │ [Edit] [Del]│ [Edit] [Del]│  │          │
│ └─────────────┴─────────────┘  │          │
│ ┌─────────────┬─────────────┐  │          │
│ │ Post 3      │ Post 4      │  │          │
│ └─────────────┴─────────────┘  │          │
│                                 │          │
│ Pagination: [1] 2 3 ... [Next] │          │
└─────────────────────────────────┴──────────┘
```

**Structure:**

```vue
<template>
    <div class="posts-view">
        <!-- Toolbar -->
        <div class="toolbar">
            <SearchInput v-model="search" />
            <FilterDropdown v-model="statusFilter" />
            <Button @click="openCreatePanel">New Post</Button>
        </div>
        
        <!-- Grid -->
        <PostsGrid 
            :posts="posts" 
            :loading="loading"
            @edit="openEditPanel"
            @delete="confirmDelete"
        />
        
        <!-- Pagination -->
        <Pagination 
            v-model="page"
            :total="total"
            :per-page="perPage"
        />
        
        <!-- Edit Panel (slide-in from right) -->
        <EditPanel 
            v-model:visible="showPanel"
            :post="currentPost"
            @save="handleSave"
        />
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { usePostsStore } from '@/contexts/posts/infrastructure/store/postsStore';
import { usePosts } from '@/contexts/posts/application/composables/usePosts';

const postsStore = usePostsStore();
const { 
    posts, 
    loading, 
    fetchPosts, 
    createPost, 
    updatePost, 
    deletePost 
} = usePosts();

const showPanel = ref(false);
const currentPost = ref(null);

onMounted(() => {
    fetchPosts();
});

function openCreatePanel() {
    currentPost.value = null;
    showPanel.value = true;
}

function openEditPanel(post) {
    currentPost.value = post;
    showPanel.value = true;
}

async function handleSave(postData) {
    if (currentPost.value) {
        await updatePost(currentPost.value.id, postData);
    } else {
        await createPost(postData);
    }
    showPanel.value = false;
    fetchPosts();
}
</script>
```

---

## 9. API Integration Layer

### 9.1 Repository Pattern

Each domain has API repositories that encapsulate HTTP calls:

**File:** `src/contexts/posts/infrastructure/api/postsApi.js`

```javascript
import apiClient from '@/core/http/client';

export const postsApi = {
    /**
     * List posts with filters and pagination
     * GET /api/v1/posts
     */
    async list(params) {
        return await apiClient.get('/posts', { params });
    },
    
    /**
     * Get single post by ID
     * GET /api/v1/posts/:id
     */
    async get(postId) {
        return await apiClient.get(`/posts/${postId}`);
    },
    
    /**
     * Create new post
     * POST /api/v1/posts
     */
    async create(postData) {
        return await apiClient.post('/posts', postData);
    },
    
    /**
     * Update existing post
     * PATCH /api/v1/posts/:id
     */
    async update(postId, updates) {
        return await apiClient.patch(`/posts/${postId}`, updates);
    },
    
    /**
     * Delete post
     * DELETE /api/v1/posts/:id
     */
    async delete(postId) {
        return await apiClient.delete(`/posts/${postId}`);
    }
};
```

### 9.2 Composable Pattern (Use Cases)

**File:** `src/contexts/posts/application/composables/usePosts.js`

```javascript
import { ref, computed } from 'vue';
import { usePostsStore } from '../../infrastructure/store/postsStore';
import { postsApi } from '../../infrastructure/api/postsApi';

export function usePosts() {
    const store = usePostsStore();
    const loading = ref(false);
    const error = ref(null);
    
    const posts = computed(() => store.posts);
    const currentPost = computed(() => store.currentPost);
    
    async function fetchPosts(filters = {}) {
        loading.value = true;
        error.value = null;
        
        try {
            await store.fetchPosts(filters);
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    }
    
    async function createPost(postData) {
        try {
            const newPost = await store.createPost(postData);
            return newPost;
        } catch (err) {
            error.value = err.message;
            throw err;
        }
    }
    
    async function updatePost(postId, updates) {
        try {
            const updated = await store.updatePost(postId, updates);
            return updated;
        } catch (err) {
            error.value = err.message;
            throw err;
        }
    }
    
    async function deletePost(postId) {
        try {
            await store.deletePost(postId);
        } catch (err) {
            error.value = err.message;
            throw err;
        }
    }
    
    return {
        posts,
        currentPost,
        loading,
        error,
        fetchPosts,
        createPost,
        updatePost,
        deletePost
    };
}
```

---

## 10. Domain Models

### 10.1 Client-Side Domain Models

**File:** `src/contexts/posts/domain/models/Post.js`

```javascript
export class Post {
    constructor(data = {}) {
        this.id = data.id || null;
        this.owner_principal_id = data.owner_principal_id || null;
        this.title = data.title || '';
        this.content = data.content || '';
        this.tags = data.tags || [];
        this.status = data.status || 'draft';
        this.created_at = data.created_at ? new Date(data.created_at) : null;
        this.updated_at = data.updated_at ? new Date(data.updated_at) : null;
        this.published_at = data.published_at ? new Date(data.published_at) : null;
        this.variants = data.variants || [];
    }
    
    // Business logic methods
    isDraft() {
        return this.status === 'draft';
    }
    
    isPublished() {
        return this.status === 'published';
    }
    
    hasVariants() {
        return this.variants.length > 0;
    }
    
    canEdit() {
        return this.status === 'draft';
    }
    
    canDelete() {
        return this.status !== 'published';
    }
    
    // Validation
    validate() {
        const errors = [];
        
        if (!this.title || this.title.trim().length === 0) {
            errors.push('Title is required');
        }
        
        if (this.title.length > 200) {
            errors.push('Title must be less than 200 characters');
        }
        
        if (!this.content || this.content.trim().length === 0) {
            errors.push('Content is required');
        }
        
        return errors;
    }
    
    // Serialization for API
    toJSON() {
        return {
            title: this.title,
            content: this.content,
            tags: this.tags,
            status: this.status
        };
    }
}
```

---

## 11. Error Handling

### 11.1 Global Error Handler

**File:** `src/core/errors/errorHandler.js`

```javascript
import { useNotificationStore } from '@/shared/store/notificationStore';

export function setupGlobalErrorHandler(app) {
    app.config.errorHandler = (err, instance, info) => {
        console.error('Global error:', err, info);
        
        const notificationStore = useNotificationStore();
        notificationStore.error({
            title: 'Error',
            message: err.message || 'An unexpected error occurred'
        });
    };
}
```

### 11.2 API Error Handling

**Structured Error Response from API:**

```json
{
    "errors": [
        {
            "error_code": "VALIDATION_ERROR",
            "error_description": "Title is required",
            "error_severity": "error"
        }
    ]
}
```

**Client-side Error Handling:**

```javascript
async function handleSave(postData) {
    try {
        await createPost(postData);
        showNotification('success', 'Post created successfully');
    } catch (error) {
        if (error.response?.data?.errors) {
            // API validation errors
            const errors = error.response.data.errors;
            errors.forEach(err => {
                showNotification('error', err.error_description);
            });
        } else {
            // Generic error
            showNotification('error', 'Failed to create post');
        }
    }
}
```

---

## 12. Shared Components

### 12.1 Core UI Components

**Location:** `src/shared/components/`

| Component | Purpose |
|-----------|---------|
| `<DataGrid>` | Sortable, filterable grid/table |
| `<EditPanel>` | Slide-in panel for forms |
| `<FormField>` | Reusable form field with validation |
| `<Modal>` | Confirmation dialogs |
| `<Notification>` | Toast notifications |
| `<LoadingSpinner>` | Loading indicators |
| `<EmptyState>` | Empty state placeholder |
| `<Pagination>` | Page navigation |
| `<SearchInput>` | Debounced search input |
| `<FilterDropdown>` | Multi-select filter |
| `<DatePicker>` | Date/time picker with timezone |
| `<TagInput>` | Tag management input |

### 12.2 Example: EditPanel Component

**File:** `src/shared/components/EditPanel.vue`

```vue
<template>
    <Transition name="slide-right">
        <div v-if="visible" class="edit-panel-overlay" @click="close">
            <div class="edit-panel" @click.stop>
                <!-- Header -->
                <div class="panel-header">
                    <h2>{{ title }}</h2>
                    <button @click="close" class="close-btn">×</button>
                </div>
                
                <!-- Content -->
                <div class="panel-content">
                    <slot />
                </div>
                
                <!-- Footer -->
                <div class="panel-footer">
                    <Button variant="secondary" @click="close">
                        Cancel
                    </Button>
                    <Button variant="primary" @click="handleSave" :loading="saving">
                        Save
                    </Button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
    visible: Boolean,
    title: String,
    saving: Boolean
});

const emit = defineEmits(['update:visible', 'save']);

function close() {
    emit('update:visible', false);
}

function handleSave() {
    emit('save');
}
</script>

<style scoped>
.edit-panel-overlay {
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
}

.edit-panel {
    position: absolute;
    right: 0;
    top: 0;
    width: 600px;
    max-width: 90%;
    height: 100%;
    background: white;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
}

.slide-right-enter-active,
.slide-right-leave-active {
    transition: transform 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
    transform: translateX(100%);
}
</style>
```

---

## 13. Development Workflow

### 13.1 Environment Configuration

**File:** `.env.development`

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Luxaris Dashboard
VITE_APP_VERSION=1.0.0
```

**File:** `.env.production`

```bash
VITE_API_BASE_URL=https://api.luxaris.com/api/v1
VITE_APP_NAME=Luxaris Dashboard
VITE_APP_VERSION=1.0.0
```

### 13.2 Development Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run linter
npm run lint

# Format code
npm run format
```

---

## 14. Testing Strategy

### 14.1 Unit Tests (Vitest)

**Test composables, stores, and utilities:**

```javascript
// usePosts.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { usePosts } from '@/contexts/posts/application/composables/usePosts';
import { setActivePinia, createPinia } from 'pinia';

describe('usePosts', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });
    
    it('should fetch posts', async () => {
        const { posts, fetchPosts } = usePosts();
        
        await fetchPosts();
        
        expect(posts.value).toHaveLength(20);
    });
});
```

### 14.2 Component Tests

**Test components in isolation:**

```javascript
import { mount } from '@vue/test-utils';
import PostsGrid from '@/contexts/posts/presentation/components/PostsGrid.vue';

describe('PostsGrid', () => {
    it('should render posts', () => {
        const posts = [
            { id: '1', title: 'Post 1', content: 'Content 1' },
            { id: '2', title: 'Post 2', content: 'Content 2' }
        ];
        
        const wrapper = mount(PostsGrid, {
            props: { posts }
        });
        
        expect(wrapper.findAll('.post-card')).toHaveLength(2);
    });
});
```

### 14.3 E2E Tests (Playwright)

**Test complete user flows:**

```javascript
import { test, expect } from '@playwright/test';

test('create post flow', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Navigate to posts
    await page.click('text=Posts');
    
    // Open create panel
    await page.click('button:has-text("New Post")');
    
    // Fill form
    await page.fill('[name="title"]', 'My New Post');
    await page.fill('[name="content"]', 'This is the content');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Verify post appears in grid
    await expect(page.locator('text=My New Post')).toBeVisible();
});
```

---

## 15. Performance Optimization

### 15.1 Code Splitting

Use dynamic imports for route-level code splitting:

```javascript
{
    path: '/posts',
    component: () => import('./views/PostsView.vue')
}
```

### 15.2 Lazy Loading Components

```vue
<script setup>
import { defineAsyncComponent } from 'vue';

const HeavyComponent = defineAsyncComponent(() =>
    import('./HeavyComponent.vue')
);
</script>
```

### 15.3 Virtual Scrolling

For large lists (1000+ items), use virtual scrolling:

```vue
<template>
    <VirtualScroller
        :items="posts"
        :item-height="80"
        v-slot="{ item }"
    >
        <PostCard :post="item" />
    </VirtualScroller>
</template>
```

### 15.4 Caching Strategy

**Luminara cache configuration:**

```javascript
const apiClient = new Luminara({
    cache: {
        enabled: true,
        ttl: 60000, // 60 seconds
        cacheOn: ['GET'],
        shouldCache: (config) => {
            // Cache channel list (rarely changes)
            return config.url?.includes('/channels');
        }
    }
});
```

---

## 16. Accessibility (a11y)

- **Keyboard navigation** - All interactive elements accessible via keyboard
- **ARIA labels** - Proper labeling for screen readers
- **Focus management** - Clear focus indicators
- **Color contrast** - WCAG AA compliance
- **Semantic HTML** - Use proper HTML5 elements

---

## 17. Summary

The Luxaris Dashboard follows a **modern, scalable architecture** with:

✅ **Vue 3.5.25** with Composition API  
✅ **Modular MVC + DDD** structure mirroring luxaris-api  
✅ **Luminara 1.2.2** for HTTP with retry/hedge strategies  
✅ **JWT authentication** with automatic token refresh  
✅ **Pinia** for state management  
✅ **Standard flow**: Side Menu → Grid → Edit Panel → Save → Refresh  
✅ **Comprehensive error handling**  
✅ **Type-safe** with TypeScript support  
✅ **Well-tested** with Vitest + Playwright  
✅ **Production-ready** with optimizations  

---

**Next Steps:**
1. Review and approve design
2. Create detailed flow documents in `/flows/` directory
3. Set up project structure
4. Implement core infrastructure
5. Build context modules one by one

# Implementation Sequence: Luxaris Dashboard

**Framework:** Vue 3.5.25 (Composition API)  
**Architecture:** Modular MVC + DDD + SPA  
**Component Library:** Vuetify 3  
**State Management:** Pinia  
**HTTP Client:** Luminara 1.2.2

---

## Phase 1: Foundation & Infrastructure Setup ✅ COMPLETE

**Purpose:** Establish project structure, core infrastructure, and development environment.

**Prerequisites:** Node.js 18+, npm/pnpm installed

### 1.1 Project Initialization

1. **Create Vue 3 Project**
   ```bash
   npm create vite@latest luxaris-dashboard -- --template vue
   cd luxaris-dashboard
   npm install
   ```

2. **Install Core Dependencies**
   ```bash
   # Core framework
   npm install vue@3.5.25 vue-router@4 pinia@2
   
   # HTTP client
   npm install luminara@1.2.2
   
   # UI component library
   npm install vuetify@^3.11.3 @mdi/font vite-plugin-vuetify
   
   # Utilities
   npm install @vueuse/core date-fns
   
   # Internationalization
   npm install vue-i18n@9
   ```

3. **Install Development Dependencies**
   ```bash
   # Testing
   npm install -D vitest @vue/test-utils jsdom
   npm install -D @playwright/test  # E2E testing
   
   # Code quality
   npm install -D eslint prettier eslint-plugin-vue
   npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
   
   # TypeScript (optional, gradual adoption)
   npm install -D typescript @vue/tsconfig
   ```

### 1.2 Folder Structure Setup

Create the DDD-inspired folder structure according to `design.md`:

```
src/
├── contexts/                    # Domain contexts (create empty for now)
│   ├── system/                 # Authentication, users
│   ├── posts/                  # Post management
│   ├── channels/               # Channel connections
│   ├── generation/             # AI content generation
│   └── scheduling/             # Schedule management
├── core/                        # Core infrastructure
│   ├── http/                   # Luminara HTTP client setup
│   ├── router/                 # Vue Router configuration
│   ├── store/                  # Pinia setup
│   ├── auth/                   # JWT authentication
│   ├── i18n/                   # Internationalization
│   └── presets/                # UI Stateful Presets
├── shared/                      # Shared utilities
│   ├── components/             # Reusable UI components
│   ├── composables/            # Vue composition functions
│   └── utils/                  # Helper functions
├── layouts/                     # Page layouts
│   ├── DashboardLayout.vue
│   ├── AuthLayout.vue
│   └── BlankLayout.vue
└── assets/                      # Static assets
    ├── styles/
    └── images/
```

### 1.3 Core Infrastructure Implementation

**Priority Order:**

1. **HTTP Client Setup** (`src/core/http/`)
   - Configure Luminara with base URL
   - Add request/response interceptors
   - Implement retry and hedge strategies
   - Token attachment middleware
   
   **Files to create:**
   - `luminara.js` - Luminara instance configuration
   - `interceptors.js` - Request/response interceptors

2. **Router Setup** (`src/core/router/`)
   - Configure Vue Router
   - Route guards for authentication
   - Meta fields for permissions
   
   **Files to create:**
   - `index.js` - Router configuration
   - `guards.js` - Navigation guards

3. **State Management Setup** (`src/core/store/`)
   - Configure Pinia
   - Create base store structure
   
   **Files to create:**
   - `index.js` - Pinia configuration

4. **Authentication Infrastructure** (`src/core/auth/`)
   - JWT token management
   - Token storage (localStorage)
   - Token refresh logic
   
   **Files to create:**
   - `tokenManager.js` - Token storage and retrieval
   - `authService.js` - Auth helper functions

5. **i18n Setup** (`src/core/i18n/`)
   - Configure vue-i18n
   - Setup RTL support
   - Create initial locale files (en.json)
   
   **Files to create:**
   - `index.js` - i18n configuration
   - `rtl.js` - RTL setup function
   - `locales/en.json` - English translations

6. **Vuetify Integration**
   - Configure Vuetify 3
   - Setup Material Design Icons
   - Configure theme with custom colors
   
   **Files to create:**
   - `src/core/vuetify/index.js` - Vuetify configuration
   
   **Files to modify:**
   - `tailwind.config.js` - Tailwind configuration

### 1.4 Base Layouts Implementation

Create three foundational layouts:

1. **AuthLayout.vue**
   - Minimal layout for login/register
   - Center-aligned form container
   - No sidebar/navigation

2. **DashboardLayout.vue**
   - Full dashboard layout
   - Left sidebar navigation (collapsible)
   - Top bar (profile, notifications, search)
   - Main content area
   - Right panel slot for edit forms

3. **BlankLayout.vue**
   - Minimal layout for error pages
   - Simple container

### 1.5 Testing Infrastructure

1. **Unit Testing Setup** (Vitest)
   - Configure Vitest
   - Create test utilities
   - Example component test

2. **E2E Testing Setup** (Playwright)
   - Configure Playwright
   - Create base test fixtures
   - Example E2E test

**✅ Phase 1 Complete When:**
- Project structure created
- All dependencies installed
- Core infrastructure implemented (HTTP, Router, Store, Auth, i18n, PrimeVue)
- Three layouts created and working
- Dev server runs successfully (`npm run dev`)
- Basic smoke tests passing

---

## Phase 2: Authentication & User Management (System Context) ✅ COMPLETE

**Purpose:** Implement authentication, user registration, login, and session management.

**Prerequisites:** Phase 1 complete (Core infrastructure ready)

### 2.1 System Context Structure

Create the system context following MVC + DDD pattern:

```
src/contexts/system/
├── domain/
│   ├── models/
│   │   └── User.js              # User domain model
│   └── rules/
│       └── userSchemas.js       # Zod validation schemas (matches API)
├── application/
│   ├── services/
│   │   └── AuthService.js       # Authentication service
│   └── composables/
│       ├── useAuth.js           # Auth composable
│       └── usePermissions.js    # Permission checking
├── infrastructure/
│   ├── api/
│   │   └── authRepository.js    # API calls for auth
│   └── store/
│       └── authStore.js         # Pinia store for auth state
└── presentation/
    ├── views/
    │   ├── LoginView.vue        # Login page
    │   ├── RegisterView.vue     # Registration page
    │   └── GoogleOAuthCallback.vue  # OAuth callback handler
    ├── components/
    │   ├── LoginForm.vue        # Login form component
    │   └── RegisterForm.vue     # Register form component
    └── routes.js                # Auth routes
```

### 2.2 Implementation Steps

**Step 1: Domain Layer**
1. Create `User.js` model with properties (id, email, name, roles, permissions, is_root)
2. Create `userSchemas.js` with Zod validation schemas matching API validation

**Step 2: Infrastructure Layer - API**
1. Implement `authRepository.js`:
   - `login(email, password)` → POST `/api/v1/system/auth/login`
   - `register(userData)` → POST `/api/v1/system/auth/register`
   - `logout()` → POST `/api/v1/system/auth/logout`
   - `refreshToken()` → POST `/api/v1/system/auth/refresh`
   - `loginWithGoogle()` → GET `/api/v1/system/auth/google`
   - `handleGoogleCallback(code, state)` → POST `/api/v1/system/auth/google/callback`

**Step 3: Infrastructure Layer - Store**
1. Implement `authStore.js` (Pinia store):
   - State: `user`, `token`, `isAuthenticated`, `loading`, `error`
   - Actions: `login`, `register`, `logout`, `refreshToken`, `loadUser`, `loginWithGoogle`
   - Getters: `isAuthenticated`, `currentUser`, `hasPermission`, `isRootAdmin`
   - Error handling: Use `formatServerErrors()` to display API error descriptions to users
   - Server errors array format: `{ errors: [{ error_code, error_description, error_severity }] }`

**Step 4: Application Layer**
1. Implement `AuthService.js`:
   - Coordinate between store and repository
   - Handle token refresh logic
   - Session management

2. Implement `useAuth.js` composable:
   - Expose auth state and actions to components
   - Reactive authentication state
   - Login/logout/register methods

3. Implement `usePermissions.js` composable:
   - `hasPermission(resource, action)` helper
   - `can(permission)` helper
   - Root admin bypass logic

**Step 5: Presentation Layer - Components**
1. **LoginForm.vue**
   - Email/password inputs (Vuetify v-text-field)
   - Zod validation using `UserLoginSchema`
   - Display server error descriptions from API
   - "Login with Google" button
   - "Forgot password?" link
   - "Register" link

2. **RegisterForm.vue**
   - Name, email, password, confirm password inputs
   - Zod validation using `UserRegistrationSchema` and `PasswordConfirmationSchema`
   - Real-time validation with Zod schemas
   - Password strength indicator (using `getPasswordStrength()`)
   - Display server error descriptions from API
   - "Register with Google" button
   - "Login" link

**Step 6: Presentation Layer - Views**
1. **LoginView.vue**
   - Use AuthLayout
   - Render LoginForm
   - Handle login success/error
   - Redirect to dashboard after login

2. **RegisterView.vue**
   - Use AuthLayout
   - Render RegisterForm
   - Handle registration success/error
   - Show "Pending approval" message if not first user
   - Redirect to login after registration

3. **GoogleOAuthCallback.vue**
   - Parse OAuth callback parameters (code, state)
   - Call API to exchange code for tokens
   - Handle success (store token, redirect to dashboard)
   - Handle error (show message, redirect to login)
   - Handle pending approval (show message, redirect to login)

**Step 7: Routes Configuration**
1. Create `src/contexts/system/presentation/routes.js`:
   - `/login` → LoginView
   - `/register` → RegisterView
   - `/auth/callback` → GoogleOAuthCallback

2. Integrate system routes into main router (`src/core/router/index.js`)

**Step 8: Router Guards**
1. Implement authentication guard:
   - Check if route requires authentication (`meta.requiresAuth`)
   - Redirect to login if not authenticated
   - Load user preset on successful authentication

2. Implement guest guard:
   - Prevent authenticated users from accessing login/register
   - Redirect to dashboard if already logged in

3. Implement permission guard:
   - Check if user has required permission (`meta.permission`)
   - Show 403 error if unauthorized

**Step 9: Token Refresh Implementation**
1. Setup token refresh interceptor in Luminara
2. Automatic token refresh on 401 response
3. Retry failed requests after token refresh

### 2.3 Testing

Create tests for authentication flow:

**Unit Tests:**
- authStore actions (login, register, logout)
- useAuth composable
- Token refresh logic

**Integration Tests:**
- Login flow (success, invalid credentials, network error)
- Registration flow (success, validation errors, first user as root)
- OAuth flow (success, error, pending approval)
- Token refresh flow

**E2E Tests:**
- Complete login → dashboard → logout flow
- Registration → approval → login flow
- Google OAuth → dashboard flow

**✅ Phase 2 Complete When:**
- All auth components working
- Login/register flows functional
- Google OAuth integration complete
- Router guards protecting routes
- Token refresh automatic
- User state persisted across page reloads
- All tests passing (unit + integration + E2E)

---

## Phase 3: UI Stateful Presets System ✅ COMPLETE

**Purpose:** Implement user interface personalization with hierarchical presets.

**Prerequisites:** Phase 2 complete (User authentication working)

### 3.1 Preset Infrastructure

**Files to create:**

```
src/core/presets/
├── presetManager.js         # Core preset management class
├── presetStore.js           # Pinia store for preset state
└── index.js                 # Exports

src/contexts/system/infrastructure/api/
└── presetsRepository.js     # Preset API calls
```

### 3.2 Implementation Steps

**Step 1: Presets Repository**
1. Implement `presetsRepository.js`:
   - `getUserPreset(userId)` → GET `/api/v1/system/users/:user_id/ui-preset`
   - `updatePreset(presetId, settings)` → PATCH `/api/v1/system/ui-presets/:preset_id`
   - `clonePreset(presetId, userId, modifications)` → POST `/api/v1/system/ui-presets/:preset_id/clone`
   - `deletePreset(presetId)` → DELETE `/api/v1/system/ui-presets/:preset_id`

**Step 2: Preset Manager**
1. Implement `presetManager.js` (Core class):
   - `loadPreset(userId)` - Load preset with hierarchy resolution
   - `updateSetting(path, value)` - Update specific setting
   - `getSetting(path)` - Get specific setting
   - `applyToComponent(componentName, settings)` - Apply to component
   - `savePreset()` - Save current state (debounced)
   - Deep merge algorithm

**Step 3: Preset Store**
1. Implement `presetStore.js` (Pinia store):
   - State: `presetId`, `presetSource`, `settings`, `loaded`
   - Actions: `loadPreset`, `updateSetting`, `savePreset`, `resetToDefault`
   - Getters: `getGridColumns`, `getGridFilters`, `getMenuState`, `getPreferences`

**Step 4: Integration with Auth Flow**
1. Update `authStore.js`:
   - Call `presetStore.loadPreset(userId)` after successful login
   - Load preset in router guard after authentication

**Step 5: Apply Presets to Components**
1. **Grid Components:**
   - Load column order/visibility from preset
   - Save column changes on reorder/toggle
   - Apply filters from preset

2. **Menu Component:**
   - Load collapsed state from preset
   - Load opened groups from preset
   - Save state changes

3. **Preferences:**
   - Apply theme, locale, timezone from preset
   - Date/time format preferences

### 3.3 Testing

**Unit Tests:**
- PresetManager class methods
- Deep merge algorithm
- Debounced save logic

**Integration Tests:**
- Load preset flow (user → role → global → empty)
- Update preset with partial changes
- Clone preset on first modification
- Reset to default

**✅ Phase 3 Complete When:**
- Preset system fully integrated
- User settings persisted across sessions
- Auto-save working with debounce
- Automatic cloning on first modification
- All tests passing

---

## Phase 4: Dashboard Layout & Navigation ✅ COMPLETE

**Purpose:** Implement main dashboard layout with sidebar, top bar, and navigation.

**Prerequisites:** Phase 2 complete (Authentication working), Phase 3 complete (Presets working)

### 4.1 Components to Create

```
src/layouts/components/
├── SidebarNav.vue           # Left sidebar navigation
├── TopBar.vue               # Top navigation bar
├── UserMenu.vue             # User profile dropdown
├── NotificationCenter.vue   # Notifications dropdown
├── GlobalSearch.vue         # Global search input
└── MobileNav.vue            # Mobile navigation drawer
```

### 4.2 Implementation Steps

**Step 1: Sidebar Navigation**
1. **SidebarNav.vue**:
   - Menu items with icons (PrimeVue Menu)
   - Collapsible menu (save state to preset)
   - Permission-based visibility (only show items user can access)
   - Active route highlighting
   - Nested menu groups
   - Menu items:
     - Dashboard
     - Posts
     - Schedules
     - Channels
     - Templates
     - Admin (if has permission)

**Step 2: Top Bar**
1. **TopBar.vue**:
   - Logo/branding
   - Global search
   - Notification bell with badge
   - User profile menu
   - Mobile menu toggle

2. **UserMenu.vue** (Dropdown):
   - User name and email
   - Profile link
   - Settings link
   - Logout button

3. **NotificationCenter.vue** (Dropdown):
   - List of notifications
   - Mark as read
   - Clear all
   - View all link

4. **GlobalSearch.vue**:
   - Search input with keyboard shortcut (Ctrl/Cmd + K)
   - Debounced search
   - Results dropdown
   - Navigate to results

**Step 3: Mobile Navigation**
1. **MobileNav.vue**:
   - Slide-in drawer
   - Same menu items as sidebar
   - Close on route change

**Step 4: Update DashboardLayout.vue**
1. Integrate SidebarNav
2. Integrate TopBar
3. Main content area with router-view
4. Right panel slot for edit forms
5. Responsive breakpoints

### 4.3 Testing

**Component Tests:**
- SidebarNav renders correct items
- Permission-based visibility
- Menu state persisted to preset

**E2E Tests:**
- Navigate through all menu items
- Mobile navigation drawer
- User menu logout

**✅ Phase 4 Complete When:**
- Dashboard layout fully functional
- Navigation working
- Mobile responsive
- Permission-based menu visibility
- All tests passing

---

## Phase 5: Posts Management Context ✅ COMPLETE

**Purpose:** Implement post creation, editing, listing, and variant management.

**Prerequisites:** Phase 4 complete (Dashboard layout ready)

### 5.1 Posts Context Structure

```
src/contexts/posts/
├── domain/
│   ├── models/
│   │   ├── Post.js
│   │   └── PostVariant.js
│   └── rules/
│       └── postSchemas.js       # Zod validation schemas (matches API)
├── application/
│   ├── services/
│   │   └── PostService.js
│   └── composables/
│       ├── usePosts.js
│       └── usePostVariants.js
├── infrastructure/
│   ├── api/
│   │   ├── postsRepository.js
│   │   └── variantsRepository.js
│   └── store/
│       └── postsStore.js
└── presentation/
    ├── views/
    │   ├── PostsView.vue        # Posts list page
    │   └── PostDetailView.vue   # Single post detail
    ├── components/
    │   ├── PostsGrid.vue        # Posts data table
    │   ├── PostEditPanel.vue    # Create/edit post form
    │   ├── PostCard.vue         # Post card component
    │   ├── VariantsGrid.vue     # Variants list
    │   ├── VariantEditPanel.vue # Create/edit variant form
    │   ├── DeleteConfirmModal.vue  # Delete confirmation
    │   └── PostStatusBadge.vue  # Status badge component
    └── routes.js
```

### 5.2 Implementation Steps

**Step 1: Domain Layer**
1. Create `Post.js` model
2. Create `PostVariant.js` model
3. Create `postSchemas.js` in `domain/rules/` with Zod validation schemas matching API validation exactly
   - Location: `src/contexts/posts/domain/rules/postSchemas.js`

**Step 2: Infrastructure - API**
1. Implement `postsRepository.js`:
   - `list(filters, pagination)` → GET `/api/v1/posts`
   - `get(id)` → GET `/api/v1/posts/:id`
   - `create(post)` → POST `/api/v1/posts`
   - `update(id, post)` → PATCH `/api/v1/posts/:id`
   - `delete(id)` → DELETE `/api/v1/posts/:id`

2. Implement `variantsRepository.js`:
   - `list(postId)` → GET `/api/v1/posts/:post_id/variants`
   - `create(postId, variant)` → POST `/api/v1/posts/:post_id/variants`
   - `update(id, variant)` → PATCH `/api/v1/posts/:post_id/variants/:id`
   - `delete(id)` → DELETE `/api/v1/posts/:post_id/variants/:id`

**Step 3: Infrastructure - Store**
1. Implement `postsStore.js`:
   - State: `posts`, `currentPost`, `variants`, `loading`, `filters`
   - Actions: `loadPosts`, `loadPost`, `createPost`, `updatePost`, `deletePost`
   - Getters: `filteredPosts`, `draftPosts`, `publishedPosts`

**Step 4: Application Layer**
1. Implement `PostService.js`:
   - Business logic for post operations
   - Zod validation using schemas from `postSchemas.js`

2. Implement `usePosts.js` composable:
   - Expose post operations to components
   - Handle loading states

3. Implement `usePostVariants.js` composable:
   - Expose variant operations to components

**Step 5: Presentation - Components**
1. **PostsGrid.vue** (PrimeVue DataTable):
   - Columns: Title, Status, Created, Tags, Actions
   - Filtering (status, tags, search)
   - Sorting
   - Pagination
   - Column reordering (save to preset)
   - Row actions (edit, delete)

2. **PostEditPanel.vue** (Slide-in panel):
   - Title input (required)
   - Content textarea (optional)
   - Tags input (Vuetify v-combobox)
   - Status dropdown (draft/published)
   - Save/Cancel buttons
   - Zod validation messages matching API
   - Display server error descriptions from API

3. **PostCard.vue**:
   - Display post info
   - Actions menu
   - Status badge

4. **VariantsGrid.vue**:
   - List variants for post
   - Channel-specific info
   - Actions (edit, delete)

5. **VariantEditPanel.vue**:
   - Channel selector
   - Content textarea (with character limit)
   - Media upload (future)
   - Save/Cancel buttons

6. **DeleteConfirmModal.vue**:
   - Confirmation message
   - Confirm/Cancel buttons
   - Warning about cascade deletes

**Step 6: Presentation - Views**
1. **PostsView.vue**:
   - Use DashboardLayout
   - Render PostsGrid
   - Toolbar with "New Post" button
   - Filter controls
   - Handle edit panel visibility

2. **PostDetailView.vue**:
   - Display post details
   - Show all variants
   - Schedules for this post
   - Edit/Delete actions

**Step 7: Routes**
1. `/dashboard/posts` → PostsView
2. `/dashboard/posts/:id` → PostDetailView

**Step 8: Integrate with Main Router**
1. Add posts routes to main router
2. Add "Posts" menu item to SidebarNav
3. Add permission check (`posts:read`)

### 5.3 Testing

**Unit Tests:**
- postsStore actions
- usePosts composable
- Validation rules

**Component Tests:**
- PostsGrid rendering
- PostEditPanel validation
- DeleteConfirmModal logic

**Integration Tests:**
- List posts with filters
- Create post flow
- Edit post flow
- Delete post flow

**E2E Tests:**
- Complete CRUD flow: Create → Edit → List → Delete
- Filter and search functionality

**✅ Phase 5 Complete When:**
- Posts CRUD fully functional
- Variants CRUD working
- Grid with filtering/sorting/pagination
- Edit panel slide-in working
- All tests passing

---

## Phase 6: Channels Management Context ✅ COMPLETE

**Purpose:** Implement social media channel connections (OAuth flow).

**Prerequisites:** Phase 4 complete (Dashboard layout ready)

### 6.1 Implementation Overview

Follow same structure as Posts context:
- Domain models (Channel, ChannelConnection)
- API repositories (channelsRepository, connectionsRepository)
- Pinia store (channelsStore)
- Composables (useChannels, useConnections)
- Components (ChannelsGrid, ConnectionCard, ConnectModal, DisconnectModal)
- Views (ChannelsView, ConnectionsView)
- Routes (`/dashboard/channels`, `/dashboard/channels/connections`)

### 6.2 Key Features

1. **List Available Channels**:
   - Show X, LinkedIn, Facebook, etc.
   - "Connect" button on each channel

2. **OAuth Connection Flow**:
   - Click "Connect" → Open OAuth URL
   - Redirect to platform for authorization
   - Callback handles success/error
   - Store connection info

3. **List Channel Connections**:
   - Show connected accounts
   - Test connection button
   - Reconnect button
   - Disconnect button

4. **Connection Health**:
   - Status indicator (active, error, expired)
   - Last used timestamp

**✅ Phase 6 Complete When:**
- Channel listing working
- OAuth connection flow complete
- Connection management functional
- All tests passing

---

## Phase 7: Content Generation Context ⏳ PENDING

**Purpose:** Implement AI-powered content generation with templates.

**Prerequisites:** Phase 5 complete (Posts context ready)

### 7.1 Implementation Overview

Follow same structure:
- Domain models (Template, GenerationSession, Suggestion)
- API repositories (templatesRepository, generationRepository)
- Pinia store (generationStore)
- Composables (useTemplates, useGeneration)
- Components (GenerationPanel, TemplatesGrid, SuggestionCard)
- Views (TemplatesView)
- Routes (`/dashboard/templates`)

### 7.2 Key Features

1. **Generate Content**:
   - Open generation panel from post edit
   - Select template (optional)
   - Configure parameters (tone, length, platforms)
   - Generate button → Show loading
   - Display 3-5 suggestions
   - Select suggestion → Apply to post

2. **Template Management**:
   - List templates
   - Create template
   - Edit template
   - Delete template
   - Public/private templates

**✅ Phase 7 Complete When:**
- Generation panel functional
- Template CRUD complete
- Integration with Posts context
- All tests passing

---

## Phase 8: Scheduling Context ⏳ PENDING

**Purpose:** Implement post scheduling and calendar view.

**Prerequisites:** Phase 5 complete (Posts), Phase 6 complete (Channels)

### 8.1 Implementation Overview

Follow same structure:
- Domain models (Schedule)
- API repositories (schedulesRepository)
- Pinia store (schedulesStore)
- Composables (useSchedules)
- Components (SchedulesGrid, ScheduleEditPanel, CalendarView)
- Views (SchedulesView, CalendarView)
- Routes (`/dashboard/schedules`, `/dashboard/calendar`)

### 8.2 Key Features

1. **Create Schedule**:
   - From post detail page
   - Select post variant
   - Select date/time (with timezone)
   - Select channel connection
   - Save schedule

2. **Calendar View**:
   - Month/week/day views
   - Drag-and-drop to reschedule
   - Visual schedule representation
   - Click to edit

3. **Schedule Management**:
   - List all schedules
   - Filter by status (pending, queued, success, failed)
   - Edit schedule (reschedule)
   - Cancel schedule
   - Retry failed schedule

4. **Publishing History**:
   - View publish results
   - Success/error details
   - Platform responses

**✅ Phase 8 Complete When:**
- Schedule CRUD functional
- Calendar view with drag-and-drop
- Publishing history visible
- All tests passing

---

## Phase 9: Admin & User Management ⏳ PENDING

**Purpose:** Implement user administration, profile management, and system settings.

**Prerequisites:** Phase 2 complete (Auth system), Phase 4 complete (Dashboard)

### 9.1 Implementation Overview

Components to create:
- ProfileView.vue (user profile page)
- ProfileEditPanel.vue
- SecurityView.vue (change password, 2FA)
- UsersAdminView.vue (admin only)
- UsersGrid.vue
- ApproveUserModal.vue
- EditUserRolesPanel.vue

Routes:
- `/dashboard/profile` → ProfileView
- `/dashboard/profile/security` → SecurityView
- `/dashboard/admin/users` → UsersAdminView (permission: `system:admin`)

### 9.2 Key Features

1. **User Profile**:
   - View/edit profile (name, email, avatar, timezone, locale)
   - Change password
   - View permissions

2. **User Administration** (Root/Admin only):
   - List all users
   - Filter by status (active, pending, suspended)
   - Approve pending users
   - Edit user roles
   - Suspend/activate users
   - Delete users

3. **Feature Flags** (Admin only):
   - Enable/disable features
   - View feature usage

**✅ Phase 9 Complete When:**
- User profile management working
- Admin user management functional
- Permission-based access working
- All tests passing

---

## Phase 10: Security Hardening ⏳ PENDING

**Purpose:** Implement comprehensive frontend security measures against XSS, CSRF, and SQL injection attack vectors.

**Prerequisites:** Phase 2 complete (Authentication), Phase 5+ (At least one data context implemented)

### 10.1 Read Security Design Documents

Review all security documentation:
- ✅ `luxaris-dashboard/designs/design-security-sql-injection.md` - Frontend input validation
- ✅ `luxaris-dashboard/designs/design-security-csrf.md` - CSRF protection with JWT
- ✅ `luxaris-dashboard/designs/design-security-xss.md` - XSS protection in React/Vue

### 10.2 SQL Injection Protection (Frontend Validation)

**Purpose:** Provide client-side validation as first line of defense and UX improvement.

**Step 1: Create Input Validators**

Create `src/shared/utils/validators.js`:

```javascript
export class InputValidator {
    // UUID validation
    static isValidUuid(value) {
        const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return pattern.test(value);
    }
    
    // Integer validation
    static isValidInteger(value) {
        const num = typeof value === 'string' ? parseInt(value, 10) : value;
        return !isNaN(num) && isFinite(num) && Math.floor(num) === num;
    }
    
    // Email validation
    static isValidEmail(email) {
        const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return pattern.test(email);
    }
    
    // Enum validation
    static isValidEnum(value, allowedValues) {
        return allowedValues.includes(value);
    }
    
    // Sanitize for API submission
    static sanitizeForApi(input, maxLength = 1000) {
        if (!input) return '';
        let sanitized = input.replace(/\0/g, ''); // Remove null bytes
        sanitized = sanitized.trim();
        return sanitized.substring(0, maxLength);
    }
    
    // Detect potential SQL patterns (for warnings, not security)
    static detectSqlPattern(input) {
        const patterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
            /(-{2}|\/\*|\*\/)/,
            /(\bOR\b.*=.*)/i,
            /(;\s*DROP)/i
        ];
        return patterns.some(p => p.test(input));
    }
}
```

**Step 2: Create Validation Composable**

Create `src/shared/composables/useValidation.js`:

```javascript
import { ref } from 'vue';
import { InputValidator } from '@/shared/utils/validators';

export function useValidation() {
    const errors = ref({});
    
    const validateField = (fieldName, value, rules) => {
        const fieldErrors = [];
        
        for (const rule of rules) {
            if (rule.type === 'required' && !value) {
                fieldErrors.push(rule.message || 'Field is required');
            }
            if (rule.type === 'email' && !InputValidator.isValidEmail(value)) {
                fieldErrors.push(rule.message || 'Invalid email format');
            }
            if (rule.type === 'uuid' && !InputValidator.isValidUuid(value)) {
                fieldErrors.push(rule.message || 'Invalid ID format');
            }
            if (rule.type === 'enum' && !InputValidator.isValidEnum(value, rule.values)) {
                fieldErrors.push(rule.message || 'Invalid value');
            }
            if (rule.type === 'maxLength' && value?.length > rule.max) {
                fieldErrors.push(rule.message || `Max length is ${rule.max}`);
            }
        }
        
        if (fieldErrors.length > 0) {
            errors.value[fieldName] = fieldErrors;
            return false;
        }
        
        delete errors.value[fieldName];
        return true;
    };
    
    const clearErrors = () => {
        errors.value = {};
    };
    
    return {
        errors,
        validateField,
        clearErrors
    };
}
```

**Step 3: Enhance API Client with Validation**

Update `src/core/http/luminara.js` to validate parameters:

```javascript
// Add request interceptor for validation
client.interceptors.request.use((config) => {
    // Validate UUID in URL paths
    const uuidPattern = /\/([a-f0-9-]{36})\//gi;
    const matches = config.url.match(uuidPattern);
    if (matches) {
        for (const match of matches) {
            const uuid = match.replace(/\//g, '');
            if (!InputValidator.isValidUuid(uuid)) {
                throw new Error(`Invalid UUID in request: ${uuid}`);
            }
        }
    }
    
    return config;
});
```

**Step 4: Apply Validation to Forms**

Update all form components to use validation:
- PostEditPanel.vue
- VariantEditPanel.vue
- TemplateEditPanel.vue
- ScheduleEditPanel.vue
- RegisterForm.vue

Example in PostEditPanel.vue:

```vue
<script setup>
import { useValidation } from '@/shared/composables/useValidation';
import { InputValidator } from '@/shared/utils/validators';

const { errors, validateField } = useValidation();

const handleSubmit = () => {
    // Validate title
    const titleValid = validateField('title', form.title, [
        { type: 'required', message: 'Title is required' },
        { type: 'maxLength', max: 200 }
    ]);
    
    // Check for SQL patterns
    if (InputValidator.detectSqlPattern(form.title)) {
        errors.value.title = ['Title contains invalid characters'];
        return;
    }
    
    if (titleValid) {
        // Submit to API
        submitPost();
    }
};
</script>
```

**Testing - SQL Injection (Frontend):**
- Test UUID validation in routes
- Test integer validation in filters
- Test enum validation in forms
- Test SQL pattern detection
- Target: 8 validation tests

### 10.3 CSRF Protection Implementation

**Purpose:** Ensure JWT token authentication is CSRF-safe and add defense-in-depth measures.

**Step 1: Document Current Implementation**

Create documentation comment in `src/core/http/luminara.js`:

```javascript
/**
 * CSRF PROTECTION:
 * 
 * This application uses JWT tokens in the Authorization header,
 * which provides natural CSRF protection because:
 * 
 * 1. Tokens are stored in localStorage (not cookies)
 * 2. Authorization header must be explicitly set by JavaScript
 * 3. Same-Origin Policy prevents malicious sites from:
 *    - Reading tokens from our localStorage
 *    - Setting Authorization headers on cross-origin requests
 * 
 * This means a malicious site cannot forge authenticated requests
 * to our API, even if a user is logged in.
 * 
 * Additional protection layers:
 * - Origin validation (backend)
 * - Token expiration and refresh
 * - Secure token storage
 */
```

**Step 2: Enhance Token Manager**

Update `src/core/auth/tokenManager.js`:

```javascript
export const TokenManager = {
    getToken() {
        const token = localStorage.getItem('auth_token');
        
        // Validate token format
        if (token && !this.isValidTokenFormat(token)) {
            console.warn('Invalid token format detected, clearing');
            this.clearToken();
            return null;
        }
        
        return token;
    },
    
    setToken(token) {
        if (!token) return;
        
        // Validate before storing
        if (!this.isValidTokenFormat(token)) {
            throw new Error('Invalid token format');
        }
        
        localStorage.setItem('auth_token', token);
    },
    
    clearToken() {
        localStorage.removeItem('auth_token');
    },
    
    isValidTokenFormat(token) {
        // JWT format: header.payload.signature
        const parts = token.split('.');
        return parts.length === 3;
    },
    
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000;
            return Date.now() >= exp;
        } catch {
            return true;
        }
    }
};
```

**Step 3: Add Request Origin Awareness**

Update Luminara interceptor to handle CORS properly:

```javascript
// Ensure requests include origin for backend validation
client.interceptors.request.use((config) => {
    // Backend will validate Origin header
    // Browser automatically includes it for cross-origin requests
    
    // Add token
    const token = TokenManager.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
});
```

**Step 4: Handle CSRF-Related Errors**

Update error handler to detect CSRF/origin failures:

```javascript
// In error interceptor
client.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 403) {
            const errorCode = error.response.data?.errors?.[0]?.error_code;
            
            if (errorCode === 'INVALID_ORIGIN' || errorCode === 'CSRF_TOKEN_INVALID') {
                // Security validation failed
                TokenManager.clearToken();
                router.push('/login?reason=security');
                
                return Promise.reject(new Error('Security validation failed. Please log in again.'));
            }
        }
        
        return Promise.reject(error);
    }
);
```

**Step 5: Implement Mutation Guard**

Create `src/shared/composables/useMutationGuard.js`:

```javascript
import { ref } from 'vue';

export function useMutationGuard() {
    const isSubmitting = ref(false);
    
    const guard = async (mutationFn) => {
        if (isSubmitting.value) {
            console.warn('Request already in progress');
            return null;
        }
        
        isSubmitting.value = true;
        
        try {
            const result = await mutationFn();
            return result;
        } finally {
            isSubmitting.value = false;
        }
    };
    
    return {
        guard,
        isSubmitting
    };
}
```

Use in components:

```vue
<script setup>
import { useMutationGuard } from '@/shared/composables/useMutationGuard';

const { guard, isSubmitting } = useMutationGuard();

const handleSubmit = async () => {
    await guard(async () => {
        return postsApi.createPost(formData);
    });
};
</script>

<template>
    <button :disabled="isSubmitting" @click="handleSubmit">
        {{ isSubmitting ? 'Submitting...' : 'Submit' }}
    </button>
</template>
```

**Testing - CSRF:**
- Test token presence in requests
- Test expired token handling
- Test 403 CSRF error handling
- Test double-submit prevention
- Target: 6 CSRF tests

### 10.4 XSS Protection Implementation

**Purpose:** Protect against XSS attacks through safe rendering, sanitization, and CSP.

**Step 1: Install DOMPurify**

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

**Step 2: Create Sanitizer Utility**

Create `src/shared/utils/sanitizer.js`:

```javascript
import DOMPurify from 'dompurify';

export class Sanitizer {
    /**
     * Sanitize HTML content for safe rendering
     */
    static sanitizeHtml(dirty, options = {}) {
        const config = {
            ALLOWED_TAGS: [
                'p', 'br', 'span', 'strong', 'em', 'u',
                'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4',
                'code', 'pre', 'blockquote'
            ],
            ALLOWED_ATTR: ['href', 'title', 'target', 'class'],
            ALLOW_DATA_ATTR: false,
            ...options
        };
        
        return DOMPurify.sanitize(dirty, config);
    }
    
    /**
     * Sanitize plain text (remove all HTML)
     */
    static sanitizePlainText(text) {
        return DOMPurify.sanitize(text, {
            ALLOWED_TAGS: [],
            KEEP_CONTENT: true
        });
    }
    
    /**
     * Validate and sanitize URL
     */
    static sanitizeUrl(url) {
        try {
            const parsed = new URL(url);
            
            // Only allow safe protocols
            if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
                return DOMPurify.sanitize(parsed.href, {
                    ALLOWED_TAGS: [],
                    ALLOWED_ATTR: []
                });
            }
        } catch {
            // Invalid URL
        }
        
        return '#';
    }
    
    /**
     * Detect potential XSS patterns
     */
    static detectXssPattern(input) {
        const patterns = [
            /<script/i,
            /javascript:/i,
            /onerror\s*=/i,
            /onclick\s*=/i,
            /onload\s*=/i,
            /<iframe/i,
            /data:text\/html/i
        ];
        
        return patterns.some(p => p.test(input));
    }
}
```

**Step 3: Create Safe HTML Component**

Create `src/shared/components/SafeHtml.vue`:

```vue
<template>
    <div :class="className" v-html="sanitizedHtml"></div>
</template>

<script setup>
import { computed } from 'vue';
import { Sanitizer } from '@/shared/utils/sanitizer';

const props = defineProps({
    html: {
        type: String,
        required: true
    },
    className: String,
    allowedTags: Array,
    allowedAttr: Array
});

const sanitizedHtml = computed(() => {
    return Sanitizer.sanitizeHtml(props.html, {
        ...(props.allowedTags && { ALLOWED_TAGS: props.allowedTags }),
        ...(props.allowedAttr && { ALLOWED_ATTR: props.allowedAttr })
    });
});
</script>
```

**Step 4: Create Safe Link Component**

Create `src/shared/components/SafeLink.vue`:

```vue
<template>
    <a 
        :href="safeHref" 
        :class="className"
        :target="target"
        :rel="isExternal ? 'noopener noreferrer' : undefined"
    >
        <slot></slot>
    </a>
</template>

<script setup>
import { computed } from 'vue';
import { Sanitizer } from '@/shared/utils/sanitizer';

const props = defineProps({
    href: {
        type: String,
        required: true
    },
    className: String,
    target: {
        type: String,
        default: '_self'
    }
});

const safeHref = computed(() => Sanitizer.sanitizeUrl(props.href));

const isExternal = computed(() => {
    try {
        const url = new URL(safeHref.value, window.location.origin);
        return url.origin !== window.location.origin;
    } catch {
        return false;
    }
});
</script>
```

**Step 5: Update Form Components with XSS Detection**

Add XSS detection to all text inputs:

```vue
<script setup>
import { Sanitizer } from '@/shared/utils/sanitizer';

const handleTitleChange = (value) => {
    // Warn user if XSS pattern detected
    if (Sanitizer.detectXssPattern(value)) {
        showWarning('Input contains characters that cannot be processed. Please remove special characters.');
        return;
    }
    
    form.title = value;
};
</script>
```

**Step 6: Apply SafeHtml to Rich Content**

Update all components displaying user-generated HTML:

```vue
<!-- Before (UNSAFE) -->
<div v-html="post.content"></div>

<!-- After (SAFE) -->
<SafeHtml :html="post.content" class="post-content" />
```

**Step 7: Configure Content Security Policy**

Update `index.html`:

```html
<head>
    <!-- Content Security Policy (Development) -->
    <!-- Production: Set via HTTP headers from backend -->
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'self'; 
                   script-src 'self' 'unsafe-inline'; 
                   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
                   img-src 'self' https: data:; 
                   font-src 'self' https://fonts.gstatic.com; 
                   connect-src 'self' http://localhost:3000 https://api.luxaris.com;">
</head>
```

**Step 8: Add XSS Warning Component**

Create `src/shared/components/SecurityWarning.vue`:

```vue
<template>
    <div v-if="visible" class="security-warning">
        <i class="pi pi-exclamation-triangle"></i>
        <div class="warning-content">
            <h4>Security Notice</h4>
            <p>{{ message }}</p>
            <p class="hint">If you believe this is an error, please contact support.</p>
        </div>
        <button @click="dismiss">Dismiss</button>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
    message: String
});

const emit = defineEmits(['dismiss']);

const visible = ref(true);

const dismiss = () => {
    visible.value = false;
    emit('dismiss');
};
</script>

<style scoped>
.security-warning {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    padding: 1rem;
    display: flex;
    gap: 1rem;
    align-items: start;
}
</style>
```

**Testing - XSS:**
- Test SafeHtml component with XSS payloads
- Test SafeLink with javascript: URLs
- Test XSS pattern detection
- Test form sanitization
- Test rich text rendering safety
- Target: 10 XSS tests

### 10.5 Security Testing Suite

Create security test files:

**tests/unit/security/validators.test.js** (8 tests)
- UUID validation
- Integer validation
- Enum validation
- SQL pattern detection

**tests/unit/security/sanitizer.test.js** (10 tests)
- HTML sanitization
- Script tag removal
- Event handler removal
- URL sanitization
- XSS pattern detection

**tests/integration/security/csrf-protection.test.js** (6 tests)
- Token attachment to requests
- Expired token handling
- CSRF error handling
- Double-submit prevention

**tests/e2e/security/xss-protection.spec.js** (E2E tests)
- Submit XSS payload in form → verify sanitized
- Render malicious HTML → verify safe display
- Click javascript: link → verify blocked

### 10.6 Security Documentation

Create `SECURITY.md` in dashboard root:

```markdown
# Security

## Overview

The Luxaris Dashboard implements multiple layers of security protection:

1. **Input Validation** - Client-side validation for UX and early detection
2. **CSRF Protection** - JWT in Authorization header (naturally CSRF-safe)
3. **XSS Protection** - DOMPurify sanitization and safe rendering

## Secure Coding Guidelines

### Never Use v-html Directly
❌ Bad: `<div v-html="userContent"></div>`
✅ Good: `<SafeHtml :html="userContent" />`

### Validate All User Inputs
Always validate UUIDs, integers, enums before API calls

### Use Safe Link Component
❌ Bad: `<a :href="userUrl">Link</a>`
✅ Good: `<SafeLink :href="userUrl">Link</SafeLink>`

## Vulnerability Reporting

Report security vulnerabilities to: security@luxaris.com
```

**✅ Phase 10 Complete When:**
- Input validation utilities implemented
- CSRF protection documented and verified
- DOMPurify integrated
- SafeHtml and SafeLink components created
- All forms using validation
- All user HTML using SafeHtml
- CSP configured
- 24+ security tests passing (8 validation + 10 sanitizer + 6 CSRF)
- Security documentation complete

---

## Phase 11: UI Features & Polish ⏳ PENDING

**Purpose:** Implement cross-cutting UI features and polish.

**Prerequisites:** Phase 10 complete (Security hardening)

### 10.1 Features to Implement

1. **Notification System**:
   - Toast notifications (success, error, warning, info)
   - Notification center dropdown
   - Real-time updates (future: WebSocket)

2. **Global Search**:
   - Search across posts, templates, schedules
   - Debounced search
   - Results grouped by type
   - Keyboard navigation

3. **Error Handling**:
   - Global error handler
   - 404 page
   - 403 forbidden page
   - 500 error page
   - Network error handling
   - Retry logic

4. **Loading States**:
   - Skeleton loaders for grids
   - Loading spinners
   - Progress indicators
   - Optimistic updates

5. **Mobile Optimization**:
   - Touch-friendly interfaces
   - Mobile navigation
   - Responsive grids
   - Mobile-specific layouts

6. **Accessibility**:
   - ARIA labels
   - Keyboard navigation
   - Focus management
   - Screen reader support

7. **Performance Optimization**:
   - Code splitting
   - Lazy loading routes
   - Image optimization
   - Bundle size optimization

**✅ Phase 10 Complete When:**
- All UI features polished
- Mobile responsive
- Accessible
- Performance optimized
- All tests passing

---

## Phase 12: Testing & Quality Assurance ⏳ PENDING

**Purpose:** Comprehensive testing and quality assurance.

**Prerequisites:** All phases complete

### 11.1 Testing Strategy

1. **Unit Tests**:
   - All composables
   - All stores
   - All utilities
   - **Target:** 80%+ coverage

2. **Component Tests**:
   - All major components
   - User interactions
   - Props/events
   - **Target:** 70%+ coverage

3. **Integration Tests**:
   - Complete user flows
   - API integration
   - Store integration
   - **Target:** Critical paths covered

4. **E2E Tests**:
   - Login → Dashboard → Logout
   - Create post → Edit → Delete
   - Connect channel → Disconnect
   - Schedule post → View in calendar
   - Generate content → Apply to post
   - **Target:** All major flows covered

### 11.2 Quality Checks

1. **Code Quality**:
   - ESLint passing (no errors)
   - Prettier formatting
   - No console.log statements
   - TypeScript errors resolved

2. **Performance**:
   - Lighthouse score > 90
   - First Contentful Paint < 1.5s
   - Time to Interactive < 3.5s
   - Bundle size < 500KB (gzipped)

3. **Accessibility**:
   - WCAG 2.1 AA compliance
   - Keyboard navigation working
   - Screen reader tested

4. **Browser Compatibility**:
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)

**✅ Phase 12 Complete When:**
- All tests passing
- Quality metrics met
- No critical bugs
- Ready for production

---

## Phase 13: Deployment & Documentation ⏳ PENDING

**Purpose:** Production deployment and comprehensive documentation.

**Prerequisites:** Phase 11 complete (All testing done)

### 12.1 Build Configuration

1. **Production Build**:
   - Configure environment variables
   - Optimize build settings
   - Setup CI/CD pipeline
   - Configure CDN for assets

2. **Environment Configuration**:
   - Development environment
   - Staging environment
   - Production environment

### 12.2 Documentation

1. **Developer Documentation**:
   - Setup guide
   - Architecture overview
   - Component library
   - API integration guide
   - Contributing guidelines

2. **User Documentation**:
   - User guide
   - Feature documentation
   - FAQ
   - Troubleshooting

3. **Deployment Documentation**:
   - Deployment guide
   - Environment setup
   - Configuration reference
   - Monitoring setup

**✅ Phase 13 Complete When:**
- Production deployment successful
- All documentation complete
- Monitoring setup
- Ready for users

---

## Testing Approach (Continuous Throughout Implementation)

### Testing Priority

1. **E2E Tests** (Highest Priority)
   - Focus on complete user flows
   - Validate interface outcomes
   - Catch integration issues early

2. **Component Tests** (Medium Priority)
   - Test user interactions
   - Validate component behavior
   - Props/events validation

3. **Unit Tests** (Lower Priority)
   - Test utility functions
   - Test composables
   - Test business logic

### Testing Tools

- **Vitest** - Unit and component testing
- **Playwright** - E2E testing
- **Testing Library** - Component testing utilities

### Test Cleanup

- Always clean up side effects
- Reset stores between tests
- Clear localStorage/sessionStorage
- Mock API calls appropriately

---

## Development Guidelines

### Code Quality

- Follow Vue 3 Composition API best practices
- Use TypeScript for type safety (gradual adoption)
- Keep components small and focused (< 300 lines)
- Implement proper error handling
- Write descriptive commit messages

### Component Best Practices

- Use PrimeVue components for consistency
- Keep components reusable
- Props for input, events for output
- Use composables for shared logic
- Implement proper loading states

### State Management

- Use Pinia stores for shared state
- Keep stores focused on single domain
- Actions for async operations
- Getters for derived state
- Use composables to expose store to components

### Performance

- Lazy load routes
- Use virtual scrolling for large lists
- Debounce search/filter operations
- Optimize images
- Code split by route

### Accessibility

- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation
- Test with screen reader
- Maintain sufficient color contrast

---

## Summary

This implementation sequence provides a structured approach to building the Luxaris Dashboard:

1. **Phase 1:** Foundation (Infrastructure, layouts, core setup)
2. **Phase 2:** Authentication (Login, register, OAuth, session management)
3. **Phase 3:** UI Presets (Personalization system)
4. **Phase 4:** Dashboard Layout (Navigation, sidebar, top bar)
5. **Phase 5:** Posts Management (CRUD, variants)
6. **Phase 6:** Channels Management (OAuth connections)
7. **Phase 7:** Content Generation (AI, templates)
8. **Phase 8:** Scheduling (Calendar, schedules)
9. **Phase 9:** Admin & Users (User management, permissions)
10. **Phase 10:** Security Hardening (XSS, CSRF, input validation)
11. **Phase 11:** UI Polish (Notifications, search, mobile, accessibility)
12. **Phase 12:** Testing & QA (Comprehensive testing)
13. **Phase 13:** Deployment (Production deployment, documentation)

Each phase builds upon previous phases, ensuring a solid foundation before adding complexity. Follow the DDD architecture and maintain clean separation of concerns throughout implementation.

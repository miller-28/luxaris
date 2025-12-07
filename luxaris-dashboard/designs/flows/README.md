# Luxaris Dashboard - UI Flow Documentation

Complete reference for all user interface flows in the Luxaris Dashboard.

---

## Overview

This directory contains comprehensive documentation for all UI flows in the Luxaris Dashboard. Each flow document provides step-by-step interactions, API endpoints, components, permissions, and error handling.

### Flow Pattern

All CRUD flows follow the standard pattern:

**Side Menu → Grid → Edit Panel → Save → Return to Grid**

1. **Side Menu Navigation** - User clicks menu item
2. **Grid View** - List/grid with filters, search, pagination
3. **Edit Panel (Slide-in)** - Right panel opens for create/edit
4. **Save Action** - Submit to API with loading state
5. **Return to Grid** - Panel closes, grid refreshes

---

## Flow Documents

All flows are organized by subject area into separate markdown files:

### 📁 [flow-authentication.md](./flow-authentication.md)
**Authentication & Authorization Flows**
- User Login (Email/Password)
- User Registration (Email/Password)
- Logout
- Automatic Token Refresh
- Change Password

**Total:** 5 flows | **Key Features:** JWT authentication, token refresh, secure password management

---

### 📁 [flow-google-oauth.md](./flow-google-oauth.md)
**Google OAuth Authentication**
- Google OAuth Login
- Google OAuth Registration
- First User as Root Admin
- Account Linking (Google to Email)

**Total:** 4 flows | **Key Features:** OAuth 2.0, CSRF protection, root admin auto-creation, pending approval workflow, account linking

---

### 📁 [flow-posts.md](./flow-posts.md)
**Post Management & Variants**
- List Posts
- Create Post
- Edit Post
- Delete Post
- View Post Detail
- List Post Variants
- Create Post Variant
- Edit Post Variant
- Delete Post Variant

**Total:** 9 flows | **Key Features:** Multi-platform variants, character limits, draft/published states

---

### 📁 [flow-channels.md](./flow-channels.md)
**Social Media Channel Management**
- List Available Channels
- Connect Channel (OAuth)
- List Channel Connections
- Test Connection
- Reconnect Channel
- Disconnect Channel
- View Connection Details

**Total:** 7 flows | **Key Features:** OAuth 2.0, connection health, token management

---

### 📁 [flow-generation.md](./flow-generation.md)
**AI Content Generation & Templates**
- Generate Post Content
- List Templates
- Create Template
- Edit Template
- Delete Template
- Use Template (Quick Action)
- Duplicate Template

**Total:** 7 flows | **Key Features:** AI-powered generation, platform optimization, template system

---

### 📁 [flow-scheduling.md](./flow-scheduling.md)
**Schedule Management & Calendar**
- List Schedules
- Create Schedule
- Edit Schedule (Reschedule)
- Cancel Schedule
- Delete Schedule
- Calendar View
- View Publish History
- Retry Failed Schedule

**Total:** 8 flows | **Key Features:** Timezone support, drag-and-drop calendar, publish history

---

### 📁 [flow-admin.md](./flow-admin.md)
**Administration & User Management**
- User Profile
- Change Password
- List Users (Admin)
- Approve User (Admin)
- Edit User Roles (Admin)
- Suspend/Activate User (Admin)
- Delete User (Admin)
- Feature Flags (Admin)
- Health Check (Admin)

**Total:** 9 flows | **Key Features:** RBAC, approval workflow, system monitoring

---

### 📁 [flow-ui-presets.md](./flow-ui-presets.md)
**UI Stateful Presets & Personalization**
- Load User Preset on Login
- Auto-Save Grid Column Reorder
- Clone Role Preset on First Modification
- Toggle Column Visibility
- Save Grid Filters
- Admin Creates Role Default Preset

**Total:** 6 flows | **Key Features:** Hierarchical presets (user → role → global), auto-save with debouncing, automatic cloning, PrimeVue integration, admin preset management

---

### 📁 [flow-ui-features.md](./flow-ui-features.md)
**UI Features & Cross-Cutting Concerns**
- Notification Center
- Toast Notifications
- Global Search
- Grid Filtering
- Mobile Navigation
- Touch Gestures
- Network Error Handling
- Permission Denied (403)
- Not Found (404)

**Total:** 9 flows | **Key Features:** Real-time notifications, responsive design, error recovery

---

## Quick Reference

### By Category

| Category | Flow Count | Document |
|----------|------------|----------|
| **Authentication** | 5 | [flow-authentication.md](./flow-authentication.md) |
| **Google OAuth** | 4 | [flow-google-oauth.md](./flow-google-oauth.md) |
| **Posts** | 9 | [flow-posts.md](./flow-posts.md) |
| **Channels** | 7 | [flow-channels.md](./flow-channels.md) |
| **Generation** | 7 | [flow-generation.md](./flow-generation.md) |
| **Scheduling** | 8 | [flow-scheduling.md](./flow-scheduling.md) |
| **Admin** | 9 | [flow-admin.md](./flow-admin.md) |
| **UI Presets** | 6 | [flow-ui-presets.md](./flow-ui-presets.md) |
| **UI Features** | 9 | [flow-ui-features.md](./flow-ui-features.md) |
| **TOTAL** | **64 flows** | 9 documents |

### By Permission Level

| Permission | Flows | Documents |
|------------|-------|-----------|
| **Public** | 2 | Authentication (login, register) |
| **Authenticated** | 35 | Posts, Channels, Generation, Scheduling, Profile |
| **Admin** | 7 | User management, Feature flags, Health check |
| **System** | 10 | Notifications, Search, Error handling |

---

## Flow Characteristics

### Pattern Compliance

✅ **Side Menu → Grid → Edit Panel → Save → Return**
- All CRUD operations follow this pattern
- Consistent right-slide edit panels (600px width)
- Grid refreshes after successful operations

✅ **Loading States**
- Loading skeletons on initial page load
- Button spinners during API calls
- Disabled form inputs during submission

✅ **Success/Error Feedback**
- Toast notifications for action outcomes
- Inline error messages below form fields
- Success: Green toast, 3 seconds
- Error: Red toast, 5 seconds

✅ **Confirmation Modals**
- All destructive actions require confirmation
- Delete, Disconnect, Suspend, Cancel
- Clear warnings and consequences shown

✅ **Real-time Validation**
- Form field validation as user types
- Character counters with limits
- Password strength indicators
- Connection health checks

✅ **Responsive Design**
- Mobile: < 768px (hamburger menu, full-screen panels)
- Tablet: 768px - 1024px (collapsed sidebar)
- Desktop: > 1024px (full sidebar, slide-in panels)

---

## Common Components

These components are used across multiple flows:

| Component | Used In | Purpose |
|-----------|---------|---------|
| `EditPanel.vue` | Posts, Variants, Schedules, Templates | Right-slide edit form |
| `DeleteConfirmModal.vue` | Posts, Schedules, Templates, Users | Confirmation dialog |
| `DataGrid.vue` | All list views | Sortable, filterable grid |
| `ToastNotification.vue` | All actions | Success/error feedback |
| `LoadingSpinner.vue` | All API calls | Loading indicator |
| `EmptyState.vue` | All grids | No data placeholder |
| `FilterBar.vue` | All grids | Filter controls |
| `Pagination.vue` | All grids | Page navigation |

---

## API Endpoints Summary

All flows interact with the luxaris-api backend via these base endpoints:

| Domain | Base Path | Flows |
|--------|-----------|-------|
| **System** | `/api/v1/system/*` | Authentication, Users, Admin |
| **Posts** | `/api/v1/posts/*` | Posts, Variants |
| **Channels** | `/api/v1/channels/*` | Channels, Connections |
| **Generation** | `/api/v1/posts/generate`, `/api/v1/templates/*` | AI Generation, Templates |
| **Scheduling** | `/api/v1/schedules/*` | Schedules, Calendar |
| **Operations** | `/api/v1/ops/*` | Feature Flags, Health |

---

## Error Handling

All flows implement consistent error handling:

### API Error Response Format

```json
{
    "errors": [
        {
            "error_code": "VALIDATION_ERROR",
            "error_description": "Email format is invalid",
            "error_severity": "error"
        }
    ]
}
```

### Error Severities

- **error** (red) - Critical error, operation failed
- **warning** (yellow) - Operation succeeded with warnings
- **info** (blue) - Informational message

### Common Error Codes

| Code | HTTP | Handling |
|------|------|----------|
| `VALIDATION_ERROR` | 400 | Show inline errors, keep form open |
| `UNAUTHORIZED` | 401 | Refresh token, redirect to login |
| `FORBIDDEN` | 403 | Show permission error, disable action |
| `NOT_FOUND` | 404 | Redirect to 404 page or remove from grid |
| `CONFLICT` | 409 | Show conflict message, suggest resolution |
| `RATE_LIMIT_EXCEEDED` | 429 | Retry with backoff |
| `INTERNAL_SERVER_ERROR` | 500 | Generic error, retry option |

---

## Development Guidelines

### Creating New Flows

When adding new flows, follow this structure:

1. **Flow Document** - Add to appropriate flow-xxx.md file
2. **Components** - Create Vue components in `presentation/`
3. **API Repository** - Add methods in `infrastructure/api/`
4. **Store** - Add Pinia store in `infrastructure/store/`
5. **Composable** - Create use case in `application/composables/`
6. **Routes** - Define routes in `presentation/routes.js`
7. **Tests** - Write unit and E2E tests

### Documentation Standards

Each flow should document:
- **Route/Trigger** - How users access the flow
- **Components** - Vue components used
- **API** - Endpoint(s) called
- **Permission** - Required permission
- **Flow Steps** - Numbered, detailed steps
- **Validation** - Rules and error handling
- **Success Actions** - What happens on success
- **Error Handling** - Error scenarios and responses

---

## Summary

**Total Flows:** 64  
**Total Documents:** 9  
**Total Components:** ~50  
**API Endpoints:** ~40  

All flows are production-ready with:
- ✅ Complete user interactions documented
- ✅ API integration specified
- ✅ Error handling defined
- ✅ Responsive design considered
- ✅ Permission requirements stated
- ✅ Real-time validation included
- ✅ Loading states defined
- ✅ Success/error feedback specified
- ✅ **PrimeVue components integrated**
- ✅ **i18n multi-language support**
- ✅ **RTL layout ready**
- ✅ **Google OAuth authentication**
- ✅ **UI stateful presets system**
- ✅ **Root admin workflow**
- ✅ **User approval workflow**
- ✅ **Permission-based menu visibility**

---

**Ready for Implementation!**

Developers can use these flow documents as complete specifications to build the Luxaris Dashboard with confidence that all user interactions are well-defined, consistent, and incorporate modern best practices including:
- OAuth 2.0 social login
- Personalized UI with persistent preferences
- Comprehensive permission system
- Multi-language internationalization
- Auto-saving user settings
- Admin approval workflows


# Admin & User Management Flows

Complete flows for user administration, profile management, and system configuration in the Luxaris Dashboard.

---

## Flow Pattern

Admin flows handle user management, permissions, and system configuration. These flows are restricted to users with administrative privileges.

**Standard Pattern:**
- List entities (users, settings)
- Manage permissions and approvals
- Configure system settings
- Monitor system health

---

## 1. User Profile

**Route:** `/dashboard/profile`  
**Components:** `ProfileView.vue`, `ProfileEditPanel.vue`  
**API:** `GET /api/v1/users/me`, `PATCH /api/v1/users/me`  
**Permission:** Authenticated user (self)

### Flow Steps

1. **Navigation**
   - Click user avatar in top bar
   - Select "Profile" from dropdown
   - Navigate to `/dashboard/profile`

2. **Display Profile**
   - **Header**
     - Avatar (large)
     - Name
     - Email
     - Role badges
     - "Edit Profile" button
   
   - **Personal Information**
     - Full name
     - Email address
     - Timezone
     - Account created date
     - Last login date
   
   - **Preferences**
     - Language
     - Date format
     - Time format (12h/24h)
     - Email notifications (on/off)
   
   - **Statistics** (if applicable)
     - Posts created: X
     - Posts published: Y
     - Templates created: Z

3. **Edit Profile**
   - Click "Edit Profile" button
   - Right panel slides in
   - Form pre-filled with current data

4. **Edit Form Fields**
   - **Name** (required)
     - Text input, max 100 characters
   
   - **Email** (required)
     - Email input
     - Validation: Valid email format
     - Warning if changing: "Confirmation email will be sent"
   
   - **Timezone** (required)
     - Searchable dropdown
     - Common timezones at top
     - Shows current time in selected TZ
   
   - **Avatar** (optional)
     - File upload or URL
     - Drag-and-drop support
     - Crop/resize tool
     - Max 2MB, formats: JPG, PNG
     - Preview thumbnail
   
   - **Preferences**
     - Language dropdown
     - Date format radio buttons
     - Time format toggle
     - Email notifications toggle

5. **Submit Changes**
   ```javascript
   PATCH /api/v1/users/me
   Body: {
       name: "Updated Name",
       email: "new@example.com",
       timezone: "America/New_York",
       preferences: {
           language: "en",
           date_format: "MM/DD/YYYY",
           time_format: "12h",
           email_notifications: true
       }
   }
   ```

6. **Success Actions**
   - Close edit panel
   - Success toast: "Profile updated successfully"
   - Update profile display
   - If email changed: "Confirmation email sent to new address"
   - Reflect timezone changes across app

---

## 2. Change Password

**Route:** `/dashboard/profile/security`  
**Components:** `SecurityView.vue`, `ChangePasswordPanel.vue`  
**API:** `POST /api/v1/system/auth/change-password`  
**Permission:** Authenticated user

### Flow Steps

1. **Navigation**
   - From profile, click "Security" tab
   - Or: User menu → "Security"
   - Display security settings page

2. **Security Page**
   - **Change Password** section
     - Last changed: [date]
     - "Change Password" button
   
   - **Active Sessions** (future)
     - List of active sessions
     - Logout other sessions
   
   - **Two-Factor Authentication** (future)
     - Enable/disable 2FA

3. **Open Change Password Panel**
   - Click "Change Password" button
   - Right panel slides in
   - Show password change form

4. **Form Fields**
   - **Current Password** (required)
     - Password input
     - Show/hide toggle
     - Autofocus on this field
   
   - **New Password** (required)
     - Password input
     - Show/hide toggle
     - Password strength meter
     - Requirements:
       - Min 8 characters
       - At least 1 uppercase
       - At least 1 lowercase
       - At least 1 number
       - At least 1 special character
   
   - **Confirm New Password** (required)
     - Password input
     - Must match new password
     - Real-time validation

5. **Real-time Validation**
   - Current password: Not empty
   - New password: Meets all requirements
   - Confirm: Matches new password
   - New ≠ Current password

6. **Submit Change**
   ```javascript
   POST /api/v1/system/auth/change-password
   Body: {
       current_password: "oldPass123",
       new_password: "newSecurePass456!"
   }
   ```

7. **Success Actions**
   - Close panel
   - Success toast: "Password changed successfully"
   - Optional: Force logout and re-login
   - Send confirmation email

### Error Handling

**Incorrect Current Password**
```json
{
    "errors": [{
        "error_code": "INVALID_CURRENT_PASSWORD",
        "error_description": "Current password is incorrect",
        "error_severity": "error"
    }]
}
```
- Highlight current password field
- Clear current password
- Keep new passwords (if valid)

**Weak New Password**
```json
{
    "errors": [{
        "error_code": "WEAK_PASSWORD",
        "error_description": "Password does not meet security requirements",
        "error_severity": "error"
    }]
}
```
- Highlight new password field
- Show specific requirement failures
- Keep other fields

---

## 3. List Users (Admin Only)

**Route:** `/dashboard/admin/users`  
**Components:** `UsersAdminView.vue`, `UsersGrid.vue`  
**API:** `GET /api/v1/system/admin/users`  
**Permission:** `system:admin`

### Flow Steps

1. **Navigation**
   - Click "Admin" in sidebar
   - Select "Users" submenu
   - Navigate to `/dashboard/admin/users`
   - Show loading skeleton

2. **API Request**
   ```javascript
   GET /api/v1/system/admin/users?page=1&limit=20
   ```

3. **Display Users Grid**
   - Table layout with columns:
     - **Avatar** - User photo
     - **Name** - Full name
     - **Email** - Email address
     - **Status** - Badge:
       - Pending (yellow) - Awaiting approval
       - Approved (green) - Active user
       - Suspended (red) - Account suspended
     - **Roles** - Role badges (Admin, User, etc.)
     - **Created** - Account creation date
     - **Last Login** - Last login timestamp
     - **Actions** - Dropdown:
       - Approve (if pending)
       - Edit Roles
       - Suspend/Activate
       - Delete

4. **Toolbar Features**
   - **Search**: Name or email search
   - **Filter by Status**: All / Pending / Approved / Suspended
   - **Filter by Role**: All / Admin / User
   - **Sort**: Name, Created date, Last login
   - **Bulk Actions**: Select multiple → Approve/Delete

5. **Pending Users Highlight**
   - Yellow banner at top if pending users exist
   - "X users awaiting approval"
   - "Review Now" button

---

## 4. Approve User (Admin Only)

**Trigger:** "Approve" button on pending user row  
**Components:** `ApproveUserModal.vue`  
**API:** `POST /api/v1/system/admin/users/:id/approve`  
**Permission:** `system:admin`

### Flow Steps

1. **Trigger Approval**
   - Click "Approve" on pending user
   - Modal appears with user details

2. **Approval Modal**
   - Title: "Approve User"
   - **User Information**:
     - Name
     - Email
     - Registered on: [date]
   - **Assign Role** (required)
     - Radio buttons: User (default) / Admin
     - Role descriptions:
       - **User**: Can create posts, schedules, templates
       - **Admin**: Full access + user management
   - **Welcome Email**
     - Checkbox: "Send welcome email" (checked by default)
   - Buttons: "Cancel" / "Approve"

3. **Confirm Approval**
   - Click "Approve" button
   - Show loading state
   - Disable buttons

4. **API Request**
   ```javascript
   POST /api/v1/system/admin/users/:id/approve
   Body: {
       role: "user",
       send_welcome_email: true
   }
   ```

5. **Success Actions**
   - Close modal
   - Success toast: "User approved successfully"
   - Update user row:
     - Status → "Approved"
     - Role badge appears
   - User receives welcome email (if enabled)
   - User can now login

---

## 5. Edit User Roles (Admin Only)

**Trigger:** "Edit Roles" in user actions  
**Components:** `EditRolesModal.vue`  
**API:** `PATCH /api/v1/system/admin/users/:id/roles`  
**Permission:** `system:admin`

### Flow Steps

1. **Open Edit Roles Modal**
   - Click "Edit Roles" for user
   - Modal displays current roles

2. **Role Selection**
   - Checkboxes for available roles:
     - ☐ Admin
     - ☐ User
     - ☐ Content Manager (future)
     - ☐ Analyst (future)
   - User must have at least one role
   - Show role descriptions

3. **Submit Changes**
   ```javascript
   PATCH /api/v1/system/admin/users/:id/roles
   Body: {
       roles: ["user", "admin"]
   }
   ```

4. **Success**
   - Close modal
   - Success toast: "Roles updated"
   - Update role badges in grid
   - User's permissions updated immediately

---

## 6. Suspend/Activate User (Admin Only)

**Trigger:** "Suspend" or "Activate" in user actions  
**API:** `POST /api/v1/system/admin/users/:id/suspend` or `/activate`  
**Permission:** `system:admin`

### Suspend Flow

1. **Trigger Suspend**
   - Click "Suspend" on active user
   - Confirmation modal

2. **Confirmation**
   - Title: "Suspend User?"
   - Warning: "User will be logged out and cannot access the system"
   - Optional: "Reason for suspension" (text area)
   - Buttons: "Cancel" / "Suspend"

3. **API Request**
   ```javascript
   POST /api/v1/system/admin/users/:id/suspend
   Body: {
       reason: "Violation of terms"
   }
   ```

4. **Success**
   - User status → "Suspended"
   - User is logged out
   - Cannot login until activated

### Activate Flow

1. **Trigger Activate**
   - Click "Activate" on suspended user

2. **Confirmation**
   - Simple confirm: "Reactivate this user?"
   - Buttons: "Cancel" / "Activate"

3. **Success**
   - User status → "Approved"
   - User can login again

---

## 7. Delete User (Admin Only)

**Trigger:** "Delete" in user actions  
**API:** `DELETE /api/v1/system/admin/users/:id`  
**Permission:** `system:admin`

### Flow Steps

1. **Trigger Delete**
   - Click "Delete" on user
   - Confirmation modal with strong warnings

2. **Confirmation Modal**
   - Title: "Delete User?"
   - **Warnings**:
     - ⚠️ "This action is permanent and cannot be undone"
     - ⚠️ "User's posts, templates, and schedules will be affected"
   - **Options**:
     - Radio: "Delete user only (keep content)"
     - Radio: "Delete user and all content"
   - Type to confirm: "DELETE"
   - Buttons: "Cancel" / "Delete User"

3. **Confirm Deletion**
   - API: `DELETE /api/v1/system/admin/users/:id?keep_content=true`
   - Success: Remove from grid
   - Toast: "User deleted"

---

## 8. Feature Flags (Admin Only)

**Route:** `/dashboard/admin/feature-flags`  
**Components:** `FeatureFlagsView.vue`, `FeatureFlagsGrid.vue`  
**API:** `GET /api/v1/ops/feature-flags`  
**Permission:** `system:admin`

### Flow Steps

1. **Navigation**
   - Admin menu → "Feature Flags"
   - Display feature flags page

2. **Display Flags**
   - Table with columns:
     - **Flag Name** - Technical name
     - **Description** - Human-readable description
     - **Status** - Toggle switch (on/off)
     - **Updated** - Last changed timestamp
     - **Updated By** - Admin who changed

3. **Toggle Flag**
   - Click toggle switch
   - Immediate API call
   - No confirmation (can toggle back)

4. **API Request**
   ```javascript
   PATCH /api/v1/ops/feature-flags/:flag_name
   Body: {
       enabled: true
   }
   ```

5. **Success**
   - Toggle updates
   - Toast: "Feature flag updated"
   - Takes effect immediately app-wide

---

## 9. Health Check (Admin Only)

**Route:** `/dashboard/admin/health`  
**Components:** `HealthView.vue`  
**API:** `GET /api/v1/ops/health`  
**Permission:** `system:admin`

### Flow Steps

1. **Navigation**
   - Admin menu → "Health"
   - Display system health dashboard

2. **Health Dashboard**
   - **Services Status**:
     - Database: ✅ Connected / ❌ Disconnected
     - Cache (Memcached): ✅ Connected / ❌ Disconnected
     - Queue: ✅ Connected / ❌ Disconnected
     - AI Service: ✅ Available / ❌ Unavailable
   
   - **System Info**:
     - API Version: 1.0.0
     - Uptime: X days
     - Environment: Production
   
   - **Metrics** (if available):
     - Active users: X
     - Pending schedules: Y
     - Queue size: Z

3. **Auto-refresh**
   - Refreshes every 30 seconds
   - Visual indicator: "Last updated: X seconds ago"
   - Manual refresh button

4. **Service Details**
   - Click service name for details
   - Shows connection info, response time

---

## Summary

**Admin & User Management Flows:** 9 flows

**User Flows:**
1. **User Profile** - View and edit personal profile
2. **Change Password** - Secure password update

**Admin Flows:**
3. **List Users** - View all users with filtering
4. **Approve User** - Approve pending registrations
5. **Edit User Roles** - Manage user permissions
6. **Suspend/Activate User** - Control user access
7. **Delete User** - Remove users and optionally content

**System Flows:**
8. **Feature Flags** - Toggle feature availability
9. **Health Check** - Monitor system health

**Key Features:**
- ✅ Self-service profile management
- ✅ Secure password change with validation
- ✅ Admin approval workflow
- ✅ Role-based access control
- ✅ User suspension capability
- ✅ Feature flag management
- ✅ System health monitoring
- ✅ Audit trail (updated by, timestamps)
- ✅ Bulk actions support
- ✅ Real-time health updates

# Authentication Flows

Complete authentication and authorization flows for the Luxaris Dashboard.

---

## Flow Pattern

All authentication flows follow secure JWT-based authentication with token refresh capability.

**Standard Pattern:**
1. User provides credentials
2. API validates and returns tokens
3. Client stores tokens securely
4. Subsequent requests include token
5. Auto-refresh on token expiration

---

## 1. User Login

**Route:** `/login`  
**Components:** `LoginView.vue`  
**API:** `POST /api/v1/system/auth/login`  
**Layout:** `AuthLayout`

### Flow Steps

1. **Initial State**
   - User navigates to `/login`
   - Display login form with email and password fields
   - "Remember me" checkbox (optional)
   - Link to registration page

2. **Input Validation**
   - Email format validation (client-side)
   - Password minimum length check
   - Enable submit button only when valid

3. **Submit Credentials**
   - User clicks "Login" button
   - Show loading state on button
   - Disable form inputs during submission

4. **API Request**
   ```javascript
   POST /api/v1/system/auth/login
   Body: {
       email: "user@example.com",
       password: "securePassword123"
   }
   ```

5. **Success Response**
   ```json
   {
       "access_token": "eyJhbGc...",
       "refresh_token": "eyJhbGc...",
       "user": {
           "id": "uuid",
           "email": "user@example.com",
           "name": "John Doe",
           "roles": ["user"]
       }
   }
   ```

6. **Store Tokens**
   - Save `access_token` to localStorage
   - Save `refresh_token` to localStorage
   - Store user profile in Pinia store
   - Set authentication state to `true`

7. **Redirect to Dashboard**
   - Navigate to `/dashboard`
   - Show welcome notification
   - Load initial dashboard data

### Error Handling

**Invalid Credentials (401)**
```json
{
    "errors": [{
        "error_code": "INVALID_CREDENTIALS",
        "error_description": "Invalid email or password",
        "error_severity": "error"
    }]
}
```
- Display error message below form
- Clear password field
- Refocus on password input

**Account Pending Approval (403)**
```json
{
    "errors": [{
        "error_code": "ACCOUNT_PENDING_APPROVAL",
        "error_description": "Your account is pending admin approval",
        "error_severity": "warning"
    }]
}
```
- Show warning message
- Provide "Contact Admin" link

**Network Error**
- Display "Unable to connect to server"
- Show "Retry" button
- Keep form data intact

### Security Considerations

- Never display specific error (email vs password)
- Implement rate limiting on client (prevent spam)
- Clear password field on error
- No auto-complete on password (optional)
- HTTPS only in production

---

## 2. User Registration

**Route:** `/register`  
**Components:** `RegisterView.vue`  
**API:** `POST /api/v1/system/auth/register`  
**Layout:** `AuthLayout`

### Flow Steps

1. **Initial State**
   - User navigates to `/register`
   - Display registration form with fields:
     - Full name (required)
     - Email (required)
     - Password (required)
     - Confirm password (required)
   - Terms of service checkbox
   - Link to login page

2. **Real-time Validation**
   - **Name**: Minimum 2 characters
   - **Email**: Valid email format
   - **Password**: 
     - Minimum 8 characters
     - At least one uppercase letter
     - At least one lowercase letter
     - At least one number
     - At least one special character
   - **Confirm Password**: Must match password
   - Show validation feedback as user types

3. **Password Strength Indicator**
   - Visual indicator (weak/medium/strong)
   - Color-coded: red/yellow/green
   - Update in real-time

4. **Submit Registration**
   - User clicks "Register" button
   - All fields must be valid
   - Terms checkbox must be checked
   - Show loading state

5. **API Request**
   ```javascript
   POST /api/v1/system/auth/register
   Body: {
       name: "John Doe",
       email: "john@example.com",
       password: "SecurePass123!"
   }
   ```

6. **Success Response (First User)**
   ```json
   {
       "access_token": "eyJhbGc...",
       "refresh_token": "eyJhbGc...",
       "user": {
           "id": "uuid",
           "email": "john@example.com",
           "name": "John Doe",
           "status": "approved",
           "roles": ["admin"]
       }
   }
   ```
   - First user is auto-approved as admin
   - Store tokens
   - Redirect to `/dashboard`

7. **Success Response (Subsequent Users)**
   ```json
   {
       "message": "Registration successful. Please wait for admin approval.",
       "user": {
           "id": "uuid",
           "email": "john@example.com",
           "name": "John Doe",
           "status": "pending"
       }
   }
   ```
   - Show success message
   - Explain approval process
   - Redirect to login with info message

### Error Handling

**Email Already Exists (409)**
```json
{
    "errors": [{
        "error_code": "EMAIL_ALREADY_EXISTS",
        "error_description": "An account with this email already exists",
        "error_severity": "error"
    }]
}
```
- Highlight email field
- Show error below field
- Suggest "Login instead" link

**Validation Errors (400)**
```json
{
    "errors": [
        {
            "error_code": "INVALID_EMAIL",
            "error_description": "Email format is invalid",
            "error_severity": "error"
        },
        {
            "error_code": "WEAK_PASSWORD",
            "error_description": "Password must be at least 8 characters",
            "error_severity": "error"
        }
    ]
}
```
- Show all errors
- Highlight affected fields
- Keep valid data intact

### UI Enhancements

- Show/hide password toggle icons
- Password strength meter
- Email availability check (debounced)
- Auto-focus on first field
- Tab navigation between fields

---

## 3. Logout

**Trigger:** User menu → "Logout"  
**API:** `POST /api/v1/system/auth/logout`  
**Location:** Any authenticated page

### Flow Steps

1. **User Action**
   - User clicks profile avatar/menu
   - Dropdown shows user info and "Logout" option
   - User clicks "Logout"

2. **Confirmation (Optional)**
   - Show confirmation dialog
   - "Are you sure you want to logout?"
   - "Cancel" / "Logout" buttons
   - (Can be disabled in settings)

3. **API Request**
   ```javascript
   POST /api/v1/system/auth/logout
   Headers: {
       Authorization: "Bearer {access_token}"
   }
   Body: {
       refresh_token: "{refresh_token}"
   }
   ```

4. **Server-Side Cleanup**
   - Revoke refresh token
   - Blacklist access token
   - Clear user session

5. **Client-Side Cleanup**
   - Remove `access_token` from localStorage
   - Remove `refresh_token` from localStorage
   - Clear all Pinia stores
   - Reset application state
   - Clear any cached data

6. **Redirect to Login**
   - Navigate to `/login`
   - Show "Logged out successfully" message
   - Clear browser history (optional)

### Error Handling

**Network Error**
- Still perform client-side cleanup
- Log error for debugging
- Continue with logout flow
- User sees success message

**Token Already Invalid**
- Ignore error
- Complete logout flow normally
- Redirect to login

### Security Considerations

- Always clear tokens, even if API fails
- Clear sensitive data from memory
- Invalidate any active subscriptions
- Close WebSocket connections (if any)

---

## 4. Automatic Token Refresh

**Trigger:** API returns 401 Unauthorized  
**API:** `POST /api/v1/system/auth/refresh`  
**Transparent to User:** Yes

### Flow Steps

1. **Token Expiration Detected**
   - Any API request returns 401
   - Luminara interceptor catches error
   - Check if refresh_token exists

2. **Refresh Token Request**
   ```javascript
   POST /api/v1/system/auth/refresh
   Body: {
       refresh_token: "{refresh_token}"
   }
   ```

3. **Success Response**
   ```json
   {
       "access_token": "eyJhbGc...",
       "refresh_token": "eyJhbGc..." // Optional: rotated token
   }
   ```
   - Update `access_token` in localStorage
   - Update `refresh_token` if provided (token rotation)
   - Retry original failed request with new token

4. **Retry Original Request**
   - Automatically retry the original API call
   - User doesn't see any interruption
   - Request completes normally

5. **Refresh Failure**
   - Refresh token is invalid/expired
   - Clear all tokens
   - Clear Pinia stores
   - Redirect to `/login`
   - Show "Session expired. Please login again."

### Implementation Details

**Luminara Interceptor**
```javascript
interceptors: {
    error: async (error) => {
        if (error.response?.status === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                // Retry original request
                return apiClient.request(error.config);
            }
            // Redirect to login
            router.push('/login');
        }
        throw error;
    }
}
```

**Refresh Function**
```javascript
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;
    
    try {
        const response = await axios.post('/api/v1/system/auth/refresh', {
            refresh_token: refreshToken
        });
        
        localStorage.setItem('access_token', response.data.access_token);
        if (response.data.refresh_token) {
            localStorage.setItem('refresh_token', response.data.refresh_token);
        }
        
        return true;
    } catch (error) {
        return false;
    }
}
```

---

## 5. Password Change

**Route:** `/dashboard/profile/security`  
**Components:** `SecurityView.vue`, `ChangePasswordPanel.vue`  
**API:** `POST /api/v1/system/auth/change-password`  
**Requires:** Authenticated user

### Flow Steps

1. **Navigation**
   - User navigates to Profile → Security
   - Display security settings page
   - "Change Password" section visible

2. **Open Change Panel**
   - Click "Change Password" button
   - Right panel slides in
   - Display password change form

3. **Form Fields**
   - Current password (required)
   - New password (required)
   - Confirm new password (required)
   - Password strength indicator
   - Show/hide password toggles

4. **Validation**
   - Current password: Not empty
   - New password: Meets strength requirements
   - Confirm: Matches new password
   - New password ≠ Current password

5. **Submit Change**
   ```javascript
   POST /api/v1/system/auth/change-password
   Headers: {
       Authorization: "Bearer {access_token}"
   }
   Body: {
       current_password: "oldPass123",
       new_password: "newPass456!"
   }
   ```

6. **Success Response**
   - Show success notification
   - Close edit panel
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
- Show error message
- Clear current password field

---

## Summary

**Authentication Flows:** 5 core flows

1. **Login** - Standard email/password authentication with JWT
2. **Registration** - Account creation with first-user admin auto-approval
3. **Logout** - Secure token revocation and cleanup
4. **Token Refresh** - Automatic, transparent token renewal
5. **Password Change** - Secure password update flow

**Security Features:**
- ✅ JWT-based authentication
- ✅ Automatic token refresh
- ✅ Secure token storage (localStorage)
- ✅ Token revocation on logout
- ✅ Password strength validation
- ✅ Rate limiting protection
- ✅ HTTPS enforcement (production)
- ✅ Session management

**Pattern Compliance:**
- ✅ Clear error messaging
- ✅ Loading states on all actions
- ✅ Client-side validation
- ✅ Secure token handling
- ✅ Graceful error recovery

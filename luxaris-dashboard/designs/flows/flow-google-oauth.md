# Google OAuth Authentication Flows

Complete Google OAuth login and registration flows for the Luxaris Dashboard.

---

## Flow Pattern

Google OAuth flows follow OAuth 2.0 standard with state validation for CSRF protection.

**OAuth Pattern:**
1. User initiates OAuth (clicks "Login with Google")
2. Redirect to Google consent screen
3. User authorizes application
4. Google redirects to API callback with code
5. API exchanges code for tokens
6. API creates/updates user account
7. API returns JWT tokens or pending status
8. Frontend stores tokens and redirects

---

## 1. Google OAuth Login

**Route:** `/login`  
**Components:** `LoginView.vue`, `GoogleOAuthCallback.vue`  
**API:** `GET /api/v1/system/auth/google`, `GET /api/v1/system/auth/google/callback`  
**Layout:** `AuthLayout`

### Flow Steps

1. **User Initiates OAuth**
   - User is on `/login` page
   - User sees "Login with Google" button with Google icon
   - User clicks button

2. **Redirect to OAuth Endpoint**
   ```javascript
   window.location.href = '/api/v1/system/auth/google';
   ```

3. **API Generates State**
   - Generate random state parameter (CSRF token)
   - Store state in session/cache (Redis) with 5min TTL
   - Build Google OAuth URL

4. **Redirect to Google**
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=YOUR_CLIENT_ID&
     redirect_uri=http://localhost:3000/api/v1/system/auth/google/callback&
     scope=email+profile+openid&
     state=RANDOM_STATE&
     response_type=code
   ```

5. **User Authorizes on Google**
   - Google displays consent screen
   - Shows requested permissions (email, profile)
   - User clicks "Allow"

6. **Google Redirects to API Callback**
   ```
   GET /api/v1/system/auth/google/callback?
     code=AUTHORIZATION_CODE&
     state=RANDOM_STATE
   ```

7. **API Validates State**
   - Check state parameter matches stored state
   - If mismatch: Return error "Invalid OAuth state"
   - If match: Continue

8. **API Exchanges Code for Token**
   ```javascript
   POST https://oauth2.googleapis.com/token
   Body: {
     code: "AUTHORIZATION_CODE",
     client_id: "YOUR_CLIENT_ID",
     client_secret: "YOUR_CLIENT_SECRET",
     redirect_uri: "YOUR_CALLBACK_URL",
     grant_type: "authorization_code"
   }
   ```

9. **API Fetches User Info**
   ```javascript
   GET https://www.googleapis.com/oauth2/v2/userinfo
   Headers: { Authorization: "Bearer GOOGLE_ACCESS_TOKEN" }
   
   Response: {
     "id": "google_user_id_12345",
     "email": "user@gmail.com",
     "name": "John Doe",
     "picture": "https://lh3.googleusercontent.com/..."
   }
   ```

10. **API Checks if User Exists**
    - Query database for user by `google_id` OR `email`
    
    **Case A: Existing User**
    - Update `last_login_at` timestamp
    - Generate JWT tokens
    - Proceed to step 11

    **Case B: New User (First in System)**
    - Create user record:
      ```sql
      INSERT INTO users (
        id, google_id, email, name, avatar_url,
        is_root_admin, status, locale, timezone
      ) VALUES (
        uuid_generate_v4(), 'google_user_id_12345', 'user@gmail.com', 'John Doe',
        'https://...', TRUE, 'approved', 'en', 'UTC'
      )
      ```
    - Assign `root_admin` role
    - Create default UI preset
    - Generate JWT tokens
    - Proceed to step 11

    **Case C: New User (Subsequent)**
    - Create user record:
      ```sql
      INSERT INTO users (
        id, google_id, email, name, avatar_url,
        is_root_admin, status, locale, timezone
      ) VALUES (
        uuid_generate_v4(), 'google_user_id_12345', 'user@gmail.com', 'John Doe',
        'https://...', FALSE, 'pending', 'en', 'UTC'
      )
      ```
    - Assign `user` role
    - Create inactive UI preset
    - Send email notification to admins
    - Proceed to step 12 (pending flow)

11. **API Redirects to Frontend (Approved Users)**
    ```
    HTTP/1.1 302 Found
    Location: https://dashboard.luxaris.com/auth/callback?
      success=true&
      token=JWT_ACCESS_TOKEN&
      refresh_token=JWT_REFRESH_TOKEN
    ```

12. **API Redirects to Frontend (Pending Users)**
    ```
    HTTP/1.1 302 Found
    Location: https://dashboard.luxaris.com/auth/callback?
      pending=true&
      email=user@gmail.com
    ```

13. **Frontend Callback Handler**
    - Component: `GoogleOAuthCallback.vue` at `/auth/callback`
    - Parse URL query parameters
    
    **If `success=true`:**
    ```javascript
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('token');
    const refreshToken = urlParams.get('refresh_token');
    
    // Store tokens
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    
    // Decode JWT to get user info
    const user = jwtDecode(accessToken);
    
    // Store in Pinia
    authStore.setUser(user);
    authStore.setTokens(accessToken, refreshToken);
    
    // Load UI preset
    await presetStore.loadPreset(user.id);
    
    // Apply locale and RTL
    i18n.global.locale.value = user.locale;
    setupRTL(user.locale);
    
    // Redirect to dashboard
    router.push('/dashboard');
    
    // Show success toast
    toast.add({
      severity: 'success',
      summary: 'Logged in successfully',
      detail: `Welcome back, ${user.name}!`,
      life: 3000
    });
    ```
    
    **If `pending=true`:**
    ```javascript
    const email = urlParams.get('email');
    
    // Show pending message
    toast.add({
      severity: 'info',
      summary: 'Account Pending Approval',
      detail: 'Your account is pending administrator approval. You will receive an email once approved.',
      life: 10000
    });
    
    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login');
    }, 3000);
    ```

### Success Actions

- **Approved Users:**
  - Tokens stored in localStorage
  - User profile stored in authStore
  - UI preset loaded and applied
  - Locale and RTL settings applied
  - Redirect to `/dashboard`
  - Display success toast

- **Pending Users:**
  - Display pending approval message
  - Show estimated approval time (if configured)
  - Provide admin contact information
  - Redirect to `/login` after delay

### Error Handling

**OAuth State Mismatch**
```json
{
  "errors": [{
    "error_code": "INVALID_OAUTH_STATE",
    "error_description": "Invalid authentication state. Please try again.",
    "error_severity": "error"
  }]
}
```
- Redirect to login with error message
- Clear any stored state
- User must restart OAuth flow

**Google API Error**
```json
{
  "errors": [{
    "error_code": "OAUTH_PROVIDER_ERROR",
    "error_description": "Failed to authenticate with Google. Please try again.",
    "error_severity": "error"
  }]
}
```
- Redirect to login with error message
- Log error details for debugging
- Suggest alternative login methods

**Network Error**
- Display error toast: "Unable to connect. Please check your internet connection."
- Provide retry button
- Offer alternative login method (email/password)

### Security Considerations

1. **State Parameter:** Always validate state to prevent CSRF attacks
2. **HTTPS Only:** OAuth flow must use HTTPS in production
3. **Token Security:** JWT tokens include expiration and signature
4. **Scope Limitation:** Only request necessary Google permissions (email, profile)
5. **Token Storage:** Use localStorage (acceptable for SPA), consider httpOnly cookies for higher security

---

## 2. Google OAuth Registration

**Route:** `/register`  
**Components:** `RegisterView.vue`, `GoogleOAuthCallback.vue`  
**API:** Same as Login - `GET /api/v1/system/auth/google`, `GET /api/v1/system/auth/google/callback`  
**Layout:** `AuthLayout`

### Flow Steps

1. **User Initiates OAuth**
   - User is on `/register` page
   - User sees "Register with Google" button
   - User clicks button

2-13. **Follow Same Flow as Login**
    - Registration uses the same OAuth endpoints as login
    - API automatically determines if user is new or existing
    - New users are created with appropriate status (first user = root admin, others = pending)

### Differences from Login

- **UI Context:** Button labeled "Register with Google" instead of "Login"
- **User Expectation:** User expects account creation
- **First-Time Message:** Show "Creating your account..." during OAuth flow
- **Success Message:** "Account created successfully!" for new users

### Success Actions

Same as Google OAuth Login (see section 1).

### Error Handling

Same as Google OAuth Login (see section 1).

---

## 3. First User Experience (Root Admin)

**Special Flow for First User Registration**

### Flow Steps

1. **User registers** (via email/password OR Google OAuth)
2. **API detects no existing users** in database:
   ```sql
   SELECT COUNT(*) FROM users; -- Returns 0
   ```
3. **API creates user with special privileges:**
   ```sql
   INSERT INTO users (
     id, email, name, password_hash,
     is_root_admin, status, locale, timezone
   ) VALUES (
     uuid_generate_v4(), 'admin@example.com', 'Admin User', '$2b$10$...',
     TRUE, 'approved', 'en', 'UTC'
   );
   ```
4. **API assigns root_admin role:**
   ```sql
   INSERT INTO user_roles (user_id, role_id)
   SELECT users.id, roles.id
   FROM users, roles
   WHERE users.email = 'admin@example.com'
   AND roles.name = 'root_admin';
   ```
5. **API creates comprehensive default UI preset:**
   ```sql
   INSERT INTO user_ui_stateful_presets (
     user_id, preset_name, is_default, settings
   ) VALUES (
     user_id, 'Root Admin Default', TRUE,
     '{
       "menu": {"collapsed": false, "openedGroups": []},
       "grids": {},
       "preferences": {"theme": "light", "locale": "en", "timezone": "UTC"}
     }'::jsonb
   );
   ```
6. **API generates JWT tokens with root admin flag:**
   ```json
   {
     "sub": "user_uuid",
     "email": "admin@example.com",
     "name": "Admin User",
     "is_root_admin": true,
     "status": "approved",
     "roles": ["root_admin"],
     "permissions": ["*"],
     "iat": 1733400000,
     "exp": 1733486400
   }
   ```
7. **Client auto-logs in root admin**
8. **Client displays special welcome:**
   ```
   Welcome, Administrator!
   
   You are the first user and have been granted full administrator privileges.
   You can now:
   - Approve pending users
   - Manage roles and permissions
   - Configure system settings
   - Create UI presets for other users
   ```

### Root Admin Privileges

- **Permanent Status:** `is_root_admin` flag cannot be changed
- **Full Access:** All permissions granted automatically
- **Permission Bypass:** Permission checks always return true for root admin
- **Cannot be Suspended:** Root admin account cannot be suspended
- **Cannot be Deleted:** Root admin account cannot be deleted
- **Full Menu Visibility:** Sees all menu items regardless of permissions

---

## 4. Linking Google Account to Existing Email Account

**Flow for when Google email matches existing non-Google account**

### Scenario

User has existing email/password account with `user@example.com`.  
User tries to login with Google using same email `user@example.com`.

### Flow Steps

1. User initiates Google OAuth
2. User authorizes on Google
3. API receives Google user info with `email: user@example.com`
4. API queries: `SELECT * FROM users WHERE email = 'user@example.com'`
5. **User exists but `google_id` is NULL**
6. API **links Google account:**
   ```sql
   UPDATE users
   SET google_id = 'google_user_id_12345',
       avatar_url = 'https://lh3.googleusercontent.com/...'
   WHERE email = 'user@example.com';
   ```
7. API generates JWT tokens
8. API redirects to frontend with tokens
9. Client logs user in
10. Client displays toast:
    ```
    Google account linked successfully!
    You can now login with Google or email/password.
    ```

### Security Considerations

- **Email Verification:** Ensure Google email is verified
- **User Notification:** Send email notification about linked account
- **Audit Log:** Log account linking event
- **Revoke Option:** Allow user to unlink Google account in settings

---

## Components

### LoginView.vue

```vue
<template>
  <div class="auth-container">
    <Card class="auth-card">
      <template #title>{{ $t('auth.login') }}</template>
      <template #content>
        <!-- Email/Password Form -->
        <form @submit.prevent="handleEmailLogin">
          <div class="field">
            <label for="email">{{ $t('auth.email') }}</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              :placeholder="$t('auth.email')"
              required
            />
          </div>
          
          <div class="field">
            <label for="password">{{ $t('auth.password') }}</label>
            <Password
              id="password"
              v-model="password"
              :placeholder="$t('auth.password')"
              toggle-mask
              required
            />
          </div>
          
          <Button
            type="submit"
            :label="$t('auth.login')"
            :loading="loading"
            class="w-full"
          />
        </form>
        
        <!-- Divider -->
        <Divider align="center" type="solid">
          <span class="text-gray-500">{{ $t('common.or') }}</span>
        </Divider>
        
        <!-- Google OAuth Button -->
        <Button
          @click="handleGoogleLogin"
          :label="$t('auth.loginWithGoogle')"
          icon="pi pi-google"
          class="w-full p-button-outlined"
          severity="secondary"
        />
        
        <!-- Register Link -->
        <div class="text-center mt-4">
          <span>{{ $t('auth.noAccount') }}</span>
          <router-link to="/register" class="ml-2 text-primary">
            {{ $t('auth.register') }}
          </router-link>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/contexts/system/infrastructure/store/authStore';
import { useToast } from 'primevue/usetoast';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const email = ref('');
const password = ref('');
const loading = ref(false);

async function handleEmailLogin() {
  loading.value = true;
  try {
    await authStore.login({ email: email.value, password: password.value });
    router.push('/dashboard');
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Login Failed',
      detail: error.message || 'Invalid credentials',
      life: 5000
    });
  } finally {
    loading.value = false;
  }
}

function handleGoogleLogin() {
  // Redirect to Google OAuth endpoint
  window.location.href = '/api/v1/system/auth/google';
}
</script>
```

### GoogleOAuthCallback.vue

```vue
<template>
  <div class="oauth-callback-container">
    <div class="text-center">
      <ProgressSpinner v-if="processing" />
      <div v-if="pending" class="pending-message">
        <i class="pi pi-clock text-6xl text-orange-500 mb-4"></i>
        <h2>{{ $t('auth.pendingApproval') }}</h2>
        <p>{{ $t('auth.pendingApprovalMessage') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/contexts/system/infrastructure/store/authStore';
import { usePresetStore } from '@/core/store/presetStore';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import { setupRTL } from '@/core/i18n/rtl';
import { jwtDecode } from 'jwt-decode';

const router = useRouter();
const authStore = useAuthStore();
const presetStore = usePresetStore();
const toast = useToast();
const { locale } = useI18n();

const processing = ref(true);
const pending = ref(false);

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('success') === 'true') {
    // Successful authentication
    const accessToken = urlParams.get('token');
    const refreshToken = urlParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      // Store tokens
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      // Decode and store user
      const user = jwtDecode(accessToken);
      authStore.setUser(user);
      authStore.setTokens(accessToken, refreshToken);
      
      // Load UI preset
      await presetStore.loadPreset(user.id);
      
      // Apply locale and RTL
      locale.value = user.locale || 'en';
      setupRTL(locale.value);
      
      // Redirect to dashboard
      toast.add({
        severity: 'success',
        summary: 'Welcome!',
        detail: `Logged in successfully`,
        life: 3000
      });
      
      router.push('/dashboard');
    }
  } else if (urlParams.get('pending') === 'true') {
    // Account pending approval
    processing.value = false;
    pending.value = true;
    
    toast.add({
      severity: 'info',
      summary: 'Account Pending',
      detail: 'Your account is pending administrator approval.',
      life: 10000
    });
    
    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  } else {
    // Error case
    toast.add({
      severity: 'error',
      summary: 'Authentication Failed',
      detail: 'Failed to complete authentication. Please try again.',
      life: 5000
    });
    
    router.push('/login');
  }
});
</script>
```

---

## API Endpoints

### GET /api/v1/system/auth/google

**Purpose:** Initiate Google OAuth flow

**Response:** 302 Redirect to Google OAuth consent screen

---

### GET /api/v1/system/auth/google/callback

**Purpose:** Handle Google OAuth callback

**Query Parameters:**
- `code` - Authorization code from Google
- `state` - CSRF protection state

**Response:** 302 Redirect to frontend with tokens or pending status

---

## Summary

**Total Flows:** 4

1. **Google OAuth Login** - Existing users login with Google account
2. **Google OAuth Registration** - New users register with Google account
3. **First User Experience** - Special flow for root admin creation
4. **Account Linking** - Link Google account to existing email account

**Key Features:**
- ✅ OAuth 2.0 standard compliance
- ✅ CSRF protection with state parameter
- ✅ First user becomes root admin automatically
- ✅ Pending approval for subsequent users
- ✅ Account linking for existing email users
- ✅ Secure token management
- ✅ UI preset loading on login
- ✅ i18n locale and RTL support
- ✅ Comprehensive error handling
- ✅ PrimeVue components

**Security:**
- State validation prevents CSRF
- HTTPS required in production
- JWT tokens with expiration
- Secure token storage
- Audit logging for account linking

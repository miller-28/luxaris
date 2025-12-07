# Channel Management Flows

Complete flows for managing social media channel connections in the Luxaris Dashboard.

---

## Flow Pattern

Channel management involves connecting and managing social media accounts through OAuth authentication. The flow supports multiple platforms (X, LinkedIn, etc.) with secure token management.

**Standard Pattern:**
- Discover available channels
- Connect via OAuth
- Manage connections
- Monitor connection health
- Disconnect when needed

---

## 1. List Available Channels

**Route:** `/dashboard/channels`  
**Components:** `ChannelsView.vue`, `ChannelsGrid.vue`  
**API:** `GET /api/v1/channels`  
**Permission:** `channels:read`

### Flow Steps

1. **Navigation**
   - User clicks "Channels" in sidebar
   - Navigate to `/dashboard/channels`
   - Show loading skeleton

2. **API Request**
   ```javascript
   GET /api/v1/channels
   ```

3. **Response**
   ```json
   {
       "data": [
           {
               "id": "x",
               "slug": "x",
               "name": "X (Twitter)",
               "logo_url": "https://...",
               "description": "Connect your X account",
               "is_available": true,
               "oauth_supported": true
           },
           {
               "id": "linkedin",
               "slug": "linkedin",
               "name": "LinkedIn",
               "logo_url": "https://...",
               "description": "Connect your LinkedIn profile",
               "is_available": true,
               "oauth_supported": true
           }
       ]
   }
   ```

4. **Display Channels**
   - Card layout for each channel
   - Each card shows:
     - **Logo** - Channel icon/logo
     - **Name** - Platform name
     - **Description** - Brief description
     - **Status**:
       - If not connected: "Connect" button (primary)
       - If connected: "Connected" badge (green) + "Manage" button
     - **Features** - Supported features (posts, scheduling)

5. **Connection Status Check**
   - Parallel API call: `GET /api/v1/channels/connections`
   - Match connections to channels
   - Update UI to show connected state

---

## 2. Connect Channel (OAuth Flow)

**Trigger:** "Connect" button on channel card  
**Components:** `ChannelConnectModal.vue`  
**API:** `POST /api/v1/channels/connect`, OAuth callback  
**Permission:** `channels:connect`

### Flow Steps

1. **Initiate Connection**
   - Click "Connect" button on channel card
   - Modal appears with OAuth instructions

2. **Modal Content**
   - Title: "Connect [Channel Name]"
   - Instructions:
     - "You will be redirected to [Platform] to authorize Luxaris"
     - "Grant Luxaris permission to post on your behalf"
     - "You can revoke access anytime"
   - Privacy notice
   - Buttons: "Cancel" / "Authorize"

3. **Start OAuth Flow**
   - User clicks "Authorize"
   - API request to get OAuth URL

   ```javascript
   POST /api/v1/channels/connect
   Body: {
       channel_slug: "x"
   }
   Response: {
       authorization_url: "https://twitter.com/oauth/authorize?...",
       state: "random_state_token"
   }
   ```

4. **Redirect to Platform**
   - Open authorization_url in same window
   - Platform OAuth page loads
   - User sees permission request:
     - App name: "Luxaris"
     - Permissions: Post tweets, Read profile
     - Account selector (if multiple accounts)

5. **User Grants Permission**
   - User clicks "Authorize" on platform
   - Platform redirects back to dashboard:
     ```
     https://dashboard.luxaris.com/auth/callback?
         code=oauth_code_here&
         state=random_state_token&
         channel=x
     ```

6. **OAuth Callback Handler**
   - Dashboard receives callback
   - Extract `code` and `state`
   - Validate `state` matches stored value
   - Show loading overlay: "Connecting..."

7. **Exchange Code for Tokens**
   ```javascript
   POST /api/v1/channels/:channel_slug/callback
   Body: {
       code: "oauth_code_here",
       state: "random_state_token"
   }
   ```

8. **API Exchanges Tokens**
   - Backend calls platform OAuth token endpoint
   - Receives access_token and refresh_token
   - Stores tokens encrypted in database
   - Fetches platform account info
   - Creates channel_connection record

9. **Success Response**
   ```json
   {
       "connection": {
           "id": "uuid",
           "channel_slug": "x",
           "platform_user_id": "123456789",
           "platform_username": "@johndoe",
           "platform_display_name": "John Doe",
           "status": "active",
           "connected_at": "2025-12-04T10:00:00Z"
       }
   }
   ```

10. **Success Actions**
    - Close modal/loading overlay
    - Success toast: "X account connected successfully"
    - Update channel card to "Connected" state
    - Redirect to `/dashboard/channels/connections`
    - Show connected account info

### Error Handling

**User Denies Permission**
- Platform redirects with `error=access_denied`
- Show info toast: "Connection cancelled"
- Return to channels page
- Channel remains in "Not Connected" state

**OAuth Error**
```json
{
    "errors": [{
        "error_code": "OAUTH_FAILED",
        "error_description": "Failed to connect account. Please try again.",
        "error_severity": "error"
    }]
}
```
- Show error toast
- Provide "Try Again" button
- Log error for debugging

**Invalid State Token**
```json
{
    "errors": [{
        "error_code": "INVALID_STATE_TOKEN",
        "error_description": "Security validation failed. Please start over.",
        "error_severity": "error"
    }]
}
```
- Show error message
- Clear stored state
- Return to channels page

**Account Already Connected**
```json
{
    "errors": [{
        "error_code": "ACCOUNT_ALREADY_CONNECTED",
        "error_description": "This account is already connected to Luxaris",
        "error_severity": "warning"
    }]
}
```
- Show warning toast
- Redirect to connections page
- Highlight existing connection

---

## 3. List Channel Connections

**Route:** `/dashboard/channels/connections`  
**Components:** `ConnectionsView.vue`, `ConnectionsGrid.vue`  
**API:** `GET /api/v1/channels/connections`  
**Permission:** `channels:read`

### Flow Steps

1. **Navigation**
   - Click "My Connections" tab in channels
   - Or navigate directly to `/dashboard/channels/connections`
   - Show loading skeleton

2. **API Request**
   ```javascript
   GET /api/v1/channels/connections
   ```

3. **Response**
   ```json
   {
       "data": [
           {
               "id": "uuid",
               "channel_slug": "x",
               "channel_name": "X (Twitter)",
               "platform_user_id": "123456789",
               "platform_username": "@johndoe",
               "platform_display_name": "John Doe",
               "platform_avatar_url": "https://...",
               "status": "active",
               "connected_at": "2025-12-04T10:00:00Z",
               "last_sync_at": "2025-12-04T12:00:00Z",
               "token_expires_at": "2026-12-04T10:00:00Z"
           },
           {
               "id": "uuid2",
               "channel_slug": "linkedin",
               "channel_name": "LinkedIn",
               "platform_user_id": "xyz123",
               "platform_username": "john-doe",
               "platform_display_name": "John Doe",
               "platform_avatar_url": "https://...",
               "status": "error",
               "error_message": "Token expired",
               "connected_at": "2025-11-01T10:00:00Z",
               "last_sync_at": "2025-12-01T10:00:00Z"
           }
       ]
   }
   ```

4. **Display Connections**
   - Card/list layout for each connection
   - Each card shows:
     - **Channel Logo** - Platform icon
     - **Account Info**:
       - Avatar (circular)
       - Display name
       - Username (@handle)
     - **Status Badge**:
       - Active (green)
       - Error (red) - with error tooltip
       - Reconnecting (yellow)
     - **Metadata**:
       - Connected since: [date]
       - Last synced: [relative time]
     - **Actions**:
       - "Test Connection" button
       - "Disconnect" button (danger)

5. **Toolbar Features**
   - **Filter by Channel**: All / X / LinkedIn
   - **Filter by Status**: All / Active / Error
   - **Search**: By username or display name
   - **Refresh All**: Sync status of all connections

---

## 4. Test Connection

**Trigger:** "Test Connection" button  
**API:** `POST /api/v1/channels/connections/:id/test`  
**Permission:** `channels:read`

### Flow Steps

1. **Trigger Test**
   - Click "Test Connection" button
   - Show loading spinner on button
   - Disable button during test

2. **API Request**
   ```javascript
   POST /api/v1/channels/connections/:id/test
   ```

3. **API Actions**
   - Attempt to refresh access token
   - Make test API call to platform (e.g., verify credentials)
   - Check token validity
   - Update connection status

4. **Success Response**
   ```json
   {
       "status": "active",
       "message": "Connection is working correctly",
       "last_test_at": "2025-12-04T13:00:00Z"
   }
   ```
   - Show success toast: "Connection is active"
   - Update status badge to green
   - Update "Last synced" timestamp

5. **Error Response**
   ```json
   {
       "status": "error",
       "error_code": "TOKEN_EXPIRED",
       "message": "Access token has expired. Please reconnect.",
       "last_test_at": "2025-12-04T13:00:00Z"
   }
   ```
   - Show error toast with message
   - Update status badge to red
   - Show "Reconnect" button

---

## 5. Reconnect Channel

**Trigger:** "Reconnect" button (appears on error status)  
**Flow:** Same as "Connect Channel" OAuth flow  
**Note:** Replaces existing connection tokens

### Flow Steps

1. **Initiate Reconnect**
   - Click "Reconnect" button
   - Confirmation modal:
     - "Reconnect [Channel]?"
     - "This will re-authorize your [Platform] account"
     - Buttons: "Cancel" / "Reconnect"

2. **Start OAuth Flow**
   - Same as initial connection
   - OAuth flow with state validation
   - Platform authorization page

3. **Complete Reconnection**
   - Exchange code for new tokens
   - Update existing connection record (don't create new)
   - Update status to "active"
   - Success toast: "Connection restored"

---

## 6. Disconnect Channel

**Trigger:** "Disconnect" button on connection  
**Components:** `ConnectionsView.vue`, `DisconnectConfirmModal.vue`  
**API:** `DELETE /api/v1/channels/connections/:id`  
**Permission:** `channels:disconnect`

### Flow Steps

1. **Trigger Disconnect**
   - Click "Disconnect" button
   - Confirmation modal appears

2. **Confirmation Modal**
   - Title: "Disconnect [Channel Name]?"
   - Account info:
     - Avatar and username
     - Connected since: [date]
   - **Warnings**:
     - ⚠️ "All active schedules for this account will be cancelled"
     - ⚠️ "This action cannot be undone"
     - ⚠️ "You will need to re-authorize to reconnect"
   - **Affected Schedules** (if any):
     - Show count: "This will cancel X active schedules"
     - "View Schedules" link
   - Buttons:
     - "Cancel" (secondary)
     - "Disconnect" (danger, red)

3. **Confirm Disconnect**
   - User clicks "Disconnect"
   - Show loading state in modal
   - Disable buttons

4. **API Request**
   ```javascript
   DELETE /api/v1/channels/connections/:id
   ```

5. **API Actions**
   - Revoke OAuth tokens with platform (if supported)
   - Mark connection as disconnected
   - Cancel all pending schedules for this connection
   - Remove connection from database (soft delete)

6. **Success Response**
   ```json
   {
       "message": "Connection disconnected successfully",
       "cancelled_schedules": 3
   }
   ```

7. **Success Actions**
   - Close modal
   - Success toast: "X account disconnected. 3 schedules cancelled."
   - Remove connection from grid with fade animation
   - Update channel card to "Not Connected" state

### Error Handling

**Has Active Publishing**
```json
{
    "errors": [{
        "error_code": "HAS_ACTIVE_PUBLISHING",
        "error_description": "Cannot disconnect while posts are being published",
        "error_severity": "error"
    }]
}
```
- Show error in modal
- List active publishing tasks
- Suggest waiting or cancelling tasks first

**Connection Not Found**
- Show info toast: "Connection already removed"
- Remove from grid
- No error state

---

## 7. View Connection Details

**Trigger:** Click on connection card  
**Components:** `ConnectionDetailModal.vue`  
**API:** `GET /api/v1/channels/connections/:id`

### Modal Content

1. **Header**
   - Channel logo
   - Platform name
   - Status badge

2. **Account Information**
   - Avatar
   - Display name
   - Username/handle
   - Platform user ID
   - Profile URL (clickable)

3. **Connection Details**
   - Connected since: [date]
   - Last synced: [timestamp]
   - Token expires: [date]
   - Connection status: Active/Error

4. **Statistics** (if available)
   - Total posts published: X
   - Scheduled posts: Y
   - Last post: [date]

5. **Recent Activity**
   - Last 5 published posts
   - Success/failure status
   - Timestamps

6. **Actions**
   - Test Connection
   - View Schedules
   - Disconnect
   - Close

---

## Summary

**Channel Management Flows:** 7 flows

1. **List Available Channels** - Browse connectable platforms
2. **Connect Channel (OAuth)** - Secure OAuth connection flow
3. **List Channel Connections** - View all connected accounts
4. **Test Connection** - Verify connection health
5. **Reconnect Channel** - Restore failed connections
6. **Disconnect Channel** - Remove connection with confirmations
7. **View Connection Details** - Detailed connection information

**Key Features:**
- ✅ OAuth 2.0 authentication flow
- ✅ Secure token storage (encrypted)
- ✅ Token refresh handling
- ✅ Connection health monitoring
- ✅ Multiple account support per platform
- ✅ Schedule cancellation on disconnect
- ✅ Clear error messaging
- ✅ Test connection functionality
- ✅ Reconnect capability
- ✅ Activity tracking

**Security Considerations:**
- State token validation
- HTTPS required
- Encrypted token storage
- Token rotation support
- Secure callback handling
- CSRF protection

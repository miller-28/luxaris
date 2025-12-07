# UI Features & Cross-Cutting Concerns

Complete flows for notifications, search, responsive design, and error handling in the Luxaris Dashboard.

---

## Flow Pattern

These flows represent cross-cutting concerns that apply across all features:
- Notification system for user feedback
- Global search for quick navigation
- Responsive design for mobile/tablet
- Error handling for graceful failures

---

## Notification Flows

### 1. View Notifications (Notification Center)

**Trigger:** Bell icon in top bar  
**Components:** `NotificationCenter.vue`  
**API:** Future: WebSocket or polling  
**Location:** Top navigation bar

#### Flow Steps

1. **Bell Icon Display**
   - Always visible in top bar
   - Badge shows unread count (if > 0)
   - Animated pulse for new notifications

2. **Open Notification Center**
   - Click bell icon
   - Dropdown appears below icon
   - Width: 400px
   - Max height: 600px, scrollable

3. **Dropdown Content**
   - **Header**
     - Title: "Notifications"
     - "Mark all as read" link
     - Close button (X)
   
   - **Notification List**
     - Most recent first
     - Shows last 20 notifications
     - Each notification card:
       - Icon (based on type)
       - Title
       - Message
       - Timestamp (relative: "5 min ago")
       - Unread indicator (blue dot)
   
   - **Footer**
     - "View All Notifications" link
     - Navigates to `/dashboard/notifications`

4. **Notification Types**
   - **Success** (✅ green icon)
     - "Post published successfully"
     - "Schedule created"
     - "User approved"
   
   - **Error** (❌ red icon)
     - "Schedule failed to publish"
     - "Connection error"
   
   - **Warning** (⚠️ yellow icon)
     - "Connection token expiring soon"
     - "Schedule conflict detected"
   
   - **Info** (ℹ️ blue icon)
     - "New feature available"
     - "System maintenance scheduled"

5. **Interactions**
   - **Click Notification**
     - Navigate to related entity
     - Example: Click "Post published" → Go to post detail
     - Mark as read automatically
   
   - **Mark as Read**
     - Hover shows "Mark as read" icon
     - Click to mark individual notification
     - Blue dot disappears
   
   - **Mark All as Read**
     - Click header link
     - All notifications marked read
     - Badge count → 0

6. **Real-time Updates** (Future)
   - WebSocket connection
   - New notifications appear at top
   - Badge count increments
   - Optional sound/desktop notification

#### Empty State

- Message: "No notifications"
- Icon: Bell with checkmark
- Subtext: "You're all caught up!"

---

### 2. Toast Notifications

**Trigger:** Action completion (success/error/warning/info)  
**Components:** `ToastNotification.vue`  
**Store:** `notificationStore`  
**Location:** Top-right corner of screen

#### Flow Steps

1. **Trigger Toast**
   - Any action completes (success/error)
   - JavaScript call:
     ```javascript
     showToast('success', 'Post created successfully');
     showToast('error', 'Failed to save post');
     ```

2. **Toast Appearance**
   - Slides in from top-right
   - Animation: 200ms ease-out
   - Stacks vertically if multiple
   - Max 3 toasts visible at once

3. **Toast Design**
   - **Success** (green background)
     - ✅ Icon
     - Title: "Success"
     - Message: Action description
   
   - **Error** (red background)
     - ❌ Icon
     - Title: "Error"
     - Message: Error description
   
   - **Warning** (yellow background)
     - ⚠️ Icon
     - Title: "Warning"
     - Message: Warning description
   
   - **Info** (blue background)
     - ℹ️ Icon
     - Title: "Info"
     - Message: Information
   
   - Components:
     - Icon (left)
     - Text content (center)
     - Close button × (right)
     - Progress bar (bottom, optional)

4. **Toast Behavior**
   - **Duration**:
     - Success: 3 seconds
     - Error: 5 seconds
     - Warning: 4 seconds
     - Info: 3 seconds
   
   - **Auto-dismiss**
     - Fades out automatically after duration
     - Slides out to right
   
   - **Manual Dismiss**
     - Click close button (×)
     - Click anywhere on toast
     - Immediately closes

5. **Progress Bar** (Optional)
   - Shows time remaining
   - Animated from full to empty
   - Visual indicator of auto-dismiss

6. **Hover Behavior**
   - Pause auto-dismiss on hover
   - Resume on mouse leave
   - Prevents accidental dismissal

#### Toast Queue

- If > 3 toasts, queue remaining
- Oldest toast dismissed first
- New toasts wait until space available

#### Usage Examples

```javascript
// Success toast
showToast('success', 'Post created successfully');

// Error toast with longer duration
showToast('error', 'Failed to connect to server', 10000);

// Warning toast with action
showToast('warning', 'Connection expiring soon', {
    action: 'Reconnect',
    onClick: () => reconnectChannel()
});
```

---

## Search & Filter Flows

### 3. Global Search

**Trigger:** Search input in top bar  
**Components:** `GlobalSearch.vue`  
**API:** `GET /api/v1/search` (future implementation)  
**Location:** Top navigation bar (center)

#### Flow Steps

1. **Search Input**
   - Always visible in top bar
   - Placeholder: "Search posts, templates, schedules..."
   - Width: 300px (expands to 500px on focus)
   - Keyboard shortcut: Ctrl/Cmd + K

2. **User Types**
   - Focus on input
   - Input expands
   - Debounced search: 500ms after last keystroke
   - Show loading spinner during search

3. **API Request**
   ```javascript
   GET /api/v1/search?q=product+launch
   ```

4. **Results Dropdown**
   - Appears below search input
   - Width matches expanded input
   - Max height: 400px, scrollable
   - Grouped by entity type

5. **Results Display**
   - **Posts** section
     - Post icon
     - Title (highlighted match)
     - Content preview (first 100 chars)
     - Date created
   
   - **Templates** section
     - Template icon
     - Template name (highlighted match)
     - Category badge
   
   - **Schedules** section
     - Schedule icon
     - Post title
     - Scheduled time
     - Status badge
   
   - Each section shows max 5 results
   - "View all X posts" link at section bottom

6. **Navigation**
   - **Click Result**
     - Navigate to entity detail page
     - Close dropdown
     - Clear search input (optional)
   
   - **Keyboard Navigation**
     - Arrow Up/Down: Navigate results
     - Enter: Open selected result
     - Escape: Close dropdown

7. **Empty State**
   - No results found
   - Message: "No results for '{query}'"
   - Suggestions:
     - Check spelling
     - Try different keywords
     - Use filters

#### Search Features

- **Fuzzy matching**: Handles typos
- **Highlighting**: Matched terms highlighted
- **Recent searches**: Show last 5 searches
- **Quick filters**: "in:posts", "in:templates", "status:draft"

---

### 4. Grid Filtering

**Location:** All grid/list views  
**Components:** `FilterBar.vue`  
**Usage:** Posts, Schedules, Templates, Users, etc.

#### Flow Steps

1. **Filter Bar Display**
   - Located above grid/list
   - Horizontal layout
   - Contains filter chips and dropdowns

2. **Available Filters** (Example: Posts)
   - **Status Filter**
     - Dropdown: All / Draft / Published
     - Multi-select (checkboxes)
     - Apply button
   
   - **Date Range Filter**
     - Dropdown: Today / This Week / This Month / Custom
     - Custom: Date range picker
     - Apply button
   
   - **Tag Filter**
     - Multi-select dropdown
     - Search for tags
     - Shows tag count
     - Max 10 tags selected
   
   - **Channel Filter** (if applicable)
     - Checkboxes: X, LinkedIn, etc.
     - Select all / deselect all

3. **Apply Filters**
   - Filters apply immediately (or on "Apply" click)
   - API request with filter parameters
   - Grid updates with filtered results
   - URL parameters updated for sharing

4. **Active Filters Display**
   - Show as chips above grid
   - Each chip: "Status: Draft" with × button
   - Click × to remove filter
   - "Clear All Filters" button

5. **Filter Persistence**
   - Save to URL query parameters
   - Example: `?status=draft&tags=product,launch`
   - Shareable URL
   - Preserved on page reload

6. **Filter Count**
   - Badge on filter button: "Filters (3)"
   - Shows number of active filters

#### Example API Request

```javascript
GET /api/v1/posts?
    status=draft&
    tags=product,launch&
    date_from=2025-12-01&
    date_to=2025-12-31&
    page=1&
    limit=20
```

---

## Responsive & Mobile Flows

### 5. Mobile Navigation

**Trigger:** Screen width < 768px  
**Components:** `MobileSidebar.vue`, `MobileTopBar.vue`  
**Breakpoints:** Mobile (< 768px), Tablet (768px - 1024px), Desktop (> 1024px)

#### Flow Steps

1. **Mobile Layout**
   - Sidebar hidden by default
   - Hamburger menu icon in top-left
   - Simplified top bar
   - Full-width content area

2. **Open Mobile Menu**
   - Tap hamburger icon
   - Sidebar slides in from left
   - Overlay dims background (50% black)
   - Sidebar width: 80% of screen (max 320px)

3. **Mobile Sidebar Content**
   - User profile at top
   - Navigation menu items
   - Collapsible sub-menus
   - Logout button at bottom

4. **Close Mobile Menu**
   - Tap outside sidebar (on overlay)
   - Tap close button (×) in sidebar
   - Swipe left on sidebar
   - Sidebar slides out
   - Overlay fades out

5. **Edit Panels on Mobile**
   - Right-slide panels become full-screen modals
   - Header with back button
   - Content scrollable
   - Footer with action buttons

6. **Tables/Grids on Mobile**
   - Tables switch to card layout
   - Each row becomes a card
   - Horizontal scroll if table maintained
   - Pagination simplified

7. **Form Fields on Mobile**
   - Full-width inputs
   - Larger touch targets (min 44px)
   - Native mobile keyboards
   - Scroll to focused input

#### Tablet Layout (768px - 1024px)

- Sidebar visible but narrow (collapsed)
- Icons only, text on hover
- Edit panels remain slide-in (400px width)

---

### 6. Touch Gestures (Mobile)

**Devices:** Touch-enabled devices (phones, tablets)  
**Library:** Hammer.js or native touch events

#### Gestures

1. **Swipe Left on List Item**
   - Reveals action buttons
   - Example: Edit, Delete buttons
   - Swipe back to hide

2. **Swipe Right on Edit Panel**
   - Closes the panel
   - Alternative to tapping close button
   - Smooth animation

3. **Pull Down to Refresh**
   - On scrollable lists (posts, schedules)
   - Pull down from top
   - Release to refresh
   - Loading spinner appears
   - List refreshes from API

4. **Long Press**
   - On schedule cards in calendar
   - Enters drag mode
   - Allows repositioning
   - Drop to reschedule

5. **Pinch to Zoom** (Calendar View)
   - Pinch out: Zoom in (day view)
   - Pinch in: Zoom out (month view)
   - Smooth transitions

#### Implementation Notes

- Provide visual feedback for gestures
- Haptic feedback on supported devices
- Smooth animations (60fps)
- Fallback to buttons if gesture fails

---

## Error Handling Flows

### 7. Network Error

**Trigger:** API request fails (no network or timeout)  
**Components:** `ErrorBoundary.vue`, `NetworkErrorModal.vue`

#### Flow Steps

1. **Network Failure Detected**
   - API request times out or network unreachable
   - Luminara retry attempts exhausted
   - Error handler catches failure

2. **Error Display**
   - Full-screen modal overlay
   - Icon: Wi-Fi with X
   - Title: "Connection Lost"
   - Message: "Unable to connect to server. Check your internet connection."

3. **User Options**
   - **Retry Button** (primary)
     - Re-attempts failed request
     - Shows loading state
   
   - **Offline Mode** (secondary, future)
     - Browse cached data
     - Queue actions for later
   
   - **Dismiss** (tertiary)
     - Close modal
     - Return to last successful state

4. **Retry Outcome**
   - **Success**: Modal closes, continue operation
   - **Failure**: Show error again, suggest offline mode

5. **Background Retry** (Optional)
   - Auto-retry every 10 seconds
   - Show countdown: "Retrying in 10 seconds..."
   - User can cancel auto-retry

#### Offline Mode (Future)

- Read-only access to cached data
- Visual indicator: "Offline" banner
- Queue write operations
- Sync when connection restored

---

### 8. Permission Denied (403)

**Trigger:** API returns 403 Forbidden  
**Components:** `ForbiddenView.vue`

#### Flow Steps

1. **Permission Denied**
   - User attempts restricted action
   - API returns 403 status
   - Interceptor catches error

2. **Redirect to 403 Page**
   - Navigate to `/403`
   - Full-page error display

3. **Error Page Content**
   - Icon: Lock or shield
   - Title: "Access Denied"
   - Message: "You don't have permission to access this resource."
   - Details: "Contact your administrator if you believe this is an error."

4. **Actions**
   - **Go to Dashboard** button (primary)
     - Navigate to `/dashboard`
   
   - **Go Back** button (secondary)
     - Navigate to previous page
   
   - **Contact Support** link
     - Opens support email/form

5. **Inline Permission Errors**
   - For actions within pages (not navigation)
   - Show toast: "You don't have permission for this action"
   - Highlight restricted button as disabled
   - Tooltip: "Contact admin for access"

---

### 9. Not Found (404)

**Trigger:** Invalid route or deleted entity  
**Components:** `NotFoundView.vue`

#### Flow Steps

1. **404 Triggered**
   - User navigates to invalid URL
   - Or: Entity deleted while viewing
   - Route guard catches invalid path

2. **404 Page Display**
   - Icon: Compass or magnifying glass
   - Title: "Page Not Found"
   - Message: "The page you're looking for doesn't exist or has been moved."

3. **Helpful Features**
   - **Search Box**
     - "Search for what you're looking for"
     - Uses global search
   
   - **Popular Links**
     - Dashboard
     - Posts
     - Schedules
     - Templates
   
   - **Recent Pages** (from history)
     - Last 5 visited pages
     - Quick navigation back

4. **Actions**
   - **Go to Dashboard** button (primary)
   - **Go Back** button (secondary)
   - **Report Issue** link

#### Deleted Entity Handling

If viewing deleted entity:
- Show inline alert: "This post has been deleted"
- Option to restore (if soft delete)
- Redirect to list page after 5 seconds

---

## Summary

**UI Features & Cross-Cutting Flows:** 9 flows

**Notifications:**
1. **Notification Center** - Centralized notification inbox
2. **Toast Notifications** - Transient feedback messages

**Search & Filters:**
3. **Global Search** - Quick search across all entities
4. **Grid Filtering** - Contextual filtering in lists

**Responsive Design:**
5. **Mobile Navigation** - Adaptive menu for small screens
6. **Touch Gestures** - Mobile-friendly interactions

**Error Handling:**
7. **Network Error** - Graceful offline handling
8. **Permission Denied (403)** - Clear authorization errors
9. **Not Found (404)** - Helpful navigation recovery

**Key Features:**
- ✅ Real-time notifications (future: WebSocket)
- ✅ Toast system with auto-dismiss
- ✅ Debounced global search
- ✅ URL-persisted filters
- ✅ Mobile-first responsive design
- ✅ Touch gesture support
- ✅ Graceful error recovery
- ✅ Helpful error pages
- ✅ Retry mechanisms
- ✅ Offline mode (future)

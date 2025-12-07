# Scheduling Flows

Complete flows for managing post schedules and calendar in the Luxaris Dashboard.

---

## Flow Pattern

Scheduling allows users to plan when posts will be published to social media platforms. The system handles:
- Future scheduling with timezone support
- Queue management
- Automated publishing
- Status tracking
- Calendar visualization
- Publishing history

**Standard Pattern:**
- Create schedule for post variant
- System queues for publishing
- Automated execution at scheduled time
- Track results and history

---

## 1. List Schedules

**Route:** `/dashboard/schedules`  
**Components:** `SchedulesView.vue`, `SchedulesGrid.vue`  
**API:** `GET /api/v1/schedules`  
**Permission:** `schedules:read`

### Flow Steps

1. **Navigation**
   - Click "Schedules" in sidebar
   - Navigate to `/dashboard/schedules`
   - Show loading skeleton

2. **API Request**
   ```javascript
   GET /api/v1/schedules?page=1&limit=20&status=all
   ```

3. **Display Grid**
   - List/table layout for schedules
   - Each row shows:
     - **Post Title** - Linked to post detail
     - **Channel** - Icon + name (X, LinkedIn)
     - **Scheduled Time** - In user's timezone
       - Format: "Dec 5, 2025 at 2:30 PM EST"
       - Relative: "in 2 hours" / "tomorrow at 2:30 PM"
     - **Status Badge**:
       - Pending (blue) - Not yet queued
       - Queued (yellow) - In publishing queue
       - Publishing (orange) - Currently publishing
       - Published (green) - Successfully published
       - Failed (red) - Publishing failed
       - Cancelled (gray) - User cancelled
     - **Actions**:
       - Edit (if pending)
       - Cancel (if pending/queued)
       - Retry (if failed)
       - Delete
       - View Details

4. **Toolbar Features**
   - **Date Range Filter**: Today / This Week / This Month / Custom
   - **Status Filter**: All / Pending / Published / Failed
   - **Channel Filter**: All / X / LinkedIn
   - **Search**: Post title search
   - **Sort**: Scheduled time, Created date, Status
   - **View Toggle**: List / Calendar

5. **Pagination**
   - 20 schedules per page
   - Page navigation at bottom

### Empty State

**No Schedules**
- Message: "No schedules yet"
- Call-to-action: "Schedule your first post"
- Link to posts page

**No Results (Filtered)**
- Message: "No schedules match your filters"
- "Clear Filters" button

---

## 2. Create Schedule

**Trigger:** "Schedule" button in post detail  
**Location:** Post detail page  
**Components:** `ScheduleEditPanel.vue`  
**API:** `POST /api/v1/schedules`  
**Permission:** `schedules:create`

### Flow Steps

1. **Open Schedule Panel**
   - User is viewing post detail
   - Click "Schedule" button
   - Right panel slides in
   - Show schedule creation form

2. **Form Fields**
   - **Post Variant** (required)
     - Dropdown: List variants for current post
     - Show: Channel icon + content preview
     - If no variants: Show message "Create variant first"
   
   - **Channel Connection** (required)
     - Dropdown: List user's active connections for selected variant's channel
     - Show: Account name + avatar
     - If no connections: Show "Connect account first" link
   
   - **Date** (required)
     - Date picker
     - Min: Today
     - Max: 1 year in future (configurable)
     - Show day of week
   
   - **Time** (required)
     - Time picker (24h or 12h based on locale)
     - 15-minute intervals
     - Show timezone selector
   
   - **Timezone** (required)
     - Dropdown: Common timezones
     - Default: User's profile timezone
     - Searchable list
     - Show current time in selected TZ
   
   - **Preview**
     - Combined date/time display
     - "Will publish on: Dec 5, 2025 at 2:30 PM EST"
     - "That's in 2 hours 15 minutes"
     - Highlight if outside business hours

3. **Real-time Validation**
   - **Variant**: Required, must exist
   - **Connection**: Required, must be active
   - **Date/Time**: Must be in future (at least 5 minutes from now)
   - **Timezone**: Valid timezone
   - Connection status check (green = active, red = error)

4. **Validation Checks**
   - Connection is active (test API call)
   - Time is in future
   - Not conflicting with another schedule (warning, not blocking)

5. **Submit Schedule**
   ```javascript
   POST /api/v1/schedules
   Body: {
       post_variant_id: "uuid",
       channel_connection_id: "uuid",
       scheduled_at: "2025-12-05T19:30:00Z", // UTC
       timezone: "America/New_York"
   }
   ```

6. **Success Response**
   ```json
   {
       "id": "uuid",
       "post_id": "uuid",
       "post_variant_id": "uuid",
       "channel_connection_id": "uuid",
       "scheduled_at": "2025-12-05T19:30:00Z",
       "scheduled_at_local": "2025-12-05T14:30:00-05:00",
       "timezone": "America/New_York",
       "status": "pending",
       "created_at": "2025-12-04T10:00:00Z"
   }
   ```

7. **Success Actions**
   - Close schedule panel
   - Success toast: "Post scheduled for Dec 5 at 2:30 PM EST"
   - Update post detail (show schedule info)
   - Option: "View in Calendar" link

### Validation Errors

**Time in Past**
```json
{
    "errors": [{
        "error_code": "INVALID_SCHEDULED_TIME",
        "error_description": "Scheduled time must be in the future",
        "error_severity": "error"
    }]
}
```
- Highlight date/time fields
- Show error message
- Suggest "Schedule for later"

**Connection Inactive**
```json
{
    "errors": [{
        "error_code": "CONNECTION_INACTIVE",
        "error_description": "Selected connection is not active. Please reconnect.",
        "error_severity": "error"
    }]
}
```
- Highlight connection field
- Show "Reconnect" button
- Link to connections page

---

## 3. Edit Schedule (Reschedule)

**Trigger:** "Edit" button on schedule card  
**Components:** `ScheduleEditPanel.vue`  
**API:** `PATCH /api/v1/schedules/:id`  
**Permission:** `schedules:update`

### Flow Steps

1. **Open Edit Panel**
   - Click "Edit" on schedule
   - Right panel slides in
   - Load schedule data
   - Pre-fill form

2. **Form Pre-filled**
   - Post variant (read-only, cannot change)
   - Connection (read-only, cannot change)
   - Date/time (editable)
   - Timezone (editable)

3. **Edit Restrictions**
   - **Status = Pending**: Can edit date/time/timezone
   - **Status = Queued**: Cannot edit (must cancel first)
   - **Status = Publishing/Published**: Cannot edit
   - **Status = Failed**: Can edit and retry

4. **Modify Date/Time**
   - User changes scheduled time
   - Real-time validation
   - Show time difference: "Moved 2 hours earlier"

5. **Submit Changes**
   ```javascript
   PATCH /api/v1/schedules/:id
   Body: {
       scheduled_at: "2025-12-05T20:00:00Z",
       timezone: "America/New_York"
   }
   ```

6. **Success Actions**
   - Close panel
   - Success toast: "Schedule updated to Dec 5 at 3:00 PM EST"
   - Update schedule in grid
   - Update calendar if visible

### Concurrent Edit Warning

If schedule status changed while editing:
```json
{
    "errors": [{
        "error_code": "SCHEDULE_STATUS_CHANGED",
        "error_description": "Schedule status changed to 'queued'. Cannot edit.",
        "error_severity": "error"
    }]
}
```
- Show warning
- Refresh schedule data
- Close panel if no longer editable

---

## 4. Cancel Schedule

**Trigger:** "Cancel" button on schedule card  
**Components:** `CancelConfirmModal.vue`  
**API:** `POST /api/v1/schedules/:id/cancel`  
**Permission:** `schedules:update`

### Flow Steps

1. **Trigger Cancel**
   - Click "Cancel" button
   - Confirmation modal appears

2. **Confirmation Modal**
   - Title: "Cancel Schedule?"
   - Schedule details:
     - Post title
     - Channel + account
     - Scheduled time
   - Message: "Are you sure you want to cancel this scheduled post?"
   - Info: "You can reschedule it later"
   - Buttons:
     - "Keep Schedule" (secondary)
     - "Cancel Schedule" (danger)

3. **Confirm Cancellation**
   - Click "Cancel Schedule"
   - Show loading state
   - Disable buttons

4. **API Request**
   ```javascript
   POST /api/v1/schedules/:id/cancel
   ```

5. **API Actions**
   - Remove from publishing queue if queued
   - Update status to 'cancelled'
   - Record cancellation timestamp

6. **Success Actions**
   - Close modal
   - Success toast: "Schedule cancelled"
   - Update status badge to "Cancelled"
   - Remove from "Pending" filter view
   - Maintain in "All" view

### Cancel Restrictions

**Already Publishing**
```json
{
    "errors": [{
        "error_code": "CANNOT_CANCEL_PUBLISHING",
        "error_description": "Cannot cancel schedule that is currently publishing",
        "error_severity": "error"
    }]
}
```
- Show error message
- Modal remains open
- Suggest waiting for completion

---

## 5. Delete Schedule

**Trigger:** "Delete" button on schedule card  
**Components:** `DeleteConfirmModal.vue`  
**API:** `DELETE /api/v1/schedules/:id`  
**Permission:** `schedules:delete`

### Flow Steps

1. **Trigger Delete**
   - Click "Delete" button (trash icon)
   - Confirmation modal appears

2. **Confirmation Modal**
   - Title: "Delete Schedule?"
   - Message: "Are you sure you want to permanently delete this schedule?"
   - Warning: "This action cannot be undone"
   - Info: For published schedules - "History will be preserved in post details"
   - Buttons: "Cancel" / "Delete"

3. **Confirm Deletion**
   - API: `DELETE /api/v1/schedules/:id`
   - Success: Remove from grid with fade animation
   - Success toast: "Schedule deleted"

### Delete Restrictions

**Cannot Delete Active**
```json
{
    "errors": [{
        "error_code": "CANNOT_DELETE_ACTIVE",
        "error_description": "Cancel the schedule before deleting",
        "error_severity": "error"
    }]
}
```
- Show error in modal
- Provide "Cancel First" button
- Link to cancel action

---

## 6. Calendar View

**Route:** `/dashboard/calendar`  
**Components:** `CalendarView.vue`  
**API:** `GET /api/v1/schedules` (with date filters)  
**Permission:** `schedules:read`

### Flow Steps

1. **Navigation**
   - Click "Calendar" in sidebar
   - Or toggle to calendar view from schedules list
   - Navigate to `/dashboard/calendar`

2. **API Request**
   ```javascript
   GET /api/v1/schedules?start_date=2025-12-01&end_date=2025-12-31
   ```

3. **Display Calendar**
   - Month view (default)
   - Grid: 7 columns (days) × 5-6 rows (weeks)
   - Each date cell shows:
     - Date number
     - Schedule indicators (colored dots/cards)
     - Post count if multiple

4. **Calendar Controls**
   - **Navigation**: Previous month / Next month arrows
   - **Month/Year Selector**: Dropdown to jump
   - **Today Button**: Jump to current month
   - **View Toggle**: Month / Week / Day
   - **Timezone Display**: Current viewing timezone

5. **Schedule Indicators**
   - **Color Coding**:
     - Blue: Pending
     - Yellow: Queued
     - Green: Published
     - Red: Failed
     - Gray: Cancelled
   - Small cards on date with:
     - Time
     - Channel icon
     - Post title (truncated)

6. **Click Date**
   - Show all schedules for that date
   - Side panel or modal with list
   - Each schedule shows:
     - Time
     - Post title
     - Channel
     - Status
     - Quick actions: Edit, Cancel, View

7. **Drag-and-Drop Reschedule**
   - Drag schedule card to different date
   - Show visual feedback (ghosting)
   - Drop on new date
   - Confirmation: "Reschedule to [new date/time]?"
   - Time is preserved, only date changes
   - Only works for status = pending

8. **Multi-day View**
   - Switch to week or day view
   - Shows timeline (hourly slots)
   - Schedules placed at exact times
   - More detailed view

---

## 7. View Publish History

**Route:** Post detail → "History" tab  
**Location:** `/dashboard/posts/:id` → History tab  
**Components:** `PostDetailView.vue`, `PublishHistoryTab.vue`  
**API:** `GET /api/v1/posts/:post_id/publish-events`  
**Permission:** `posts:read`

### Flow Steps

1. **Navigate to History**
   - Open post detail page
   - Click "History" tab
   - Show loading spinner

2. **API Request**
   ```javascript
   GET /api/v1/posts/:post_id/publish-events
   ```

3. **Response**
   ```json
   {
       "data": [
           {
               "id": "uuid",
               "schedule_id": "uuid",
               "channel_slug": "x",
               "status": "success",
               "published_at": "2025-12-04T14:30:00Z",
               "published_at_local": "2025-12-04T09:30:00-05:00",
               "platform_post_id": "123456789",
               "platform_post_url": "https://twitter.com/user/status/123456789",
               "platform_response": {
                   "message": "Post published successfully"
               }
           },
           {
               "id": "uuid2",
               "schedule_id": "uuid2",
               "channel_slug": "linkedin",
               "status": "failed",
               "attempted_at": "2025-12-03T10:00:00Z",
               "error_code": "RATE_LIMIT_EXCEEDED",
               "error_message": "LinkedIn API rate limit exceeded",
               "retry_count": 3
           }
       ]
   }
   ```

4. **Display Timeline**
   - Vertical timeline layout
   - Each event card shows:
     - **Timestamp** - In user's timezone
       - "Dec 4, 2025 at 9:30 AM EST"
       - Relative: "2 days ago"
     - **Channel** - Icon + name
     - **Status Icon**:
       - ✅ Success (green)
       - ❌ Failed (red)
       - 🔄 Retrying (yellow)
     - **Details**:
       - Success: Platform post URL (clickable)
       - Failed: Error message
       - Retry count if applicable
     - **Platform Response** (expandable)
       - Raw response data
       - Useful for debugging

5. **Success Event Actions**
   - "View on Platform" button → Opens platform post in new tab
   - "Copy Link" button → Copies platform URL
   - "View Stats" button → Future: Analytics

6. **Failed Event Actions**
   - "Retry" button → Reschedule with same parameters
   - "View Error Details" → Expandable error info
   - "Contact Support" → Opens support form with context

7. **Filter/Sort**
   - Filter by status: All / Success / Failed
   - Filter by channel: All / X / LinkedIn
   - Sort: Newest first / Oldest first

### Empty State

**No History**
- Message: "No publish history yet"
- Info: "Schedule this post to see publishing history"

---

## 8. Retry Failed Schedule

**Trigger:** "Retry" button on failed schedule  
**API:** `POST /api/v1/schedules/:id/retry`  
**Permission:** `schedules:update`

### Flow Steps

1. **Trigger Retry**
   - Click "Retry" on failed schedule
   - Or "Retry" in publish history

2. **Retry Options Modal**
   - Title: "Retry Publishing"
   - Options:
     - **Retry Now**: Attempt immediate publish
     - **Reschedule**: Choose new date/time
   - Show failure reason
   - Buttons: "Cancel" / "Retry Now" / "Reschedule"

3. **Retry Now**
   - API: `POST /api/v1/schedules/:id/retry`
   - Immediate re-queue
   - Status → "queued"
   - Publishing attempt within seconds

4. **Reschedule**
   - Opens edit schedule panel
   - Pre-filled with original time + 1 hour
   - User adjusts as needed
   - Save creates new schedule attempt

5. **Success**
   - Toast: "Schedule retrying..."
   - Update status to "queued" or "publishing"
   - Refresh after completion

---

## Summary

**Scheduling Flows:** 8 flows

1. **List Schedules** - Grid view of all schedules with filters
2. **Create Schedule** - Schedule post variant for future publishing
3. **Edit Schedule** - Reschedule to different time (pending only)
4. **Cancel Schedule** - Cancel pending/queued schedules
5. **Delete Schedule** - Permanently remove schedule
6. **Calendar View** - Visual calendar with drag-and-drop
7. **View Publish History** - Timeline of publishing events
8. **Retry Failed Schedule** - Re-attempt failed publishes

**Key Features:**
- ✅ Timezone-aware scheduling
- ✅ Multiple status states (pending, queued, publishing, published, failed, cancelled)
- ✅ Calendar visualization with month/week/day views
- ✅ Drag-and-drop rescheduling
- ✅ Publishing history with platform URLs
- ✅ Retry failed publishes
- ✅ Real-time validation
- ✅ Connection health checks
- ✅ Conflict warnings
- ✅ Automated queue management

**Status Workflow:**
1. **Created** → Pending
2. **Queued** → In publishing queue (5 min before scheduled time)
3. **Publishing** → Actively publishing to platform
4. **Published** → Successfully published
5. **Failed** → Publishing failed (can retry)
6. **Cancelled** → User cancelled (before publishing)

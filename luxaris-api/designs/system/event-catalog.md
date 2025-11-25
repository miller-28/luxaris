# System Events Catalog

This document provides a complete reference of all system events tracked in the `system_events` table across the Luxaris API platform.

---

## Overview

**Purpose:** System events track major business operations and user actions across the entire platform for analytics, monitoring, and integration purposes.

**Table:** `system_events`

**Handler Class:** `EventRegistry` (`src/core/events/event_registry.js`)

**Event Structure:**
- `event_type` - Category (auth, post, schedule, channel, template, system)
- `event_name` - Specific event identifier (see catalog below)
- `principal_id` - User/service account who triggered event
- `principal_type` - Type of principal (user, service_account, system)
- `resource_type` - Affected entity type
- `resource_id` - ID of affected entity
- `status` - Event outcome (success, failed, pending)
- `metadata` - Event-specific data (JSON)

---

## Event Categories

### 1. Authentication Events (`auth`)

Events related to user authentication, registration, and account management.

| Event Name | Description | Trigger | Resource Type | Metadata |
|------------|-------------|---------|---------------|----------|
| `USER_REGISTERED` | New user registration (password) | User completes registration form | `user` | `{ auth_method: "password", is_root: boolean }` |
| `USER_REGISTERED_VIA_OAUTH` | New user registration (OAuth) | User completes OAuth registration | `user` | `{ provider: "google", is_root: boolean }` |
| `USER_APPROVED` | User registration approved | Root user approves pending user | `user` | `{ approved_by: user_id, approved_at: timestamp }` |
| `USER_REJECTED` | User registration rejected | Root user rejects pending user | `user` | `{ rejected_by: user_id, rejected_at: timestamp, reason: string }` |
| `USER_LOGIN` | Successful login | User logs in with password | `user` | `{ auth_method: "password" }` |
| `USER_LOGIN_FAILED` | Failed login attempt | Invalid credentials provided | `user` | `{ reason: "invalid_credentials", attempted_email: string }` |
| `USER_LOGOUT` | User logout | User explicitly logs out | `user` | `{ session_duration_seconds: number }` |
| `PASSWORD_CHANGED` | Password updated | User changes password | `user` | `{ changed_by: "user" or "admin" }` |
| `PASSWORD_RESET_REQUESTED` | Password reset initiated | User requests password reset | `user` | `{ reset_token_sent: boolean }` |
| `TOKEN_REFRESHED` | Access token refreshed | Refresh token used to get new access token | `user` | `{ old_token_exp: timestamp }` |
| `OAUTH_ACCOUNT_LINKED` | OAuth provider linked | User connects OAuth account | `user` | `{ provider: "google", provider_user_id: string }` |
| `OAUTH_ACCOUNT_UNLINKED` | OAuth provider unlinked | User disconnects OAuth account | `user` | `{ provider: "google" }` |
| `OAUTH_LOGIN_FAILED` | OAuth login failed | OAuth flow failed | `user` | `{ provider: "google", error: string }` |

**Files Referencing:**
- `designs/flows/flow-user-registration.md`
- `designs/flows/flow-user-login.md`
- `designs/flows/flow-oauth-google.md`
- `designs/flows/flow-approve-user.md`
- `designs/flows/flow-refresh-token.md`
- `designs/flows/flow-logout.md`

---

### 2. Post Events (`post`)

Events related to post creation, modification, and deletion.

| Event Name | Description | Trigger | Resource Type | Metadata |
|------------|-------------|---------|---------------|----------|
| `POST_CREATED` | New post created | User creates draft post | `post` | `{ title: string, tags: array, status: "draft" }` |
| `POST_UPDATED` | Post modified | User edits post content | `post` | `{ updated_fields: array, old_status: string, new_status: string }` |
| `POST_DELETED` | Post deleted | User deletes post | `post` | `{ title: string, was_published: boolean }` |
| `POST_VARIANT_CREATED` | Variant created | User creates channel-specific variant | `post_variant` | `{ post_id: uuid, channel_id: uuid }` |
| `POST_VARIANT_UPDATED` | Variant modified | User edits variant content | `post_variant` | `{ post_id: uuid, channel_id: uuid }` |
| `POST_VARIANT_DELETED` | Variant deleted | User deletes variant | `post_variant` | `{ post_id: uuid, channel_id: uuid }` |
| `POST_GENERATED` | AI-generated post | AI generates post from template | `post` | `{ template_id: uuid, generation_model: string, prompt_tokens: number }` |

**Files Referencing:**
- `designs/flows/flow-create-post.md`
- `designs/flows/flow-update-post.md`
- `designs/flows/flow-delete-post.md`
- `designs/flows/flow-create-post-variant.md`
- `designs/flows/flow-generate-post-content.md`

---

### 3. Schedule Events (`schedule`)

Events related to post scheduling and publishing.

| Event Name | Description | Trigger | Resource Type | Metadata |
|------------|-------------|---------|---------------|----------|
| `SCHEDULE_CREATED` | New schedule created | User schedules post for future | `schedule` | `{ post_variant_id: uuid, channel_connection_id: uuid, run_at: timestamp }` |
| `SCHEDULE_UPDATED` | Schedule modified | User changes schedule time | `schedule` | `{ old_run_at: timestamp, new_run_at: timestamp }` |
| `SCHEDULE_CANCELLED` | Schedule cancelled | User cancels pending schedule | `schedule` | `{ was_run_at: timestamp, cancelled_reason: string }` |
| `SCHEDULE_QUEUED` | Schedule queued for publishing | Scanner detects due schedule | `schedule` | `{ queue_name: string, queue_time: timestamp }` |
| `SCHEDULE_PUBLISHING` | Publishing in progress | Publisher starts processing | `schedule` | `{ attempt_count: number, started_at: timestamp }` |
| `SCHEDULE_PUBLISHED` | Successfully published | Post published to social media | `schedule` | `{ platform: string, platform_post_id: string, published_at: timestamp }` |
| `SCHEDULE_FAILED` | Publishing failed | Publishing attempt failed | `schedule` | `{ attempt_count: number, error: string, will_retry: boolean }` |

**Files Referencing:**
- `designs/flows/flow-create-schedule.md`
- `designs/flows/flow-update-schedule.md`
- `designs/flows/flow-cancel-schedule.md` (if exists)
- Runner documentation: `luxaris-runner/docs/design-runner.md`

---

### 4. Channel Events (`channel`)

Events related to social media channel connections.

| Event Name | Description | Trigger | Resource Type | Metadata |
|------------|-------------|---------|---------------|----------|
| `CHANNEL_CONNECTED` | OAuth channel connected | User connects social media account | `channel_connection` | `{ platform: string, channel_name: string }` |
| `CHANNEL_DISCONNECTED` | Channel disconnected | User disconnects channel | `channel_connection` | `{ platform: string, disconnected_reason: string }` |
| `CHANNEL_TOKEN_REFRESHED` | OAuth token refreshed | System refreshes expiring token | `channel_connection` | `{ platform: string, auto_refresh: boolean }` |
| `CHANNEL_ERROR` | Channel authentication error | Token invalid or revoked | `channel_connection` | `{ platform: string, error_type: string }` |

**Files Referencing:**
- `designs/flows/flow-connect-channel.md` (if exists)
- `designs/flows/flow-disconnect-channel.md`
- Channel management documentation

---

### 5. Template Events (`template`)

Events related to post templates and AI generation.

| Event Name | Description | Trigger | Resource Type | Metadata |
|------------|-------------|---------|---------------|----------|
| `TEMPLATE_CREATED` | Template created | User creates new template | `template` | `{ title: string, has_variables: boolean }` |
| `TEMPLATE_UPDATED` | Template modified | User edits template | `template` | `{ title: string, updated_fields: array }` |
| `TEMPLATE_DELETED` | Template deleted | User deletes template | `template` | `{ title: string, usage_count: number }` |
| `TEMPLATE_USED` | Template used for generation | Template used to generate post | `template` | `{ post_id: uuid, generation_model: string }` |

**Files Referencing:**
- `designs/flows/flow-create-template.md`
- `designs/flows/flow-generate-post-content.md`

---

### 6. System Events (`system`)

Events related to system administration and configuration.

| Event Name | Description | Trigger | Resource Type | Metadata |
|------------|-------------|---------|---------------|----------|
| `API_KEY_CREATED` | API key generated | User creates API key | `api_key` | `{ name: string, permissions: array }` |
| `API_KEY_REVOKED` | API key revoked | User revokes API key | `api_key` | `{ name: string, last_used_at: timestamp }` |
| `ROLE_ASSIGNED` | Role assigned to user | Admin assigns role | `user` | `{ role_id: uuid, role_name: string }` |
| `ROLE_REVOKED` | Role revoked from user | Admin removes role | `user` | `{ role_id: uuid, role_name: string }` |
| `PERMISSION_GRANTED` | Direct permission granted | Admin grants specific permission | `user` | `{ permission_id: uuid, resource: string, action: string }` |
| `PERMISSION_REVOKED` | Permission revoked | Admin removes permission | `user` | `{ permission_id: uuid, resource: string, action: string }` |

**Files Referencing:**
- ACL management flows
- `designs/system/design-3-access-control.md`

---

## Usage Patterns

### Recording Events

**Successful Event:**
```javascript
const { EventRegistry } = require('core/events/event_registry');

await EventRegistry.record('auth', 'USER_LOGIN', {
  principal_id: user.id,
  principal_type: 'user',
  resource_type: 'user',
  resource_id: user.id,
  status: 'success',
  metadata: { auth_method: 'password' },
  ip_address: req.ip,
  user_agent: req.get('user-agent')
});
```

**Failed Event:**
```javascript
await EventRegistry.recordFailure('schedule', 'SCHEDULE_PUBLISHED', error, {
  principal_id: user.id,
  resource_type: 'schedule',
  resource_id: schedule.id,
  metadata: {
    channel: schedule.channel_connection_id,
    attempt: schedule.attempt_count,
    error_message: error.message
  }
});
```

### When to Record Events

**DO record events for:**
- ✅ Major user actions (create, update, delete)
- ✅ Authentication/authorization events
- ✅ State changes (pending → active, draft → published)
- ✅ External integrations (OAuth, social media publishing)
- ✅ System-initiated actions (token refresh, schedule scanning)

**DON'T record events for:**
- ❌ Read-only operations (GET requests, queries)
- ❌ Validation failures (use system_logs instead)
- ❌ Health checks and monitoring pings
- ❌ Internal system operations (cache writes, background cleanup)

---

## Four-Tier Observability

Understanding when to use each logging system:

| Aspect | Request Logs | System Logs | System Events | Audit Logs |
|--------|-------------|-------------|---------------|------------|
| **Purpose** | HTTP telemetry, performance | Technical debugging | Business analytics | Legal compliance |
| **Example** | GET /posts took 45ms, 200 OK | Database query timeout | User created a post | User Alice deleted post ID 123 |
| **Retention** | 30-180 days | 30-365 days (by level) | 2 years (archivable) | Indefinite (regulatory) |
| **Who cares** | DevOps, performance team | Developers, DevOps | Product team, analytics | Legal, compliance, security |
| **Query use** | API metrics, latency analysis | Debugging, error tracking | Feature usage, user activity | Security audits, compliance reviews |
| **Automatic** | Yes (middleware) | No (explicit calls) | No (explicit calls) | No (explicit calls) |

**Rule of thumb:**
- **Request Log**: "How is the API performing?" (automatic)
- **System Log**: "What went wrong technically?" (errors, warnings)
- **Event**: "What happened from a business perspective?" (user actions)
- **Audit**: "Who did what, when, for compliance?" (legal requirement)

---

## Extensibility

### Adding New Events

1. **Define the event** in this catalog with:
   - Unique event name (UPPER_SNAKE_CASE)
   - Event category (auth, post, schedule, etc.)
   - Description and trigger condition
   - Resource type and expected metadata

2. **Update flow documentation** to reference the event:
   - Add event recording step in flow
   - Document metadata fields
   - Show usage example

3. **Implement event recording** in code:
   - Add EventRegistry.record() call at appropriate point
   - Include all required metadata
   - Handle errors gracefully

4. **Consider analytics** use cases:
   - How will this event be queried?
   - What reports/dashboards need this data?
   - What retention policy applies?

### Event Naming Conventions

- Use **UPPER_SNAKE_CASE** for all event names
- Start with **subject** (what entity): `USER_`, `POST_`, `SCHEDULE_`
- End with **past tense verb**: `_CREATED`, `_UPDATED`, `_DELETED`, `_FAILED`
- Be specific but concise: `POST_VARIANT_CREATED` not `POST_VARIANT_WAS_CREATED_BY_USER`

**Examples:**
- ✅ `USER_REGISTERED` (clear, concise)
- ✅ `SCHEDULE_PUBLISHED` (past tense, specific)
- ❌ `UserCreated` (wrong case)
- ❌ `CREATING_POST` (present tense)
- ❌ `USER_DID_A_THING` (vague)

---

## Querying Events

### Common Queries

**Get all user activity:**
```sql
SELECT * FROM system_events
WHERE principal_id = 'user-uuid'
ORDER BY timestamp DESC;
```

**Get failed publishing attempts:**
```sql
SELECT * FROM system_events
WHERE event_type = 'schedule'
  AND event_name = 'SCHEDULE_FAILED'
  AND timestamp > NOW() - INTERVAL '24 hours';
```

**Count posts created per user:**
```sql
SELECT principal_id, COUNT(*) as post_count
FROM system_events
WHERE event_name = 'POST_CREATED'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY principal_id
ORDER BY post_count DESC;
```

**Track OAuth registration growth:**
```sql
SELECT DATE(timestamp) as date, COUNT(*) as registrations
FROM system_events
WHERE event_name = 'USER_REGISTERED_VIA_OAUTH'
  AND timestamp > NOW() - INTERVAL '90 days'
GROUP BY DATE(timestamp)
ORDER BY date;
```

---

## Summary

This catalog documents **40+ system events** across 6 categories:
- **Authentication**: 13 events
- **Posts**: 7 events
- **Schedules**: 7 events
- **Channels**: 4 events
- **Templates**: 4 events
- **System**: 6 events

All events are recorded via the centralized `EventRegistry` class and stored in the `system_events` table for business analytics, user activity tracking, and feature usage metrics.

**See also:**
- `designs/system/design-4-observability.md` - Complete observability design
- `designs/design-general.md` - Architecture overview
- Individual flow files for event usage examples

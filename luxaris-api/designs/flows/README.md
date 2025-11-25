# API Flow Documentation Index

Complete reference for all API endpoint flows in the Luxaris platform.

---

## Observability in All Flows

Every flow in this directory includes **four-tier observability** integration:

| Layer | Type | Handler | Usage in Flows |
|-------|------|---------|----------------|
| **HTTP** | Request telemetry | `RequestLogger` middleware | Automatic - all requests logged with timing, status, performance |
| **Technical** | System logs | `SystemLogger` class | Manual - errors, warnings, info at key operation points |
| **Business** | System events | `EventRegistry` class | Manual - major events (USER_REGISTERED, POST_CREATED, etc.) |
| **Compliance** | Audit logs | `AuditService` | Manual - security/compliance tracking |

**See**: [`designs/system/design-4-observability.md`](../system/design-4-observability.md) for complete details.

---

## Authentication & Identity Flows

Core authentication and user management operations.

### User Authentication
- **[flow-user-registration.md](flow-user-registration.md)** - `POST /api/v1/system/auth/register`
  - User registration with email and password
  - First user becomes root with full access
  - Subsequent users require root approval

- **[flow-oauth-google.md](flow-oauth-google.md)** - `GET/POST /api/v1/system/auth/oauth/google/*`
  - Register or login with Google OAuth
  - Account linking for existing users
  - Extensible to other OAuth providers (GitHub, Microsoft, etc.)
  - First OAuth user becomes root
  - Subsequent users require root approval

- **[flow-user-login.md](flow-user-login.md)** - `POST /api/v1/system/auth/login`
  - Email/password authentication
  - JWT access and refresh token generation
  - Session management in Memcached
  - Blocks pending approval users

- **[flow-refresh-token.md](flow-refresh-token.md)** - `POST /api/v1/system/auth/refresh`
  - Refresh expired access tokens
  - Session validation and renewal
  - Token rotation strategy

- **[flow-logout.md](flow-logout.md)** - `POST /api/v1/system/auth/logout`
  - Session revocation (single or all devices)
  - Token blacklisting
  - Audit logging

- **[flow-change-password.md](flow-change-password.md)** - `POST /api/v1/system/auth/change-password`
  - Password change with current password verification
  - Password strength validation
  - Password history checking
  - Optional session revocation

### Admin Operations (Root Users Only)
- **[flow-approve-user.md](flow-approve-user.md)** - `POST /api/v1/system/admin/users/:user_id/approve`
  - Approve pending user registrations
  - Root user authorization required
  - Activates user account and assigns default role
  - Sends activation notification email

---

## Post Management Flows

Create, read, update, and delete posts.

### Basic CRUD Operations
- **[flow-create-post.md](flow-create-post.md)** - `POST /api/v1/posts`
  - Create new post (draft)
  - Basic validation
  - Owner assignment

- **[flow-list-posts.md](flow-list-posts.md)** - `GET /api/v1/posts`
  - List posts with filtering and pagination
  - Status filtering
  - Search by title/content

- **[flow-get-post.md](flow-get-post.md)** - `GET /api/v1/posts/:id`
  - Get single post with all details
  - Include variants and schedules
  - Authorization check

- **[flow-update-post.md](flow-update-post.md)** - `PATCH /api/v1/posts/:id`
  - Update post metadata
  - Status transitions
  - Validation rules

- **[flow-delete-post.md](flow-delete-post.md)** - `DELETE /api/v1/posts/:id`
  - Soft delete post
  - Cancel active schedules
  - Cascade handling

### Post Variants
- **[flow-create-post-variant.md](flow-create-post-variant.md)** - `POST /api/v1/posts/:post_id/variants`
  - Create channel-specific variant
  - Channel-specific validation (character limits, media rules)
  - Content adaptation

---

## Content Generation Flows

AI-powered content creation with templates.

### AI Generation
- **[flow-generate-post-content.md](flow-generate-post-content.md)** - `POST /api/v1/posts/generate`
  - Generate post content using AI
  - Template integration
  - Multi-channel variant generation
  - Rate limiting and cost tracking

### Template Management
- **[flow-create-template.md](flow-create-template.md)** - `POST /api/v1/templates`
  - Create reusable generation templates
  - Variable definitions
  - Public/private templates

- **[flow-list-templates.md](flow-list-templates.md)** - `GET /api/v1/templates`
  - List available templates
  - Filter by category, visibility
  - Search and sort options
  - Usage statistics

---

## Scheduling & Publishing Flows

Schedule posts and track publishing status.

### Schedule Management
- **[flow-create-schedule.md](flow-create-schedule.md)** - `POST /api/v1/schedules`
  - Schedule post variant for publishing
  - Timezone handling
  - Time validation
  - Queue integration

- **[flow-list-schedules.md](flow-list-schedules.md)** - `GET /api/v1/schedules`
  - List schedules with filtering
  - Status filtering (pending, queued, publishing, success, failed)
  - Date range filtering

- **[flow-update-schedule.md](flow-update-schedule.md)** - `PATCH /api/v1/schedules/:id`
  - Update schedule time or channel
  - Status validation (only pending editable)
  - Authorization checks

- **[flow-cancel-schedule.md](flow-cancel-schedule.md)** - `POST /api/v1/schedules/:id/cancel`
  - Cancel pending or queued schedule
  - Remove from RabbitMQ queue
  - Status transitions

### Publishing History
- **[flow-get-publish-history.md](flow-get-publish-history.md)** - `GET /api/v1/posts/:post_id/publish-events`
  - View publishing history for a post
  - Success/failure details
  - Platform responses and errors
  - Retry information

---

## Channel Management Flows

Connect and manage social media accounts.

### Channel Connections
- **[flow-connect-channel.md](flow-connect-channel.md)** - `POST /api/v1/channels/connect`
  - OAuth 2.0 connection flow
  - Platform authorization
  - Token exchange and encryption
  - Account profile fetching

- **[flow-list-channel-connections.md](flow-list-channel-connections.md)** - `GET /api/v1/channels/connections`
  - List connected social media accounts
  - Status filtering (connected, error, disconnected)
  - Token sanitization (no sensitive data exposed)

- **[flow-disconnect-channel.md](flow-disconnect-channel.md)** - `DELETE /api/v1/channels/connections/:id`
  - Disconnect social media account
  - Revoke OAuth tokens
  - Check for active schedules
  - Audit trail preservation

---

## Flow Count Summary

**Total Flows:** 24

**By Category:**
- Authentication & Identity: 6 flows
- Admin Operations: 1 flow (root users only)
- Post Management: 6 flows
- Content Generation: 3 flows
- Scheduling & Publishing: 5 flows
- Channel Management: 3 flows

---

## Flow Naming Convention

All flow files follow the pattern: `flow-{operation}-{resource}.md`

**Examples:**
- `flow-create-post.md` - Create operation on post resource
- `flow-list-schedules.md` - List operation on schedules resource
- `flow-user-login.md` - Login operation for user

---

## Flow Document Structure

Each flow document contains:

1. **Endpoint:** HTTP method and path
2. **Context:** Which bounded context (System, Posts, etc.)
3. **Purpose:** Brief description of what the flow does
4. **Request:** Example request body/parameters
5. **Flow Steps:** Detailed step-by-step process
6. **Response:** Success and error response examples
7. **Authorization:** Who can perform this operation
8. **Additional Sections:** Validation rules, use cases, security notes, etc.

---

## Using This Documentation

**For Implementation:**
1. Read the flow document for your endpoint
2. Follow the flow steps sequentially
3. Implement validation rules as specified
4. Use provided error codes and messages
5. Add audit logging as documented

**For API Consumers:**
- Request/response examples show expected format
- Error responses help with error handling
- Authorization section explains permissions needed

**For Testing:**
- Flow steps define test scenarios
- Error cases provide test cases
- Validation rules define test boundaries

---

## Related Documentation

- **[../design-api-high-level.md](../design-api-high-level.md)** - Overall API architecture and tech stack
- **[../system/design-1-overview.md](../system/design-1-overview.md)** - System context overview
- **[../product/design-1-overview.md](../product/design-1-overview.md)** - Posts context overview

---

## Next Steps

**Flows to be added:**
- Forgot password flow
- Reset password flow
- Email verification flow
- Get user profile
- Update user profile
- List API keys (for service accounts)
- Create API key
- Revoke API key
- Get post analytics
- Export data
- Import posts (bulk)

**Enhancements to existing flows:**
- Webhook notifications for publish events
- Batch operations (bulk schedule, bulk cancel)
- Advanced filtering options
- GraphQL alternatives
- Rate limiting details per endpoint

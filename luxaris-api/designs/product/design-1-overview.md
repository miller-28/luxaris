
# Luxaris API – Posts Context Overview

This document provides a high-level overview of the **Posts context** and how its components work together to enable multi-platform social media management.

---

## 1. What is the Posts Context?

The Posts context is the **core product domain** of Luxaris, handling everything related to creating, scheduling, and publishing social media content across multiple platforms.

### 1.1 Core Responsibilities

The Posts context owns:

- **Content Creation** – Drafting posts and platform-specific variants
- **Scheduling** – Time-based publishing with timezone support
- **Publishing** – Reliable background publishing to social platforms
- **Channel Management** – Platform connections and authentication
- **AI Generation** – Assisted content creation with templates

### 1.2 What Posts Context Does NOT Own

- Users, authentication, roles, permissions → **System context**
- Global logging and audit trails → **System context**
- API keys and system configuration → **System context**

Posts context **consumes** these capabilities from System context through well-defined interfaces.

---

## 2. The Four Components of Posts Context

### 2.1 Channels & Connections

**Purpose:** Manage platform definitions and user account connections.

**Key concepts:**
- Channel catalog (X, LinkedIn, etc.)
- User-specific social media account connections
- OAuth authentication state
- Platform-specific constraints

**Detailed design:** [`design-channels.md`](./design-channels.md)

**Key entities:**
- `channels`
- `channel_connections`

**Exposed interfaces:**
- `connectChannel(principal, channel, oauth_data)` – Connect social account
- `disconnectChannel(connection_id)` – Revoke connection
- `listConnections(principal)` – Get user's connected accounts

---

### 2.2 Posts & Variants

**Purpose:** Manage content creation and multi-platform variants.

**Key concepts:**
- Platform-agnostic posts
- Channel-specific content variants
- Post lifecycle (draft → scheduled → published)
- Media attachments

**Detailed design:** [`design-posts.md`](./design-posts.md)

**Key entities:**
- `posts`
- `post_variants`

**Exposed interfaces:**
- `createPost(principal, content, tags)` – Create new post
- `createVariant(post_id, channel_id, content)` – Add channel variant
- `updatePost(post_id, changes)` – Edit post
- `listPosts(principal, filters)` – Get posts with variants

---

### 2.3 Scheduling & Publishing

**Purpose:** Time-based publishing with reliable background execution.

**Key concepts:**
- Schedule management with timezone support
- Two-runner architecture (scanner + publisher)
- RabbitMQ queue for reliability
- Retry logic and error handling
- Publish event tracking

**Detailed design:** [`design-scheduling.md`](./design-scheduling.md)

**Key entities:**
- `schedules`
- `publish_events`

**Exposed interfaces:**
- `createSchedule(variant_id, connection_id, run_at, timezone)` – Schedule post
- `updateSchedule(schedule_id, changes)` – Reschedule or cancel
- `listSchedules(principal, date_range)` – Calendar view
- `getPublishEvents(schedule_id)` – Audit trail

---

### 2.4 Content Generation

**Purpose:** AI-assisted content creation with templates.

**Key concepts:**
- Reusable post templates
- AI-powered content suggestions
- Multi-variant generation
- Generation history tracking

**Detailed design:** [`design-generation.md`](./design-generation.md)

**Key entities:**
- `post_templates`
- `generation_sessions`
- `generation_suggestions`

**Exposed interfaces:**
- `createTemplate(principal, name, body, constraints)` – Define template
- `generateSuggestions(prompt, channels, template_id)` – AI generation
- `acceptSuggestion(suggestion_id)` – Promote to variant
- `listSessions(principal)` – Generation history

---

## 3. How the Four Components Work Together

### 3.1 Content Creation Flow

1. **User drafts post** (Posts & Variants)
2. **Optionally uses AI** (Content Generation) to create variants
3. **Selects target channels** (Channels & Connections)
4. **Creates platform-specific variants** (Posts & Variants)
5. **Schedules for publishing** (Scheduling & Publishing)

### 3.2 Publishing Flow

1. **User creates schedule** → stored with `status = pending`
2. **Scanner runner** (every minute) → finds due schedules → queues to RabbitMQ
3. **Publisher runner** → consumes queue → publishes to platform
4. **Result recorded** → publish event created, status updated

### 3.3 Integration Points

**Channels → Posts:**
- Channels define constraints for variant content
- Channel connections used as publish targets

**Posts → Scheduling:**
- Variants scheduled for publishing
- Schedule status updates variant status

**Generation → Posts:**
- Suggestions become post variants
- Templates provide content structure

**All → System:**
- All operations check permissions via System context
- All actions logged to audit logs via System context

---

## 4. Complete Entity Map

All Posts context database entities:

### Channels & Connections
- `channels` – Platform catalog
- `channel_connections` – User account connections

### Posts & Variants
- `posts` – Platform-agnostic content
- `post_variants` – Channel-specific publishable content

### Scheduling & Publishing
- `schedules` – Publishing instructions
- `publish_events` – Detailed publish attempts

### Content Generation
- `post_templates` – Reusable patterns
- `generation_sessions` – AI generation attempts
- `generation_suggestions` – AI-generated candidates

**Total:** 9 primary entities

---

## 5. Background Infrastructure

### 5.1 Two-Runner Architecture

**Scanner Runner:**
- Heartbeat process (every minute)
- Queries for due schedules
- Publishes to RabbitMQ queue
- Stateless, horizontally scalable

**Publisher Runner:**
- Queue consumer
- Loads schedule data
- Publishes to social platforms
- Records results
- Handles retries

**Benefits:**
- Separation of concerns
- Reliability through queuing
- Horizontal scalability
- Observability at each stage

### 5.2 External Dependencies

**Social Platform APIs:**
- X (Twitter) API
- LinkedIn API
- Future: Instagram, Facebook, etc.

**AI Services:**
- OpenAI GPT API
- Anthropic Claude API
- Or custom models

**Message Queue:**
- RabbitMQ with `amqplib`
- Configured via `RABBITMQ_URL`

---

## 6. Cross-File Navigation

For detailed information on specific areas:

- **Channels & Connections** → [`design-channels.md`](./design-channels.md)
  - Platform catalog, OAuth connections, authentication state

- **Posts & Variants** → [`design-posts.md`](./design-posts.md)
  - Content creation, multi-platform variants, post lifecycle

- **Scheduling & Publishing** → [`design-scheduling.md`](./design-scheduling.md)
  - Time-based scheduling, runner architecture, publish events

- **Content Generation** → [`design-generation.md`](./design-generation.md)
  - Templates, AI generation, suggestions workflow

---

## 7. Implementation Guidelines

### 7.1 Directory Structure

```text
src/contexts/posts/
  interface/
    http/
      routes.js
      handlers/
        posts.js
        schedules.js
        channels.js
        generation.js
  application/
    use_cases/
      create_post.js
      create_schedule.js
      generate_content.js
      publish_post.js
    services/
      scheduling_service.js
      generation_service.js
  domain/
    models/
      post.js
      schedule.js
      channel.js
    rules/
      schedule_validation.js
      content_validation.js
  infrastructure/
    repositories/
      post_repository.js
      schedule_repository.js
      channel_repository.js
    publishers/
      x_publisher.js
      linkedin_publisher.js
    generators/
      ai_generator.js
    queue/
      rabbitmq_client.js
```

### 7.2 Service Exposure Pattern

Posts services exposed to other contexts:

```javascript
// src/contexts/posts/index.js
module.exports = {
  // Posts
  createPost: require('./application/use_cases/create_post'),
  listPosts: require('./application/use_cases/list_posts'),
  
  // Scheduling
  createSchedule: require('./application/use_cases/create_schedule'),
  listSchedules: require('./application/use_cases/list_schedules'),
  
  // Channels
  connectChannel: require('./application/use_cases/connect_channel'),
  listConnections: require('./application/use_cases/list_connections'),
  
  // Generation
  generateContent: require('./application/use_cases/generate_content'),
};
```

---

## 8. Key Workflows

### 8.1 Simple Post Creation

1. User creates post via API
2. Post stored with `status = draft`
3. User reviews in dashboard
4. User manually publishes (creates schedule for now)
5. Runner picks up immediately and publishes

### 8.2 Multi-Platform Campaign

1. User creates post with base content
2. Uses AI to generate variants for X, LinkedIn
3. Reviews and edits suggestions
4. Accepts both variants
5. Schedules both for optimal times (different per platform)
6. Runners publish at scheduled times
7. User views results in calendar

### 8.3 Template-Based Publishing

1. Marketing team creates template for product launches
2. For each launch:
   - Fill in template variables
   - Generate variants for all channels
   - Schedule for announcement time
3. Automated publishing with consistent messaging

---

## 9. Domain Rules & Constraints

**Content Validation:**
- Variants must respect channel length limits
- Media must meet platform requirements
- Content scanned for policy violations

**Scheduling Rules:**
- Must be in future
- Within maximum horizon (e.g., 90 days)
- Connection must be active
- Optional: rate limiting, minimum gaps

**Ownership & Permissions:**
- Only owner or team members can edit
- Permissions checked via System context
- Connections cannot be shared without permission

**Publishing Guarantees:**
- At-least-once delivery (may retry)
- No silent failures (all logged)
- Eventual consistency (queue ensures processing)

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Domain rules (content validation, schedule rules)
- Service logic (generation, scheduling)
- Pure functions without dependencies

### 10.2 Integration Tests

- Full post creation → scheduling → publishing flow
- Queue message handling
- External API mocking (platform APIs, AI APIs)
- Database interactions

### 10.3 API Tests

- HTTP endpoints for all use-cases
- Permission checks
- Error handling

---

## 11. Summary

The Posts context is the **product core** of Luxaris, providing:

✅ **Channels** – Platform connections  
✅ **Posts** – Multi-platform content  
✅ **Scheduling** – Time-based publishing  
✅ **Generation** – AI-assisted creation  

All four components work together to enable reliable, scalable, observable social media management.

**Next steps:**
1. Review each detailed design document
2. Understand the two-runner publishing architecture
3. Follow domain rules and constraints
4. Use exposed service interfaces from other contexts

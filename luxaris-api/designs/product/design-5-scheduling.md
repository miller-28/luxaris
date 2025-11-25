
# Luxaris API – Scheduling & Publishing

This document describes **Scheduling and Publishing** within the Posts context:  
schedule management, background publishing runners, and publish event tracking.

---

## 1. Overview

Scheduling and Publishing provide:

- Time-based post scheduling with timezone support
- Two-runner architecture for reliable publishing
- RabbitMQ-based queue for decoupling
- Retry logic and error handling
- Publishing event audit trail

---

## 2. Schedule

**Schedule** = instruction to publish a specific PostVariant at a specific time.

### 2.1 Fields

- `id` – UUID.
- `post_variant_id` – FK → `PostVariant`.
- `channel_connection_id` – FK → `ChannelConnection`.
- `run_at` – datetime when publishing should be attempted (in UTC).
- `timezone` – original timezone chosen by user (for UX; stored as string).
- `status` – `pending | queued | processing | success | failed | cancelled | skipped`.
- `attempt_count` – number of publish attempts made.
- `last_attempt_at` – datetime.
- `error_code` – last error category (optional).
- `error_message` – safe error detail (optional).
- `created_at`, `updated_at`.

### 2.2 Schedule Status

- **`pending`** – Awaiting scheduled time
- **`queued`** – Picked up by scanner, sent to queue
- **`processing`** – Currently being published
- **`success`** – Published successfully
- **`failed`** – Publishing failed (max retries exceeded)
- **`cancelled`** – User cancelled before publishing
- **`skipped`** – Skipped due to business rules (e.g., rate limit)

---

## 3. Publish Event

**PublishEvent** = detailed record of each publish attempt for audit and debugging.

### 3.1 Fields

- `id` – UUID.
- `schedule_id` – FK → `Schedule`.
- `attempt_index` – 1, 2, 3…
- `timestamp`.
- `status` – `success | failed | retried | cancelled`.
- `external_post_id` – id returned by the channel API (if success).
- `external_url` – public URL of the published post (if success).
- `error_code`, `error_message` – if failed.
- `raw_response` – optional truncated JSON for debugging (no secrets).

### 3.2 Purpose

- More detailed than global audit logs
- Lives in Posts context (not System context)
- Enables debugging of publishing issues
- Tracks all retry attempts

---

## 4. Two-Runner Publishing Architecture

The publishing process uses **two separate runner processes** that communicate via RabbitMQ.

### 4.1 Schedule Scanner Runner (Heartbeat)

**Purpose:** Find due schedules and queue them for publishing.

**Execution:** Runs every minute as a heartbeat process.

**Process:**

1. Queries database for `Schedule` records with:
   - `status = pending`
   - `run_at <= now`
   - Respecting rate limits and concurrency constraints.

2. For each eligible schedule:
   - Transitions `status` to `queued`.
   - Publishes message to RabbitMQ queue containing:
     ```json
     {
       "schedule_id": "uuid",
       "post_variant_id": "uuid",
       "channel_connection_id": "uuid",
       "attempt_count": 0
     }
     ```
   - Updates `Schedule.last_attempt_at` timestamp.

3. Logs scanning activity (schedules found, queued, errors).

**Characteristics:**
- **Stateless** – Can be scaled horizontally if needed
- **Fast** – Only scans and queues, doesn't publish
- **Reliable** – Uses database transaction to prevent double-queuing

### 4.2 Publisher Runner (Queue Consumer)

**Purpose:** Consume queue messages and publish to social platforms.

**Execution:** Runs continuously, consuming from RabbitMQ queue.

**Process:**

1. Receives message from publishing queue.

2. Loads full data from database:
   - `Schedule`
   - `PostVariant`
   - `ChannelConnection`

3. Updates `Schedule.status = processing`.

4. Calls external channel adapter (X API, LinkedIn API, etc.):

   **On success:**
   - Creates `PublishEvent` with `status = success`.
   - Updates `Schedule.status = success`.
   - Updates `PostVariant.status = published`.
   - If all variants/schedules done, marks `Post.status = published`.
   - Acknowledges queue message.

   **On failure:**
   - Records `PublishEvent` with `status = failed`.
   - Evaluates retry strategy:
     - **Retryable error** (rate limit, temporary outage):
       - If under max attempts: requeues with exponential backoff.
       - Increments `attempt_count`.
       - Updates status to `pending`.
     - **Non-retryable error** (auth failure, content violation):
       - Updates `Schedule.status = failed`.
       - Does NOT requeue.
   - Acknowledges queue message after handling.

5. Errors captured but schedules NOT deleted (audit trail).

**Characteristics:**
- **Scalable** – Multiple consumers can process queue in parallel
- **Resilient** – Queue survives crashes, messages not lost
- **Observable** – Each stage logged with correlation IDs

### 4.3 Benefits of Two-Runner Architecture

- **Separation of concerns** – Scanning logic separate from publishing logic
- **Reliability** – Queue ensures no schedules lost if publisher crashes
- **Scalability** – Multiple publisher runners can consume from same queue
- **Retry handling** – Failed publishes can be requeued with backoff
- **Observability** – Each stage logged independently (scan → queue → publish)
- **Rate limiting** – Can control publishing rate at consumer level

### 4.4 Queue Configuration

**Technology:** RabbitMQ with `amqplib` client

**Configuration:** Via `RABBITMQ_URL` environment variable

**Queue properties:**
- Persistent messages (survive broker restart)
- Message TTL for stale messages
- Dead-letter queue for repeated failures
- Prefetch count to control concurrency

---

## 5. Workflows

### 5.1 Create Schedule

Flow:

1. User selects:
   - `post_variant_id`
   - `channel_connection_id`
   - `run_at` (local time) + timezone

2. Application:
   - Converts local time to UTC using timezone.
   - Validates via domain rules:
     - `run_at` is in future.
     - Not beyond maximum horizon.
     - Channel connection is active.
     - Rate-limit / conflict rules (optional).
   - Creates `Schedule` with `status = pending`.
   - Sets `Post.status = scheduled` if not already.

3. Returns schedule confirmation to user.

### 5.2 Update Schedule

Allows modifying time or connection:

1. User requests change to:
   - `run_at` (reschedule)
   - `channel_connection_id` (different account)
   - Or cancellation

2. Application:
   - If rescheduling: validates new time, updates `run_at`.
   - If cancelling: updates `status = cancelled`.
   - Checks if post status should change.

3. Reschedules remain `pending`, cancelled schedules stay for audit.

### 5.3 Publishing Flow (End-to-End)

Complete flow from schedule creation to publishing:

1. **User creates schedule** (API)
   - Schedule stored with `status = pending`.

2. **Scanner finds schedule** (every minute)
   - Transitions to `queued`.
   - Publishes to RabbitMQ.

3. **Publisher consumes message**
   - Loads data.
   - Transitions to `processing`.

4. **Publishes to platform**
   - Calls X API / LinkedIn API.
   - Records result in `PublishEvent`.
   - Updates schedule and variant status.

5. **User sees result** (API/Dashboard)
   - Schedule shows `success` or `failed`.
   - Post shows `published`.
   - Can view publish event details.

---

## 6. Retry Strategy

### 6.1 Retryable Errors

- Rate limit exceeded
- Temporary network issues
- Platform API timeout
- 5xx server errors

**Handling:**
- Requeue with exponential backoff (1min, 5min, 15min, 1hr)
- Max 5 attempts
- After max attempts, mark as `failed`

### 6.2 Non-Retryable Errors

- Authentication failure (revoked token)
- Content policy violation
- Invalid request (400 errors)
- Deleted channel connection

**Handling:**
- Immediate `failed` status
- No retry
- User notified via publish event

---

## 7. Calendar View

**Use-case:** `listSchedulesByDateRange(principal, from, to)`

Returns schedules + associated posts/variants for calendar UI.

**Supports filters:**
- Channel
- Channel connection
- Tag
- Post status

Backend exposes structured data; calendar visualization is client concern.

---

## 8. Constraints & Rules

**Scheduling Horizon**
- `run_at` must be in future (> now)
- `run_at` must be within maximum days (e.g., < now + 90 days)

**Connection Validity**
- Can only schedule to `ChannelConnection.status = connected`
- Invalid connection returns validation error

**Rate Limiting (Optional)**
- Domain may enforce:
  - Max N posts per hour per connection
  - Minimum gap between posts on same channel

**Concurrency Control**
- Scanner uses database locks to prevent double-queuing
- Publisher acknowledges messages only after database commit

---

## 9. Summary

Key entities:

- `schedules` – Publishing instructions with timing
- `publish_events` – Detailed audit trail of attempts

Key infrastructure:

- **Scanner Runner** – Finds due schedules, queues them
- **Publisher Runner** – Consumes queue, publishes to platforms
- **RabbitMQ** – Message broker for reliable queuing

This architecture provides reliable, scalable, observable publishing with proper error handling and audit trails.

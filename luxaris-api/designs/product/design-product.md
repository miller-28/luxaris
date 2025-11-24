
# Luxaris API product – Posts & Scheduling Model

This document describes the **Posts context** of the Luxaris API:  
everything related to posts, templates, generations, channels and schedules.  

It focuses on **business concepts and data structures**, not low-level SQL or technical wiring.

System-level entities (users, roles, permissions, global logs, API keys) are defined in `design-api-system.md`.

---

## 1. Scope of the Posts Context

The Posts context owns:

- Authoring of posts (drafts, variants, templates).
- Scheduling and publishing workflow.
- Channel and account mapping (where posts are published).
- AI / generative flows for assisting content creation.
- Calendar / timeline views of upcoming and past posts.

It does **not** own:

- Users, authentication, roles, permissions.
- Global logging/audit.
- API keys and system configuration.

Those are consumed from the System context.

---

## 2. Core Concepts & Entities

### 2.1 Channel

**Channel** = destination platform type (e.g. X, LinkedIn; future: others).

Fields (conceptual):

- `id` – UUID.
- `key` – stable identifier (`"x"`, `"linkedin"`).
- `name` – human readable (`"X (Twitter)"`).
- `status` – `active | disabled`.
- `limits` – JSON with platform limits:
  - `max_text_length`
  - `supports_images`
  - `supports_links`
  - per-day rate limits (optional).
- `created_at`, `updated_at`.

This is more like a static catalog table used by validation and generation logic.

---

### 2.2 Channel Connection

**ChannelConnection** = a user- or account-specific connection to a channel  
(e.g. “Jonathan’s X account @miller_28”).

Fields:

- `id` – UUID.
- `owner_principal_id` – principal id from System context.
- `channel_id` – FK → `Channel`.
- `display_name` – e.g. `"@miller_28"`.
- `status` – `connected | revoked | error`.
- `auth_state` – JSON with tokens, refresh info, etc (encrypted at rest).
- `created_at`, `updated_at`, `last_used_at`.

Publishing logic uses this to know **where** and **as whom** to send posts.

---

### 2.3 Post

**Post** is the central content unit in Luxaris:  
a conceptual message/idea independent of channel formatting.

Fields:

- `id` – UUID.
- `owner_principal_id` – who owns it.
- `title` – optional, for internal use / calendar.
- `base_content` – base text (channel-agnostic).
- `tags` – list of strings (for filtering, not social hashtags).
- `status` – `draft | scheduled | published | cancelled | archived`.
- `created_at`, `updated_at`, `published_at` (optional).
- `metadata` – JSON (custom fields, grouping, campaign id, etc).

Notes:

- A `Post` can have multiple **PostVariants** for different channels or styles.
- `status` is derived from related schedules and publishing results but also directly settable for archiving.

---

### 2.4 Post Variant

**PostVariant** = channel-targeted representation of a post.

Fields:

- `id` – UUID.
- `post_id` – FK → `Post`.
- `channel_id` – FK → `Channel`.
- `channel_connection_id` – target account (optional; may be chosen later).
- `content` – final channel-specific text.
- `media` – JSON references (images, video links, etc).
- `tone` – optional label (`"neutral"`, `"provocative"`, `"short"`, etc).
- `source` – `manual | generated | imported`.
- `status` – `draft | ready | published | failed`.
- `created_at`, `updated_at`, `published_at` (optional).
- `metadata` – JSON (UTM codes, short-url mapping, etc).

Notes:

- A `Post` may have **0..N** variants.
- Scheduling and publishing happens at the **variant** level (since it’s channel-specific).

---

### 2.5 Schedule

**Schedule** = instruction to publish a specific PostVariant at a specific time.

Fields:

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

Notes:

- Scheduler finds `pending` schedules with `run_at <= now` and moves them into `queued/processing`.
- Publishing errors update `status` and error fields but **do not** delete the schedule.

---

### 2.6 Publish Result (Event)

For auditability and debugging, each publish attempt can be recorded as a **PublishEvent**.

Fields:

- `id` – UUID.
- `schedule_id` – FK → `Schedule`.
- `attempt_index` – 1, 2, 3…
- `timestamp`.
- `status` – `success | failed | retried | cancelled`.
- `external_post_id` – id returned by the channel API (if success).
- `external_url` – public URL of the published post (if success).
- `error_code`, `error_message` – if failed.
- `raw_response` – optional truncated JSON for debugging (no secrets).

These are more detailed than global audit logs, and live in the Posts context.

---

### 2.7 Templates

**PostTemplate** helps to define reusable patterns for content generation.

Fields:

- `id` – UUID.
- `owner_principal_id`.
- `name` – e.g. `"launch_announce_short"`.
- `description`.
- `template_body` – text with placeholders (e.g. `"New feature: {{feature}} is live..."`).
- `default_channel_id` – optional default target.
- `constraints` – JSON (max length, tone presets, etc).
- `created_at`, `updated_at`.

Templates can be used both for manual fill-in and AI-assisted generation.

---

### 2.8 Generation Session & Suggestion

**GenerationSession** groups multiple AI generations around a single intent.

Fields:

- `id` – UUID.
- `owner_principal_id`.
- `post_id` – optional link to a Post.
- `template_id` – optional link to PostTemplate.
- `prompt` – high-level request (“announce our new feature x in dark, sharp tone”).
- `status` – `in_progress | completed | aborted`.
- `created_at`, `updated_at`.

**GenerationSuggestion** captures each generated candidate.

Fields:

- `id` – UUID.
- `generation_session_id`.
- `channel_id` – target channel considered.
- `content` – proposed text.
- `score` – optional numeric quality score / ranking.
- `accepted` – boolean (if user promoted it to a PostVariant).
- `created_at`.

Business flow: user runs generation → sees multiple suggestions → picks one → it becomes a `PostVariant` (and possibly the `Post`’s base_content if initial draft).

---

## 3. Key Workflows (Use-Case Level)

### 3.1 Create Draft Post (Manual)

Flow:

1. User (principal) requests to create a new post with base content.
2. Posts application validates:
   - user can create posts.
   - content basic constraints.
3. Creates:
   - `Post` with `status = draft`.
4. Returns post data to client.

Optional: Immediately create a `PostVariant` if a default channel is selected.

---

### 3.2 Generate Post Suggestions

Flow:

1. User specifies:
   - high-level prompt / description,
   - optional template reference,
   - target channel(s),
   - tone/length hints.
2. Application creates a `GenerationSession`.
3. For each target channel:
   - calls generator adapter in infrastructure (e.g. AI API).
   - applies channel-specific limits (truncate, reword).
   - stores each proposal as `GenerationSuggestion`.
4. User fetches suggestions and picks one:
   - accepted suggestion becomes a `PostVariant` (linked to a Post).
   - optionally, if no Post existed, create a new Post and set `base_content` from chosen suggestion.

---

### 3.3 Create / Update Schedules

#### Create schedule

1. User selects:
   - `post_variant_id`
   - `channel_connection_id`
   - `run_at` (local time) + timezone.
2. Application:
   - converts to UTC.
   - validates via domain rules:
     - run_at is in future.
     - not beyond maximum horizon.
     - channel connection is active.
     - rate-limit / conflict rules (optional).
   - creates `Schedule` with `status = pending`.
   - sets `Post.status` = `scheduled` if not already.

#### Update schedule

- Allows moving time (`run_at`), changing connection, or cancelling:
  - If cancelled:
    - `Schedule.status = cancelled`.
    - If all schedules of the same post are cancelled and post not yet published, post may return to `draft` or `cancelled` status according to rules.

---

### 3.4 Publishing Engine (Background)

A worker process periodically:

1. Fetches `Schedule` with:
   - `status = pending`
   - `run_at <= now`
   - respecting concurrency / rate limits.
2. Transitions them to `processing`.
3. For each schedule:
   - loads `PostVariant` and `ChannelConnection`.
   - calls external channel adapter:
     - on success:
       - create `PublishEvent` with `status = success`.
       - update `Schedule.status = success`.
       - update `PostVariant.status = published`.
       - if all variants/schedules done, mark `Post.status = published`.
     - on failure:
       - record `PublishEvent` with `status = failed`.
       - update `Schedule.status` accordingly:
         - `failed` (no retry) or
         - back to `pending` with incremented `attempt_count` if retryable.
4. Errors are captured but schedules are not deleted.

Retry strategy is defined in domain rules (max attempts, backoff).

---

### 3.5 Calendar / Timeline View

Use-cases to support views like “what’s going out next week?”:

- `listSchedulesByDateRange(principal, from, to)`:
  - returns schedules + associated posts/variants for calendar UI.
- Supports filters:
  - channel, channel_connection, tag, post status.

Backend just exposes structured data; calendar visualization is a client concern.

---

### 3.6 Post Lifecycle

A typical lifecycle:

1. `Post` created as `draft`.
2. Variants authored or generated (`PostVariant.status = draft | ready`).
3. Schedules created (`Schedule.status = pending`).
4. Worker publishes:
   - success → `PostVariant.status = published`, `Schedule.status = success`, `Post.status = published`.
   - failure → `Schedule.status = failed`, optional retries.
5. Post can later be `archived` for housekeeping.

Transitions are governed by domain rules to prevent invalid states (e.g. publishing a post with no variants).

---

## 4. Constraints & Domain Rules (Examples)

Some important business constraints:

- **Content length**  
  `PostVariant.content` must not exceed `Channel.limits.max_text_length`.

- **Scheduling horizon**  
  `Schedule.run_at` must be:
  - > current time,
  - < now + `MAX_FUTURE_DAYS` (configurable).

- **Channel connection validity**  
  Only schedules to `ChannelConnection.status = connected` are allowed.

- **Ownership**  
  Only principals with the right permissions (from System context) can:
  - view / edit posts they own or are allowed to manage,
  - schedule to channel connections they own or are permitted to use.

- **Rate limiting (optional)**  
  Domain may define:
  - no more than `N` posts per hour per connection,
  - or gaps between posts in the same channel.

These rules live in `posts/domain/rules` and are consumed by application use-cases.

---

## 5. Summary of Posts Context Entities

Main entities in this context:

- `Channel`
- `ChannelConnection`
- `Post`
- `PostVariant`
- `Schedule`
- `PublishEvent`
- `PostTemplate`
- `GenerationSession`
- `GenerationSuggestion`

All of them are **owned by the Posts context** and are accessed from other parts of the system via well-defined use-cases in the Posts application layer.
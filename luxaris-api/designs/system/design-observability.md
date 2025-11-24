
# Luxaris API system – Observability

This document describes **Observability** within the Luxaris System context:  
system logs, audit logs, request tracing, and correlation.

---

## 1. Overview

Observability provides:

- Technical telemetry (system logs)
- Business-relevant event tracking (audit logs)
- Request correlation and tracing
- Debugging and compliance capabilities

---

## 2. Logging

We distinguish between **system logs** (technical telemetry) and **audit logs** (who did what).

### 2.1 System Logs (technical telemetry)

These are mainly **streamed** to a log sink, not stored as rows, but there is still a logical structure:

- `timestamp`
- `level` – `debug | info | warn | error | fatal`.
- `logger` – module name.
- `request_id` – correlates to a single API request.
- `principal_id` (if present).
- `message`
- `meta` – JSON (any extra context: error stack, payload sizes, etc).

They are written via `core/logging/logger.js` and shipped to stdout or log aggregation.

Guidelines (from project standards):

- **Log Levels**: Use appropriate levels for different scenarios:
  - `DEBUG`: Detailed diagnostic information for development
  - `INFO`: General informational messages (requests, responses, state changes)
  - `WARNING`: Recoverable issues that need attention
  - `ERROR`: Error conditions that affect functionality
  - `CRITICAL`: System-critical failures requiring immediate action
- **Log Format**: Include essential context in every log entry:
  - Timestamp (ISO 8601 format)
  - Log level
  - Service/module name
  - Request ID (for tracing)
  - User ID (when authenticated)
  - Message
  - Additional context (structured data)
- **Best Practices**:
  - Never log sensitive data (passwords, tokens, PII)
  - Use correlation IDs to trace requests across services
  - Log all API requests/responses (excluding sensitive data)
  - Log all errors with stack traces
  - Include performance metrics (response time, query duration)

---

### 2.2 Audit Logs (business-relevant events)

**Concept:** an append-only record of user/system actions that matter from a business / security perspective.

Main fields:

- `id` – UUID.
- `timestamp`.
- `actor_type` – `user | service_account | system`.
- `actor_id` – nullable if `system`.
- `action` – string code (`"USER_LOGIN"`, `"ROLE_ASSIGNED"`, `"SCHEDULE_CREATED"`, `"POST_PUBLISHED"`).
- `resource_type` – e.g. `"user"`, `"schedule"`, `"post"`.
- `resource_id` – id of the affected entity.
- `ip_address`, `user_agent` – optional but useful for security.
- `data` – JSON payload with non-sensitive details (no secrets).

Guidelines:

- Audit table is **append-only** (no updates or deletes) except in extreme legal/GDPR cases.
- Used for security reviews, debugging unexpected behavior, and compliance.

---

## 3. Request Tracing & Correlation

To tie logs and audits together, every incoming request gets:

- `request_id` – random UUID attached to:
  - logger context,
  - audit entries,
  - error responses (so you can tell users "send us your request id").

Optionally:

- `trace_id`, `span_id` – if integrating with distributed tracing later.

These are usually not stored in a dedicated table; they are part of log/audit records.

---

## 4. Summary of Observability Entities

Key entities:

- `audit_logs` (persisted)
- System logs (streamed, not persisted in DB)

Supporting concepts:

- `request_id` for correlation
- Optional `trace_id`, `span_id` for distributed tracing

These provide the foundation for debugging, security reviews, and compliance in the Luxaris system.

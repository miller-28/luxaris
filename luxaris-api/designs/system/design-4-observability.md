
# Luxaris API system – Observability

This document describes **Observability** within the Luxaris System domain:  
system logs, system events, audit logs, request tracing, and correlation.

---

## 1. Overview

Observability provides:

- Technical telemetry (system logs - errors, warnings, info)
- Business-relevant event tracking (system events, audit logs)
- Request correlation and tracing
- Debugging and compliance capabilities
- Centralized logging and event management

---

## 2. System Logs (Technical Telemetry)

### 2.1 Concept

**System Logs:** Persistent storage for all technical logs (errors, warnings, info) from the entire API.

Unlike traditional streaming logs, these are **stored in database** for:
- Long-term error analysis
- Debugging production issues
- Pattern detection
- Compliance and audit trails
- Query and filter capabilities

### 2.2 System Logs Table

Main fields:

- `id` – UUID.
- `timestamp` – When the log occurred.
- `level` – `DEBUG | INFO | WARNING | ERROR | CRITICAL`.
- `logger` – Module/component name (e.g., `system.auth`, `posts.scheduler`).
- `message` – Human-readable log message.
- `request_id` – Correlates to API request (if applicable).
- `principal_id` – User/service account ID (if authenticated).
- `principal_type` – `user | service_account | system`.
- `context` – JSON with additional data:
  - `module` – Source module
  - `function` – Function name
  - `line` – Line number (optional)
  - `stack_trace` – For errors
  - `error_code` – Application error code
  - `duration_ms` – Operation duration
  - `ip_address` – Client IP
  - `user_agent` – Client user agent
- `created_at` – Database insertion time.

### 2.3 Log Levels Usage

**DEBUG:**
- Detailed diagnostic information for development
- Variable values, state changes
- Not stored in production (filtered out)

**INFO:**
- General informational messages
- API requests received
- Successful operations
- State changes

**WARNING:**
- Recoverable issues that need attention
- Deprecated API usage
- Rate limit approaching
- Retry attempts

**ERROR:**
- Error conditions affecting functionality
- Failed operations
- Validation failures
- External service errors
- Stored with stack trace

**CRITICAL:**
- System-critical failures
- Database connection lost
- Service unavailable
- Requires immediate action
- Triggers alerts

### 2.4 Database Schema

```sql
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  level VARCHAR(20) NOT NULL,
  logger VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  request_id UUID,
  principal_id UUID,
  principal_type VARCHAR(50),
  context JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_logger ON system_logs(logger);
CREATE INDEX idx_system_logs_request_id ON system_logs(request_id);
CREATE INDEX idx_system_logs_principal_id ON system_logs(principal_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
```

### 2.5 Retention Policy

- **DEBUG**: Not stored in production
- **INFO**: 30 days
- **WARNING**: 90 days
- **ERROR**: 1 year
- **CRITICAL**: Indefinite (until manually archived)

Automated cleanup job runs daily to remove old logs based on retention policy.

---

## 3. System Events (Business Events)

### 3.1 Concept

**System Events:** Major business events across the entire API platform.

Different from audit logs:
- **System Events**: High-level business milestones (user registered, post published)
- **Audit Logs**: Detailed security/compliance tracking (who did what, when)

System events are used for:
- Business analytics
- User activity tracking
- Feature usage metrics
- Integration points
- Webhooks (future)

### 3.2 System Events Table

Main fields:

- `id` – UUID.
- `event_type` – Event category (`auth`, `post`, `schedule`, `channel`, `system`).
- `event_name` – Specific event (see Event Catalog below).
- `principal_id` – User/service account who triggered event.
- `principal_type` – `user | service_account | system`.
- `resource_type` – Affected entity type (`user`, `post`, `schedule`, `channel`).
- `resource_id` – ID of affected entity.
- `status` – `success | failed | pending`.
- `metadata` – JSON with event-specific data (non-sensitive).
- `ip_address` – Client IP address.
- `user_agent` – Client user agent.
- `timestamp` – When event occurred.
- `created_at` – Database insertion time.

### 3.3 Event Catalog

**Authentication Events (`auth`):**
- `USER_REGISTERED` – New user registration
- `USER_REGISTERED_VIA_OAUTH` – OAuth registration
- `USER_APPROVED` – User approved by root
- `USER_REJECTED` – User registration rejected
- `USER_LOGIN` – Successful login
- `USER_LOGIN_FAILED` – Failed login attempt
- `USER_LOGOUT` – User logout
- `PASSWORD_CHANGED` – Password update
- `PASSWORD_RESET_REQUESTED` – Password reset initiated
- `TOKEN_REFRESHED` – Access token refreshed
- `OAUTH_ACCOUNT_LINKED` – OAuth provider linked

**Post Events (`post`):**
- `POST_CREATED` – New post created
- `POST_UPDATED` – Post modified
- `POST_DELETED` – Post deleted
- `POST_VARIANT_CREATED` – Variant created
- `POST_VARIANT_UPDATED` – Variant modified
- `POST_VARIANT_DELETED` – Variant deleted
- `POST_GENERATED` – AI-generated post

**Schedule Events (`schedule`):**
- `SCHEDULE_CREATED` – New schedule created
- `SCHEDULE_UPDATED` – Schedule modified
- `SCHEDULE_CANCELLED` – Schedule cancelled
- `SCHEDULE_QUEUED` – Schedule queued for publishing
- `SCHEDULE_PUBLISHING` – Publishing in progress
- `SCHEDULE_PUBLISHED` – Successfully published
- `SCHEDULE_FAILED` – Publishing failed

**Channel Events (`channel`):**
- `CHANNEL_CONNECTED` – OAuth channel connected
- `CHANNEL_DISCONNECTED` – Channel disconnected
- `CHANNEL_TOKEN_REFRESHED` – OAuth token refreshed
- `CHANNEL_ERROR` – Channel authentication error

**Template Events (`template`):**
- `TEMPLATE_CREATED` – Template created
- `TEMPLATE_UPDATED` – Template modified
- `TEMPLATE_DELETED` – Template deleted
- `TEMPLATE_USED` – Template used for generation

**System Events (`system`):**
- `API_KEY_CREATED` – API key generated
- `API_KEY_REVOKED` – API key revoked
- `ROLE_ASSIGNED` – Role assigned to user
- `ROLE_REVOKED` – Role revoked from user
- `PERMISSION_GRANTED` – Direct permission granted
- `PERMISSION_REVOKED` – Permission revoked

### 3.4 Database Schema

```sql
CREATE TABLE system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  principal_id UUID,
  principal_type VARCHAR(50),
  resource_type VARCHAR(50),
  resource_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_events_event_type ON system_events(event_type);
CREATE INDEX idx_system_events_event_name ON system_events(event_name);
CREATE INDEX idx_system_events_principal_id ON system_events(principal_id);
CREATE INDEX idx_system_events_resource ON system_events(resource_type, resource_id);
CREATE INDEX idx_system_events_timestamp ON system_events(timestamp DESC);
CREATE INDEX idx_system_events_status ON system_events(status);
```

### 3.5 Retention Policy

- All events: 2 years
- After 2 years: Archive to cold storage or data warehouse
- Critical events (auth, security): Indefinite

---

## 4. Request Logs (HTTP Telemetry)

### 4.1 Concept

**Request Logs:** Comprehensive tracking of all HTTP requests for performance monitoring, debugging, and API usage analytics.

Unlike system logs (technical errors) or system events (business actions), request logs capture:
- Every HTTP request/response
- Request timing and performance
- API usage patterns
- Client information
- Error tracking at HTTP layer

### 4.2 Request Logs Table

Main fields:

- `id` – UUID.
- `request_id` – Unique request identifier (correlation ID).
- `timestamp` – Request start time.
- `method` – HTTP method (GET, POST, PUT, DELETE, etc.).
- `path` – Request path (e.g., `/api/v1/posts`).
- `status_code` – HTTP response status code.
- `duration_ms` – Request duration in milliseconds.
- `principal_id` – Authenticated user/service account ID (nullable).
- `principal_type` – `user | service_account | anonymous`.
- `ip_address` – Client IP address.
- `user_agent` – Client user agent string.
- `request_size_bytes` – Request body size.
- `response_size_bytes` – Response body size.
- `error_code` – Application error code (if error occurred).
- `error_message` – Error message (if error occurred).
- `context` – JSON with additional data:
  - `query_params` – Query string parameters
  - `route_params` – Route parameters
  - `headers` – Selected headers (excluding sensitive)
  - `referrer` – HTTP referrer
  - `correlation_id` – External correlation ID (if provided)
- `created_at` – Database insertion time.

### 4.3 Database Schema

```sql
CREATE TABLE request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  method VARCHAR(10) NOT NULL,
  path VARCHAR(500) NOT NULL,
  status_code INT NOT NULL,
  duration_ms INT NOT NULL,
  principal_id UUID,
  principal_type VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  request_size_bytes INT,
  response_size_bytes INT,
  error_code VARCHAR(100),
  error_message TEXT,
  context JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_request_logs_request_id ON request_logs(request_id);
CREATE INDEX idx_request_logs_timestamp ON request_logs(timestamp DESC);
CREATE INDEX idx_request_logs_path ON request_logs(path);
CREATE INDEX idx_request_logs_status_code ON request_logs(status_code);
CREATE INDEX idx_request_logs_principal_id ON request_logs(principal_id);
CREATE INDEX idx_request_logs_method ON request_logs(method);
CREATE INDEX idx_request_logs_duration ON request_logs(duration_ms);
CREATE INDEX idx_request_logs_created_at ON request_logs(created_at DESC);
```

### 4.4 Retention Policy

- **Success (2xx)**: 30 days
- **Client errors (4xx)**: 90 days
- **Server errors (5xx)**: 180 days
- **High-value endpoints** (auth, payments): 1 year

Automated cleanup job runs daily to remove old logs based on retention policy.

### 4.5 What Gets Logged

**Included:**
- All API requests (authenticated and anonymous)
- Request/response timing
- HTTP status codes
- Client information (IP, user agent)
- Non-sensitive query parameters
- Error codes and messages
- Performance metrics

**Excluded (Security):**
- Password fields
- Authorization tokens
- API keys
- Credit card numbers
- Any PII in request bodies
- Sensitive headers (Authorization, Cookie)

---

## 5. Audit Logs (Compliance & Security)

### 5.1 Concept

**Audit Logs:** Append-only record for security, compliance, and regulatory requirements.

Main fields:

- `id` – UUID.
- `timestamp` – When action occurred.
- `actor_type` – `user | service_account | system`.
- `actor_id` – Who performed action (nullable if system).
- `action` – Action code (e.g., `"USER_LOGIN"`, `"POST_PUBLISHED"`).
- `resource_type` – Affected entity type.
- `resource_id` – ID of affected entity.
- `ip_address` – Client IP.
- `user_agent` – Client user agent.
- `data` – JSON with non-sensitive details.
- `created_at` – Database insertion time.

**Note:** Audit logs are similar to system events but serve different purposes:
- **Audit Logs**: Legal/compliance requirements, never deleted
- **System Events**: Business analytics, can be archived

### 4.2 Database Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  actor_type VARCHAR(50),
  actor_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

**Retention:** Append-only, never deleted (except legal/GDPR requirements).

---

## 6. Centralized Logging & Event Classes

### 6.1 SystemLogger Class

**Purpose:** Centralized logging handler for all technical logs.

**Location:** `src/core/logging/system_logger.js`

**Methods:**

```javascript
class SystemLogger {
  // Log debug information
  debug(logger, message, context = {})
  
  // Log informational messages
  info(logger, message, context = {})
  
  // Log warnings
  warning(logger, message, context = {})
  
  // Log errors with stack trace
  error(logger, message, error, context = {})
  
  // Log critical failures
  critical(logger, message, error, context = {})
  
  // Query logs for debugging
  query(filters)
}
```

**Usage Example:**

```javascript
const systemLogger = require('core/logging/system_logger');

// Info log
systemLogger.info('system.auth', 'User login successful', {
  request_id: req.id,
  principal_id: user.id,
  principal_type: 'user'
});

// Error log with stack trace
try {
  await someOperation();
} catch (error) {
  systemLogger.error('posts.creation', 'Failed to create post', error, {
    request_id: req.id,
    principal_id: req.user.id,
    post_data: sanitizedData
  });
  throw error;
}
```

### 6.2 EventRegistry Class

**Purpose:** Centralized event handler for business events.

**Location:** `src/core/events/event_registry.js`

**Methods:**

```javascript
class EventRegistry {
  // Record successful event
  record(eventType, eventName, options = {})
  
  // Record failed event
  recordFailure(eventType, eventName, error, options = {})
  
  // Bulk record events (for batch operations)
  recordBatch(events)
  
  // Query events for analytics
  query(filters)
}
```

**Usage Example:**

```javascript
const eventRegistry = require('core/events/event_registry');

// Record user registration
await eventRegistry.record('auth', 'USER_REGISTERED', {
  principal_id: user.id,
  principal_type: 'user',
  resource_type: 'user',
  resource_id: user.id,
  metadata: {
    auth_method: 'password',
    is_root: user.is_root
  },
  ip_address: req.ip,
  user_agent: req.get('user-agent')
});

// Record failed event
await eventRegistry.recordFailure('schedule', 'SCHEDULE_PUBLISHED', error, {
  principal_id: user.id,
  resource_type: 'schedule',
  resource_id: schedule.id,
  metadata: {
    channel: schedule.channel_connection_id,
    attempt: schedule.attempt_count
  }
});
```

### 6.3 RequestLogger Class

**Purpose:** HTTP request/response telemetry and performance tracking.

**Location:** `src/core/http/middleware/request_logger.js`

**Implementation Pattern:**

```javascript
class RequestLogger {
  // Middleware function to attach to Express
  middleware() {
    return async (req, res, next) => {
      const startTime = Date.now();
      const requestId = req.id; // From express-request-id middleware
      
      // Capture request size
      const requestSize = req.get('content-length') || 0;
      
      // Store original res.json to capture response
      const originalJson = res.json.bind(res);
      let responseSize = 0;
      
      res.json = function(body) {
        responseSize = JSON.stringify(body).length;
        return originalJson(body);
      };
      
      // On response finish, log to database
      res.on('finish', async () => {
        const duration = Date.now() - startTime;
        
        try {
          await this.logRequest({
            request_id: requestId,
            timestamp: new Date(startTime),
            method: req.method,
            path: req.path,
            status_code: res.statusCode,
            duration_ms: duration,
            principal_id: req.user?.id || null,
            principal_type: req.user ? 'user' : 'anonymous',
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            request_size_bytes: requestSize,
            response_size_bytes: responseSize,
            error_code: res.locals.errorCode || null,
            error_message: res.locals.errorMessage || null,
            context: {
              query_params: this.sanitizeParams(req.query),
              route_params: req.params,
              referrer: req.get('referrer'),
              correlation_id: req.get('x-correlation-id')
            }
          });
        } catch (error) {
          // Fail silently - don't break request flow
          console.error('Failed to log request:', error);
        }
      });
      
      next();
    };
  }
  
  // Log request to database
  async logRequest(data) {
    // Insert into request_logs table
    // Implementation in repository layer
  }
  
  // Remove sensitive parameters
  sanitizeParams(params) {
    const sensitive = ['password', 'token', 'secret', 'api_key'];
    const sanitized = { ...params };
    
    for (const key of Object.keys(sanitized)) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  // Query request logs for analytics
  async query(filters) {
    // Query request_logs table
    // Filters: principal_id, path, status_code, date_range, etc.
  }
  
  // Get performance metrics
  async getMetrics(options = {}) {
    // Aggregate queries:
    // - Average response time by endpoint
    // - Request count by status code
    // - Slowest endpoints
    // - Error rate by endpoint
  }
}

module.exports = new RequestLogger();
```

**Usage Example:**

```javascript
// src/core/http/server.js
const express = require('express');
const requestId = require('express-request-id')();
const requestLogger = require('./middleware/request_logger');

const app = express();

// Attach request ID first
app.use(requestId);

// Attach request logger
app.use(requestLogger.middleware());

// ... rest of middleware and routes
```

### 6.4 Integration with Error Handling

**Global Error Handler:**

```javascript
// src/core/http/middleware/error_handler.js
function errorHandler(err, req, res, next) {
  // Store error info for request logger
  res.locals.errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  res.locals.errorMessage = err.message;
  
  // Always log errors to system_logs
  systemLogger.error(
    'http.request',
    `${req.method} ${req.path} failed`,
    err,
    {
      request_id: req.id,
      principal_id: req.user?.id,
      status_code: err.statusCode || 500,
      error_code: err.code
    }
  );
  
  // Send error response (request logger will capture this)
  res.status(err.statusCode || 500).json({
    errors: [{
      error_code: err.code || 'INTERNAL_SERVER_ERROR',
      error_description: err.message,
      error_severity: 'error'
    }],
    request_id: req.id
  });
}
```

---

## 7. Request Tracing & Correlation

To tie logs, events, audits, and request logs together, every incoming request gets:

- `request_id` – Random UUID attached to:
  - Logger context
  - Event records
  - Audit entries
  - Error responses

Optionally:

- `trace_id`, `span_id` – For distributed tracing

These are part of log/event/audit records for complete correlation.

---

## 8. Summary of Observability Entities

Key entities:

- `system_logs` – Technical telemetry (errors, warnings, info) - **DATABASE PERSISTED**
- `system_events` – Business events (registrations, posts, schedules) - **DATABASE PERSISTED**
- `request_logs` – HTTP request/response telemetry - **DATABASE PERSISTED**
- `audit_logs` – Compliance and security tracking - **DATABASE PERSISTED**

Supporting concepts:

- `request_id` for correlation across all logging systems
- SystemLogger class for centralized technical logging
- EventRegistry class for business event management
- RequestLogger middleware for HTTP telemetry
- Retention policies for data lifecycle
- Optional `trace_id`, `span_id` for distributed tracing

### Four-Tier Observability

| Layer | Purpose | Table | Class | Example |
|-------|---------|-------|-------|----------|
| **HTTP** | Request telemetry | `request_logs` | `RequestLogger` | GET /api/v1/posts took 45ms, returned 200 |
| **Technical** | Error/info logs | `system_logs` | `SystemLogger` | Database query failed with timeout error |
| **Business** | User actions | `system_events` | `EventRegistry` | User created post, schedule published |
| **Compliance** | Legal audit trail | `audit_logs` | `AuditService` | User Alice deleted post ID 123 at 10:00 AM |

These provide complete observability for debugging, performance monitoring, analytics, security, and compliance in the Luxaris system.

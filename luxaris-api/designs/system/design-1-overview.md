# Luxaris API – System Context Overview

This document provides a high-level overview of the **System context** and how its four major components work together to provide the foundational capabilities for the entire Luxaris API.

---

## 1. What is the System Context?

The System context is the **foundational layer** of the Luxaris API that provides cross-cutting capabilities used by all other bounded contexts (e.g., Posts, Schedules).

### 1.1 Core Responsibilities

The System context provides:

- **Identity & Authentication** – Who you are (users, service accounts, sessions, JWT, API keys)
- **Access Control (ACL)** – What you can do (permissions, roles, authorization)
- **Observability** – What happened (system logs, audit logs, request tracing)
- **Operations** – How the system runs (feature flags, health checks, configuration)

### 1.2 Design Principles

- **Separation of concerns** – Each component has a single, well-defined purpose
- **Bounded context isolation** – Other contexts (Posts, etc.) depend on System but don't modify its internals
- **Port/adapter pattern** – System exposes well-defined interfaces; contexts call functions, not direct DB access
- **Security-first** – All authentication and authorization flows through System

---

## 2. The Four Pillars of System Context

### 2.1 Identity & Authentication

**Purpose:** Establish who is making requests.

**Key concepts:**
- Users and service accounts as principals
- Multiple authentication methods:
  - Password-based (email + hashed password)
  - OAuth providers (Google, GitHub, etc.)
  - Sessions (for web dashboard)
  - JWT tokens (for API access)
  - API keys (for programmatic access)
- OAuth provider management and account linking
- Password hashing and secure credential storage

**Detailed design:** [`design-2-identity.md`](./design-2-identity.md)

**Key entities:**
- `users`
- `service_accounts`
- `sessions` (if persisted)
- `api_keys`

**Exposed interfaces:**
- `issueToken(principal, options)` – Generate JWT
- `verifyToken(token)` – Validate JWT
- `authenticateApiKey(key)` – Verify API key
- `createSession(principal)` – Create session
- `getSession(sessionId)` – Retrieve session

---

### 2.2 Access Control (ACL)

**Purpose:** Determine what authenticated principals can do.

**Key concepts:**
- ACL star model: Principal → Roles → Permissions → Resource/Action
- Fine-grained permissions with optional conditions
- Role-based permission bundling
- Direct grants for exceptional cases

**Detailed design:** [`design-access-control.md`](./design-access-control.md)

**Key entities:**
- `permissions`
- `roles`
- `role_permissions`
- `principal_role_assignments`
- `principal_permission_grants`

**Exposed interfaces:**
- `can(principal, resource, action, context)` – Check permission
- `assignRole(principal, role)` – Assign role to principal
- `grantPermission(principal, permission)` – Direct permission grant
- `getPrincipalPermissions(principal)` – Get all permissions for principal

---

### 2.3 Observability

**Purpose:** Track what happens in the system for debugging, analytics, security, and compliance.

**Key concepts:**
- **Four-tier observability**:
  - **Request Logs**: HTTP request/response telemetry (timing, status, performance)
  - **System Logs**: Persistent technical telemetry (errors, warnings, info) stored in database
  - **System Events**: Business events tracking (user actions, post creation, schedule publishing)
  - **Audit Logs**: Compliance and security tracking (append-only)
- Centralized logging via `SystemLogger` class
- HTTP telemetry via `RequestLogger` middleware
- Centralized event tracking via `EventRegistry` class
- Structured logging with correlation IDs
- Request tracing across the application
- Database-persisted logs for long-term analysis

**Detailed design:** [`design-4-observability.md`](./design-4-observability.md)

**Key entities:**
- `request_logs` – HTTP request/response telemetry (database-persisted)
- `system_logs` – Technical telemetry (database-persisted)
- `system_events` – Business events (database-persisted)
- `audit_logs` – Compliance logs (database-persisted, append-only)

**Exposed interfaces:**
- `RequestLogger.middleware()` – Express middleware for request logging (automatic)
- `SystemLogger.info|warning|error|critical(logger, message, context)` – Log technical events to database
- `EventRegistry.record(eventType, eventName, options)` – Record business event
- `auditLog(actor, action, resource, data)` – Record compliance event
- `attachRequestId(req)` – Generate and attach correlation ID

---

### 2.4 Operations & System Management

**Purpose:** Control runtime behavior and monitor system health.

**Key concepts:**
- Feature flags for gradual rollouts
- Health checks for dependency monitoring
- Environment-based configuration
- Version and deployment tracking

**Detailed design:** [`design-ops.md`](./design-ops.md)

**Key entities:**
- `feature_flags`

**Exposed interfaces:**
- `isFeatureEnabled(key, context)` – Check feature flag
- `getHealthStatus()` – Get system health
- `getSystemInfo()` – Get version and build info

---

## 3. How the Four Pillars Work Together

### 3.1 Request Flow Example

When an API request comes in:

1. **Identity** authenticates the request (JWT/API key/session)
2. **Observability** attaches `request_id` for tracing
3. **Access Control** checks if principal can perform the action
4. **Operations** checks if feature is enabled
5. Business logic executes (in Posts context, etc.)
6. **Observability** logs the outcome and creates audit entry

### 3.2 Integration Points

**Identity → Access Control**
- Identity establishes the principal (user/service account)
- Access Control uses principal ID to check permissions

**Identity → Observability**
- Authentication events logged to audit logs
- Principal ID attached to all log entries

**Access Control → Observability**
- Permission checks and role changes logged to audit logs
- Authorization failures tracked for security

**Operations → All**
- Feature flags control behavior across all components
- Health checks verify all systems operational

---

## 4. Dependencies and Context Boundaries

### 4.1 System Context is Self-Contained

The System context:
- Has no dependencies on other contexts (Posts, etc.)
- Manages its own data models and repositories
- Exposes services through well-defined interfaces

### 4.2 Other Contexts Depend on System

Other contexts (e.g., Posts):
- Call System services through exposed interfaces
- Never access System database tables directly
- Treat System as a black box with clear contracts

**Example:**
```js
// Posts context checking permission
const { can } = require('../../system/application/services/permission_service');

async function deletePost(postId, principal) {
  // Check permission via System service
  if (!can(principal, 'post', 'delete', { postId })) {
    throw new ForbiddenError('Cannot delete post');
  }
  
  // Business logic continues...
}
```

---

## 5. Complete Entity Map

All System context database entities:

### Identity & Authentication
- `users` – Human users
- `service_accounts` – Automated/programmatic identities
- `sessions` – Active user sessions (optional persistence)
- `api_keys` – Long-lived API credentials

### Access Control
- `permissions` – Catalog of possible permissions
- `roles` – Named permission bundles
- `role_permissions` – Role to permission mapping
- `principal_role_assignments` – Principal to role assignments
- `principal_permission_grants` – Direct permission grants

### Observability
- `request_logs` – HTTP request/response telemetry - database-persisted
- `system_logs` – Technical telemetry (errors, warnings, info) - database-persisted
- `system_events` – Business events tracking (user actions, posts, schedules) - database-persisted
- `audit_logs` – Compliance and security event history - append-only

### Operations
- `feature_flags` – Runtime feature toggles

**Total:** 14 primary entities (11 original + request_logs + system_logs + system_events)

---

## 6. Cross-File Navigation

For detailed information on specific areas:

- **Identity & Authentication** → [`design-identity.md`](./design-identity.md)
  - Users, service accounts, sessions, JWT, API keys
  
- **Access Control** → [`design-access-control.md`](./design-access-control.md)
  - Permissions, roles, ACL model, permission checks
  
- **Observability** → [`design-4-observability.md`](./design-4-observability.md)
  - Request logs (HTTP telemetry), system logs (technical telemetry), system events (business), audit logs (compliance)
  - RequestLogger middleware, SystemLogger class, EventRegistry class, request tracing
  - See also: [`request-logger-guide.md`](./request-logger-guide.md) for complete middleware implementation
  
- **Operations** → [`design-5-ops.md`](./design-5-ops.md)
  - Feature flags, health checks, configuration

---

## 7. Implementation Guidelines

### 7.1 Directory Structure

```text
src/contexts/system/
  interface/
    http/
      routes.js          # HTTP routes for System endpoints
      handlers/
        auth.js          # Login, token issuance
        users.js         # User management
        roles.js         # Role management
        health.js        # Health checks
  application/
    use_cases/
      login_user.js      # Identity
      assign_role.js     # Access Control
      create_audit_log.js # Observability
    services/
      auth_service.js    # Identity services
      permission_service.js # ACL services
      feature_flag_service.js # Ops services
  domain/
    models/
      user.js
      role.js
      permission.js
    policies/
      password_policy.js
      permission_policy.js
  infrastructure/
    repositories/
      user_repository.js
      role_repository.js
      system_log_repository.js
      system_event_repository.js
      audit_log_repository.js
    auth/
      jwt_handler.js
      password_hasher.js
    cache/
      session_store.js
  core/
    logging/
      system_logger.js   # Centralized technical logging
    events/
      event_registry.js  # Centralized event tracking
    http/
      middleware/
        request_logger.js  # HTTP request/response telemetry
```

### 7.2 Service Exposure Pattern

System services are exposed through explicit exports:

```js
// src/contexts/system/index.js
module.exports = {
  // Identity
  issueToken: require('./application/services/auth_service').issueToken,
  verifyToken: require('./application/services/auth_service').verifyToken,
  
  // Access Control
  can: require('./application/services/permission_service').can,
  assignRole: require('./application/services/permission_service').assignRole,
  
  // Observability
  SystemLogger: require('./core/logging/system_logger'),
  EventRegistry: require('./core/events/event_registry'),
  RequestLogger: require('./core/http/middleware/request_logger'),
  auditLog: require('./application/services/audit_service').log,
  
  // Operations
  isFeatureEnabled: require('./application/services/feature_flag_service').isEnabled,
  getHealthStatus: require('./application/services/health_service').getStatus,
};
```

Other contexts import from this single entry point:

```js
const { SystemLogger, EventRegistry, RequestLogger, can } = require('../system');

// Use in Posts context
const canPublish = await can(principal, 'post', 'create');

// Log technical information
SystemLogger.info('posts.creation', 'Post created', {
  request_id: req.id,
  principal_id: principal.id
});

// Record business event
await EventRegistry.record('post', 'POST_CREATED', {
  principal_id: principal.id,
  resource_type: 'post',
  resource_id: post.id
});

// Request logging is automatic via middleware
// But can query logs for analytics:
const metrics = await RequestLogger.getMetrics({
  path: '/api/v1/posts',
  dateRange: { start: '2025-11-01', end: '2025-11-30' }
});
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

Focus on:
- Domain policies (password validation, permission rules)
- Service logic (JWT generation, permission checks)
- Pure functions without external dependencies

### 8.2 Integration Tests

Focus on:
- Full authentication flows (login → token → verify)
- Permission checking with database
- Audit log creation
- Feature flag evaluation

### 8.3 API Tests

Focus on:
- HTTP endpoints for authentication
- Role and permission management APIs
- Health check endpoints

Use `supertest` for HTTP-level testing:

```js
const request = require('supertest');
const app = require('../../src/core/http/server');

describe('System Authentication', () => {
  it('should issue JWT on successful login', async () => {
    const res = await request(app)
      .post('/api/v1/system/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(200);
    
    expect(res.body).toHaveProperty('token');
  });
});
```

---

## 9. Security Considerations

### 9.1 Authentication Security

- Passwords hashed with `argon2` (OWASP recommended)
- JWT tokens signed with strong secret (`JWT_SECRET`)
- API keys hashed before storage
- Session tokens stored in Memcached with expiry
- Rate limiting on authentication endpoints

### 9.2 Authorization Security

- All permission checks go through centralized `can()` function
- No direct database access from other contexts
- Conditions evaluated at runtime (e.g., owner-only checks)
- Failed authorization attempts logged to audit logs

### 9.3 Observability Security

- Never log sensitive data (passwords, tokens, PII)
- System logs and events stored in database with retention policies
- Audit logs are append-only (compliance requirement)
- Request IDs prevent log correlation issues
- Access to logs restricted by permissions
- Log queries filtered by permission level

---

## 10. Future Considerations

### 10.1 Multi-Tenancy

If multi-tenancy is added:
- Extend permissions with tenant scoping
- Add `tenant_id` to principals
- Scope roles and permissions per tenant
- Isolate audit logs by tenant

### 10.2 SSO Integration

For Single Sign-On:
- Add `identity_provider` field to users
- Support OAuth2/OIDC flows in auth service
- Allow `password_hash` to be NULL for SSO-only users
- Map external roles to internal roles

### 10.3 Advanced Observability

For production scale:
- Database log retention and archiving strategies
- Partitioning system_logs and system_events by date
- Separate read replicas for log queries
- Integrate with distributed tracing (OpenTelemetry)
- Real-time log streaming to analytics platforms
- Add metrics collection (Prometheus)
- Real-time alerting on critical events based on system_events

---

## 11. Summary

The System context is the **backbone** of the Luxaris API, providing:

✅ **Identity** – Who you are  
✅ **Access Control** – What you can do  
✅ **Observability** – What happened  
✅ **Operations** – How the system runs  

All four pillars work together to create a **secure, observable, and maintainable** foundation that other contexts build upon.

**Next steps:**
1. Review each detailed design document
2. Understand the exposed service interfaces
3. Never bypass System services in other contexts
4. Follow security and logging best practices

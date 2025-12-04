
# Luxaris API system – Operations & System Management

This document describes **Operations and System Management** within the Luxaris System domain:  
feature flags, health checks, and system status.

---

## 1. Overview

Operations and System Management provides:

- Runtime configuration via feature flags
- System health monitoring
- Deployment and operational metadata

---

## 2. Feature Flags

**Concept:** control rollout of capabilities without redeploying.

### 2.1 Feature Flags Table

- `flags` table:
- `key` – e.g. `"posts.ai_generation"`.
- `value` – boolean or string.
- `description`.
- `updated_at`.

Optional tables to scope flags per user/role/tenant if needed later.

### 2.2 Usage

Feature flags are read by application logic in different contexts to enable/disable behaviors.

Examples:

- `posts.ai_generation` – enable/disable AI content generation
- `schedules.bulk_operations` – enable/disable bulk scheduling features
- `system.maintenance_mode` – put system in read-only mode

---

## 3. Health & System Status

Not strictly "entities", but part of System domain responsibilities.

### 3.1 Health Endpoint

**Health endpoint** returns:

- DB connectivity status.
- Cache connectivity (Memcached).
- Queue connectivity (if applicable).
- Build/version info (`version`, `commit_sha`).

No DB table required, but it is driven by System domain code that knows how to probe dependencies.

### 3.2 Response Format

Example health check response:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "commit_sha": "abc123",
  "checks": {
    "database": "ok",
    "cache": "ok",
    "queue": "ok"
  }
}
```

Status values:

- `healthy` – all systems operational
- `degraded` – some non-critical systems down
- `unhealthy` – critical systems down

---

## 4. System Configuration

### 4.1 Environment Variables

All operational configuration comes from environment variables (per project standards):

Required:

- `NODE_ENV` / `APP_ENV` – environment identifier (`development`, `staging`, `production`)
- `PORT` – application server port
- `DATABASE_URL` – database connection string
- `MEMCACHED_URL` – Memcached server connection
- `JWT_SECRET` – secret key for JWT signing
- `LOG_LEVEL` – logging level (`debug`, `info`, `warning`, `error`, `critical`)
- `API_VERSION` – current API version

### 4.2 Environment-Specific Behavior

- **Development**: Verbose logging, detailed errors, hot reload
- **Staging**: Production-like setup with test data
- **Production**: Minimal logging, generic error messages, optimizations

---

## 5. Summary of Ops Entities

Key entities:

- `feature_flags` (optional but recommended)

Supporting concepts:

- Health check endpoints (no DB table)
- Environment configuration via environment variables
- Version and build metadata

These provide the foundation for operational control, monitoring, and configuration management in the Luxaris system.

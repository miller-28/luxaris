# Luxaris API - General Design and Architecture

This document defines the high-level architecture of the Luxaris API for the Luxaris post scheduler / creator / generator system. It focuses on the global structure of the backend service, not on specific entities or detailed business rules.

---

## 1. Architectural Style

- **Platform**: Node.js (no TypeScript, plain JavaScript).
- **API style**: REST over HTTP, JSON request/response.
- **Deployment**: Single process modular monolith, designed so contexts can be extracted later into services if needed.
- **Core principles**:
  - Separation of concerns and SOLID as far as practical. :contentReference[oaicite:0]{index=0}  
  - Hexagonal / clean boundaries between core logic and infrastructure.
  - Explicit, small, composable modules.

---

## 2. Modular Monolith & Bounded Contexts

The Luxaris API is a **modular monolith** structured as multiple bounded contexts inside a single codebase:

- **System context**  
  Cross-cutting and auxiliary capabilities:
  - Authentication and sessions
  - Authorization and permissions (ACL)
  - Users, roles, API keys
  - Logging and audit trails
  - Configuration, health checks, feature flags

- **Posts context**  
  Core product logic:
  - Post templates and generated posts
  - Schedules, calendars and timezones
  - Channels / destinations (X, others in future)
  - Generative workflows and status tracking

Each context has its own modules, data access and use-cases, and communicates with others only through **well-defined interfaces** (ports), not by reaching directly into each other’s internal modules.

---

## 3. Hexagonal / Clean Architecture Layers

Each context follows the same internal layering:

1. **Interface layer (API & transport)**  
   - HTTP handlers, routing, request/response mapping.
   - Input validation and parsing.
   - Authentication middleware and request context enrichment.

2. **Application layer (use-cases)**  
   - Orchestrates operations across repositories, services and external APIs.
   - Implements workflows like `createScheduledPost`, `generatePostVariant`, `assignRoleToUser`.
   - Contains no HTTP/UI or database details.

3. **Domain / core logic**  
   - Pure functions and small objects that encode rules (e.g. schedule validation, permission checks, rate limits).
   - Should be as framework-agnostic as possible.

4. **Infrastructure layer (adapters)**  
   - Database repositories (PostgreSQL).
   - Cache clients (Memcached or Redis).
   - External API clients (social networks, email).
   - Logging, metrics, queue / background job adapters.

Interfaces (ports) are defined in application/domain, and concrete implementations live in infrastructure.

---

## 4. Cross-Cutting Concerns

### 4.1 Authentication and Sessions

- **JWT** for stateless API authentication, carrying:
  - `user_id`
  - roles
  - permissions snapshot / scopes
  - expiry
- Optional support for:
  - Session storage in Memcached for server-managed sessions (e.g. browser dashboards). :contentReference[oaicite:1]{index=1}  

### 4.2 Authorization (ACL)

Authorization is based on an ACL star model:

- **Resource**: what is being accessed (e.g. `post`, `schedule`, `user`).
- **Action**: operations (`read`, `create`, `update`, `delete`, `execute`).
- **User / Role / Permission**:
  - Users can have roles.
  - Roles map to permission sets.
  - Permissions are expressed as `(resource, action, condition?)`.

The System context exposes permission-check functions that Posts and other contexts consume.

### 4.3 Error Handling

- Central Express/Fastify error middleware.
- Standard error response format:

```json
{
  "errors": [
    {
      "error_code": "VALIDATION_ERROR",
      "error_description": "Field X is required",
      "error_severity": "error"
    }
  ]
}
```

* Clear mapping of HTTP status codes:

  * 2xx - success
  * 400 - validation
  * 401 - unauthenticated
  * 403 - unauthorized
  * 404 - not found
  * 409 - conflict
  * 500 - unexpected server error 

### 4.4 Logging

* Structured logging with context:

* timestamp, level, module, request id, user id, message, extra data.
* No sensitive data in logs.
* Errors always logged with stack trace at `ERROR` or `CRITICAL`.

---

## 5. Technical Stack & Project Structure

### 5.1 Stack

* **Runtime**: Node.js (LTS, ES modules or CommonJS, but no TypeScript).
* **HTTP framework**: `express` - Web framework for routing and middleware.
* **Database**: PostgreSQL with `pg` (node-postgres) client and `knex` query builder.
* **Database migrations**: `db-migrate` - Version-controlled schema changes.
* **Cache / sessions**: Memcached with `memcached` client.
* **Queues / background jobs**: RabbitMQ with `amqplib` client.
* **Authentication**: `jsonwebtoken` - JWT token generation and verification.
* **Password hashing**: `argon2` - Secure password hashing (OWASP recommended).
* **Validation**: `zod` - Schema validation for request data.
* **Logging**: `winston` - Structured logging with flexible transports.
* **Configuration**: `dotenv` - Environment variable management.
* **HTTP client**: `luminara` - HTTP requests to external APIs.
* **Date/time**: `luxon` - Timezone-aware date/time handling.
* **UUID generation**: `uuid` - RFC4122 compliant unique identifiers.
* **Security**: `helmet` - Security headers, `cors` - CORS handling.
* **Rate limiting**: `rate-limiter-flexible` - Advanced rate limiting with multiple stores.
* **Request tracking**: `express-request-id` - Request ID generation and tracking.
* **API documentation**: `swagger-ui-express` + `swagger-jsdoc` - OpenAPI/Swagger docs.
* **Testing**: `jest` - Test framework, `supertest` - HTTP API testing.

### 5.2 Directory Layout (elaborated)

```text
src/
  config/
    index.js
    env.js
  core/
    http/
      server.js
      router.js
      middleware/
    logging/
      logger.js
    errors/
      api_error.js
  contexts/
    system/
      interface/
        http/
          routes.js
          handlers/
      application/
        use_cases/
        services/
      domain/
        models/
        policies/
      infrastructure/
        repositories/
        auth/
    posts/
      interface/
        http/
          routes.js
          handlers/
      application/
        use_cases/
        services/
      domain/
        models/
        rules/
      infrastructure/
        repositories/
        generators/
  shared/
    utils/
    validation/
    time/
index.js
```

### Folder-by-folder explanation

---

### **`src/config/`**

Holds everything related to configuration and environment loading.

* **`env.js`** – reads and validates environment variables at startup.
* **`index.js`** – exports a unified config object consumed by the rest of the app.

**Role:** A single place to understand how the app is configured.

---

### **`src/core/`**

Global building blocks that are not tied to any specific domain.

#### `http/`

* **`server.js`** – creates and configures the Express server instance.
* **`router.js`** – helper utilities to create routers consistently.
* **`middleware/`** – global middlewares (auth extraction, request-id, error handler).

#### `logging/`

* **`logger.js`** – central logger for the entire system, used everywhere.

#### `errors/`

* **`api_error.js`** – unified error class for throwing controlled API errors.

**Role:** Core infrastructure that all contexts depend on, but which depends on none of them.

---

### **`src/contexts/`**

The modular monolith’s heart.
Each subfolder here is a *bounded context*, with identical structure:

```
interface → application → domain → infrastructure
```

No cross-referencing internals. Only public services/use-cases are imported across contexts.

---

## Context structure (applies to both `system/` and `posts/`)

### **`interface/`**

*How the outside world talks to this context.*

#### `http/`

* **`routes.js`**
  Defines the HTTP routes exposed by the context.
  Maps them to handlers.

* **`handlers/`**
  Lightweight controllers responsible for:

  * parsing input,
  * validation,
  * calling the use-case,
  * mapping result back to HTTP.

**Role:** Transport layer. Thin glue between HTTP and use-cases.

---

### **`application/`**

*Use-cases and orchestration logic.*

#### `use_cases/`

* Each file implements a single business action:
  `createScheduledPost`, `assignRoleToUser`, `loginUser`, etc.
* Contains workflow orchestration:
  domain rules → repositories → external services.

#### `services/`

* Reusable logic across multiple use-cases within this context.
  Examples: `PermissionService`, `ContentGenerationService`.

**Role:** Coordinates the steps required to fulfill a request.
Knows *how things happen*, not *what is allowed* (that’s domain).

---

### **`domain/`**

*Pure rules and models of the context.*

#### `models/`

* Entities / value objects, pure JS.
* No Express, no SQL, no external APIs.

#### `rules/` (or `policies/` in system)

* Functions and validators representing domain invariants.
  Example: schedule may not be in the past; role must contain permitted actions; etc.

**Role:** Encodes what Luxaris *is* and *what is allowed*, independent of frameworks or databases.

---

### **`infrastructure/`**

*DB, queues, external APIs, all side effects.*

#### `repositories/`

* Persistence layer for domain models.
* Contains SQL queries and mapping row → model.

#### `auth/` (in system)

* JWT handling, password hashing, identity providers.

#### `generators/` (in posts)

* Adapters for AI / content generation providers.

**Role:** Talks to the external world. Dirty work.
Application layer depends on these through abstractions (ports).

---

### **`src/shared/`**

Generic helpers shared across contexts, but kept intentionally small.

* **`utils/`** – tiny pure helpers.
* **`validation/`** – common schemas and validation functions.
* **`time/`** – time manipulation helpers, timezone conversions.

**Role:** Only truly context-agnostic code.

---

### **`index.js`** (root)

Application entry point:

* load config,
* create server,
* mount routes,
* start listening.

---

## Summary — One-sentence-per-folder

* **config** – how the app reads and understands configuration.
* **core** – global technical spine (HTTP, logging, errors).
* **contexts** – self-contained domains, each with interface/application/domain/infrastructure.
* **shared** – tiny utilities used everywhere but tied to no domain.
* **index.js** – the bootstrapper.

---

## 6. Configuration & Environments

* All configuration comes from environment variables: `PORT`, `DATABASE_URL`, `MEMCACHED_URL`, `JWT_SECRET`, `LOG_LEVEL`, `API_VERSION`, etc. 
* `.env` for local only, with `.env.example` checked in.
* Environment modes:

  * `development` - verbose logs, detailed errors.
  * `staging` - production-like, safe test data.
  * `production` - minimal leak of internals, strict security.

A small `config/env.js` module reads and validates required env vars at startup.

---

## 7. HTTP Composition Example (high level)

```js
// index.js
const { createServer } = require('./src/core/http/server');
const systemRoutes = require('./src/contexts/system/interface/http/routes');
const postsRoutes = require('./src/contexts/posts/interface/http/routes');

const app = createServer();

app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/posts', postsRoutes);

app.listen(process.env.PORT, () => {
  console.log(`luxaris api listening on port ${process.env.PORT}`);
});
```

Each routes module only wires HTTP to context use-cases, never touching infrastructure directly.

---

## 8. Testing Strategy (high level)

* Focus on:

* API-level tests per context (via HTTP).
* Integration tests for key workflows (e.g. schedule creation, permission checks).
* Use in-memory or isolated real DB with migrations.
* Keep unit tests for dense business rules in domain and application layers. 
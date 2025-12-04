# Luxaris API

The backend REST API service that powers the Luxaris social media management platform.

## Purpose

The Luxaris API is the core backend service that manages all business logic, data persistence, and security for the Luxaris platform. It provides a RESTful HTTP interface for creating, scheduling, and managing social media posts across multiple channels while ensuring secure access through authentication and fine-grained authorization.

## Responsibilities

**System Management**
- User authentication (password, OAuth providers like Google)
- Root user system with approval workflow for new registrations
- Authorization and permissions (role-based access control)
- Four-tier observability (request logs, system logs, events, audit trails)
- Health monitoring and feature flags

**Content Management**
- Post creation and lifecycle management
- Multi-platform content variants
- AI-powered content generation with templates
- Platform-specific formatting and validation

**Channel Integration**
- Social platform connections (X, LinkedIn, and more)
- OAuth 2.0 authentication flows
- Token management and refresh
- Platform-specific constraints and limits

**Scheduling & Publishing**
- Schedule management with timezone support
- Two-runner publishing architecture (scanner + publisher via RabbitMQ)
- Reliable background execution with retry logic
- Publish event tracking and history

**Security & Compliance**
- JWT tokens with refresh mechanism
- OAuth 2.0 authentication (Google, extensible to others)
- Session management in Memcached
- Complete audit trails for compliance
- Comprehensive request telemetry and error tracking

## Architecture

Built as a modular monolith with **hexagonal architecture** and clear separation between five domains:

- **System** – Identity, authentication, authorization, observability, operations
- **Posts** – Post creation, content management, multi-platform variants
- **Channels** – Platform connections, OAuth integrations, social account management
- **Generation** – AI-powered content generation, templates, suggestions
- **Scheduling** – Time-based publishing, timezone support, background runners

Each domain follows hexagonal architecture with clear boundaries between:
- **Domain logic** (business rules, entities)
- **Application layer** (use-cases, orchestration)
- **Infrastructure** (repositories, external adapters)

Designed to be extracted into microservices if needed in the future.

**Observability:** Four-tier logging system with request telemetry (automatic), system logs (technical), business events (analytics), and audit logs (compliance) - all database-persisted for long-term analysis.

## Technical Stack

- **Runtime:** Node.js (plain JavaScript, no TypeScript)
- **Framework:** Express
- **Database:** PostgreSQL (pg + knex)
- **Cache:** Memcached
- **Queue:** RabbitMQ (amqplib)
- **Authentication:** JWT (jsonwebtoken), OAuth 2.0, Argon2 password hashing
- **Validation:** Zod
- **Logging:** Winston (four-tier observability)
- **Testing:** Jest + Supertest

For complete technical details, see `./designs/design-general.md`.

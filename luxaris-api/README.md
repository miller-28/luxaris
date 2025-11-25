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

**Content & Scheduling**
- Post creation with AI-powered content generation
- Multi-platform content variants and templates
- Schedule management with timezone support
- Channel connections (X, LinkedIn, and more)
- Two-runner publishing architecture (scanner + publisher via RabbitMQ)

**Security & Compliance**
- JWT tokens with refresh mechanism
- OAuth 2.0 authentication (Google, extensible to others)
- Session management in Memcached
- Complete audit trails for compliance
- Comprehensive request telemetry and error tracking

## Architecture

Built as a modular monolith with clean separation between bounded contexts:

- **System Context** – Identity, authentication, authorization, observability, operations
- **Posts Context** – Content management, generation, scheduling, channels, publishing

Uses hexagonal architecture with clear boundaries between domain logic, application use-cases, and infrastructure adapters. Designed to be extracted into microservices if needed in the future.

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

# Luxaris API

The backend REST API service that powers the Luxaris social media management platform.

## Purpose

The Luxaris API is the core backend service that manages all business logic, data persistence, and security for the Luxaris platform. It provides a RESTful HTTP interface for creating, scheduling, and managing social media posts across multiple channels while ensuring secure access through authentication and fine-grained authorization.

## Responsibilities

**System Management**
- User authentication (JWT tokens, API keys, sessions)
- Authorization and permissions (role-based access control)
- Identity management (users, service accounts)
- Audit logging and system observability
- Health monitoring and feature flags

**Content & Scheduling**
- Post creation, editing, and versioning
- Multi-platform content variants
- Schedule management with timezone support
- Channel connections (X, LinkedIn, etc.)
- Publishing workflow and status tracking

**Team Collaboration**
- Role and permission management
- Multi-user workflows
- API key generation for automation
- Activity tracking and audit trails

## Architecture

Built as a modular monolith with clean separation between bounded contexts:

- **System Context** – Authentication, authorization, logging, configuration
- **Posts Context** – Content management, scheduling, channels, publishing

Uses hexagonal architecture with clear boundaries between domain logic, application use-cases, and infrastructure adapters. Designed to be extracted into microservices if needed in the future.

## Technical Stack

- **Runtime:** Node.js (plain JavaScript, no TypeScript)
- **Framework:** Express
- **Database:** PostgreSQL (pg + knex)
- **Cache:** Memcached
- **Queue:** RabbitMQ (amqplib)
- **Authentication:** JWT (jsonwebtoken), Argon2 password hashing
- **Validation:** Zod
- **Logging:** Winston
- **Testing:** Jest + Supertest

For complete technical details, see `./designs/design-api-high-level.md`.


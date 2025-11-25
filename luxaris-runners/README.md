# Luxaris Runner

Background workers that handle scheduled post publishing for the Luxaris platform.

---

## Overview

The Luxaris Runner consists of **two independent worker processes** that work together through RabbitMQ to publish scheduled posts to social media platforms at the right time.

## The Two Runners

### 1. Schedule Scanner
- **Runs every minute** as a heartbeat process
- Queries the database for schedules that are due to be published
- Publishes due schedules as messages to RabbitMQ queue
- Lightweight and fast - just scans and queues

### 2. Publisher Worker
- **Queue consumer** that listens to RabbitMQ
- Receives publishing jobs from the scanner
- Executes actual post publishing to social media platforms (X, LinkedIn, etc.)
- Handles retries for failed publishing attempts
- Updates schedule status in database (publishing, published, failed)
- Can scale horizontally - run multiple publisher workers for higher throughput

## Architecture Benefits

**Separation of Concerns**
- Scanner focuses on detecting due schedules
- Publisher focuses on actual platform integration

**Reliability**
- RabbitMQ provides message durability
- Failed jobs can be retried automatically
- No lost schedules if publisher crashes

**Scalability**
- Add more publisher workers during high load
- Scanner remains single lightweight process

**Observability**
- Each step logged and tracked
- System events for publishing success/failure
- Complete audit trail of all publishing attempts

---

## Status

🚧 **Future Implementation** - To be developed after core API is complete.

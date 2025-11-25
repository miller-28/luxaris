# Luxaris

An intelligent, self-hosted social media management platform for scheduling, creating, and publishing content across multiple channels.

## Purpose

Luxaris empowers content creators, marketers, and businesses to streamline their social media workflow. Instead of manually crafting and posting content to different platforms, users can create posts once, schedule them strategically, and let Luxaris handle the publishing across connected channels like X (Twitter), LinkedIn, and others.

## What Luxaris Does

**Content Creation & Management**
Draft posts, create multiple variants for different platforms, and organize content with tags and campaigns. Use AI-powered generation with customizable templates to create engaging, platform-optimized content. Each post can have channel-specific variants that adapt to different platform requirements.

**Smart Scheduling**
Plan your content calendar weeks or months in advance. Schedule posts for specific dates and times with full timezone support. A two-runner architecture ensures reliable publishing: the scanner detects due schedules and the publisher executes delivery to social platforms. RabbitMQ message queue provides durability and retry logic for failed attempts.

**Multi-Channel Publishing**
Connect your social media accounts once and publish everywhere. Each platform has unique constraints—character limits, media support, formatting rules—and Luxaris automatically adapts your content to meet each channel's requirements while preserving your message's intent.

**Team Collaboration & Security**
Built for teams with role-based access control and a root user approval system. The first registered user becomes the platform administrator who approves new registrations. OAuth 2.0 authentication (Google, with support for more providers) makes sign-in seamless. Fine-grained permissions control who can draft, schedule, publish, and manage accounts.

**Visibility & Control**
Four-tier observability provides complete visibility: HTTP request telemetry (performance, errors), system logs (technical debugging), business events (user actions, publishing), and compliance audit trails. All logs are database-persisted for long-term analysis. Monitor API health, track feature usage, and maintain complete audit trails for compliance.

## Platform Architecture

Luxaris is composed of three independent services that work together:

### **luxaris-api**
The backend REST API that handles all business logic, data persistence, authentication, and authorization. Built with Node.js, it exposes endpoints for managing posts, schedules, channels, users, and permissions. It serves as the single source of truth for the entire platform.

### **luxaris-dashboard**
The web-based user interface for interacting with Luxaris. Provides an intuitive experience for creating posts, managing schedules, viewing calendars, connecting social accounts, and administering team permissions. Communicates with the API via HTTP.

### **luxaris-runner**
The background publishing system with two independent workers: a schedule scanner that runs every minute to detect due posts and queue them via RabbitMQ, and publisher workers that consume the queue and execute actual delivery to social platforms. This architecture provides reliability, scalability, and automatic retry for failed publishing attempts.

## Self-Hosted & Cost-Effective

Unlike expensive third-party SaaS platforms, Luxaris runs entirely on your own infrastructure. Deploy the API, dashboard, and runner on your company's VPN with a median-level developer in a few hours. No monthly subscriptions, no per-user fees, no paying thousands for ordinary usage. You own the platform, control your data, and pay only for your server costs—making professional social media management accessible to companies of any size without breaking the budget.

## Getting Started

Each component has its own directory with detailed information:

- **API:** `./luxaris-api/README.md` - Core backend service
- **Dashboard:** `./luxaris-dashboard/README.md` - User interface
- **Runner:** `./luxaris-runner/README.md` - Publishing workers
- **Admin Panel:** `./luxaris-admin/README.md` - Root user control center
- **Public Site:** `./luxaris-site/README.md` - Project documentation and showcase

For complete architecture and design details, see `./luxaris-api/designs/`

## Open Source

Luxaris is open-source software (MIT License), free to use, modify, and self-host. Whether you're a solo creator managing personal accounts or an enterprise team coordinating multi-channel campaigns, Luxaris provides professional social media management without subscription fees or vendor lock-in.

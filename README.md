# Luxaris

An intelligent, self-hosted social media management platform for scheduling, creating, and publishing content across multiple channels.

## Purpose

Luxaris empowers content creators, marketers, and businesses to streamline their social media workflow. Instead of manually crafting and posting content to different platforms, users can create posts once, schedule them strategically, and let Luxaris handle the publishing across connected channels like X (Twitter), LinkedIn, and others.

## What Luxaris Does

**Content Creation & Management**
Draft posts, create multiple variants for different platforms, and organize content with tags and campaigns. Posts can be authored manually or assisted by AI-powered generation tools that help create engaging, platform-optimized content.

**Smart Scheduling**
Plan your content calendar weeks or months in advance. Schedule posts for specific dates and times, respect different timezones, and ensure consistent engagement with your audience. The system handles the complexity of managing multiple channels, rate limits, and optimal posting times.

**Multi-Channel Publishing**
Connect your social media accounts once and publish everywhere. Each platform has unique constraints—character limits, media support, formatting rules—and Luxaris automatically adapts your content to meet each channel's requirements while preserving your message's intent.

**Team Collaboration & Security**
Built for teams with role-based access control. Assign different permissions to team members—some can only draft, others can schedule, and administrators can publish and manage accounts. API keys enable automation and integration with external tools while maintaining security.

**Visibility & Control**
Track what's happening with comprehensive audit logs showing who created, edited, or published content. Monitor system health, control feature rollouts with flags, and maintain compliance with detailed activity tracking.

## Platform Architecture

Luxaris is composed of three independent services that work together:

### **luxaris-api**
The backend REST API that handles all business logic, data persistence, authentication, and authorization. Built with Node.js, it exposes endpoints for managing posts, schedules, channels, users, and permissions. It serves as the single source of truth for the entire platform.

### **luxaris-dashboard**
The web-based user interface for interacting with Luxaris. Provides an intuitive experience for creating posts, managing schedules, viewing calendars, connecting social accounts, and administering team permissions. Communicates with the API via HTTP.

### **luxaris-runner**
The background job processor that executes scheduled tasks. Monitors the schedule queue, picks up posts that are due for publishing, and communicates with social media platform APIs to deliver content at the right time. Runs independently as a daemon process.

## Self-Hosted & Cost-Effective

Unlike expensive third-party SaaS platforms, Luxaris runs entirely on your own infrastructure. Deploy the API, dashboard, and runner on your company's VPN with a median-level developer in a few hours. No monthly subscriptions, no per-user fees, no paying thousands for ordinary usage. You own the platform, control your data, and pay only for your server costs—making professional social media management accessible to companies of any size without breaking the budget.

## Getting Started

Each service has its own directory with detailed setup instructions:

- **API:** `./luxaris-api/README.md`
- **Dashboard:** `./luxaris-dashboard/README.md`
- **Runner:** `./luxaris-runner/README.md`

Whether you're a solo creator managing personal accounts or an enterprise team coordinating multi-channel campaigns, Luxaris provides the foundation for efficient, scalable social media management.

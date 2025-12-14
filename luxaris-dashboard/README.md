# Luxaris Dashboard

A modern Vue 3 dashboard for managing social media content.

## Phase 1 - Foundation & Infrastructure ✅

### Completed Features

#### 1.1 Project Initialization
- ✅ Vue 3 with Composition API
- ✅ Vite 7.2.7 build tool
- ✅ 228 dependencies installed

#### 1.2 Folder Structure
- ✅ DDD-based architecture
- ✅ Contexts: system, posts, channels, generation, scheduling
- ✅ Core infrastructure modules
- ✅ Shared components and utilities

#### 1.3 Core Infrastructure
- ✅ **HTTP Client**: Luminara 1.2.2 with automatic token refresh
- ✅ **Router**: Vue Router with authentication guards
- ✅ **State Management**: Pinia stores
- ✅ **Authentication**: JWT token management (localStorage)
- ✅ **i18n**: vue-i18n with English locale
- ✅ **Vuetify**: Material Design component library

#### 1.4 Base Layouts
- ✅ **AuthLayout**: Clean centered layout for login/register
- ✅ **DashboardLayout**: Full dashboard with sidebar, topbar, and main content
- ✅ **BlankLayout**: Minimal layout for error pages

#### 1.5 Testing Infrastructure
- ✅ Vitest configuration
- ✅ Unit test example (TokenManager)
- ✅ All tests passing (3/3)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd luxaris-dashboard
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

### Development

```bash
# Start dev server
npm run dev

# Run tests
npm run test

# Run tests once
npm run test:run

# Build for production
npm run build
```

### Project Structure

```
luxaris-dashboard/
├── src/
│   ├── contexts/          # Domain contexts (DDD)
│   │   ├── system/        # System/auth views
│   │   ├── posts/         # Posts management
│   │   ├── channels/      # Channel management
│   │   ├── generation/    # AI generation
│   │   └── scheduling/    # Post scheduling
│   ├── core/              # Core infrastructure
│   │   ├── http/          # HTTP client (Axios)
│   │   ├── router/        # Vue Router
│   │   ├── store/         # Pinia stores
│   │   ├── auth/          # Authentication
│   │   ├── i18n/          # Internationalization
│   │   └── vuetify/       # Vuetify config
│   ├── shared/            # Shared resources
│   │   ├── components/    # Reusable components
│   │   ├── composables/   # Vue composables
│   │   └── utils/         # Utility functions
│   ├── layouts/           # Page layouts
│   │   ├── AuthLayout.vue
│   │   ├── DashboardLayout.vue
│   │   └── BlankLayout.vue
│   └── assets/            # Static assets
│       └── styles/        # Global styles
├── tests/                 # Test files
│   └── unit/              # Unit tests
└── docs/                  # Documentation
```

## Features

### Authentication
- JWT-based authentication
- Automatic token refresh on 401 errors
- Token expiration validation
- Guest-only routes (login/register)
- Protected routes (dashboard pages)

### Layouts
- **Auth Layout**: Gradient background, centered card design
- **Dashboard Layout**: Collapsible sidebar, top navigation, responsive
- **Blank Layout**: Minimal wrapper for special pages

### HTTP Client
- Base URL configuration via environment variables
- Automatic token attachment to requests
- Token refresh interceptor
- 30-second timeout
- Error handling

### Testing
- Vitest with jsdom environment
- Unit tests for core functionality
- Coverage reporting available

## Tech Stack

- **Framework**: Vue 3.5.24 (Composition API)
- **Build Tool**: Vite 7.2.7
- **Router**: Vue Router 4.6.3
- **State**: Pinia 3.0.4
- **HTTP**: Luminara 1.2.2
- **UI**: Vuetify 3.11.3 + Material Design Icons
- **i18n**: vue-i18n 11.2.2
- **Testing**: Vitest 4.0.15
- **Utilities**: @vueuse/core 14.1.0, date-fns 4.1.0

## Development Guidelines

- Follow Vue 3 Composition API patterns
- Use Tailwind utility classes for styling
- Leverage Vuetify components for UI
- Write tests for core functionality
- Keep components focused and reusable
- Follow DDD architecture principles

## Next Steps (Phase 2)

- Implement authentication UI (login/register forms)
- Create user store with Pinia
- Build dashboard home page
- Add user profile management
- Implement logout functionality

## License

See LICENSE file.

# CSRF Protection - Dashboard Perspective

## Overview

Cross-Site Request Forgery (CSRF) protection in the dashboard involves proper authentication token handling, request configuration, and secure cookie management (if applicable).

## Current Authentication: Bearer Token in Header

**Status**: ✅ NATURALLY PROTECTED

The current implementation uses JWT tokens in the `Authorization` header, which provides natural CSRF protection because:

1. Tokens stored in `localStorage`/`sessionStorage` (not cookies)
2. Must be explicitly added to requests via JavaScript
3. Cannot be automatically sent by malicious sites (Same-Origin Policy)

### Current Implementation

```typescript
// src/api/api-client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

export class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        // Request interceptor: Add auth token
        this.client.interceptors.request.use(
            (config) => {
                // Get token from storage
                const token = this.getAuthToken();
                
                if (token) {
                    // Add Authorization header
                    config.headers.Authorization = `Bearer ${token}`;
                }
                
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor: Handle auth errors
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (error.response?.status === 401) {
                    // Token expired or invalid
                    this.handleUnauthorized();
                }
                return Promise.reject(error);
            }
        );
    }

    private getAuthToken(): string | null {
        // Retrieve from localStorage
        return localStorage.getItem('auth_token');
    }

    private handleUnauthorized() {
        // Clear token
        localStorage.removeItem('auth_token');
        
        // Redirect to login
        window.location.href = '/login';
    }

    // API methods
    public get<T>(url: string, config = {}) {
        return this.client.get<T>(url, config);
    }

    public post<T>(url: string, data?: any, config = {}) {
        return this.client.post<T>(url, data, config);
    }

    public put<T>(url: string, data?: any, config = {}) {
        return this.client.put<T>(url, data, config);
    }

    public patch<T>(url: string, data?: any, config = {}) {
        return this.client.patch<T>(url, data, config);
    }

    public delete<T>(url: string, config = {}) {
        return this.client.delete<T>(url, config);
    }
}

export const api_client = new ApiClient();
```

### Authentication Service

```typescript
// src/services/auth-service.ts

export class AuthService {
    /**
     * Login and store JWT token
     */
    static async login(email: string, password: string): Promise<void> {
        const response = await api_client.post('/auth/login', {
            email,
            password
        });

        const { token, user } = response.data;

        // Store token in localStorage
        // ✅ CSRF SAFE: Not sent automatically by browser
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    /**
     * Logout and clear token
     */
    static logout(): void {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }

    /**
     * Get current token
     */
    static getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    /**
     * Check if user is authenticated
     */
    static isAuthenticated(): boolean {
        const token = this.getToken();
        if (!token) return false;

        // Optionally check token expiration
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000; // Convert to milliseconds
            return Date.now() < exp;
        } catch {
            return false;
        }
    }

    /**
     * Get current user
     */
    static getCurrentUser(): any {
        const user_json = localStorage.getItem('user');
        return user_json ? JSON.parse(user_json) : null;
    }
}
```

## Why Current Implementation is CSRF-Safe

### Attack Scenario (Blocked)

```
User Browser         Malicious Site (evil.com)       Luxaris API
    │                         │                          │
    │  User logged in         │                          │
    │  Token in localStorage  │                          │
    │                         │                          │
    │  Visits evil.com        │                          │
    ├────────────────────────>│                          │
    │                         │                          │
    │  Malicious JavaScript:  │                          │
    │  fetch('luxaris.com/api/posts', {                  │
    │    method: 'POST',      │                          │
    │    headers: {           │                          │
    │      Authorization: ??? │                          │
    │    }                    │                          │
    │  })                     │                          │
    │                         │                          │
    │  ❌ BLOCKED: Same-Origin Policy                    │
    │     prevents evil.com from:                        │
    │     1. Reading localStorage from luxaris.com       │
    │     2. Setting Authorization header cross-origin   │
    │                         │                          │
```

### Legitimate Request (Works)

```
Dashboard (luxaris.com)        Luxaris API
    │                              │
    │  User clicks "Create Post"   │
    │                              │
    │  1. JavaScript reads token   │
    │     from localStorage        │
    │     token = "eyJ..."         │
    │                              │
    │  2. Make API call            │
    │     with Authorization       │
    ├─────────────────────────────>│
    │  POST /api/v1/posts          │
    │  Authorization: Bearer eyJ...│
    │                              │
    │  ✅ Same origin, token added │
    │                              │
    │  Response                    │
    │<─────────────────────────────┤
    │                              │
```

## Alternative: Cookie-Based Auth with CSRF Token

If you switch to cookie-based authentication, implement CSRF tokens:

### Backend: Set HttpOnly Cookie + Return CSRF Token

```typescript
// Backend (for reference - implemented in API)
// POST /auth/login
{
    // Set HttpOnly cookie
    res.cookie('session_token', jwt_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000  // 24 hours
    });

    // Return CSRF token in response body
    res.json({
        csrf_token: generated_csrf_token,
        user: user_data
    });
}
```

### Frontend: Store CSRF Token + Send in Headers

```typescript
// src/services/auth-service-with-csrf.ts

export class AuthServiceWithCsrf {
    private static CSRF_TOKEN_KEY = 'csrf_token';

    /**
     * Login with cookie-based auth
     */
    static async login(email: string, password: string): Promise<void> {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',  // Send/receive cookies
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        // Store CSRF token in memory/state (not localStorage for security)
        sessionStorage.setItem(this.CSRF_TOKEN_KEY, data.csrf_token);
        
        // Session cookie is automatically stored by browser
    }

    /**
     * Get CSRF token
     */
    static getCsrfToken(): string | null {
        return sessionStorage.getItem(this.CSRF_TOKEN_KEY);
    }

    /**
     * Logout
     */
    static async logout(): Promise<void> {
        await fetch('/api/v1/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        sessionStorage.removeItem(this.CSRF_TOKEN_KEY);
        window.location.href = '/login';
    }
}
```

### API Client with CSRF Token

```typescript
// src/api/api-client-with-csrf.ts

export class ApiClientWithCsrf {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: process.env.REACT_APP_API_URL,
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true  // Send cookies
        });

        // Add CSRF token to all state-changing requests
        this.client.interceptors.request.use((config) => {
            if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
                const csrf_token = AuthServiceWithCsrf.getCsrfToken();
                
                if (csrf_token) {
                    config.headers['X-CSRF-Token'] = csrf_token;
                }
            }
            
            return config;
        });

        // Handle CSRF errors
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 403 && 
                    error.response?.data?.errors?.[0]?.error_code === 'CSRF_TOKEN_INVALID') {
                    // CSRF token invalid - force re-login
                    AuthServiceWithCsrf.logout();
                }
                return Promise.reject(error);
            }
        );
    }
}
```

## Protected Route Component

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { AuthService } from '@/services/auth-service';

export function ProtectedRoute() {
    const is_authenticated = AuthService.isAuthenticated();

    if (!is_authenticated) {
        // Redirect to login
        return <Navigate to="/login" replace />;
    }

    // Render child routes
    return <Outlet />;
}

// Usage in router
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />
    },
    {
        path: '/',
        element: <ProtectedRoute />,
        children: [
            {
                path: 'dashboard',
                element: <DashboardPage />
            },
            {
                path: 'posts',
                element: <PostsPage />
            }
        ]
    }
]);
```

## Form Submission Protection

### Prevent Double Submit

```typescript
// src/hooks/use-mutation-guard.ts
import { useState } from 'react';

export function useMutationGuard() {
    const [is_submitting, setIsSubmitting] = useState(false);

    const guard = async <T,>(
        mutation_fn: () => Promise<T>
    ): Promise<T | null> => {
        if (is_submitting) {
            console.warn('Request already in progress');
            return null;
        }

        setIsSubmitting(true);
        
        try {
            const result = await mutation_fn();
            return result;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { guard, is_submitting };
}

// Usage in component
function PostForm() {
    const { guard, is_submitting } = useMutationGuard();
    const create_post = useCreatePost();

    const handleSubmit = async (data: PostFormData) => {
        await guard(async () => {
            return create_post.mutateAsync(data);
        });
    };

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)}>
            {/* form fields */}
            <button type="submit" disabled={is_submitting}>
                {is_submitting ? 'Submitting...' : 'Submit'}
            </button>
        </form>
    );
}
```

## Origin Validation Awareness

While origin validation is handled by the backend, the dashboard should handle CORS errors gracefully:

```typescript
// src/api/error-handler.ts

export function handleApiError(error: any): {
    message: string;
    should_logout: boolean;
} {
    if (axios.isAxiosError(error)) {
        // Network error (CORS, connection failure)
        if (!error.response) {
            return {
                message: 'Unable to connect to server. Please check your connection.',
                should_logout: false
            };
        }

        // CSRF/Origin validation failure
        if (error.response.status === 403) {
            const error_code = error.response.data?.errors?.[0]?.error_code;
            
            if (error_code === 'INVALID_ORIGIN' || error_code === 'CSRF_TOKEN_INVALID') {
                return {
                    message: 'Security validation failed. Please log in again.',
                    should_logout: true
                };
            }
        }

        // Unauthorized
        if (error.response.status === 401) {
            return {
                message: 'Your session has expired. Please log in again.',
                should_logout: true
            };
        }
    }

    return {
        message: 'An unexpected error occurred.',
        should_logout: false
    };
}

// Global error handler
export function setupGlobalErrorHandler() {
    window.addEventListener('unhandledrejection', (event) => {
        const { message, should_logout } = handleApiError(event.reason);
        
        if (should_logout) {
            AuthService.logout();
        } else {
            // Show toast notification
            toast.error(message);
        }
    });
}
```

## Testing Strategy

### Unit Tests

```typescript
// src/services/auth-service.test.ts
import { AuthService } from './auth-service';

describe('AuthService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('isAuthenticated', () => {
        it('should return false when no token', () => {
            expect(AuthService.isAuthenticated()).toBe(false);
        });

        it('should return true with valid token', () => {
            // Create valid JWT (not expired)
            const payload = {
                user_id: '123',
                exp: Math.floor(Date.now() / 1000) + 3600  // 1 hour from now
            };
            const token = createMockJwt(payload);
            
            localStorage.setItem('auth_token', token);
            
            expect(AuthService.isAuthenticated()).toBe(true);
        });

        it('should return false with expired token', () => {
            // Create expired JWT
            const payload = {
                user_id: '123',
                exp: Math.floor(Date.now() / 1000) - 3600  // 1 hour ago
            };
            const token = createMockJwt(payload);
            
            localStorage.setItem('auth_token', token);
            
            expect(AuthService.isAuthenticated()).toBe(false);
        });
    });
});
```

### Integration Tests

```typescript
// src/api/api-client.test.ts
import { render, screen, waitFor } from '@testing-library/react';
import { ApiClient } from './api-client';
import { server } from '@/test/mocks/server';
import { rest } from 'msw';

describe('ApiClient CSRF Protection', () => {
    it('should add Authorization header from localStorage', async () => {
        const token = 'mock-jwt-token';
        localStorage.setItem('auth_token', token);

        let captured_header: string | undefined;

        server.use(
            rest.get('/api/v1/posts', (req, res, ctx) => {
                captured_header = req.headers.get('Authorization') || undefined;
                return res(ctx.json({ data: [] }));
            })
        );

        const client = new ApiClient();
        await client.get('/posts');

        expect(captured_header).toBe(`Bearer ${token}`);
    });

    it('should handle 401 Unauthorized', async () => {
        localStorage.setItem('auth_token', 'invalid-token');

        server.use(
            rest.get('/api/v1/posts', (req, res, ctx) => {
                return res(ctx.status(401), ctx.json({
                    errors: [{ error_code: 'UNAUTHORIZED' }]
                }));
            })
        );

        const client = new ApiClient();
        
        await expect(client.get('/posts')).rejects.toThrow();
        
        // Verify token was cleared
        expect(localStorage.getItem('auth_token')).toBeNull();
    });
});
```

## Security Checklist

- [x] JWT tokens stored in localStorage (not cookies)
- [x] Authorization header added via interceptor
- [x] Token validation on each request
- [x] Automatic logout on 401 responses
- [x] Protected routes redirect unauthenticated users
- [ ] Token refresh mechanism (optional enhancement)
- [ ] Secure token storage (consider memory vs localStorage)
- [ ] CSRF token implementation (if switching to cookies)
- [ ] Origin header validation awareness
- [ ] Rate limiting awareness on login

## Key Principles

1. **Current Auth Method is CSRF-Safe**: Bearer tokens in headers naturally prevent CSRF
2. **Same-Origin Policy Protects localStorage**: Malicious sites cannot access tokens
3. **Explicit Token Inclusion**: Must be added by JavaScript, not automatic
4. **Handle Auth Errors Gracefully**: Logout and redirect on 401/403
5. **If Using Cookies**: Must implement CSRF tokens
6. **Test Token Lifecycle**: Login, authenticated requests, logout, expiration

## References

- Backend: luxaris-api/designs/system/design-8-security-csrf.md
- OWASP CSRF: https://owasp.org/www-community/attacks/csrf
- JWT Best Practices: https://datatracker.ietf.org/doc/html/rfc8725
- Axios Interceptors: https://axios-http.com/docs/interceptors

# SQL Injection Protection - Dashboard Perspective

## Overview

While SQL injection is primarily a backend vulnerability, the dashboard (frontend) plays a critical role in defense-in-depth strategy through input validation, safe API interaction patterns, and security-aware UI/UX design.

## Frontend Responsibilities

### 1. Client-Side Input Validation

**Purpose**: Catch malicious input early and provide immediate user feedback

**Status**: 🔄 NEEDS IMPLEMENTATION

```typescript
// src/utils/validators.ts

export class InputValidator {
    /**
     * Validate UUID format
     */
    static isValidUuid(value: string): boolean {
        const uuid_pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuid_pattern.test(value);
    }

    /**
     * Validate integer
     */
    static isValidInteger(value: string | number): boolean {
        const num = typeof value === 'string' ? parseInt(value, 10) : value;
        return !isNaN(num) && isFinite(num) && Math.floor(num) === num;
    }

    /**
     * Validate email format
     */
    static isValidEmail(email: string): boolean {
        const email_pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return email_pattern.test(email);
    }

    /**
     * Validate enum value
     */
    static isValidEnum<T extends string>(
        value: string,
        allowed_values: readonly T[]
    ): value is T {
        return allowed_values.includes(value as T);
    }

    /**
     * Sanitize string for API submission
     * Remove potentially dangerous characters
     */
    static sanitizeForApi(input: string, max_length: number = 1000): string {
        if (!input) return '';
        
        // Remove null bytes
        let sanitized = input.replace(/\0/g, '');
        
        // Trim whitespace
        sanitized = sanitized.trim();
        
        // Enforce length limit
        sanitized = sanitized.substring(0, max_length);
        
        return sanitized;
    }

    /**
     * Detect potential SQL injection patterns
     * NOTE: This is NOT a security control, just a warning system
     */
    static detectSqlPattern(input: string): boolean {
        const sql_patterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
            /(-{2}|\/\*|\*\/)/,  // SQL comments
            /(\bOR\b.*=.*)/i,     // OR conditions
            /('\s*OR\s*')/i,      // Quoted OR
            /(;\s*DROP)/i         // Statement termination + DROP
        ];

        return sql_patterns.some(pattern => pattern.test(input));
    }
}
```

### 2. Form Validation with Zod

**Purpose**: Type-safe validation with runtime checks

```typescript
// src/schemas/post-schema.ts
import { z } from 'zod';

export const PostFormSchema = z.object({
    title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title must be 200 characters or less')
        .refine(
            (val) => !InputValidator.detectSqlPattern(val),
            { message: 'Invalid characters detected in title' }
        ),
    
    content: z.string()
        .min(1, 'Content is required')
        .max(50000, 'Content too long'),
    
    status: z.enum(['draft', 'active', 'inactive'], {
        errorMap: () => ({ message: 'Invalid status value' })
    }),
    
    category_id: z.string()
        .uuid('Invalid category ID format')
});

export type PostFormData = z.infer<typeof PostFormSchema>;
```

### 3. Safe API Client Implementation

**Purpose**: Ensure all API calls use proper parameter passing

```typescript
// src/api/posts-api.ts
import axios, { AxiosInstance } from 'axios';

export class PostsApi {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Add auth token interceptor
        this.client.interceptors.request.use((config) => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
    }

    /**
     * Get posts with filters
     * ✅ SAFE: Parameters passed in request body/query params
     */
    async getPosts(filters: {
        status?: 'draft' | 'active' | 'inactive';
        category_id?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }) {
        // Validate inputs before sending
        if (filters.category_id && !InputValidator.isValidUuid(filters.category_id)) {
            throw new Error('Invalid category ID format');
        }

        if (filters.limit && !InputValidator.isValidInteger(filters.limit)) {
            throw new Error('Invalid limit value');
        }

        // API client handles parameter encoding
        const response = await this.client.get('/posts', {
            params: filters  // Axios safely encodes query params
        });

        return response.data;
    }

    /**
     * Create post
     * ✅ SAFE: Data sent as JSON in request body
     */
    async createPost(data: PostFormData) {
        // Validate with Zod schema
        const validated = PostFormSchema.parse(data);

        // Sanitize string inputs
        const sanitized = {
            ...validated,
            title: InputValidator.sanitizeForApi(validated.title, 200),
            content: InputValidator.sanitizeForApi(validated.content, 50000)
        };

        const response = await this.client.post('/posts', sanitized);
        return response.data;
    }

    /**
     * Get post by ID
     * ✅ SAFE: ID in URL path, validated first
     */
    async getPostById(post_id: string) {
        if (!InputValidator.isValidUuid(post_id)) {
            throw new Error('Invalid post ID format');
        }

        // URL path parameters are safely encoded by axios
        const response = await this.client.get(`/posts/${post_id}`);
        return response.data;
    }

    /**
     * ❌ NEVER DO THIS: Building query strings manually
     */
    // async searchPosts(query: string) {
    //     const url = `/posts?search=${query}`;  // DANGEROUS!
    //     return this.client.get(url);
    // }
}
```

### 4. React Query Hooks with Validation

```typescript
// src/hooks/use-posts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PostsApi } from '@/api/posts-api';
import { PostFormData } from '@/schemas/post-schema';

const posts_api = new PostsApi();

export function usePosts(filters?: {
    status?: 'draft' | 'active' | 'inactive';
    category_id?: string;
}) {
    return useQuery({
        queryKey: ['posts', filters],
        queryFn: () => posts_api.getPosts(filters || {}),
        // Automatic error handling
        retry: 1,
        staleTime: 5 * 60 * 1000  // 5 minutes
    });
}

export function usePost(post_id: string | undefined) {
    return useQuery({
        queryKey: ['posts', post_id],
        queryFn: () => {
            if (!post_id) {
                throw new Error('Post ID is required');
            }
            return posts_api.getPostById(post_id);
        },
        enabled: !!post_id && InputValidator.isValidUuid(post_id),
        retry: false
    });
}

export function useCreatePost() {
    const query_client = useQueryClient();

    return useMutation({
        mutationFn: (data: PostFormData) => posts_api.createPost(data),
        onSuccess: () => {
            // Invalidate posts list
            query_client.invalidateQueries({ queryKey: ['posts'] });
        },
        onError: (error) => {
            console.error('Failed to create post:', error);
            // Handle error (show toast, etc.)
        }
    });
}
```

### 5. Form Component with Validation

```tsx
// src/components/PostForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PostFormSchema, PostFormData } from '@/schemas/post-schema';
import { useCreatePost } from '@/hooks/use-posts';
import { InputValidator } from '@/utils/validators';

export function PostForm() {
    const create_post = useCreatePost();
    
    const form = useForm<PostFormData>({
        resolver: zodResolver(PostFormSchema),
        defaultValues: {
            title: '',
            content: '',
            status: 'draft'
        }
    });

    const onSubmit = async (data: PostFormData) => {
        try {
            // Additional client-side check
            if (InputValidator.detectSqlPattern(data.title)) {
                form.setError('title', {
                    message: 'Title contains invalid characters'
                });
                return;
            }

            await create_post.mutateAsync(data);
            
            // Success handling
            form.reset();
        } catch (error) {
            // Error handling
            console.error('Form submission failed:', error);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div>
                <label htmlFor="title">Title</label>
                <input
                    id="title"
                    type="text"
                    {...form.register('title')}
                    maxLength={200}
                />
                {form.formState.errors.title && (
                    <span className="error">
                        {form.formState.errors.title.message}
                    </span>
                )}
            </div>

            <div>
                <label htmlFor="content">Content</label>
                <textarea
                    id="content"
                    {...form.register('content')}
                    maxLength={50000}
                    rows={10}
                />
                {form.formState.errors.content && (
                    <span className="error">
                        {form.formState.errors.content.message}
                    </span>
                )}
            </div>

            <div>
                <label htmlFor="status">Status</label>
                <select id="status" {...form.register('status')}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
                {form.formState.errors.status && (
                    <span className="error">
                        {form.formState.errors.status.message}
                    </span>
                )}
            </div>

            <button type="submit" disabled={create_post.isPending}>
                {create_post.isPending ? 'Creating...' : 'Create Post'}
            </button>
        </form>
    );
}
```

## URL Parameter Safety

### Safe URL Building

```typescript
// src/utils/url-builder.ts

export class UrlBuilder {
    /**
     * Build URL with validated parameters
     * ✅ SAFE: Uses URLSearchParams for proper encoding
     */
    static buildSearchUrl(base: string, params: Record<string, string | number | boolean | undefined>) {
        const url = new URL(base, window.location.origin);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
            }
        });
        
        return url.toString();
    }

    /**
     * Parse query parameters safely
     */
    static parseQueryParams<T extends Record<string, string>>(
        search_string: string
    ): Partial<T> {
        const params = new URLSearchParams(search_string);
        const result: Record<string, string> = {};
        
        params.forEach((value, key) => {
            result[key] = value;
        });
        
        return result as Partial<T>;
    }
}

// Usage in components
function PostsList() {
    const [searchParams, setSearchParams] = useSearchParams();
    
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    // Validate parameters before using
    const validated_status = status && 
        InputValidator.isValidEnum(status, ['draft', 'active', 'inactive'])
        ? status
        : undefined;
    
    const { data: posts } = usePosts({
        status: validated_status,
        search: search || undefined
    });
    
    // Update URL safely
    const handleFilterChange = (new_status: string) => {
        setSearchParams({
            status: new_status,
            search: search || ''
        });
    };
    
    return (
        <div>
            {/* UI implementation */}
        </div>
    );
}
```

## Security Best Practices

### 1. Never Trust Client-Side Validation Alone

```typescript
/**
 * ⚠️  IMPORTANT: Client-side validation is for UX only
 * Backend MUST validate and sanitize all inputs
 */

// Client-side: User-friendly validation
if (!InputValidator.isValidEmail(email)) {
    setError('Please enter a valid email');
    return;  // Stop submission
}

// Submit to API
// Backend will re-validate and sanitize
await api.createUser({ email, ... });
```

### 2. Error Handling - Don't Expose Details

```typescript
// src/api/error-handler.ts

export function handleApiError(error: any): string {
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
            // Show validation errors
            return error.response.data.errors?.[0]?.error_description || 
                   'Invalid input';
        } else if (error.response?.status === 500) {
            // Don't expose server errors
            return 'An error occurred. Please try again.';
        }
    }
    
    return 'Network error. Please check your connection.';
}

// Usage in components
try {
    await create_post.mutateAsync(data);
} catch (error) {
    const message = handleApiError(error);
    toast.error(message);  // User-friendly message only
}
```

### 3. Content Security Policy Compliance

```typescript
// public/index.html
// Meta tag for CSP (development)
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' https: data:;">

// Note: In production, set CSP via HTTP headers (backend)
```

## Testing Strategy

### Unit Tests

```typescript
// src/utils/validators.test.ts
import { InputValidator } from './validators';

describe('InputValidator', () => {
    describe('isValidUuid', () => {
        it('should accept valid UUID v4', () => {
            const valid_uuid = '550e8400-e29b-41d4-a716-446655440000';
            expect(InputValidator.isValidUuid(valid_uuid)).toBe(true);
        });

        it('should reject SQL injection in UUID', () => {
            const malicious = "1' OR '1'='1";
            expect(InputValidator.isValidUuid(malicious)).toBe(false);
        });

        it('should reject invalid format', () => {
            expect(InputValidator.isValidUuid('not-a-uuid')).toBe(false);
            expect(InputValidator.isValidUuid('123')).toBe(false);
        });
    });

    describe('detectSqlPattern', () => {
        it('should detect SELECT statement', () => {
            expect(InputValidator.detectSqlPattern('SELECT * FROM users')).toBe(true);
        });

        it('should detect OR injection', () => {
            expect(InputValidator.detectSqlPattern("1' OR '1'='1")).toBe(true);
        });

        it('should detect DROP statement', () => {
            expect(InputValidator.detectSqlPattern('1; DROP TABLE users--')).toBe(true);
        });

        it('should allow normal text', () => {
            expect(InputValidator.detectSqlPattern('Hello World')).toBe(false);
        });
    });
});
```

### Integration Tests

```typescript
// src/api/posts-api.test.ts
import { PostsApi } from './posts-api';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('PostsApi', () => {
    const posts_api = new PostsApi();

    it('should reject invalid UUID in getPostById', async () => {
        await expect(
            posts_api.getPostById("1' OR '1'='1")
        ).rejects.toThrow('Invalid post ID format');
    });

    it('should safely encode query parameters', async () => {
        server.use(
            rest.get('/api/v1/posts', (req, res, ctx) => {
                // Verify query params are properly encoded
                const search = req.url.searchParams.get('search');
                expect(search).toBe("<script>alert(1)</script>");
                return res(ctx.json({ data: [] }));
            })
        );

        await posts_api.getPosts({
            search: '<script>alert(1)</script>'
        });
    });

    it('should validate enum values', async () => {
        await expect(
            posts_api.getPosts({
                status: 'invalid' as any
            })
        ).rejects.toThrow();
    });
});
```

## Monitoring & User Feedback

### Security Alert UI

```typescript
// src/components/SecurityAlert.tsx

interface SecurityAlertProps {
    message: string;
    onDismiss: () => void;
}

export function SecurityAlert({ message, onDismiss }: SecurityAlertProps) {
    return (
        <div className="security-alert">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">
                <h4>Security Notice</h4>
                <p>{message}</p>
                <p className="alert-hint">
                    If you believe this is an error, please contact support.
                </p>
            </div>
            <button onClick={onDismiss}>Dismiss</button>
        </div>
    );
}

// Usage
function MyForm() {
    const [show_alert, setShowAlert] = useState(false);
    
    const handleSubmit = (data: FormData) => {
        if (InputValidator.detectSqlPattern(data.title)) {
            setShowAlert(true);
            return;
        }
        
        // Continue with submission
    };
    
    if (show_alert) {
        return (
            <SecurityAlert
                message="Your input contains characters that cannot be processed. Please remove special characters and try again."
                onDismiss={() => setShowAlert(false)}
            />
        );
    }
    
    return <form>{/* form fields */}</form>;
}
```

## Key Principles

1. **Validate All Inputs**: Check format, type, length before API calls
2. **Use Type-Safe APIs**: Leverage TypeScript and Zod for runtime validation
3. **Never Build Raw URLs**: Use URLSearchParams for query strings
4. **Handle Errors Gracefully**: Don't expose technical details to users
5. **Client Validation ≠ Security**: Always rely on backend validation
6. **Use HTTP Libraries Safely**: Let axios/fetch handle encoding

## References

- Backend: luxaris-api/designs/system/design-7-security-sql-injection.md
- Zod Documentation: https://zod.dev/
- React Hook Form: https://react-hook-form.com/
- Axios Security: https://axios-http.com/docs/urlencoded

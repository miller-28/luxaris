# XSS Protection - Dashboard Perspective

## Overview

Cross-Site Scripting (XSS) protection in the React dashboard is critical as it's the final rendering layer. While the backend sanitizes inputs, the frontend must safely handle all data display and user interactions.

## React's Built-in Protection

**Status**: ✅ ENABLED BY DEFAULT

React automatically escapes values rendered in JSX, providing baseline XSS protection.

### Safe Rendering (Automatic Escaping)

```tsx
// ✅ SAFE - React automatically escapes
function PostTitle({ title }: { title: string }) {
    // Even if title contains: <script>alert(1)</script>
    // React renders it as: &lt;script&gt;alert(1)&lt;/script&gt;
    return <h1>{title}</h1>;
}

// ✅ SAFE - Attributes are escaped
function UserLink({ username, url }: { username: string; url: string }) {
    return <a href={url}>{username}</a>;
    // React safely escapes both username and url
}

// ✅ SAFE - Form inputs
function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <input
            type="text"
            value={value}  // Escaped automatically
            onChange={(e) => onChange(e.target.value)}
        />
    );
}
```

## Dangerous Patterns to Avoid

### ❌ dangerouslySetInnerHTML Without Sanitization

```tsx
// ❌ DANGEROUS - Direct HTML injection
function UnsafePost({ content }: { content: string }) {
    // If content contains: <img src=x onerror="alert(1)">
    // This WILL execute the script!
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

// ✅ SAFE - With DOMPurify sanitization
import DOMPurify from 'dompurify';

function SafePost({ content }: { content: string }) {
    const clean_content = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3'],
        ALLOWED_ATTR: ['href', 'title']
    });
    
    return <div dangerouslySetInnerHTML={{ __html: clean_content }} />;
}
```

### ❌ Direct DOM Manipulation

```tsx
// ❌ DANGEROUS - Bypassing React's protection
function BadComponent({ userInput }: { userInput: string }) {
    useEffect(() => {
        const element = document.getElementById('output');
        if (element) {
            element.innerHTML = userInput;  // DANGEROUS!
        }
    }, [userInput]);
    
    return <div id="output"></div>;
}

// ✅ SAFE - Let React handle rendering
function GoodComponent({ userInput }: { userInput: string }) {
    return <div>{userInput}</div>;  // React escapes automatically
}
```

### ❌ javascript: Protocol in URLs

```tsx
// ❌ DANGEROUS - JavaScript execution via URL
function UnsafeLink({ url, text }: { url: string; text: string }) {
    // If url is: "javascript:alert(1)"
    // Clicking executes JavaScript!
    return <a href={url}>{text}</a>;
}

// ✅ SAFE - Validate URL protocol
function SafeLink({ url, text }: { url: string; text: string }) {
    const safe_url = useMemo(() => {
        try {
            const parsed = new URL(url);
            // Only allow http and https
            if (['http:', 'https:'].includes(parsed.protocol)) {
                return parsed.href;
            }
        } catch {
            // Invalid URL
        }
        return '#';  // Fallback to safe URL
    }, [url]);
    
    return <a href={safe_url}>{text}</a>;
}
```

## DOMPurify Integration

### Installation

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

### Sanitizer Utility

```typescript
// src/utils/sanitizer.ts
import DOMPurify from 'dompurify';

export class Sanitizer {
    /**
     * Sanitize HTML content for safe rendering
     */
    static sanitizeHtml(dirty: string, options?: {
        allowed_tags?: string[];
        allowed_attr?: string[];
    }): string {
        const default_config = {
            ALLOWED_TAGS: [
                'p', 'br', 'span', 'strong', 'em', 'u',
                'ul', 'ol', 'li',
                'a',
                'h1', 'h2', 'h3', 'h4',
                'code', 'pre',
                'blockquote'
            ],
            ALLOWED_ATTR: [
                'href', 'title', 'target',
                'class'  // For styling
            ],
            ALLOW_DATA_ATTR: false,
            KEEP_CONTENT: true,
            RETURN_DOM: false,
            RETURN_DOM_FRAGMENT: false
        };

        // Override with custom options
        const config = {
            ...default_config,
            ...(options?.allowed_tags && { ALLOWED_TAGS: options.allowed_tags }),
            ...(options?.allowed_attr && { ALLOWED_ATTR: options.allowed_attr })
        };

        return DOMPurify.sanitize(dirty, config);
    }

    /**
     * Sanitize plain text (remove all HTML)
     */
    static sanitizePlainText(text: string): string {
        return DOMPurify.sanitize(text, {
            ALLOWED_TAGS: [],
            KEEP_CONTENT: true
        });
    }

    /**
     * Validate and sanitize URL
     */
    static sanitizeUrl(url: string): string {
        try {
            const parsed = new URL(url);
            
            // Only allow safe protocols
            if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
                return DOMPurify.sanitize(parsed.href, {
                    ALLOWED_TAGS: [],
                    ALLOWED_ATTR: []
                });
            }
        } catch {
            // Invalid URL
        }
        
        return '#';  // Safe fallback
    }

    /**
     * Check if string contains potential XSS
     */
    static detectXssPattern(input: string): boolean {
        const xss_patterns = [
            /<script/i,
            /javascript:/i,
            /onerror\s*=/i,
            /onclick\s*=/i,
            /onload\s*=/i,
            /<iframe/i,
            /data:text\/html/i,
            /vbscript:/i
        ];

        return xss_patterns.some(pattern => pattern.test(input));
    }
}
```

### Safe HTML Component

```tsx
// src/components/SafeHtml.tsx
import { useMemo } from 'react';
import { Sanitizer } from '@/utils/sanitizer';

interface SafeHtmlProps {
    html: string;
    className?: string;
    allowed_tags?: string[];
    allowed_attr?: string[];
}

export function SafeHtml({
    html,
    className,
    allowed_tags,
    allowed_attr
}: SafeHtmlProps) {
    const sanitized_html = useMemo(() => {
        return Sanitizer.sanitizeHtml(html, {
            allowed_tags,
            allowed_attr
        });
    }, [html, allowed_tags, allowed_attr]);

    return (
        <div
            className={className}
            dangerouslySetInnerHTML={{ __html: sanitized_html }}
        />
    );
}

// Usage
function BlogPost({ post }: { post: Post }) {
    return (
        <article>
            {/* Title - plain text, auto-escaped */}
            <h1>{post.title}</h1>
            
            {/* Content - rich HTML, sanitized */}
            <SafeHtml
                html={post.content}
                className="post-content"
            />
            
            {/* Author - plain text, auto-escaped */}
            <p className="author">By {post.author_name}</p>
        </article>
    );
}
```

## URL Sanitization

### Safe Link Component

```tsx
// src/components/SafeLink.tsx
import { useMemo, ReactNode } from 'react';
import { Sanitizer } from '@/utils/sanitizer';

interface SafeLinkProps {
    href: string;
    children: ReactNode;
    className?: string;
    target?: '_blank' | '_self';
}

export function SafeLink({
    href,
    children,
    className,
    target = '_self'
}: SafeLinkProps) {
    const safe_href = useMemo(() => {
        return Sanitizer.sanitizeUrl(href);
    }, [href]);

    // Additional protection for external links
    const is_external = useMemo(() => {
        try {
            const url = new URL(safe_href, window.location.origin);
            return url.origin !== window.location.origin;
        } catch {
            return false;
        }
    }, [safe_href]);

    return (
        <a
            href={safe_href}
            className={className}
            target={target}
            {...(is_external && {
                rel: 'noopener noreferrer'  // Security for external links
            })}
        >
            {children}
        </a>
    );
}

// Usage
function LinkList({ links }: { links: Array<{ url: string; text: string }> }) {
    return (
        <ul>
            {links.map((link, index) => (
                <li key={index}>
                    <SafeLink href={link.url} target="_blank">
                        {link.text}
                    </SafeLink>
                </li>
            ))}
        </ul>
    );
}
```

## Image Sanitization

```tsx
// src/components/SafeImage.tsx
import { useState, useMemo } from 'react';

interface SafeImageProps {
    src: string;
    alt: string;
    className?: string;
    fallback?: string;
}

export function SafeImage({
    src,
    alt,
    className,
    fallback = '/images/placeholder.png'
}: SafeImageProps) {
    const [error, setError] = useState(false);

    const safe_src = useMemo(() => {
        try {
            const url = new URL(src);
            
            // Only allow https images (or local)
            if (url.protocol === 'https:' || url.protocol === 'http:') {
                return url.href;
            }
        } catch {
            // Invalid URL or relative path
            // If starts with /, assume local
            if (src.startsWith('/')) {
                return src;
            }
        }
        
        return fallback;
    }, [src, fallback]);

    return (
        <img
            src={error ? fallback : safe_src}
            alt={alt}  // React escapes alt text
            className={className}
            onError={() => setError(true)}
            loading="lazy"
        />
    );
}
```

## Form Input Sanitization

```tsx
// src/components/forms/PostForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sanitizer } from '@/utils/sanitizer';

interface PostFormData {
    title: string;
    content: string;
    excerpt: string;
}

export function PostForm() {
    const form = useForm<PostFormData>({
        resolver: zodResolver(PostSchema)
    });

    const onSubmit = (data: PostFormData) => {
        // Check for XSS patterns before submission
        if (Sanitizer.detectXssPattern(data.title)) {
            form.setError('title', {
                message: 'Title contains invalid characters'
            });
            return;
        }

        // Note: Backend will also sanitize
        // Client-side check is for immediate UX feedback
        
        // Submit to API
        create_post.mutate(data);
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

            {/* Content - Rich text editor */}
            <div>
                <label htmlFor="content">Content</label>
                <RichTextEditor
                    value={form.watch('content')}
                    onChange={(value) => form.setValue('content', value)}
                    maxLength={50000}
                />
            </div>

            <button type="submit">Submit</button>
        </form>
    );
}
```

## Rich Text Editor Safety

```tsx
// src/components/RichTextEditor.tsx
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useMemo } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
}

export function RichTextEditor({
    value,
    onChange,
    maxLength = 50000
}: RichTextEditorProps) {
    // Configure allowed formats
    const modules = useMemo(() => ({
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'header': [1, 2, 3, false] }],
            ['link'],
            ['clean']
        ]
    }), []);

    // Only allow safe formats
    const formats = [
        'bold', 'italic', 'underline',
        'list', 'bullet',
        'header',
        'link'
    ];

    const handleChange = (content: string) => {
        // Enforce length limit
        if (content.length <= maxLength) {
            onChange(content);
        }
    };

    return (
        <ReactQuill
            theme="snow"
            value={value}
            onChange={handleChange}
            modules={modules}
            formats={formats}
        />
    );
}
```

## Content Security Policy

### Setup in index.html

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- Content Security Policy (Development) -->
    <!-- In production, set via HTTP headers -->
    <meta
        http-equiv="Content-Security-Policy"
        content="
            default-src 'self';
            script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
            img-src 'self' https: data:;
            font-src 'self' https://fonts.gstatic.com;
            connect-src 'self' http://localhost:3000 https://api.luxaris.com;
            frame-ancestors 'none';
            base-uri 'self';
            form-action 'self';
        "
    />
    
    <title>Luxaris Dashboard</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
```

### Production CSP (via backend)

```
Content-Security-Policy:
    default-src 'self';
    script-src 'self' https://cdn.luxaris.com;
    style-src 'self' https://fonts.googleapis.com;
    img-src 'self' https: data:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.luxaris.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
```

## Search Parameter Safety

```tsx
// src/pages/SearchPage.tsx
import { useSearchParams } from 'react-router-dom';

export function SearchPage() {
    const [searchParams] = useSearchParams();
    
    // Get query parameter
    const query = searchParams.get('q') || '';
    
    // ✅ SAFE - React auto-escapes
    return (
        <div>
            <h1>Search Results for: {query}</h1>
            {/* Even if query contains <script>, it won't execute */}
        </div>
    );
}

// ❌ DANGEROUS - Don't do this
function UnsafeSearchPage() {
    const query = new URLSearchParams(window.location.search).get('q');
    
    // DANGEROUS - Direct DOM manipulation
    document.getElementById('results')!.innerHTML = `
        <h1>Search: ${query}</h1>
    `;
}
```

## Testing Strategy

### Unit Tests

```typescript
// src/utils/sanitizer.test.ts
import { Sanitizer } from './sanitizer';

describe('Sanitizer', () => {
    describe('sanitizeHtml', () => {
        it('should remove script tags', () => {
            const dirty = '<p>Hello</p><script>alert(1)</script>';
            const clean = Sanitizer.sanitizeHtml(dirty);
            
            expect(clean).not.toContain('script');
            expect(clean).toContain('<p>Hello</p>');
        });

        it('should remove event handlers', () => {
            const dirty = '<p onclick="alert(1)">Hello</p>';
            const clean = Sanitizer.sanitizeHtml(dirty);
            
            expect(clean).not.toContain('onclick');
            expect(clean).toContain('Hello');
        });

        it('should allow safe HTML', () => {
            const dirty = '<p>Hello <strong>World</strong></p>';
            const clean = Sanitizer.sanitizeHtml(dirty);
            
            expect(clean).toBe('<p>Hello <strong>World</strong></p>');
        });
    });

    describe('sanitizeUrl', () => {
        it('should allow https URLs', () => {
            const url = 'https://example.com/page';
            const result = Sanitizer.sanitizeUrl(url);
            
            expect(result).toBe(url);
        });

        it('should block javascript: protocol', () => {
            const url = 'javascript:alert(1)';
            const result = Sanitizer.sanitizeUrl(url);
            
            expect(result).toBe('#');
        });

        it('should block data: URLs', () => {
            const url = 'data:text/html,<script>alert(1)</script>';
            const result = Sanitizer.sanitizeUrl(url);
            
            expect(result).toBe('#');
        });
    });

    describe('detectXssPattern', () => {
        it('should detect script tags', () => {
            expect(Sanitizer.detectXssPattern('<script>alert(1)</script>')).toBe(true);
        });

        it('should detect event handlers', () => {
            expect(Sanitizer.detectXssPattern('<img onerror="alert(1)">')).toBe(true);
        });

        it('should allow normal text', () => {
            expect(Sanitizer.detectXssPattern('Hello World')).toBe(false);
        });
    });
});
```

### Component Tests

```typescript
// src/components/SafeHtml.test.tsx
import { render, screen } from '@testing-library/react';
import { SafeHtml } from './SafeHtml';

describe('SafeHtml', () => {
    it('should render safe HTML', () => {
        const html = '<p>Hello <strong>World</strong></p>';
        render(<SafeHtml html={html} />);
        
        expect(screen.getByText(/Hello/)).toBeInTheDocument();
        expect(screen.getByText(/World/)).toBeInTheDocument();
    });

    it('should remove script tags', () => {
        const html = '<p>Safe</p><script>alert(1)</script>';
        const { container } = render(<SafeHtml html={html} />);
        
        expect(container.innerHTML).not.toContain('script');
        expect(container.innerHTML).toContain('Safe');
    });

    it('should remove event handlers', () => {
        const html = '<p onclick="alert(1)">Click me</p>';
        const { container } = render(<SafeHtml html={html} />);
        
        expect(container.innerHTML).not.toContain('onclick');
        expect(screen.getByText('Click me')).toBeInTheDocument();
    });
});
```

## Security Checklist

- [x] React auto-escaping for all text content
- [x] DOMPurify for rich HTML content
- [x] URL validation for all links
- [x] Image source validation
- [x] CSP headers configured
- [x] No direct DOM manipulation with innerHTML
- [x] Rich text editor with format restrictions
- [x] XSS pattern detection in forms
- [ ] Regular security audits of dependencies
- [ ] CSP violation reporting (production)

## Key Principles

1. **Trust React's Auto-Escaping**: Use JSX for all text rendering
2. **Sanitize HTML Before `dangerouslySetInnerHTML`**: Always use DOMPurify
3. **Validate URLs**: Check protocols, block javascript: and data:
4. **Use CSP**: Define strict content security policy
5. **Avoid Direct DOM**: Never use innerHTML, use React
6. **Test XSS Vectors**: Test with common XSS payloads

## References

- Backend: luxaris-api/designs/system/design-9-security-xss.md
- DOMPurify: https://github.com/cure53/DOMPurify
- React Security: https://react.dev/reference/react-dom/components/common
- OWASP XSS: https://owasp.org/www-community/attacks/xss/
- CSP Guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

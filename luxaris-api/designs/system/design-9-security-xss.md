# XSS (Cross-Site Scripting) Protection

## Overview

Cross-Site Scripting (XSS) allows attackers to inject malicious scripts into web pages viewed by other users. This design outlines comprehensive XSS protection for the Luxaris API and frontend.

## Threat Model

### Attack Types

#### 1. Stored XSS (Persistent)
- Malicious script stored in database
- Executed when data is retrieved and displayed
- **Example**: Inject `<script>` in post content, executes for all viewers

#### 2. Reflected XSS
- Malicious script in URL/request
- Reflected in response
- **Example**: Search parameter with script injected

#### 3. DOM-based XSS
- Client-side script vulnerability
- Manipulation of DOM without server involvement
- **Example**: `document.write(location.hash)`

### Risk Level: HIGH
- **Impact**: Session hijacking, credential theft, data exfiltration, defacement
- **Likelihood**: HIGH without proper output encoding

## Protection Strategy

### 1. Input Validation & Sanitization (FIRST LINE)

**Status**: 🔄 NEEDS ENHANCEMENT

#### Validation Rules

```javascript
// src/core/utils/input-sanitizer.js
const xss = require('xss');

class InputSanitizer {
    /**
     * Sanitize plain text input (no HTML allowed)
     */
    static sanitize_plain_text(input, max_length = 1000) {
        if (!input || typeof input !== 'string') {
            return '';
        }

        // Remove all HTML tags
        let sanitized = input.replace(/<[^>]*>/g, '');
        
        // Remove potentially dangerous characters
        sanitized = sanitized.replace(/[<>'"]/g, '');
        
        // Trim and enforce length
        sanitized = sanitized.trim().substring(0, max_length);
        
        return sanitized;
    }

    /**
     * Sanitize rich text (allow safe HTML subset)
     */
    static sanitize_rich_text(input, max_length = 10000) {
        if (!input || typeof input !== 'string') {
            return '';
        }

        // XSS library with strict whitelist
        const options = {
            whiteList: {
                // Text formatting
                p: [],
                br: [],
                span: ['style'],
                strong: [],
                em: [],
                u: [],
                
                // Lists
                ul: [],
                ol: [],
                li: [],
                
                // Links (with strict href validation)
                a: ['href', 'title', 'target'],
                
                // Headers
                h1: [],
                h2: [],
                h3: [],
                h4: [],
                
                // Code
                code: [],
                pre: [],
                
                // Media (carefully allowed)
                img: ['src', 'alt', 'title', 'width', 'height'],
            },
            stripIgnoreTag: true,
            stripIgnoreTagBody: ['script', 'style'],
            
            // URL validation
            onTagAttr: function(tag, name, value) {
                if (tag === 'a' && name === 'href') {
                    // Only allow http, https, mailto
                    if (!/^(https?:\/\/|mailto:)/i.test(value)) {
                        return '';
                    }
                }
                if (tag === 'img' && name === 'src') {
                    // Only allow https images
                    if (!/^https:\/\//i.test(value)) {
                        return '';
                    }
                }
            }
        };

        const sanitized = xss(input, options);
        return sanitized.substring(0, max_length);
    }

    /**
     * Sanitize JSON (for settings, metadata)
     */
    static sanitize_json(input) {
        if (typeof input !== 'object') {
            return {};
        }

        // Deep sanitize object
        const sanitize_value = (value) => {
            if (typeof value === 'string') {
                return this.sanitize_plain_text(value);
            } else if (Array.isArray(value)) {
                return value.map(sanitize_value);
            } else if (typeof value === 'object' && value !== null) {
                return Object.fromEntries(
                    Object.entries(value).map(([k, v]) => [k, sanitize_value(v)])
                );
            }
            return value;
        };

        return sanitize_value(input);
    }

    /**
     * Validate and sanitize URLs
     */
    static sanitize_url(url) {
        if (!url || typeof url !== 'string') {
            return '';
        }

        try {
            const parsed = new URL(url);
            
            // Only allow http/https protocols
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return '';
            }

            return parsed.href;
        } catch (error) {
            return '';
        }
    }
}

module.exports = InputSanitizer;
```

#### Apply Sanitization in Handlers

```javascript
// src/contexts/product/interface/http/handlers/post-handler.js
const InputSanitizer = require('../../../../../core/utils/input-sanitizer');

class PostHandler {
    async create_post(req, res) {
        try {
            const { title, content, excerpt } = req.body;
            
            // Sanitize inputs
            const sanitized_data = {
                title: InputSanitizer.sanitize_plain_text(title, 200),
                content: InputSanitizer.sanitize_rich_text(content, 50000),
                excerpt: InputSanitizer.sanitize_plain_text(excerpt, 500),
                author_id: req.user.id
            };

            const post = await this.post_service.create_post(sanitized_data);
            
            res.status(201).json(post);
        } catch (error) {
            // Error handling
        }
    }
}
```

### 2. Output Encoding (CRITICAL - Frontend)

**Status**: 🔄 FRONTEND RESPONSIBILITY

The API returns data as JSON. Frontend MUST properly encode when rendering.

#### React Example (Dashboard)

```jsx
// ✅ SAFE - React automatically escapes
function PostTitle({ title }) {
    return <h1>{title}</h1>; // Escaped automatically
}

// ⚠️ DANGEROUS - Bypass React escaping
function PostContent({ html_content }) {
    // Only use with sanitized content
    return <div dangerouslySetInnerHTML={{ __html: html_content }} />;
}

// ✅ SAFE - Use DOMPurify for rich content
import DOMPurify from 'dompurify';

function SafePostContent({ html_content }) {
    const clean_html = DOMPurify.sanitize(html_content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3'],
        ALLOWED_ATTR: ['href', 'title', 'target']
    });
    
    return <div dangerouslySetInnerHTML={{ __html: clean_html }} />;
}
```

### 3. Content Security Policy (CSP)

**Status**: ✅ RECOMMENDED

Set CSP headers to prevent inline scripts.

```javascript
// src/core/middleware/security-headers.js
function set_security_headers(req, res, next) {
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' https://cdn.luxaris.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' https: data:; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self' https://api.luxaris.com; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'"
    );

    // Prevent XSS via MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable browser XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    next();
}

module.exports = set_security_headers;
```

### 4. HTTP-Only Cookies

**Status**: ✅ IF USING COOKIES

```javascript
// Never store sensitive data in JavaScript-accessible storage
res.cookie('session_token', token, {
    httpOnly: true,  // Cannot be accessed by JavaScript
    secure: true,    // HTTPS only
    sameSite: 'strict'
});
```

### 5. API Response Headers

**Status**: ✅ IMPLEMENTED

```javascript
// Ensure JSON responses have correct content type
app.use(express.json());

// Set content type explicitly
function json_response_middleware(req, res, next) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
}
```

## Field-by-Field Protection

### User-Generated Content

| Field | Type | Sanitization | Storage | Display |
|-------|------|--------------|---------|---------|
| Post Title | Plain Text | Remove HTML | Escaped | Text only |
| Post Content | Rich Text | XSS filter | Sanitized HTML | DOMPurify |
| Post Excerpt | Plain Text | Remove HTML | Escaped | Text only |
| Comment Text | Plain Text | Remove HTML | Escaped | Text only |
| User Bio | Plain Text | Remove HTML | Escaped | Text only |
| Channel Name | Plain Text | Remove HTML | Escaped | Text only |
| Template Name | Plain Text | Remove HTML | Escaped | Text only |

### System Fields

| Field | Type | Protection |
|-------|------|------------|
| Email | Plain Text | Validation only (no HTML) |
| URL | URL | URL validation + protocol check |
| UUID | UUID | Format validation |
| JSON Settings | JSON | Deep sanitization |

## Validation Middleware

```javascript
// src/core/middleware/xss-validation.js
const InputSanitizer = require('../utils/input-sanitizer');

/**
 * Sanitize request body fields
 */
function sanitize_body_middleware(field_config) {
    return (req, res, next) => {
        if (!req.body) {
            return next();
        }

        for (const [field, type] of Object.entries(field_config)) {
            if (req.body[field]) {
                switch (type) {
                    case 'plain_text':
                        req.body[field] = InputSanitizer.sanitize_plain_text(req.body[field]);
                        break;
                    case 'rich_text':
                        req.body[field] = InputSanitizer.sanitize_rich_text(req.body[field]);
                        break;
                    case 'url':
                        req.body[field] = InputSanitizer.sanitize_url(req.body[field]);
                        break;
                    case 'json':
                        req.body[field] = InputSanitizer.sanitize_json(req.body[field]);
                        break;
                }
            }
        }

        next();
    };
}

// Usage in routes
router.post('/posts', 
    auth_middleware,
    sanitize_body_middleware({
        title: 'plain_text',
        content: 'rich_text',
        excerpt: 'plain_text'
    }),
    post_handler.create_post
);
```

## Testing Strategy

### Unit Tests

```javascript
describe('XSS Protection', () => {
    describe('Plain Text Sanitization', () => {
        it('should remove script tags', () => {
            const input = '<script>alert("XSS")</script>Hello';
            const result = InputSanitizer.sanitize_plain_text(input);
            expect(result).toBe('Hello');
        });

        it('should remove event handlers', () => {
            const input = '<img src=x onerror="alert(1)">';
            const result = InputSanitizer.sanitize_plain_text(input);
            expect(result).not.toContain('onerror');
            expect(result).not.toContain('alert');
        });

        it('should remove all HTML tags', () => {
            const input = '<p>Hello <strong>World</strong></p>';
            const result = InputSanitizer.sanitize_plain_text(input);
            expect(result).toBe('Hello World');
        });
    });

    describe('Rich Text Sanitization', () => {
        it('should allow safe HTML', () => {
            const input = '<p>Hello <strong>World</strong></p>';
            const result = InputSanitizer.sanitize_rich_text(input);
            expect(result).toContain('<p>');
            expect(result).toContain('<strong>');
        });

        it('should remove dangerous tags', () => {
            const input = '<script>alert(1)</script><p>Safe</p>';
            const result = InputSanitizer.sanitize_rich_text(input);
            expect(result).not.toContain('script');
            expect(result).toContain('<p>');
        });

        it('should sanitize javascript: URLs', () => {
            const input = '<a href="javascript:alert(1)">Click</a>';
            const result = InputSanitizer.sanitize_rich_text(input);
            expect(result).not.toContain('javascript:');
        });

        it('should remove event handlers from allowed tags', () => {
            const input = '<p onclick="alert(1)">Hello</p>';
            const result = InputSanitizer.sanitize_rich_text(input);
            expect(result).not.toContain('onclick');
        });
    });
});
```

### Integration Tests

```javascript
describe('XSS Attack Scenarios', () => {
    it('should prevent stored XSS in post content', async () => {
        const xss_payload = '<img src=x onerror="alert(document.cookie)">';
        
        const response = await request(app)
            .post('/api/v1/posts')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Test Post',
                content: xss_payload
            });

        expect(response.status).toBe(201);
        
        // Verify stored content is sanitized
        const post = await db_pool.query(
            'SELECT content FROM luxaris.posts WHERE id = $1',
            [response.body.id]
        );
        
        expect(post.rows[0].content).not.toContain('onerror');
        expect(post.rows[0].content).not.toContain('alert');
    });

    it('should prevent reflected XSS in search', async () => {
        const xss_payload = '<script>alert(1)</script>';
        
        const response = await request(app)
            .get('/api/v1/posts')
            .query({ search: xss_payload })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should prevent XSS in JSON settings', async () => {
        const xss_payload = {
            theme: '<img src=x onerror="alert(1)">',
            preferences: {
                locale: '<script>alert(1)</script>'
            }
        };
        
        const response = await request(app)
            .patch('/api/v1/system/ui-presets/123')
            .set('Authorization', `Bearer ${token}`)
            .send({ settings: xss_payload });

        expect(response.status).toBe(200);
        
        // Verify stored settings are sanitized
        const preset = await db_pool.query(
            'SELECT settings FROM luxaris.user_ui_stateful_presets WHERE id = $1',
            [response.body.id]
        );
        
        const settings = preset.rows[0].settings;
        expect(JSON.stringify(settings)).not.toContain('<script>');
        expect(JSON.stringify(settings)).not.toContain('onerror');
    });
});
```

## Frontend Protection (React Dashboard)

### Setup DOMPurify

```bash
npm install dompurify
npm install @types/dompurify --save-dev
```

### Create Sanitizer Utility

```typescript
// src/utils/sanitizer.ts
import DOMPurify from 'dompurify';

export class Sanitizer {
    static sanitizeHtml(dirty: string): string {
        return DOMPurify.sanitize(dirty, {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li',
                'a', 'h1', 'h2', 'h3', 'h4', 'code', 'pre'
            ],
            ALLOWED_ATTR: ['href', 'title', 'target'],
            ALLOW_DATA_ATTR: false
        });
    }

    static sanitizeText(text: string): string {
        // React handles this automatically, but double-check
        return text.replace(/[<>]/g, '');
    }
}
```

### Safe Components

```tsx
// components/SafeHtml.tsx
import { Sanitizer } from '@/utils/sanitizer';

interface SafeHtmlProps {
    html: string;
    className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
    const cleanHtml = Sanitizer.sanitizeHtml(html);
    
    return (
        <div 
            className={className}
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
    );
}

// Usage
<SafeHtml html={post.content} className="post-content" />
```

## Monitoring & Detection

```javascript
// Log potential XSS attempts
function detect_xss_pattern(input) {
    const xss_patterns = [
        /<script/i,
        /javascript:/i,
        /onerror=/i,
        /onclick=/i,
        /onload=/i,
        /<iframe/i,
        /eval\(/i,
        /expression\(/i
    ];

    for (const pattern of xss_patterns) {
        if (pattern.test(input)) {
            system_logger.warning('security.xss_attempt', 
                'Potential XSS attempt detected', {
                input_sample: input.substring(0, 100),
                pattern: pattern.toString()
            });
            return true;
        }
    }
    
    return false;
}
```

## Migration Checklist

- [ ] Install XSS protection library (`xss` package)
- [ ] Create InputSanitizer utility class
- [ ] Apply sanitization to all user input endpoints
- [ ] Add CSP headers
- [ ] Set X-XSS-Protection header
- [ ] Review all `dangerouslySetInnerHTML` usage in frontend
- [ ] Install DOMPurify in frontend
- [ ] Create safe HTML rendering components
- [ ] Add XSS tests to test suite
- [ ] Document safe coding practices
- [ ] Train developers on XSS prevention
- [ ] Set up XSS detection monitoring
- [ ] Perform security audit of existing stored content

## References

- OWASP XSS: https://owasp.org/www-community/attacks/xss/
- XSS Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- DOMPurify: https://github.com/cure53/DOMPurify
- XSS Filter (node): https://github.com/leizongmin/js-xss

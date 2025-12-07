# CSRF (Cross-Site Request Forgery) Protection

## Overview

Cross-Site Request Forgery (CSRF) is an attack that forces authenticated users to execute unwanted actions on a web application. This design outlines comprehensive CSRF protection for the Luxaris API.

## Threat Model

### Attack Scenario

1. User logs into Luxaris (gets JWT token stored in browser)
2. User visits malicious website while still logged in
3. Malicious site makes authenticated request to Luxaris API using user's credentials
4. Request appears legitimate (has valid token)
5. Unwanted action executed (delete posts, change settings, etc.)

### Risk Level: HIGH
- **Impact**: Unauthorized actions performed on behalf of legitimate users
- **Likelihood**: MEDIUM (depends on token storage mechanism)

## Protection Strategy

### 1. JWT Token Storage (PRIMARY DEFENSE)

**Status**: ✅ RECOMMENDED APPROACH

The primary CSRF protection is **proper JWT token storage**.

#### Option A: HttpOnly Cookie + CSRF Token (MOST SECURE)

```javascript
// Login - Set HttpOnly cookie
router.post('/auth/login', async (req, res) => {
    const { access_token, refresh_token } = await auth_service.login(email, password);
    
    // Set access token in HttpOnly cookie
    res.cookie('access_token', access_token, {
        httpOnly: true,      // Not accessible via JavaScript
        secure: true,        // HTTPS only
        sameSite: 'strict',  // CSRF protection
        maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    // Set refresh token in HttpOnly cookie
    res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Return CSRF token for state-changing requests
    const csrf_token = crypto.randomBytes(32).toString('hex');
    await redis_client.setex(`csrf:${user_id}`, 3600, csrf_token);
    
    res.json({
        user: { id: user.id, email: user.email },
        csrf_token // Client includes this in X-CSRF-Token header
    });
});

// Auth middleware - Extract from cookie
function auth_middleware(req, res, next) {
    const token = req.cookies.access_token;
    
    if (!token) {
        return res.status(401).json({
            errors: [{
                error_code: 'UNAUTHORIZED',
                error_description: 'Authentication required',
                error_severity: 'error'
            }]
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            errors: [{
                error_code: 'INVALID_TOKEN',
                error_description: 'Invalid or expired token',
                error_severity: 'error'
            }]
        });
    }
}

// CSRF middleware - For state-changing operations
function csrf_middleware(req, res, next) {
    // Only check CSRF on state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const csrf_token = req.headers['x-csrf-token'];
        
        if (!csrf_token) {
            return res.status(403).json({
                errors: [{
                    error_code: 'CSRF_TOKEN_MISSING',
                    error_description: 'CSRF token required',
                    error_severity: 'error'
                }]
            });
        }
        
        // Verify CSRF token
        const stored_token = await redis_client.get(`csrf:${req.user.id}`);
        
        if (csrf_token !== stored_token) {
            system_logger.warning('security.csrf_attempt', 
                'Invalid CSRF token attempt', {
                user_id: req.user.id,
                ip: req.ip
            });
            
            return res.status(403).json({
                errors: [{
                    error_code: 'CSRF_TOKEN_INVALID',
                    error_description: 'Invalid CSRF token',
                    error_severity: 'error'
                }]
            });
        }
    }
    
    next();
}
```

#### Option B: Authorization Header (CURRENT - Less CSRF Risk)

**Status**: ✅ CURRENTLY IMPLEMENTED

```javascript
// Client stores JWT in memory (not localStorage/cookies)
// Sends in Authorization header
Authorization: Bearer <jwt_token>
```

**CSRF Protection Mechanism**:
- Malicious site **cannot** access token (not in cookie)
- Malicious site **cannot** read Authorization header (CORS blocks it)
- Browser **will not** automatically send Authorization header

**Pros**:
- Simple implementation
- Natural CSRF protection (requires JavaScript access)
- Works well with SPAs

**Cons**:
- Vulnerable to XSS (if token in localStorage)
- Requires client-side token management
- Less convenient (token expires, needs refresh logic)

### 2. SameSite Cookie Attribute

**Status**: 🔄 APPLICABLE IF USING COOKIES

```javascript
res.cookie('token', jwt_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' // or 'lax'
});
```

**SameSite Values**:
- `strict`: Cookie only sent for same-site requests (MOST SECURE)
- `lax`: Cookie sent for top-level navigation (GET only)
- `none`: Cookie sent for all requests (requires `secure: true`)

### 3. Origin/Referer Validation

**Status**: ✅ RECOMMENDED AS ADDITIONAL LAYER

```javascript
// src/core/middleware/origin-validation.js
function validate_origin_middleware(req, res, next) {
    const origin = req.headers.origin || req.headers.referer;
    
    // List of allowed origins
    const ALLOWED_ORIGINS = [
        'https://app.luxaris.com',
        'https://luxaris.com',
        process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
    ].filter(Boolean);
    
    // Skip for GET/HEAD/OPTIONS (read-only)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    
    // Check origin for state-changing requests
    if (!origin) {
        system_logger.warning('security.missing_origin', 
            'Request without origin header', {
            method: req.method,
            path: req.path,
            ip: req.ip
        });
        
        return res.status(403).json({
            errors: [{
                error_code: 'ORIGIN_REQUIRED',
                error_description: 'Origin header required',
                error_severity: 'error'
            }]
        });
    }
    
    const origin_url = new URL(origin);
    const is_allowed = ALLOWED_ORIGINS.some(allowed => {
        const allowed_url = new URL(allowed);
        return allowed_url.origin === origin_url.origin;
    });
    
    if (!is_allowed) {
        system_logger.warning('security.invalid_origin', 
            'Request from invalid origin', {
            origin,
            method: req.method,
            path: req.path,
            ip: req.ip
        });
        
        return res.status(403).json({
            errors: [{
                error_code: 'INVALID_ORIGIN',
                error_description: 'Request from unauthorized origin',
                error_severity: 'error'
            }]
        });
    }
    
    next();
}
```

### 4. Double Submit Cookie Pattern

**Status**: 🔄 ALTERNATIVE APPROACH (NOT CURRENTLY USED)

If using cookies but not server-side session storage:

```javascript
// Login - Set both cookie and return token
router.post('/auth/login', async (req, res) => {
    const { token } = await auth_service.login(email, password);
    
    // Generate CSRF token
    const csrf_token = crypto.randomBytes(32).toString('hex');
    
    // Set CSRF token in cookie
    res.cookie('csrf_token', csrf_token, {
        httpOnly: false, // Readable by JavaScript
        secure: true,
        sameSite: 'strict'
    });
    
    // Return CSRF token in response
    res.json({
        token,
        csrf_token // Client must send this in header
    });
});

// Middleware validates both match
function double_submit_csrf_middleware(req, res, next) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const cookie_csrf = req.cookies.csrf_token;
        const header_csrf = req.headers['x-csrf-token'];
        
        if (!cookie_csrf || !header_csrf || cookie_csrf !== header_csrf) {
            return res.status(403).json({
                errors: [{
                    error_code: 'CSRF_VALIDATION_FAILED',
                    error_description: 'CSRF token validation failed',
                    error_severity: 'error'
                }]
            });
        }
    }
    next();
}
```

## Current Implementation Status

### ✅ Already Protected

1. **Authorization Header Pattern**: JWT in Authorization header (not cookies)
2. **CORS Configuration**: Restricts cross-origin requests
3. **No State-Changing GET**: All mutations use POST/PUT/PATCH/DELETE

### 🔄 Recommended Enhancements

1. **Add Origin Validation**: Extra layer for state-changing requests
2. **Consider CSRF Tokens**: If moving to HttpOnly cookies
3. **Implement Rate Limiting**: Prevent brute force CSRF attempts

## Implementation Recommendations

### For Current Setup (Authorization Header)

```javascript
// Apply origin validation to state-changing routes
app.use('/api/v1/posts', validate_origin_middleware);
app.use('/api/v1/channels', validate_origin_middleware);
app.use('/api/v1/schedules', validate_origin_middleware);
app.use('/api/v1/admin', validate_origin_middleware);
```

### For Future (If Moving to Cookies)

1. Implement HttpOnly cookies
2. Add SameSite=Strict
3. Implement CSRF token system
4. Apply CSRF middleware to all routes

## Testing Strategy

### Unit Tests

```javascript
describe('CSRF Protection', () => {
    it('should reject requests from invalid origin', async () => {
        const response = await request(app)
            .post('/api/v1/posts')
            .set('Authorization', `Bearer ${valid_token}`)
            .set('Origin', 'https://malicious-site.com')
            .send({ title: 'Test Post' });

        expect(response.status).toBe(403);
        expect(response.body.errors[0].error_code).toBe('INVALID_ORIGIN');
    });

    it('should allow requests from valid origin', async () => {
        const response = await request(app)
            .post('/api/v1/posts')
            .set('Authorization', `Bearer ${valid_token}`)
            .set('Origin', 'https://app.luxaris.com')
            .send({ title: 'Test Post', content: 'Content' });

        expect(response.status).toBe(201);
    });

    it('should reject CSRF token mismatch', async () => {
        // Only if using CSRF tokens
        const response = await request(app)
            .post('/api/v1/posts')
            .set('Cookie', 'access_token=valid_token')
            .set('X-CSRF-Token', 'invalid_token')
            .send({ title: 'Test Post' });

        expect(response.status).toBe(403);
        expect(response.body.errors[0].error_code).toBe('CSRF_TOKEN_INVALID');
    });
});
```

### Integration Tests

```javascript
describe('CSRF Attack Scenarios', () => {
    it('should prevent CSRF via external form submission', async () => {
        // Simulate external site trying to submit form
        const response = await request(app)
            .post('/api/v1/posts/123/delete')
            .set('Authorization', `Bearer ${valid_token}`)
            .set('Origin', 'https://evil.com');

        expect(response.status).toBe(403);
    });

    it('should prevent CSRF via XMLHttpRequest from external site', async () => {
        // Even with valid token, invalid origin should block
        const response = await request(app)
            .patch('/api/v1/users/123/settings')
            .set('Authorization', `Bearer ${valid_token}`)
            .set('Origin', 'https://phishing-site.com')
            .send({ theme: 'dark' });

        expect(response.status).toBe(403);
    });
});
```

## Security Headers

Add these headers for additional protection:

```javascript
// src/core/middleware/security-headers.js
app.use((req, res, next) => {
    // Prevent CSRF by restricting who can frame the site
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Only allow resources from same origin
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection (legacy)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
});
```

## Monitoring & Alerting

```javascript
// Log potential CSRF attempts
function log_csrf_attempt(req, reason) {
    system_logger.security('csrf_attempt', {
        reason,
        origin: req.headers.origin,
        referer: req.headers.referer,
        user_agent: req.headers['user-agent'],
        ip: req.ip,
        user_id: req.user?.id,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString()
    });

    // Alert if multiple attempts from same IP
    const attempts_key = `csrf_attempts:${req.ip}`;
    redis_client.incr(attempts_key);
    redis_client.expire(attempts_key, 3600); // 1 hour window

    redis_client.get(attempts_key).then(count => {
        if (parseInt(count) > 10) {
            // Send alert to security team
            alert_service.send_security_alert({
                type: 'MULTIPLE_CSRF_ATTEMPTS',
                ip: req.ip,
                count: count
            });
        }
    });
}
```

## Migration Checklist

- [ ] Review current token storage mechanism (Authorization header vs cookies)
- [ ] Implement origin validation middleware
- [ ] Configure CORS with specific allowed origins
- [ ] Set security headers (X-Frame-Options, CSP, etc.)
- [ ] Add CSRF tests to test suite
- [ ] Document CSRF protection in API documentation
- [ ] If using cookies: implement CSRF token system
- [ ] Set up monitoring for CSRF attempts
- [ ] Configure alerts for suspicious patterns

## References

- OWASP CSRF: https://owasp.org/www-community/attacks/csrf
- CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- SameSite Cookies: https://web.dev/samesite-cookies-explained/

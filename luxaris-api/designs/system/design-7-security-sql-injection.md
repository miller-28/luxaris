# SQL Injection Protection

## Overview

SQL Injection is one of the most critical security vulnerabilities. This design document outlines comprehensive protection mechanisms against SQL injection attacks across the Luxaris API.

## Threat Model

### Attack Vectors
1. **User Input Fields**: Login forms, search boxes, filters
2. **URL Parameters**: Query strings, route parameters
3. **Request Headers**: Custom headers, cookies
4. **JSON Payloads**: POST/PUT/PATCH request bodies
5. **File Uploads**: Metadata fields

### Risk Level: CRITICAL
- **Impact**: Complete database compromise, data theft, data manipulation, privilege escalation
- **Likelihood**: HIGH without proper protection

## Protection Strategy

### 1. Parameterized Queries (PRIMARY DEFENSE)

**Status**: ✅ IMPLEMENTED

All database queries MUST use parameterized queries (prepared statements) with the `pg` library.

#### Implementation Pattern

```javascript
// ✅ CORRECT - Parameterized query
const result = await db_pool.query(
    'SELECT * FROM users WHERE email = $1 AND status = $2',
    [email, status]
);

// ❌ WRONG - String concatenation (VULNERABLE)
const result = await db_pool.query(
    `SELECT * FROM users WHERE email = '${email}' AND status = '${status}'`
);

// ❌ WRONG - Template literals (VULNERABLE)
const result = await db_pool.query(
    `SELECT * FROM users WHERE email = '${email}'`
);
```

#### Repository Pattern Enforcement

All repositories MUST follow this pattern:

```javascript
class UserRepository {
    async find_by_email(email) {
        const query = `
            SELECT id, email, password_hash, is_root, is_active, created_at
            FROM luxaris.users
            WHERE email = $1
        `;
        const result = await connection_manager.get_db_pool().query(query, [email]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async find_by_filters(filters) {
        const conditions = [];
        const values = [];
        let param_index = 1;

        if (filters.status) {
            conditions.push(`status = $${param_index++}`);
            values.push(filters.status);
        }

        if (filters.role_id) {
            conditions.push(`role_id = $${param_index++}`);
            values.push(filters.role_id);
        }

        const where_clause = conditions.length > 0 
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const query = `
            SELECT * FROM luxaris.users
            ${where_clause}
            ORDER BY created_at DESC
        `;

        const result = await connection_manager.get_db_pool().query(query, values);
        return result.rows;
    }
}
```

### 2. Input Validation (SECONDARY DEFENSE)

**Status**: 🔄 PARTIAL - Needs enhancement

Validate all inputs before they reach the database layer.

#### Validation Rules

```javascript
// Email validation
function validate_email(email) {
    if (!email || typeof email !== 'string') {
        throw new ValidationError('Email is required');
    }
    
    const email_regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email_regex.test(email)) {
        throw new ValidationError('Invalid email format');
    }
    
    if (email.length > 255) {
        throw new ValidationError('Email too long');
    }
    
    return email.toLowerCase().trim();
}

// UUID validation
function validate_uuid(id, field_name = 'id') {
    if (!id || typeof id !== 'string') {
        throw new ValidationError(`${field_name} is required`);
    }
    
    const uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid_regex.test(id)) {
        throw new ValidationError(`Invalid ${field_name} format`);
    }
    
    return id.toLowerCase();
}

// Integer validation
function validate_integer(value, field_name, min = null, max = null) {
    const num = parseInt(value, 10);
    
    if (isNaN(num)) {
        throw new ValidationError(`${field_name} must be an integer`);
    }
    
    if (min !== null && num < min) {
        throw new ValidationError(`${field_name} must be at least ${min}`);
    }
    
    if (max !== null && num > max) {
        throw new ValidationError(`${field_name} must be at most ${max}`);
    }
    
    return num;
}

// Enum validation
function validate_enum(value, field_name, allowed_values) {
    if (!allowed_values.includes(value)) {
        throw new ValidationError(
            `${field_name} must be one of: ${allowed_values.join(', ')}`
        );
    }
    return value;
}
```

#### Validation Middleware

```javascript
// src/core/middleware/validation-middleware.js
function validate_request_params(schema) {
    return (req, res, next) => {
        try {
            // Validate route parameters
            if (schema.params) {
                for (const [key, validator] of Object.entries(schema.params)) {
                    req.params[key] = validator(req.params[key], key);
                }
            }

            // Validate query parameters
            if (schema.query) {
                for (const [key, validator] of Object.entries(schema.query)) {
                    if (req.query[key]) {
                        req.query[key] = validator(req.query[key], key);
                    }
                }
            }

            // Validate body
            if (schema.body) {
                req.body = schema.body(req.body);
            }

            next();
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'VALIDATION_ERROR',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    };
}
```

### 3. ORM/Query Builder Safety

**Status**: ❌ NOT IMPLEMENTED (Using raw SQL with parameterization)

**Decision**: Continue using parameterized queries with `pg` library rather than introducing an ORM.

**Rationale**:
- Parameterized queries provide equivalent SQL injection protection
- Lower complexity and better performance
- Direct SQL gives more control for complex queries
- Team familiarity with SQL

### 4. Database User Permissions

**Status**: 🔄 NEEDS REVIEW

The database user should have minimal necessary permissions.

#### Recommended Permissions

```sql
-- Create application user with limited permissions
CREATE USER luxaris_app WITH PASSWORD 'strong_password';

-- Grant only necessary schema access
GRANT USAGE ON SCHEMA luxaris TO luxaris_app;

-- Grant table-level permissions (NOT superuser)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA luxaris TO luxaris_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA luxaris TO luxaris_app;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA luxaris FROM luxaris_app;
REVOKE ALL ON SCHEMA public FROM luxaris_app;

-- Deny access to system tables
REVOKE ALL ON pg_catalog.* FROM luxaris_app;
```

### 5. Dynamic Query Construction

**Status**: ⚠️ REQUIRES ATTENTION

When building dynamic queries (filters, sorting), use whitelisting.

#### Safe Dynamic Query Pattern

```javascript
class PostRepository {
    async find_with_filters(filters, sort_by = 'created_at', sort_order = 'DESC') {
        // Whitelist allowed sort columns
        const ALLOWED_SORT_COLUMNS = ['created_at', 'updated_at', 'title', 'status'];
        const ALLOWED_SORT_ORDERS = ['ASC', 'DESC'];

        // Validate sort parameters
        if (!ALLOWED_SORT_COLUMNS.includes(sort_by)) {
            throw new Error('Invalid sort column');
        }
        if (!ALLOWED_SORT_ORDERS.includes(sort_order.toUpperCase())) {
            throw new Error('Invalid sort order');
        }

        const conditions = [];
        const values = [];
        let param_index = 1;

        // Build WHERE clause with parameterization
        if (filters.status) {
            conditions.push(`status = $${param_index++}`);
            values.push(filters.status);
        }

        if (filters.author_id) {
            conditions.push(`author_id = $${param_index++}`);
            values.push(filters.author_id);
        }

        if (filters.search) {
            conditions.push(`title ILIKE $${param_index++}`);
            values.push(`%${filters.search}%`);
        }

        const where_clause = conditions.length > 0 
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        // Safe to use column name directly (whitelisted)
        const query = `
            SELECT * FROM luxaris.posts
            ${where_clause}
            ORDER BY ${sort_by} ${sort_order}
            LIMIT 100
        `;

        const result = await connection_manager.get_db_pool().query(query, values);
        return result.rows;
    }
}
```

### 6. Error Handling

**Status**: ✅ IMPLEMENTED

Never expose SQL errors to clients.

```javascript
// src/core/middleware/error-handler.js
function error_handler(error, req, res, next) {
    // Log full error internally
    system_logger.error('request_error', error.message, {
        stack: error.stack,
        url: req.url,
        method: req.method
    });

    // Return generic error to client (no SQL details)
    if (error.code?.startsWith('22') || error.code?.startsWith('23')) {
        // PostgreSQL constraint/data errors
        return res.status(400).json({
            errors: [{
                error_code: 'INVALID_DATA',
                error_description: 'Invalid data provided',
                error_severity: 'error'
            }]
        });
    }

    // Generic 500 error
    res.status(500).json({
        errors: [{
            error_code: 'INTERNAL_ERROR',
            error_description: 'An internal error occurred',
            error_severity: 'error'
        }]
    });
}
```

## Testing Strategy

### Unit Tests

```javascript
describe('SQL Injection Protection', () => {
    it('should reject SQL injection in email field', async () => {
        const malicious_email = "admin'--";
        
        await expect(
            user_repository.find_by_email(malicious_email)
        ).resolves.toBeNull(); // No results, not an error
    });

    it('should handle SQL injection attempts in search', async () => {
        const malicious_search = "'; DROP TABLE posts; --";
        
        const results = await post_repository.find_with_filters({
            search: malicious_search
        });
        
        // Should search for literal string, not execute SQL
        expect(results).toEqual([]);
    });

    it('should reject invalid UUID format', async () => {
        const malicious_id = "1' OR '1'='1";
        
        await expect(
            validate_uuid(malicious_id, 'user_id')
        ).rejects.toThrow('Invalid user_id format');
    });
});
```

### Integration Tests

```javascript
describe('SQL Injection Attack Scenarios', () => {
    it('should protect login endpoint from SQL injection', async () => {
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: "admin' OR '1'='1",
                password: "password"
            });

        expect(response.status).toBe(401);
        expect(response.body.errors[0].error_code).toBe('INVALID_CREDENTIALS');
    });

    it('should protect search endpoint from injection', async () => {
        const response = await request(app)
            .get('/api/v1/posts')
            .query({ search: "'; DROP TABLE posts; --" })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.posts)).toBe(true);
        
        // Verify posts table still exists
        const check = await db_pool.query('SELECT COUNT(*) FROM luxaris.posts');
        expect(check.rows[0].count).toBeDefined();
    });
});
```

## Audit Checklist

- [ ] All database queries use parameterized queries ($1, $2, etc.)
- [ ] No string concatenation or template literals in SQL queries
- [ ] Input validation on all user inputs (params, query, body)
- [ ] UUID validation for all ID parameters
- [ ] Enum validation for status/type fields
- [ ] Whitelist validation for sort columns
- [ ] Database user has minimal necessary permissions
- [ ] SQL errors are logged but not exposed to clients
- [ ] All endpoints have integration tests for SQL injection
- [ ] Code review checklist includes SQL injection check

## Monitoring & Detection

### Query Logging

```javascript
// Log all queries in development/test
if (process.env.NODE_ENV !== 'production') {
    const original_query = db_pool.query.bind(db_pool);
    db_pool.query = async (text, params) => {
        console.log('SQL Query:', text);
        console.log('Params:', params);
        return original_query(text, params);
    };
}
```

### Attack Detection

```javascript
// Detect potential SQL injection attempts
function detect_sql_injection_pattern(input) {
    const sql_keywords = [
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
        'ALTER', 'EXEC', 'UNION', 'OR 1=1', 'OR 1 = 1',
        '--', '/*', '*/', 'xp_', 'sp_'
    ];

    const input_upper = input.toUpperCase();
    
    for (const keyword of sql_keywords) {
        if (input_upper.includes(keyword)) {
            system_logger.warning('security.sql_injection_attempt', 
                'Potential SQL injection attempt detected', {
                input_sample: input.substring(0, 100),
                keyword_detected: keyword
            });
            return true;
        }
    }
    
    return false;
}
```

## Migration Guide

For existing code not using parameterized queries:

1. **Identify vulnerable queries**: Search for string concatenation in SQL
2. **Refactor to parameterized**: Replace with $1, $2 placeholders
3. **Add validation**: Validate inputs before database layer
4. **Test thoroughly**: Add SQL injection test cases
5. **Deploy with monitoring**: Watch logs for errors

## References

- OWASP SQL Injection: https://owasp.org/www-community/attacks/SQL_Injection
- PostgreSQL Security: https://www.postgresql.org/docs/current/sql-prepare.html
- node-postgres Parameterized Queries: https://node-postgres.com/features/queries

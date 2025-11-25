# HTTP Middleware Stack - Implementation Guide

This document describes the complete HTTP middleware stack for the Luxaris API with focus on the RequestLogger middleware.

---

## Middleware Execution Order

The order matters for proper request tracking and error handling:

```javascript
// src/core/http/server.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const requestId = require('express-request-id');
const requestLogger = require('./middleware/request_logger');
const authenticate = require('./middleware/authenticate');
const errorHandler = require('./middleware/error_handler');

const app = express();

// 1. Security headers (first)
app.use(helmet());

// 2. CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));

// 3. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Request ID generation (BEFORE request logger)
app.use(requestId());

// 5. Request Logger (captures all requests)
app.use(requestLogger.middleware());

// 6. Authentication (JWT/API key verification)
app.use(authenticate);

// 7. Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// 8. Application routes
app.use('/api/v1', require('../../contexts/system/interface/http/routes'));
app.use('/api/v1', require('../../contexts/posts/interface/http/routes'));

// 9. 404 handler
app.use((req, res) => {
  res.status(404).json({
    errors: [{
      error_code: 'NOT_FOUND',
      error_description: `Route ${req.method} ${req.path} not found`,
      error_severity: 'error'
    }],
    request_id: req.id
  });
});

// 10. Global error handler (LAST)
app.use(errorHandler);

module.exports = app;
```

---

## RequestLogger Middleware

### Purpose

The RequestLogger middleware automatically captures **HTTP telemetry** for every request:
- Request details (method, path, query params)
- Response details (status code, size)
- Performance metrics (duration in milliseconds)
- Client information (IP, user agent)
- Authentication context (principal ID and type)
- Error tracking (error code and message)

### Implementation

**File:** `src/core/http/middleware/request_logger.js`

```javascript
const requestLogRepository = require('../../../infrastructure/repositories/request_log_repository');

class RequestLogger {
  /**
   * Express middleware factory
   * Attaches request logging to all routes
   */
  middleware() {
    return async (req, res, next) => {
      const startTime = Date.now();
      const requestId = req.id; // From express-request-id middleware
      
      // Capture request size
      const requestSize = parseInt(req.get('content-length') || '0', 10);
      
      // Intercept res.json to capture response body size
      const originalJson = res.json.bind(res);
      let responseSize = 0;
      
      res.json = function(body) {
        try {
          responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
        } catch (err) {
          responseSize = 0;
        }
        return originalJson(body);
      };
      
      // Intercept res.send for non-JSON responses
      const originalSend = res.send.bind(res);
      res.send = function(body) {
        if (typeof body === 'string') {
          responseSize = Buffer.byteLength(body, 'utf8');
        }
        return originalSend(body);
      };
      
      // On response finish, log to database
      res.on('finish', async () => {
        const duration = Date.now() - startTime;
        
        try {
          await this.logRequest({
            request_id: requestId,
            timestamp: new Date(startTime),
            method: req.method,
            path: this.normalizePath(req.path),
            status_code: res.statusCode,
            duration_ms: duration,
            principal_id: req.user?.id || null,
            principal_type: req.user ? (req.user.type || 'user') : 'anonymous',
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent') || null,
            request_size_bytes: requestSize,
            response_size_bytes: responseSize,
            error_code: res.locals.errorCode || null,
            error_message: res.locals.errorMessage || null,
            context: {
              query_params: this.sanitizeParams(req.query),
              route_params: req.params,
              referrer: req.get('referrer') || null,
              correlation_id: req.get('x-correlation-id') || null
            }
          });
        } catch (error) {
          // Fail silently - don't break request flow
          // Log to console in development, silent in production
          if (process.env.NODE_ENV === 'development') {
            console.error('[RequestLogger] Failed to log request:', error);
          }
        }
      });
      
      next();
    };
  }
  
  /**
   * Log request data to database
   */
  async logRequest(data) {
    return await requestLogRepository.create(data);
  }
  
  /**
   * Normalize path to remove IDs for grouping
   * Example: /api/v1/posts/123abc -> /api/v1/posts/:id
   */
  normalizePath(path) {
    // Replace UUIDs with :id
    let normalized = path.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id'
    );
    
    // Replace numeric IDs with :id
    normalized = normalized.replace(/\/\d+\/?/g, '/:id/');
    
    return normalized;
  }
  
  /**
   * Remove sensitive parameters from query strings
   */
  sanitizeParams(params) {
    if (!params || typeof params !== 'object') {
      return {};
    }
    
    const sensitive = ['password', 'token', 'secret', 'api_key', 'authorization'];
    const sanitized = { ...params };
    
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitive.some(s => lowerKey.includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  /**
   * Query request logs for analytics
   */
  async query(filters = {}) {
    return await requestLogRepository.find(filters);
  }
  
  /**
   * Get performance metrics for endpoints
   */
  async getMetrics(options = {}) {
    const {
      path = null,
      startDate = null,
      endDate = null,
      groupBy = 'path' // 'path', 'status_code', 'principal_id'
    } = options;
    
    return await requestLogRepository.getMetrics({
      path,
      startDate,
      endDate,
      groupBy
    });
  }
  
  /**
   * Get slowest endpoints
   */
  async getSlowestEndpoints(limit = 10, dateRange = {}) {
    return await requestLogRepository.getSlowestEndpoints(limit, dateRange);
  }
  
  /**
   * Get error rate by endpoint
   */
  async getErrorRate(dateRange = {}) {
    return await requestLogRepository.getErrorRate(dateRange);
  }
}

// Export singleton instance
module.exports = new RequestLogger();
```

---

## Repository Implementation

**File:** `src/infrastructure/repositories/request_log_repository.js`

```javascript
const knex = require('../database/knex');

class RequestLogRepository {
  async create(data) {
    const [log] = await knex('request_logs')
      .insert({
        request_id: data.request_id,
        timestamp: data.timestamp,
        method: data.method,
        path: data.path,
        status_code: data.status_code,
        duration_ms: data.duration_ms,
        principal_id: data.principal_id,
        principal_type: data.principal_type,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        request_size_bytes: data.request_size_bytes,
        response_size_bytes: data.response_size_bytes,
        error_code: data.error_code,
        error_message: data.error_message,
        context: JSON.stringify(data.context),
        created_at: knex.fn.now()
      })
      .returning('*');
    
    return log;
  }
  
  async find(filters = {}) {
    const query = knex('request_logs').select('*');
    
    if (filters.principal_id) {
      query.where('principal_id', filters.principal_id);
    }
    
    if (filters.path) {
      query.where('path', filters.path);
    }
    
    if (filters.status_code) {
      query.where('status_code', filters.status_code);
    }
    
    if (filters.startDate) {
      query.where('timestamp', '>=', filters.startDate);
    }
    
    if (filters.endDate) {
      query.where('timestamp', '<=', filters.endDate);
    }
    
    query.orderBy('timestamp', 'desc');
    
    if (filters.limit) {
      query.limit(filters.limit);
    }
    
    return await query;
  }
  
  async getMetrics(options = {}) {
    const { path, startDate, endDate, groupBy } = options;
    
    const query = knex('request_logs')
      .select(groupBy)
      .count('* as request_count')
      .avg('duration_ms as avg_duration_ms')
      .min('duration_ms as min_duration_ms')
      .max('duration_ms as max_duration_ms')
      .sum('request_size_bytes as total_request_size')
      .sum('response_size_bytes as total_response_size');
    
    if (path) query.where('path', path);
    if (startDate) query.where('timestamp', '>=', startDate);
    if (endDate) query.where('timestamp', '<=', endDate);
    
    query.groupBy(groupBy);
    query.orderBy('request_count', 'desc');
    
    return await query;
  }
  
  async getSlowestEndpoints(limit = 10, dateRange = {}) {
    const query = knex('request_logs')
      .select('path', 'method')
      .avg('duration_ms as avg_duration_ms')
      .count('* as request_count');
    
    if (dateRange.startDate) {
      query.where('timestamp', '>=', dateRange.startDate);
    }
    
    if (dateRange.endDate) {
      query.where('timestamp', '<=', dateRange.endDate);
    }
    
    query.groupBy('path', 'method');
    query.orderBy('avg_duration_ms', 'desc');
    query.limit(limit);
    
    return await query;
  }
  
  async getErrorRate(dateRange = {}) {
    const query = knex('request_logs')
      .select('path')
      .count('* as total_requests')
      .sum(knex.raw('CASE WHEN status_code >= 400 THEN 1 ELSE 0 END as error_count'))
      .select(knex.raw('(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::float / COUNT(*)::float * 100) as error_rate'));
    
    if (dateRange.startDate) {
      query.where('timestamp', '>=', dateRange.startDate);
    }
    
    if (dateRange.endDate) {
      query.where('timestamp', '<=', dateRange.endDate);
    }
    
    query.groupBy('path');
    query.havingRaw('COUNT(*) > 10'); // Only paths with significant traffic
    query.orderBy('error_rate', 'desc');
    
    return await query;
  }
}

module.exports = new RequestLogRepository();
```

---

## Error Handler Integration

The error handler must set `res.locals` properties so RequestLogger can capture error details:

**File:** `src/core/http/middleware/error_handler.js`

```javascript
const { SystemLogger } = require('../../../contexts/system');

function errorHandler(err, req, res, next) {
  // Set error info for RequestLogger to capture
  res.locals.errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  res.locals.errorMessage = err.message;
  
  // Log error to system_logs
  SystemLogger.error(
    'http.request',
    `${req.method} ${req.path} failed`,
    err,
    {
      request_id: req.id,
      principal_id: req.user?.id,
      status_code: err.statusCode || 500,
      error_code: err.code
    }
  );
  
  // Send error response (RequestLogger will capture this)
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    errors: [{
      error_code: res.locals.errorCode,
      error_description: process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal server error'
        : err.message,
      error_severity: 'error'
    }],
    request_id: req.id
  });
}

module.exports = errorHandler;
```

---

## Usage Examples

### Querying Request Logs

```javascript
const { RequestLogger } = require('./contexts/system');

// Get all requests for a specific user
const userRequests = await RequestLogger.query({
  principal_id: 'user-uuid',
  limit: 100
});

// Get metrics for posts endpoint
const postMetrics = await RequestLogger.getMetrics({
  path: '/api/v1/posts',
  startDate: '2025-11-01',
  endDate: '2025-11-30',
  groupBy: 'status_code'
});

// Get slowest endpoints
const slowEndpoints = await RequestLogger.getSlowestEndpoints(10, {
  startDate: '2025-11-01',
  endDate: '2025-11-30'
});

// Get error rates
const errorRates = await RequestLogger.getErrorRate({
  startDate: '2025-11-01',
  endDate: '2025-11-30'
});
```

### Analytics Dashboard Queries

```sql
-- Top 10 most called endpoints (last 7 days)
SELECT path, method, COUNT(*) as calls
FROM request_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY path, method
ORDER BY calls DESC
LIMIT 10;

-- Average response time by endpoint
SELECT path, AVG(duration_ms) as avg_ms, COUNT(*) as calls
FROM request_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY path
ORDER BY avg_ms DESC;

-- Error rate by endpoint (last 24 hours)
SELECT 
  path,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors,
  (SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::float / COUNT(*)::float * 100) as error_rate
FROM request_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY path
HAVING COUNT(*) > 10
ORDER BY error_rate DESC;

-- User activity tracking
SELECT 
  principal_id,
  COUNT(*) as total_requests,
  COUNT(DISTINCT path) as unique_endpoints,
  AVG(duration_ms) as avg_response_time
FROM request_logs
WHERE principal_type = 'user'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY principal_id
ORDER BY total_requests DESC
LIMIT 20;
```

---

## Benefits

### Performance Monitoring
- Track response times per endpoint
- Identify slow queries and bottlenecks
- Monitor API health in real-time

### Usage Analytics
- Understand which features are used most
- Track user behavior patterns
- Identify unused or underutilized endpoints

### Error Tracking
- Correlate errors across logs and events
- Track error rates by endpoint
- Debug production issues with full request context

### Security
- Audit API access patterns
- Detect unusual activity (rate spikes, brute force)
- Track authentication failures

### Compliance
- Complete audit trail of API usage
- Track who accessed what data and when
- Support GDPR data access requests

---

## Performance Considerations

### Database Load
- Request logs can generate significant write volume
- Consider using a separate database or schema for logs
- Implement connection pooling
- Use batch inserts for high-traffic scenarios

### Storage Growth
- Implement retention policies (see design-4-observability.md)
- Archive old logs to cold storage (S3, Glacier)
- Partition tables by date for efficient cleanup

### Query Performance
- All critical indexes are defined in schema
- Use materialized views for common analytics queries
- Consider time-series database (TimescaleDB) for high volume

---

## Environment Configuration

```env
# Request Logging
REQUEST_LOGGING_ENABLED=true
REQUEST_LOG_RETENTION_DAYS=90
REQUEST_LOG_BATCH_SIZE=100
REQUEST_LOG_FLUSH_INTERVAL_MS=5000

# Performance thresholds for alerts
REQUEST_SLOW_THRESHOLD_MS=1000
REQUEST_ERROR_RATE_THRESHOLD=5

# Exclude paths from logging (health checks, metrics)
REQUEST_LOG_EXCLUDE_PATHS=/health,/metrics,/favicon.ico
```

---

## Summary

The RequestLogger middleware provides:
- ✅ **Automatic HTTP telemetry** for all requests
- ✅ **Zero-code integration** - just add middleware
- ✅ **Performance metrics** - response times, throughput
- ✅ **Error tracking** - status codes, error messages
- ✅ **User analytics** - API usage patterns
- ✅ **Security auditing** - access patterns, authentication
- ✅ **Compliance support** - complete audit trail

Combined with SystemLogger, EventRegistry, and AuditService, it provides complete four-tier observability for the Luxaris API.

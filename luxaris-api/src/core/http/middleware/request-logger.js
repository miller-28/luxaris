const winston = require('winston');
const RequestLogRepository = require('../../infrastructure/repositories/request-log-repository');

class RequestLogger {
    
    constructor(db_pool) {
        this.repository = db_pool ? new RequestLogRepository() : null;
        
        // Winston logger for console output
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.printf(({ timestamp, level, message }) => {
                            return `${timestamp} \x1b[32m[info]\x1b[0m: ${message}`;
                        })
                    )
                })
            ]
        });
    }

    middleware() {
        return (req, res, next) => {

            const start_time = Date.now();
            const request_id = req.id;
            const route = `${req.method} ${req.path || req.url}`;

            this.logger.info(
                `[INCOMING] Request UUID: ${request_id} | Route: ${route}`
            );

            // Capture request size
            const request_size = parseInt(req.get('content-length') || '0', 10);

            // Store original methods to capture response
            const original_json = res.json.bind(res);
            const original_send = res.send.bind(res);
            let response_size = 0;

            // Override res.json
            res.json = function(body) {
                response_size = JSON.stringify(body).length;
                return original_json(body);
            };

            // Override res.send
            res.send = function(body) {
                if (body) {
                    response_size = typeof body === 'string' ? body.length : JSON.stringify(body).length;
                }
                return original_send(body);
            };

            // On response finish, log to database
            res.on('finish', async () => {

                const duration = Date.now() - start_time;
                const user_id = req.user?.id || 'anonymous';
                this.logger.info(
                    `[COMPLETED] Request UUID: ${request_id} | Route: ${route} | User: ${user_id} | Duration: ${duration}ms | Status: ${res.statusCode}`
                );

                if (!this.repository) {
                    return;
                }

                try {
                    await this.repository.create({
                        request_id,
                        timestamp: new Date(start_time),
                        method: req.method,
                        path: req.path || req.url,
                        status_code: res.statusCode,
                        duration_ms: duration,
                        principal_id: req.user?.id || null,
                        principal_type: req.user ? 'user' : 'anonymous',
                        ip_address: req.ip || req.connection.remoteAddress,
                        user_agent: req.get('user-agent'),
                        request_size_bytes: request_size,
                        response_size_bytes: response_size,
                        error_code: res.locals.errorCode || null,
                        error_message: res.locals.errorMessage || null,
                        context: {
                            query_params: this.sanitize_params(req.query),
                            route_params: req.params,
                            referrer: req.get('referrer'),
                            correlation_id: req.get('x-correlation-id')
                        }
                    });
                } catch (error) {
                    // Fail silently - don't break request flow
                    this.logger.error('Failed to log request:', error.message);
                }
            });

            next();
        };
    }

    sanitize_params(params) {
        const sensitive = ['password', 'token', 'secret', 'api_key', 'authorization'];
        const sanitized = { ...params };

        for (const key of Object.keys(sanitized)) {
            if (sensitive.some(s => key.toLowerCase().includes(s))) {
                sanitized[key] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    async query(filters) {
        if (!this.repository) {
            throw new Error('Database repository not initialized');
        }
        return await this.repository.query(filters);
    }

    async get_metrics(options = {}) {
        if (!this.repository) {
            throw new Error('Database repository not initialized');
        }
        return await this.repository.get_metrics(options);
    }
}

// Singleton instance
let instance = null;

module.exports = {
    RequestLogger,
    get_request_logger: (db_pool) => {
        if (!instance) {
            instance = new RequestLogger(db_pool);
        }
        return instance;
    }
};

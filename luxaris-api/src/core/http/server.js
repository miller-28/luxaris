const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const request_id_middleware = require('./middleware/request-id');

class Server {
    
    constructor(config) {
        this.config = config;
        this.app = express();
        this.rate_limiter = new RateLimiterMemory({
            points: config.rate_limit_max_requests,
            duration: config.rate_limit_window_ms / 1000,
        });
        this._setup_middleware();
    }

    _setup_middleware() {
        // Security headers with CSP
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for compatibility
                    imgSrc: ["'self'", 'https:', 'data:'],
                    connectSrc: ["'self'"],
                    frameAncestors: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            frameguard: {
                action: 'deny'
            },
            noSniff: true,
            xssFilter: true,
            referrerPolicy: {
                policy: 'strict-origin-when-cross-origin'
            }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: this.config.cors_origin,
            credentials: true,
        }));

        // Request ID for tracing
        this.app.use(request_id_middleware());    // Rate limiting
        this.app.use(async (req, res, next) => {
            try {
                await this.rate_limiter.consume(req.ip);
                next();
            } catch (error) {
                res.status(429).json({
                    errors: [{
                        error_code: 'RATE_LIMIT_EXCEEDED',
                        error_description: 'Too many requests, please try again later',
                        error_severity: 'warning'
                    }]
                });
            }
        });

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    }

    register_middleware(middleware) {
        this.app.use(middleware);
    }

    register_routes(path, router) {
        this.app.use(path, router);
    }

    register_error_handler(handler) {
        this.app.use(handler);
    }

    start() {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.config.port, () => {
                console.log(`Server listening on port ${this.config.port} in ${this.config.node_env} mode`);
                resolve(this.server);
            });
        });
    }

    stop() {
        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.close((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    get_app() {
        return this.app;
    }
}

module.exports = Server;

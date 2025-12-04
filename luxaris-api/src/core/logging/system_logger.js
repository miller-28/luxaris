const winston = require('winston');
const SystemLogRepository = require('./system_log_repository');

class SystemLogger {
    constructor(db_pool) {
        this.repository = db_pool ? new SystemLogRepository(db_pool) : null;
		
        // Winston logger for console output
        this.winston = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.printf(({ timestamp, level, message, ...meta }) => {
                            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                        })
                    )
                })
            ]
        });
    }

    async _log(level, logger, message, context = {}) {
        // Ensure message is a string
        const message_str = typeof message === 'string' ? message : String(message);
		
        // Map our log levels to Winston levels
        const winston_level_map = {
            'DEBUG': 'debug',
            'INFO': 'info',
            'WARNING': 'warn',
            'ERROR': 'error',
            'CRITICAL': 'error'
        };
		
        // Always log to console via Winston
        this.winston.log(winston_level_map[level], message_str, { ...context, logger });

        // Persist to database if repository available and not DEBUG in production
        if (this.repository && !(level === 'DEBUG' && process.env.NODE_ENV === 'production')) {
            await this.repository.create({
                level,
                logger,
                message: message_str,
                timestamp: new Date(),
                request_id: context.request_id || null,
                principal_id: context.principal_id || null,
                principal_type: context.principal_type || null,
                context: context
            });
        }
    }

    async debug(logger, message, context = {}) {
        await this._log('DEBUG', logger, message, context);
    }

    async info(logger, message, context = {}) {
        await this._log('INFO', logger, message, context);
    }

    async warning(logger, message, context = {}) {
        await this._log('WARNING', logger, message, context);
    }

    async error(logger, message, error, context = {}) {
        const error_context = {
            ...context,
            error_message: error?.message,
            error_name: error?.name,
            stack_trace: error?.stack
        };
        await this._log('ERROR', logger, message, error_context);
    }

    async critical(logger, message, error, context = {}) {
        const error_context = {
            ...context,
            error_message: error?.message,
            error_name: error?.name,
            stack_trace: error?.stack
        };
        await this._log('CRITICAL', logger, message, error_context);
    }

    async query(filters) {
        if (!this.repository) {
            throw new Error('Database repository not initialized');
        }
        return await this.repository.query(filters);
    }
}

// Singleton instance
let instance = null;

module.exports = {
    SystemLogger,
    get_logger: (db_pool) => {
        if (!instance) {
            instance = new SystemLogger(db_pool);
        }
        return instance;
    }
};

const AuditLogRepository = require('./audit_log_repository');

class AuditService {
    constructor(db_pool) {
        this.repository = new AuditLogRepository();
    }

    async log(action, options = {}) {
        return await this.repository.create({
            timestamp: new Date(),
            actor_type: options.actor_type || null,
            actor_id: options.actor_id || null,
            action,
            resource_type: options.resource_type || null,
            resource_id: options.resource_id || null,
            ip_address: options.ip_address || null,
            user_agent: options.user_agent || null,
            data: options.data || null
        });
    }

    async query(filters) {
        return await this.repository.query(filters);
    }
}

// Singleton instance
let instance = null;

module.exports = {
    AuditService,
    get_audit_service: (db_pool) => {
        if (!instance) {
            instance = new AuditService(db_pool);
        }
        return instance;
    }
};

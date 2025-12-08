class DbCleaner {
    constructor(db_pool) {
        this.db_pool = db_pool;
    }

    /**
     * Clean all tables in reverse dependency order to avoid foreign key violations
     */
    async clean_all_tables() {
        const tables = [
            // Observability tables (no dependencies)
            'request_logs',
            'system_logs',
            'system_events',
            'audit_logs',
            
            // Scheduling tables
            'schedules',
            
            // Generation tables
            'generation_suggestions',
            'generation_sessions',
            'post_templates',
            
            // Post-related tables
            'post_variants',
            'posts',
            
            // Channel tables
            'channel_connections',
            
            // UI Presets
            'user_ui_stateful_presets',
            
            // ACL tables
            'acl_principal_permission_grants',
            'acl_principal_role_assignments',
            
            // Auth tables
            'oauth_accounts',
            'sessions',
            'users'
        ];

        for (const table of tables) {
            await this.db_pool.query(`DELETE FROM ${table}`);
        }
    }

    /**
     * Clean a specific table (search_path is already set to luxaris schema)
     */
    async clean_table(table_name) {
        await this.db_pool.query(`DELETE FROM ${table_name}`);
    }

    /**
     * Clean multiple tables in the specified order
     */
    async clean_tables(table_names) {
        for (const table_name of table_names) {
            await this.clean_table(table_name);
        }
    }

    /**
     * Clean tables with a WHERE clause (for conditional cleanup)
     */
    async clean_table_where(table_name, where_clause, params = []) {
        await this.db_pool.query(`DELETE FROM ${table_name} WHERE ${where_clause}`, params);
    }

    /**
     * Clean user-related data (auth and identity tables)
     */
    async clean_auth_tables() {
        await this.clean_tables([
            'audit_logs',
            'request_logs',
            'system_events',
            'system_logs',
            'oauth_accounts',
            'acl_principal_permission_grants',
            'acl_principal_role_assignments',
            'sessions',
            'users'
        ]);
    }

    /**
     * Clean post-related data
     */
    async clean_post_tables() {
        await this.clean_tables([
            'schedules',
            'post_variants',
            'posts'
        ]);
    }

    /**
     * Clean generation-related data
     */
    async clean_generation_tables() {
        await this.clean_tables([
            'generation_suggestions',
            'generation_sessions',
            'post_templates'
        ]);
    }

    /**
     * Clean channel-related data
     */
    async clean_channel_tables() {
        await this.clean_tables([
            'channel_connections'
        ]);
    }

    /**
     * Clean test users by email pattern
     */
    async clean_test_users(email_pattern) {
        await this.db_pool.query(
            'DELETE FROM oauth_accounts WHERE provider_email LIKE $1',
            [email_pattern]
        );
        await this.db_pool.query(
            'DELETE FROM users WHERE email LIKE $1',
            [email_pattern]
        );
    }

    /**
     * Clean specific users by emails
     */
    async clean_users_by_emails(emails) {
        if (!emails || emails.length === 0) return;
        
        const placeholders = emails.map((_, i) => `$${i + 1}`).join(', ');
        await this.db_pool.query(
            `DELETE FROM users WHERE email IN (${placeholders})`,
            emails
        );
    }

    /**
     * Clean specific users by IDs
     */
    async clean_users_by_ids(user_ids) {
        if (!user_ids || user_ids.length === 0) return;
        
        const placeholders = user_ids.map((_, i) => `$${i + 1}`).join(', ');
        await this.db_pool.query(
            `DELETE FROM users WHERE id IN (${placeholders})`,
            user_ids
        );
    }

    /**
     * Reset auto-increment sequences (if needed)
     */
    async reset_sequences() {
        // PostgreSQL sequences will continue from their current value
        // This method can be used to reset them if needed in the future
    }
}

module.exports = DbCleaner;

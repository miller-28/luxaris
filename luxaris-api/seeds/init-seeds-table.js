/**
 * Seeds Table Initialization
 * This file creates the seeds tracking table independently from db-migrate
 */

/**
 * Initialize seeds tracking table with final schema
 * @param {object} db_pool - PostgreSQL connection pool
 * @returns {Promise<void>}
 */
async function init_seeds_table(db_pool) {

    const create_table_sql = `
        CREATE TABLE IF NOT EXISTS public.seeds (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            execution_time_ms INTEGER,
            records_created INTEGER DEFAULT 0,
            records_updated INTEGER DEFAULT 0,
            records_deleted INTEGER DEFAULT 0,
            metadata JSONB DEFAULT '{}'::jsonb
        );
        
        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_seeds_executed_at ON public.seeds(executed_at);
        CREATE INDEX IF NOT EXISTS idx_seeds_name ON public.seeds(name);
        CREATE INDEX IF NOT EXISTS idx_seeds_metadata ON public.seeds USING gin (metadata);
        
        -- Add documentation comment
        COMMENT ON TABLE public.seeds IS 'Tracks seed file executions (independent from migrations)';
        COMMENT ON COLUMN public.seeds.metadata IS 'Stores execution details including affected_db_table, new_records_id_from, new_records_id_to for precise rollback';
    `;

    try {
        await db_pool.query(create_table_sql);
        console.log('[Seeds Init] ✓ Seeds tracking table ready');
    } catch (err) {
        console.error('[Seeds Init] ✗ Failed to initialize seeds table:', err.message);
        throw err;
    }
}

module.exports = { init_seeds_table };

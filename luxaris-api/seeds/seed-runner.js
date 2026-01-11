/**
 * Seed Runner - Execute database seed files with idempotency tracking
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { init_seeds_table } = require('./init-seeds-table');

class SeedRunner {
    
    constructor(db_config) {
        this.db_pool = new Pool({
            host: db_config.host,
            port: db_config.port,
            database: db_config.database,
            user: db_config.user,
            password: db_config.password,
            max: 5
        });
        this.seeds_dir = path.join(__dirname, 'seeders');
    }

    /**
     * Initialize seeds table if not exists
     * Uses autonomous init file (independent from db-migrate)
     */
    async _ensure_seeds_table() {
        await init_seeds_table(this.db_pool);
    }

    /**
     * Check if seed has already been executed
     */
    async _is_seed_executed(seed_name) {
        const client = await this.db_pool.connect();
        try {
            const result = await client.query(
                'SELECT id FROM public.seeds WHERE name = $1',
                [seed_name]
            );
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    /**
     * Record seed execution
     */
    async _record_seed_execution(seed_name, stats) {
        const client = await this.db_pool.connect();
        try {
            // Merge all metadata into single column
            const merged_metadata = {
                ...(stats.metadata || {}),
                ...(stats.execution_metadata || {})
            };
            
            // Always insert a new row (allows multiple executions tracking)
            await client.query(`
                INSERT INTO public.seeds 
                    (name, execution_time_ms, records_created, records_updated, records_deleted, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                seed_name,
                stats.execution_time_ms,
                stats.records_created || 0,
                stats.records_updated || 0,
                stats.records_deleted || 0,
                JSON.stringify(merged_metadata)
            ]);
        } finally {
            client.release();
        }
    }

    /**
     * Get all seed files from seeds directory
     */
    async _get_seed_files() {
        try {
            const files = await fs.readdir(this.seeds_dir);
            return files
                .filter(file => file.endsWith('.js'))
                .sort(); // Execute in alphabetical order
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log('[SeedRunner] Seeds directory not found, creating...');
                await fs.mkdir(this.seeds_dir, { recursive: true });
                return [];
            }
            throw err;
        }
    }

    /**
     * Execute a single seed file
     */
    async _execute_seed(seed_file, force = false) {
        const seed_name = path.basename(seed_file, '.js');
        
        // Check if already executed (unless forced)
        if (!force && await this._is_seed_executed(seed_name)) {
            console.log(`[SeedRunner] ⏭️  Skipping ${seed_name} (already executed)`);
            return { skipped: true, name: seed_name };
        }

        console.log(`[SeedRunner] 🌱 Executing ${seed_name}...`);
        
        const seed_path = path.join(this.seeds_dir, seed_file);
        const seed_module = require(seed_path);
        
        if (typeof seed_module.up !== 'function') {
            throw new Error(`Seed file ${seed_file} must export an 'up' function`);
        }

        const start_time = Date.now();
        
        // Execute seed with database pool and force flag
        const stats = await seed_module.up(this.db_pool, force);
        
        const execution_time = Date.now() - start_time;
        
        // Record execution with all stats from seed
        await this._record_seed_execution(seed_name, {
            execution_time_ms: execution_time,
            records_created: stats?.records_created || 0,
            records_updated: stats?.records_updated || 0,
            records_deleted: stats?.records_deleted || 0,
            metadata: stats?.metadata || {},
            execution_metadata: stats?.execution_metadata || {}
        });

        console.log(`[SeedRunner] ✅ ${seed_name} completed in ${execution_time}ms`);
        console.log(`[SeedRunner]    Created: ${stats?.records_created || 0}, Updated: ${stats?.records_updated || 0}, Deleted: ${stats?.records_deleted || 0}`);
        
        return { 
            success: true, 
            name: seed_name, 
            execution_time,
            stats 
        };
    }

    /**
     * Run all seeds
     */
    async run(options = {}) {
        const { force = false, seed_name = null } = options;
        
        console.log('[SeedRunner] Starting seed execution...');
        console.log(`[SeedRunner] Force mode: ${force ? 'ON' : 'OFF'}`);
        
        await this._ensure_seeds_table();
        
        const seed_files = await this._get_seed_files();
        
        if (seed_files.length === 0) {
            console.log('[SeedRunner] No seed files found in seeds directory');
            return { total: 0, executed: 0, skipped: 0 };
        }

        // Filter to specific seed if requested
        const files_to_run = seed_name 
            ? seed_files.filter(f => f.includes(seed_name))
            : seed_files;

        if (files_to_run.length === 0) {
            console.log(`[SeedRunner] No seed files found matching: ${seed_name}`);
            return { total: 0, executed: 0, skipped: 0 };
        }

        console.log(`[SeedRunner] Found ${files_to_run.length} seed(s) to execute`);
        
        const results = {
            total: files_to_run.length,
            executed: 0,
            skipped: 0,
            failed: 0,
            details: []
        };

        for (const seed_file of files_to_run) {
            try {
                const result = await this._execute_seed(seed_file, force);
                
                if (result.skipped) {
                    results.skipped++;
                } else {
                    results.executed++;
                }
                
                results.details.push(result);
            } catch (err) {
                console.error(`[SeedRunner] ❌ Failed to execute ${seed_file}:`, err.message);
                results.failed++;
                results.details.push({ 
                    failed: true, 
                    name: path.basename(seed_file, '.js'), 
                    error: err.message 
                });
            }
        }

        console.log('[SeedRunner] ═════════════════════════════════════');
        console.log(`[SeedRunner] Total: ${results.total}, Executed: ${results.executed}, Skipped: ${results.skipped}, Failed: ${results.failed}`);
        
        return results;
    }

    /**
     * Rollback latest seed execution (or specific seed if name provided)
     */
    async rollback(seed_name = null) {
        await this._ensure_seeds_table();
        
        // Get latest execution from seeds table
        const client = await this.db_pool.connect();
        let latest_execution;
        try {
            let query;
            let params = [];
            
            if (seed_name) {
                // Find seed file by partial name match
                const seed_files = await this._get_seed_files();
                const seed_file = seed_files.find(f => f.includes(seed_name));
                
                if (!seed_file) {
                    throw new Error(`Seed file not found matching: ${seed_name}`);
                }
                
                const full_seed_name = path.basename(seed_file, '.js');
                console.log(`[SeedRunner] Rolling back latest execution of: ${full_seed_name}`);
                
                query = 'SELECT id, name, metadata, executed_at FROM public.seeds WHERE name = $1 ORDER BY executed_at DESC LIMIT 1';
                params = [full_seed_name];
            } else {
                console.log('[SeedRunner] Rolling back latest seed execution...');
                query = 'SELECT id, name, metadata, executed_at FROM public.seeds ORDER BY executed_at DESC LIMIT 1';
            }
            
            const result = await client.query(query, params);
            
            if (result.rows.length === 0) {
                console.log('[SeedRunner] ⏭️  No seed executions found. Nothing to rollback.');
                return;
            }
            
            latest_execution = result.rows[0];
        } finally {
            client.release();
        }
        
        console.log(`[SeedRunner] Rolling back: ${latest_execution.name}`);
        console.log(`[SeedRunner] Execution ID: ${latest_execution.id} from ${new Date(latest_execution.executed_at).toLocaleString()}`);
        
        // Find seed file
        const seed_files = await this._get_seed_files();
        const seed_file = seed_files.find(f => path.basename(f, '.js') === latest_execution.name);
        
        if (!seed_file) {
            throw new Error(`Seed file not found for: ${latest_execution.name}`);
        }

        const seed_path = path.join(this.seeds_dir, seed_file);
        const seed_module = require(seed_path);
        
        if (typeof seed_module.down !== 'function') {
            throw new Error(`Seed file ${seed_file} must export a 'down' function for rollback`);
        }

        const start_time = Date.now();
        
        // Pass execution metadata to down function for precise rollback (as array for compatibility)
        const execution_records = [{
            id: latest_execution.id,
            execution_metadata: latest_execution.metadata
        }];
        
        const result = await seed_module.down(this.db_pool, execution_records);
        
        const execution_time = Date.now() - start_time;

        // Remove the execution record from seeds table
        const deleteClient = await this.db_pool.connect();
        try {
            await deleteClient.query(
                'DELETE FROM public.seeds WHERE id = $1', 
                [latest_execution.id]
            );
            console.log(`[SeedRunner]    Removed execution record ID ${latest_execution.id} from seeds table`);
        } finally {
            deleteClient.release();
        }

        console.log(`[SeedRunner] ✅ Rollback completed in ${execution_time}ms`);
        if (result?.records_deleted) {
            console.log(`[SeedRunner]    Deleted: ${result.records_deleted} records`);
        }
    }

    /**
     * List executed seeds
     */
    async list() {
        await this._ensure_seeds_table();
        
        const client = await this.db_pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    name,
                    executed_at,
                    execution_time_ms,
                    records_created,
                    records_updated,
                    records_deleted,
                    metadata
                FROM public.seeds
                ORDER BY executed_at DESC
            `);
            
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Get available seed files (all seed files with execution status)
     */
    async get_available_seeds() {
        const seed_files = await this._get_seed_files();
        const executed_seeds = await this.list();
        const executed_names = new Set(executed_seeds.map(s => s.name));
        
        return seed_files.map(file => {
            const name = file.replace('.js', '');
            return {
                file: file,
                name: name,
                executed: executed_names.has(name),
                executed_at: executed_seeds.find(s => s.name === name)?.executed_at || null
            };
        });
    }

    /**
     * Reset seeds table (drop and recreate)
     */
    async reset() {
        console.log('[SeedRunner] ⚠️  Resetting seeds table...');
        
        const client = await this.db_pool.connect();
        try {
            // Drop the seeds table
            await client.query('DROP TABLE IF EXISTS public.seeds CASCADE');
            console.log('[SeedRunner] ✓ Dropped existing seeds table');
            
            // Reinitialize it
            await init_seeds_table(this.db_pool);
            console.log('[SeedRunner] ✓ Seeds table reinitialized');
            
            console.log('[SeedRunner] ✅ Reset completed successfully');
        } catch (err) {
            console.error('[SeedRunner] ❌ Reset failed:', err.message);
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Close database connection
     */
    async close() {
        await this.db_pool.end();
    }
}

module.exports = { SeedRunner };

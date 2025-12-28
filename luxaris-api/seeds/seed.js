#!/usr/bin/env node

/**
 * Database Seeding CLI
 * Usage:
 *   npm run seed              - Run all seeds (idempotent)
 *   npm run seed:force:posts  - Force re-run posts seed
 *   npm run seed:force:users  - Force re-run users seed
 *   npm run seed:rollback     - Rollback specific seed
 *   npm run seed:list         - List executed seeds
 *   npm run seed:reset        - Reset seeds table (drop & recreate)
 */

require('dotenv').config();
const { SeedRunner } = require('./seed-runner');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const seed_name = args.find(arg => arg.startsWith('--name='))?.split('=')[1];
const force = args.includes('--force');

// Database configuration from environment
const db_config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'luxaris',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
};

async function main() {

    const runner = new SeedRunner(db_config);
    
    try {
        switch (command) {

            case 'list':
                console.log('📋 Listing executed seeds...\n');
                const seeds = await runner.list();
                
                if (seeds.length === 0) {
                    console.log('No seeds have been executed yet.\n');
                } else {
                    console.table(seeds.map(s => ({
                        Name: s.name,
                        'Executed At': new Date(s.executed_at).toLocaleString(),
                        'Time (ms)': s.execution_time_ms,
                        Created: s.records_created,
                        Updated: s.records_updated,
                        Deleted: s.records_deleted
                    })));
                    console.log('');
                }
                
                // Show available seeds
                console.log('📁 Available seed files:\n');
                const available = await runner.get_available_seeds();
                
                if (available.length === 0) {
                    console.log('No seed files found in seeders/ directory.\n');
                } else {
                    console.table(available.map(s => ({
                        File: s.file,
                        Status: s.executed ? '✅ Executed' : '⏳ Pending',
                        'Last Executed': s.executed_at ? new Date(s.executed_at).toLocaleString() : 'Never'
                    })));
                    
                    // Show example CLI command for last seed
                    const lastSeed = available[available.length - 1];
                    if (lastSeed) {
                        console.log('\n💡 Example: Run the latest seed file:');
                        console.log(`   node seeds/seed.js --name=${lastSeed.name}\n`);
                    }
                }
                break;

            case 'rollback':
                await runner.rollback(seed_name);
                break;

            case 'reset':
                console.log('⚠️  WARNING: This will DROP the seeds table and all execution history!');
                console.log('The table will be recreated empty.\n');
                await runner.reset();
                break;

            default:
                // Run seeds
                const options = { force, seed_name };
                await runner.run(options);
                break;
        }
        
        await runner.close();
        process.exit(0);

    } catch (err) {
        console.error('❌ Seed execution failed:', err.message);
        console.error(err.stack);
        await runner.close();
        process.exit(1);
    }
}

main();

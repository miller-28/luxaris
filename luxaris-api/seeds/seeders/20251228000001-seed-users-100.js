/**
 * Seed: 100 mock users for testing
 * This seed is idempotent - it will only insert users that don't already exist
 */

'use strict';

const argon2 = require('argon2');

const TOTAL_USERS = 100;
const SCHEMA = process.env.DB_SCHEMA || 'luxaris';

// Password hash for "password" - will be generated once
let CACHED_PASSWORD_HASH = null;

// Mock data arrays
const FIRST_NAMES = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'James', 'Emily',
    'Robert', 'Olivia', 'William', 'Sophia', 'Richard', 'Isabella', 'Thomas',
    'Mia', 'Charles', 'Charlotte', 'Daniel', 'Amelia', 'Matthew', 'Harper',
    'Andrew', 'Evelyn', 'Christopher', 'Abigail', 'Joseph', 'Elizabeth', 'Ryan',
    'Sofia', 'Nicholas', 'Avery', 'Alexander', 'Ella', 'Jonathan', 'Scarlett'
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
    'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
    'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams'
];

const TIMEZONES = [
    'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
    'Asia/Shanghai', 'Australia/Sydney'
];

const LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'it'];

// Helper to generate random item from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate random date within last 6 months
const randomDate = () => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
    const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
    return new Date(randomTime).toISOString();
};

/**
 * Hash password using Argon2 (same as AuthService)
 */
async function hash_password(password) {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3,
        parallelism: 4
    });
}

/**
 * Seed execution (UP)
 * @param {object} db_pool - PostgreSQL connection pool
 * @param {boolean} force - Whether to skip idempotency checks
 */
exports.up = async function(db_pool, force = false) {
    
    const client = await db_pool.connect();
    
    try {
        console.log(`[Seed] Starting to seed ${TOTAL_USERS} mock users...`);
        
        // Generate password hash once (reuse for all users)
        console.log('[Seed] Generating password hash for "password"...');
        CACHED_PASSWORD_HASH = await hash_password('SunLight2800!');
        console.log('[Seed] Password hash generated');
        
        // Track ID range for precise rollback
        let first_inserted_id = null;
        let last_inserted_id = null;
        
        // Check existing users with email pattern to determine starting index (skip if forced)
        let existingCount = 0;
        if (!force) {
            const existingResult = await client.query(`
                SELECT COUNT(*) as count
                FROM ${SCHEMA}.users
                WHERE email LIKE '%@luxaris-test.com'
                AND is_deleted = false
            `);
            
            existingCount = parseInt(existingResult.rows[0].count);
            
            if (existingCount >= TOTAL_USERS) {
                console.log(`[Seed] All ${TOTAL_USERS} users already exist. Skipping...`);
                return {
                    records_created: 0,
                    records_updated: 0,
                    metadata: { total_users: TOTAL_USERS, existing: existingCount }
                };
            }
        } else {
            console.log(`[Seed] Force mode enabled - creating ${TOTAL_USERS} additional users...`);
        }
        
        const usersToCreate = TOTAL_USERS - existingCount;
        console.log(`[Seed] Found ${existingCount} existing users, creating ${usersToCreate} more...`);
        
        let totalCreated = 0;
        
        // Determine user distribution:
        // - 10% admin (is_root = true) → automatically active
        // - 30% pending approval (status = 'pending_approval')
        // - 60% approved (status = 'active')
        const adminCount = Math.floor(usersToCreate * 0.10);
        const pendingCount = Math.floor(usersToCreate * 0.30);
        const approvedCount = usersToCreate - adminCount - pendingCount;
        
        console.log(`[Seed] Distribution: ${adminCount} admins, ${pendingCount} pending approval, ${approvedCount} approved`);
        
        // Get an existing user to use as approver (for approved users)
        let approver_id = null;
        const approverResult = await client.query(`
            SELECT id FROM ${SCHEMA}.users 
            WHERE is_root = true 
            LIMIT 1
        `);
        
        if (approverResult.rows.length > 0) {
            approver_id = approverResult.rows[0].id;
            console.log(`[Seed] Using user_id ${approver_id} as approver for approved users`);
        }
        
        const users = [];
        
        for (let i = 0; i < usersToCreate; i++) {

            const index = existingCount + i + 1;
            const firstName = randomItem(FIRST_NAMES);
            const lastName = randomItem(LAST_NAMES);
            const createdAt = randomDate();
            
            // Determine user type based on distribution
            let is_root = false;
            let status = 'active';
            let approved_by_user_id = null;
            let approved_at = null;
            
            if (i < adminCount) {
                // Admin users
                is_root = true;
                status = 'active'; // Admins are always active
                approved_by_user_id = null;
                approved_at = null;
            } else if (i < adminCount + pendingCount) {
                // Pending approval users
                is_root = false;
                status = 'pending_approval';
                approved_by_user_id = null;
                approved_at = null;
            } else {
                // Approved users
                is_root = false;
                status = 'active';
                approved_by_user_id = approver_id;
                approved_at = createdAt;
            }
            
            users.push({
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index}@luxaris-test.com`,
                password_hash: CACHED_PASSWORD_HASH,
                name: `${firstName} ${lastName}`,
                avatar_url: null,
                auth_method: 'password',
                status: status,
                is_root: is_root,
                approved_by_user_id: approved_by_user_id,
                approved_at: approved_at,
                timezone: randomItem(TIMEZONES),
                locale: randomItem(LOCALES),
                created_at: createdAt,
                updated_at: createdAt
            });
        }
        
        // Build VALUES clause with proper parameterization
        const valuesClauses = [];
        const params = [];
        let paramIndex = 1;
        
        for (const user of users) {
            valuesClauses.push(
                `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, ` +
                `$${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, ` +
                `$${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, ` +
                `$${paramIndex + 12})`
            );
            params.push(
                user.email,
                user.password_hash,
                user.name,
                user.avatar_url,
                user.auth_method,
                user.status,
                user.is_root,
                user.approved_by_user_id,
                user.approved_at,
                user.timezone,
                user.locale,
                user.created_at,
                user.updated_at
            );
            paramIndex += 13;
        }
        
        // Insert all users and capture IDs
        const insertResult = await client.query(`
            INSERT INTO ${SCHEMA}.users 
                (email, password_hash, name, avatar_url, auth_method, status, is_root, 
                 approved_by_user_id, approved_at, timezone, locale, created_at, updated_at)
            VALUES ${valuesClauses.join(', ')}
            RETURNING id
        `, params);
        
        // Track ID range
        const user_ids = insertResult.rows.map(row => row.id);
        first_inserted_id = Math.min(...user_ids);
        last_inserted_id = Math.max(...user_ids);
        
        totalCreated = users.length;
        
        console.log(`[Seed] Successfully created ${totalCreated} users!`);
        console.log(`[Seed] ID range: ${first_inserted_id} to ${last_inserted_id}`);
        console.log('[Seed] All users have password: "password"');
        
        return {
            records_created: totalCreated,
            records_updated: 0,
            metadata: { 
                total_users: TOTAL_USERS,
                existing: existingCount,
                created: totalCreated,
                admin_count: adminCount,
                pending_count: pendingCount,
                approved_count: approvedCount
            },
            execution_metadata: {
                affected_db_table: 'users',
                new_records_id_from: first_inserted_id,
                new_records_id_to: last_inserted_id
            }
        };
        
    } finally {
        client.release();
    }
};

/**
 * Seed rollback (DOWN)
 * @param {Pool} db_pool - Database connection pool
 * @param {Array} execution_records - Array of execution records with metadata
 */
exports.down = async function(db_pool, execution_records = []) {

    const client = await db_pool.connect();
    
    try {
        console.log('[Seed] Removing mock users...');
        
        let result;
        
        // If we have execution metadata with ID ranges, use precise deletion
        if (execution_records.length > 0 && execution_records[0].execution_metadata?.new_records_id_from) {
            console.log('[Seed] Using execution metadata for precise rollback...');
            
            // Delete using all ID ranges from execution records
            const id_ranges = execution_records
                .map(record => record.execution_metadata)
                .filter(meta => meta?.new_records_id_from && meta?.new_records_id_to);
            
            if (id_ranges.length > 0) {
                // Build WHERE clause for ID ranges
                const conditions = id_ranges.map((_, idx) => 
                    `(id BETWEEN $${idx * 2 + 1} AND $${idx * 2 + 2})`).join(' OR ');
                
                const params = id_ranges.flatMap(range => [
                    range.new_records_id_from, 
                    range.new_records_id_to
                ]);
                
                // Hard delete (physical removal)
                result = await client.query(`
                    DELETE FROM ${SCHEMA}.users
                    WHERE ${conditions}
                    RETURNING id
                `, params);
                
                console.log(`[Seed] Deleted users by ID ranges: ${id_ranges.map(r => `${r.new_records_id_from}-${r.new_records_id_to}`).join(', ')}`);
            }
        } else {
            // Fallback: use email pattern (less precise, for older seeds)
            console.log('[Seed] No execution metadata found, using email pattern fallback...');
            result = await client.query(`
                DELETE FROM ${SCHEMA}.users
                WHERE email LIKE '%@luxaris-test.com'
                RETURNING id
            `);
        }
        
        console.log(`[Seed] Successfully deleted ${result.rowCount} mock users!`);
        
        return {
            records_deleted: result.rowCount,
            metadata: { batch: 'mock_100_users' }
        };
    } finally {
        client.release();
    }
};

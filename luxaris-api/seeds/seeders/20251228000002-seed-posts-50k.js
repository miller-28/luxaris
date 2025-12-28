/**
 * Seed: 50,000 mock posts for testing
 * This seed is idempotent - it will only insert posts that don't already exist
 */

'use strict';

const BATCH_SIZE = 1000; // Insert in batches for better performance
const TOTAL_POSTS = 50000;
const SCHEMA = process.env.DB_SCHEMA || 'luxaris';

// Mock data arrays
const TITLES = [
    'Amazing Product Launch', 'New Feature Announcement', 'Behind the Scenes', 
    'Customer Success Story', 'Industry Insights', 'Team Update',
    'Event Highlights', 'Product Tutorial', 'Company Milestone', 
    'Seasonal Campaign', 'Special Offer', 'Blog Post Promotion',
    'Webinar Announcement', 'Partnership News', 'Market Trends'
];

const DESCRIPTIONS = [
    'Check out our latest updates and improvements',
    'Exciting news coming your way!',
    'We are thrilled to share this with you',
    'Here is what we have been working on',
    'Join us in celebrating this achievement',
    'Discover how we can help you succeed',
    'Learn more about our innovative solutions',
    'Get inspired by this success story',
    'Stay ahead with these industry insights',
    'Don\'t miss out on this opportunity'
];

const TAGS_POOL = [
    'marketing', 'sales', 'product', 'technology', 'business',
    'innovation', 'startup', 'growth', 'strategy', 'social',
    'digital', 'content', 'branding', 'analytics', 'engagement'
];

const STATUSES = ['draft', 'published'];

// Helper to generate random item from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate random tags (1-5 tags)
const randomTags = () => {
    const count = Math.floor(Math.random() * 5) + 1;
    const tags = [];
    for (let i = 0; i < count; i++) {
        const tag = randomItem(TAGS_POOL);
        if (!tags.includes(tag)) {
            tags.push(tag);
        }
    }
    return tags;
};

// Helper to generate random date within last 6 months
const randomDate = () => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
    const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
    return new Date(randomTime).toISOString();
};

/**
 * Seed execution (UP)
 * @param {object} db_pool - PostgreSQL connection pool
 * @param {boolean} force - Whether to skip idempotency checks
 */
exports.up = async function(db_pool, force = false) {
    
    const client = await db_pool.connect();
    
    try {
        console.log(`[Seed] Starting to seed ${TOTAL_POSTS} mock posts...`);
        
        // Get the first user ID to use as the post owner
        const userResult = await client.query(`
            SELECT id FROM ${SCHEMA}.users 
            WHERE email = 'jonathan@miller28.com' 
            LIMIT 1
        `);
        
        if (userResult.rows.length === 0) {
            throw new Error('No user found with email jonathan@miller28.com. Please ensure users exist before running this seed.');
        }
        
        const userId = userResult.rows[0].id;
        console.log(`[Seed] Using user_id: ${userId}`);
        
        // Track ID range for precise rollback
        let first_inserted_id = null;
        let last_inserted_id = null;
        
        // Check existing posts with seed marker to determine starting index (skip if forced)
        let existingCount = 0;
        if (!force) {
            const existingResult = await client.query(`
                SELECT COUNT(*) as count
                FROM ${SCHEMA}.posts
                WHERE metadata::jsonb @> '{"source": "seed", "batch": "mock_50k"}'::jsonb
            `);
            
            existingCount = parseInt(existingResult.rows[0].count);
            
            if (existingCount >= TOTAL_POSTS) {
                console.log(`[Seed] All ${TOTAL_POSTS} posts already exist. Skipping...`);
                return {
                    records_created: 0,
                    records_updated: 0,
                    metadata: { total_posts: TOTAL_POSTS, existing: existingCount }
                };
            }
        } else {
            console.log(`[Seed] Force mode enabled - creating ${TOTAL_POSTS} additional posts...`);
        }
        
        const postsToCreate = TOTAL_POSTS - existingCount;
        console.log(`[Seed] Found ${existingCount} existing posts, creating ${postsToCreate} more...`);
        
        let totalCreated = 0;
        const batches = Math.ceil(postsToCreate / BATCH_SIZE);
        
        for (let batch = 0; batch < batches; batch++) {
            const postsInThisBatch = Math.min(BATCH_SIZE, postsToCreate - (batch * BATCH_SIZE));
            const posts = [];
            
            for (let i = 0; i < postsInThisBatch; i++) {
                const index = existingCount + (batch * BATCH_SIZE) + i + 1;
                const createdAt = randomDate();
                const status = randomItem(STATUSES);
                const publishedAt = status === 'published' ? createdAt : null;
                
                posts.push({
                    owner_principal_id: userId,
                    title: `${randomItem(TITLES)} #${index}`,
                    description: `${randomItem(DESCRIPTIONS)} - Post ${index}`,
                    tags: JSON.stringify(randomTags()),
                    status: status,
                    metadata: JSON.stringify({ 
                        source: 'seed', 
                        batch: 'mock_50k',
                        index: index
                    }),
                    created_at: createdAt,
                    updated_at: createdAt,
                    published_at: publishedAt,
                    created_by_user_id: userId,
                    updated_by_user_id: userId
                });
            }
            
            // Build VALUES clause with proper parameterization
            const valuesClauses = [];
            const params = [];
            let paramIndex = 1;
            
            for (const post of posts) {
                valuesClauses.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`);
                params.push(
                    post.owner_principal_id,
                    post.title,
                    post.description,
                    post.tags,
                    post.status,
                    post.metadata,
                    post.created_at,
                    post.updated_at,
                    post.published_at,
                    post.created_by_user_id
                );
                paramIndex += 10;
            }
            
            // Insert batch and capture IDs
            const insertResult = await client.query(`
                INSERT INTO ${SCHEMA}.posts 
                    (owner_principal_id, title, description, tags, status, metadata, created_at, updated_at, published_at, created_by_user_id)
                VALUES ${valuesClauses.join(', ')}
                RETURNING id
            `, params);
            
            // Track ID range
            const batch_ids = insertResult.rows.map(row => row.id);
            if (first_inserted_id === null) {
                first_inserted_id = Math.min(...batch_ids);
            }
            last_inserted_id = Math.max(...batch_ids, last_inserted_id || 0);
            
            totalCreated += posts.length;
            console.log(`[Seed] Inserted batch ${batch + 1}/${batches} (${posts.length} posts) - Total: ${totalCreated}/${postsToCreate}`);
        }
        
        console.log(`[Seed] Successfully created ${totalCreated} posts!`);
        console.log(`[Seed] ID range: ${first_inserted_id} to ${last_inserted_id}`);
        
        return {
            records_created: totalCreated,
            records_updated: 0,
            metadata: { 
                total_posts: TOTAL_POSTS,
                existing: existingCount,
                created: totalCreated
            },
            execution_metadata: {
                affected_db_table: 'posts',
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
        console.log(`[Seed] Removing mock posts...`);
        
        let result;
        
        // If we have execution metadata with ID ranges, use precise deletion
        if (execution_records.length > 0 && execution_records[0].execution_metadata?.new_records_id_from) {
            console.log(`[Seed] Using execution metadata for precise rollback...`);
            
            // Delete using all ID ranges from execution records
            const id_ranges = execution_records
                .map(record => record.execution_metadata)
                .filter(meta => meta?.new_records_id_from && meta?.new_records_id_to);
            
            if (id_ranges.length > 0) {
                // Build WHERE clause for ID ranges
                const conditions = id_ranges.map((_, idx) => 
                    `(id BETWEEN $${idx * 2 + 1} AND $${idx * 2 + 2})`
                ).join(' OR ');
                
                const params = id_ranges.flatMap(range => [
                    range.new_records_id_from, 
                    range.new_records_id_to
                ]);
                
                result = await client.query(`
                    DELETE FROM ${SCHEMA}.posts
                    WHERE ${conditions}
                    RETURNING id
                `, params);
                
                console.log(`[Seed] Deleted posts by ID ranges: ${id_ranges.map(r => `${r.new_records_id_from}-${r.new_records_id_to}`).join(', ')}`);
            }
        } else {
            // Fallback: use metadata marker (less precise, for older seeds)
            console.log(`[Seed] No execution metadata found, using metadata marker fallback...`);
            result = await client.query(`
                DELETE FROM ${SCHEMA}.posts
                WHERE metadata::jsonb @> '{"source": "seed", "batch": "mock_50k"}'::jsonb
                RETURNING id
            `);
        }
        
        console.log(`[Seed] Successfully removed ${result.rowCount} mock posts!`);
        
        return {
            records_deleted: result.rowCount,
            metadata: { batch: 'mock_50k' }
        };
    } finally {
        client.release();
    }
};

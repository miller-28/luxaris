exports.up = async function(db) {
	
    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Insert Google OAuth provider
    await db.runSql(`
        INSERT INTO ${schema}.oauth_providers (key, name, status, config)
        VALUES (
            'google',
            'Google',
            'active',
            '{}'::jsonb
        )
        ON CONFLICT (key) DO NOTHING;
    `);
};

exports.down = async function(db) {
	
    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Remove Google OAuth provider (and cascade to oauth_accounts)
    await db.runSql(`
        DELETE FROM ${schema}.oauth_providers WHERE key = 'google';
    `);
};

exports._meta = {
    version: 1
};

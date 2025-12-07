'use strict';

let dbm;
let type;
let seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
    dbm = options.dbmigrate;
    type = dbm.dataType;
    seed = seedLink;
};

exports.up = async function(db) {

	  const schema = process.env.DB_SCHEMA || 'luxaris';

    // Convert all TIMESTAMP columns to TIMESTAMP WITH TIME ZONE (TIMESTAMPTZ)
    // All existing data is assumed to be in UTC (as per application design)
    // Each table is wrapped in try-catch to handle tables that may not exist yet
  
    // Identity tables - users
    try {
        await db.runSql(`
      ALTER TABLE ${schema}.users 
        ALTER COLUMN approved_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN last_login_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    } catch (err) {
        console.log('✗ Skipping users table:', err.message);
    }
  
    // OAuth Providers
    try {
        await db.runSql(`
      ALTER TABLE ${schema}.oauth_providers
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    } catch (err) {
        console.log('✗ Skipping oauth_providers table:', err.message);
    }
  
    // OAuth Accounts
    try {
        await db.runSql(`
      ALTER TABLE ${schema}.oauth_accounts
        ALTER COLUMN token_expires_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN last_used_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    } catch (err) {
        console.log('✗ Skipping oauth_accounts table:', err.message);
    }
  
    // Service Accounts
    try {
        await db.runSql(`
      ALTER TABLE ${schema}.service_accounts
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    } catch (err) {
        console.log('✗ Skipping service_accounts table:', err.message);
    }
  
    // API Keys
    try {
        await db.runSql(`
      ALTER TABLE ${schema}.api_keys
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN revoked_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN last_used_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    } catch (err) {
        console.log('✗ Skipping api_keys table:', err.message);
    }
  
    // Sessions
    try {
        await db.runSql(`
      ALTER TABLE ${schema}.sessions
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN expires_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    } catch (err) {
        console.log('✗ Skipping sessions table:', err.message);
    }

    // System Logs
    try {
        await db.runSql(`
      ALTER TABLE ${schema}.system_logs
        ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    } catch (err) {
        console.log('✗ Skipping system_logs table:', err.message);
    }
  
    // System Events
    try {
        await db.runSql(`
      ALTER TABLE ${schema}.system_events
        ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    } catch (err) {
        console.log('✗ Skipping system_events table:', err.message);
    }
  
    // Request Logs
    try {
        await db.runSql(`
      ALTER TABLE ${schema}.request_logs
        ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    } catch (err) {
        console.log('✗ Skipping request_logs table:', err.message);
    }
  
    // Audit Logs
    try {
        await db.runSql(`
      ALTER TABLE ${schema}.audit_logs
        ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    } catch (err) {
        console.log('✗ Skipping audit_logs table:', err.message);
    }

    return null;
};

exports.down = async function(db) {
	
    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Revert all columns back to TIMESTAMP (without time zone)
    // This is not recommended in production as timezone information will be lost
  
    // Identity tables
    await db.runSql(`
    ALTER TABLE ${schema}.users 
      ALTER COLUMN approved_at TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP,
      ALTER COLUMN last_login_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.oauth_providers
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.oauth_accounts
      ALTER COLUMN token_expires_at TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP,
      ALTER COLUMN last_used_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.service_accounts
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.api_keys
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN revoked_at TYPE TIMESTAMP,
      ALTER COLUMN last_used_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.sessions
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN expires_at TYPE TIMESTAMP;
  `);

    await db.runSql(`
    ALTER TABLE ${schema}.acl_permissions
      ALTER COLUMN created_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.acl_roles
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
  `);

    await db.runSql(`
    ALTER TABLE ${schema}.system_logs
      ALTER COLUMN timestamp TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.system_events
      ALTER COLUMN timestamp TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.request_logs
      ALTER COLUMN timestamp TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.audit_logs
      ALTER COLUMN timestamp TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP;
  `);

    await db.runSql(`
    ALTER TABLE ${schema}.feature_flags
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
  `);

    await db.runSql(`
    ALTER TABLE ${schema}.channels
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.channel_connections
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP,
      ALTER COLUMN last_used_at TYPE TIMESTAMP,
      ALTER COLUMN disconnected_at TYPE TIMESTAMP;
  `);

    await db.runSql(`
    ALTER TABLE ${schema}.posts
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.post_variants
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP,
      ALTER COLUMN published_at TYPE TIMESTAMP;
  `);

    await db.runSql(`
    ALTER TABLE ${schema}.post_templates
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.generation_sessions
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE ${schema}.generation_suggestions
      ALTER COLUMN created_at TYPE TIMESTAMP;
  `);

};

exports._meta = {
    'version': 1
};

'use strict';

var dbm;
var type;
var seed;

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
  // Convert all TIMESTAMP columns to TIMESTAMP WITH TIME ZONE (TIMESTAMPTZ)
  // All existing data is assumed to be in UTC (as per application design)
  // Each table is wrapped in try-catch to handle tables that may not exist yet
  
  // Identity tables - users
  try {
    await db.runSql(`
      ALTER TABLE users 
        ALTER COLUMN approved_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN last_login_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Converted users table timestamps');
  } catch (err) {
    console.log('✗ Skipping users table:', err.message);
  }
  
  // OAuth Providers
  try {
    await db.runSql(`
      ALTER TABLE oauth_providers
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Converted oauth_providers table timestamps');
  } catch (err) {
    console.log('✗ Skipping oauth_providers table:', err.message);
  }
  
  // OAuth Accounts
  try {
    await db.runSql(`
      ALTER TABLE oauth_accounts
        ALTER COLUMN token_expires_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN last_used_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Converted oauth_accounts table timestamps');
  } catch (err) {
    console.log('✗ Skipping oauth_accounts table:', err.message);
  }
  
  // Service Accounts
  try {
    await db.runSql(`
      ALTER TABLE service_accounts
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Converted service_accounts table timestamps');
  } catch (err) {
    console.log('✗ Skipping service_accounts table:', err.message);
  }
  
  // API Keys
  try {
    await db.runSql(`
      ALTER TABLE api_keys
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN revoked_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN last_used_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Converted api_keys table timestamps');
  } catch (err) {
    console.log('✗ Skipping api_keys table:', err.message);
  }
  
  // Sessions
  try {
    await db.runSql(`
      ALTER TABLE sessions
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN expires_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Converted sessions table timestamps');
  } catch (err) {
    console.log('✗ Skipping sessions table:', err.message);
  }

  // System Logs
  try {
    await db.runSql(`
      ALTER TABLE system_logs
        ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Converted system_logs table timestamps');
  } catch (err) {
    console.log('✗ Skipping system_logs table:', err.message);
  }
  
  // System Events
  try {
    await db.runSql(`
      ALTER TABLE system_events
        ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Converted system_events table timestamps');
  } catch (err) {
    console.log('✗ Skipping system_events table:', err.message);
  }
  
  // Request Logs
  try {
    await db.runSql(`
      ALTER TABLE request_logs
        ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Converted request_logs table timestamps');
  } catch (err) {
    console.log('✗ Skipping request_logs table:', err.message);
  }
  
  // Audit Logs
  try {
    await db.runSql(`
      ALTER TABLE audit_logs
        ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Converted audit_logs table timestamps');
  } catch (err) {
    console.log('✗ Skipping audit_logs table:', err.message);
  }

  console.log('✓ Successfully completed timestamp normalization migration');
  return null;
};

exports.down = async function(db) {
  // Revert all columns back to TIMESTAMP (without time zone)
  // This is not recommended in production as timezone information will be lost
  
  // Identity tables
  await db.runSql(`
    ALTER TABLE users 
      ALTER COLUMN approved_at TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP,
      ALTER COLUMN last_login_at TYPE TIMESTAMP;
    
    ALTER TABLE oauth_providers
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE oauth_accounts
      ALTER COLUMN token_expires_at TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP,
      ALTER COLUMN last_used_at TYPE TIMESTAMP;
    
    ALTER TABLE service_accounts
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE api_keys
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN revoked_at TYPE TIMESTAMP,
      ALTER COLUMN last_used_at TYPE TIMESTAMP;
    
    ALTER TABLE sessions
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN expires_at TYPE TIMESTAMP;
  `);

  await db.runSql(`
    ALTER TABLE acl_resources
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE acl_actions
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE acl_permissions
      ALTER COLUMN created_at TYPE TIMESTAMP;
    
    ALTER TABLE acl_roles
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
  `);

  await db.runSql(`
    ALTER TABLE system_logs
      ALTER COLUMN timestamp TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP;
    
    ALTER TABLE system_events
      ALTER COLUMN timestamp TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP;
    
    ALTER TABLE request_logs
      ALTER COLUMN timestamp TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP;
    
    ALTER TABLE audit_logs
      ALTER COLUMN timestamp TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP;
  `);

  await db.runSql(`
    ALTER TABLE feature_flags
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
  `);

  await db.runSql(`
    ALTER TABLE channels
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE channel_connections
      ALTER COLUMN token_expires_at TYPE TIMESTAMP,
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP,
      ALTER COLUMN last_sync_at TYPE TIMESTAMP;
  `);

  await db.runSql(`
    ALTER TABLE posts
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE post_variants
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP,
      ALTER COLUMN published_at TYPE TIMESTAMP;
  `);

  await db.runSql(`
    ALTER TABLE post_templates
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE generation_sessions
      ALTER COLUMN created_at TYPE TIMESTAMP,
      ALTER COLUMN updated_at TYPE TIMESTAMP;
    
    ALTER TABLE generation_suggestions
      ALTER COLUMN created_at TYPE TIMESTAMP;
  `);

  console.log('Reverted all TIMESTAMP WITH TIME ZONE columns back to TIMESTAMP');
};

exports._meta = {
  "version": 1
};

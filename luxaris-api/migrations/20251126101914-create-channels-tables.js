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
  // Create channels table - platform catalog
  await db.createTable('channels', {
    id: { 
      type: 'uuid', 
      primaryKey: true, 
      defaultValue: new String('gen_random_uuid()') 
    },
    key: { 
      type: 'string', 
      length: 50, 
      notNull: true, 
      unique: true 
    },
    name: { 
      type: 'string', 
      length: 100, 
      notNull: true 
    },
    status: { 
      type: 'string', 
      length: 20, 
      notNull: true, 
      defaultValue: 'active' 
    },
    limits: { 
      type: 'jsonb', 
      notNull: true, 
      defaultValue: '{}' 
    },
    created_at: { 
      type: 'timestamp', 
      notNull: true, 
      defaultValue: new String('CURRENT_TIMESTAMP') 
    },
    updated_at: { 
      type: 'timestamp', 
      notNull: true, 
      defaultValue: new String('CURRENT_TIMESTAMP') 
    }
  });

  // Create index on key for fast lookups
  await db.addIndex('channels', 'idx_channels_key', ['key'], true);

  // Create channel_connections table - user-specific OAuth connections
  await db.createTable('channel_connections', {
    id: { 
      type: 'uuid', 
      primaryKey: true, 
      defaultValue: new String('gen_random_uuid()') 
    },
    owner_principal_id: { 
      type: 'uuid', 
      notNull: true 
    },
    channel_id: { 
      type: 'uuid', 
      notNull: true,
      foreignKey: {
        name: 'channel_connections_channel_id_fk',
        table: 'channels',
        rules: {
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE'
        },
        mapping: 'id'
      }
    },
    display_name: { 
      type: 'string', 
      length: 200, 
      notNull: true 
    },
    status: { 
      type: 'string', 
      length: 20, 
      notNull: true, 
      defaultValue: 'connected' 
    },
    auth_state: { 
      type: 'jsonb', 
      notNull: true, 
      defaultValue: '{}' 
    },
    created_at: { 
      type: 'timestamp', 
      notNull: true, 
      defaultValue: new String('CURRENT_TIMESTAMP') 
    },
    updated_at: { 
      type: 'timestamp', 
      notNull: true, 
      defaultValue: new String('CURRENT_TIMESTAMP') 
    },
    last_used_at: { 
      type: 'timestamp', 
      notNull: false 
    },
    disconnected_at: { 
      type: 'timestamp', 
      notNull: false 
    }
  });

  // Create indexes for common queries
  await db.addIndex('channel_connections', 'idx_channel_connections_owner', ['owner_principal_id']);
  await db.addIndex('channel_connections', 'idx_channel_connections_channel', ['channel_id']);
  await db.addIndex('channel_connections', 'idx_channel_connections_status', ['status']);
  await db.addIndex('channel_connections', 'idx_channel_connections_owner_status', ['owner_principal_id', 'status']);

  // Insert initial channel catalog data
  const xChannelId = '7fc9150d-32f3-48ed-a600-036610ef5642'; // Use same UUID as Owner role for consistency
  const linkedinChannelId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  await db.insert('channels', ['id', 'key', 'name', 'status', 'limits'], [
    xChannelId,
    'x',
    'X (Twitter)',
    'active',
    JSON.stringify({
      max_text_length: 280,
      supports_images: true,
      supports_links: true,
      max_images: 4
    })
  ]);

  await db.insert('channels', ['id', 'key', 'name', 'status', 'limits'], [
    linkedinChannelId,
    'linkedin',
    'LinkedIn',
    'active',
    JSON.stringify({
      max_text_length: 3000,
      supports_images: true,
      supports_links: true,
      max_images: 9
    })
  ]);
};

exports.down = async function(db) {
  // Drop tables in reverse order
  await db.dropTable('channel_connections');
  await db.dropTable('channels');
};

exports._meta = {
  "version": 1
};

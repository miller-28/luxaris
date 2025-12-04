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
  // Create posts table - platform-agnostic content
  await db.createTable('posts', {
    id: { 
      type: 'uuid', 
      primaryKey: true, 
      defaultValue: new String('gen_random_uuid()') 
    },
    owner_principal_id: { 
      type: 'uuid', 
      notNull: true 
    },
    title: { 
      type: 'string', 
      length: 200, 
      notNull: false 
    },
    base_content: { 
      type: 'text', 
      notNull: true 
    },
    tags: { 
      type: 'jsonb', 
      notNull: true, 
      defaultValue: '[]' 
    },
    status: { 
      type: 'string', 
      length: 20, 
      notNull: true, 
      defaultValue: 'draft' 
    },
    metadata: { 
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
    published_at: { 
      type: 'timestamp', 
      notNull: false 
    }
  });

  // Create indexes for posts
  await db.addIndex('posts', 'idx_posts_owner', ['owner_principal_id']);
  await db.addIndex('posts', 'idx_posts_status', ['status']);
  await db.addIndex('posts', 'idx_posts_created_at', ['created_at']);

  // Create post_variants table - channel-specific content
  await db.createTable('post_variants', {
    id: { 
      type: 'uuid', 
      primaryKey: true, 
      defaultValue: new String('gen_random_uuid()') 
    },
    post_id: { 
      type: 'uuid', 
      notNull: true,
      foreignKey: {
        name: 'post_variants_post_id_fk',
        table: 'posts',
        rules: {
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        mapping: 'id'
      }
    },
    channel_id: { 
      type: 'uuid', 
      notNull: true,
      foreignKey: {
        name: 'post_variants_channel_id_fk',
        table: 'channels',
        rules: {
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE'
        },
        mapping: 'id'
      }
    },
    channel_connection_id: { 
      type: 'uuid', 
      notNull: false,
      foreignKey: {
        name: 'post_variants_connection_id_fk',
        table: 'channel_connections',
        rules: {
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        mapping: 'id'
      }
    },
    content: { 
      type: 'text', 
      notNull: true 
    },
    media: { 
      type: 'jsonb', 
      notNull: true, 
      defaultValue: '{}' 
    },
    tone: { 
      type: 'string', 
      length: 50, 
      notNull: false 
    },
    source: { 
      type: 'string', 
      length: 20, 
      notNull: true, 
      defaultValue: 'manual' 
    },
    status: { 
      type: 'string', 
      length: 20, 
      notNull: true, 
      defaultValue: 'draft' 
    },
    metadata: { 
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
    published_at: { 
      type: 'timestamp', 
      notNull: false 
    }
  });

  // Create indexes for post_variants
  await db.addIndex('post_variants', 'idx_post_variants_post_id', ['post_id']);
  await db.addIndex('post_variants', 'idx_post_variants_channel_id', ['channel_id']);
  await db.addIndex('post_variants', 'idx_post_variants_connection_id', ['channel_connection_id']);
  await db.addIndex('post_variants', 'idx_post_variants_status', ['status']);

  return null;
};

exports.down = async function(db) {
  // Drop post_variants first (due to foreign key dependency)
  await db.dropTable('post_variants');
  
  // Drop posts table
  await db.dropTable('posts');

  return null;
};

exports._meta = {
  "version": 1
};

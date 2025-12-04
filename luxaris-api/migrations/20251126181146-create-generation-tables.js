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
    // Create post_templates table - reusable content patterns
    await db.createTable('post_templates', {
        id: { 
            type: 'uuid', 
            primaryKey: true, 
            defaultValue: new String('gen_random_uuid()') 
        },
        owner_principal_id: { 
            type: 'uuid', 
            notNull: true 
        },
        name: { 
            type: 'string', 
            length: 100, 
            notNull: true 
        },
        description: { 
            type: 'text', 
            notNull: false 
        },
        template_body: { 
            type: 'text', 
            notNull: true 
        },
        default_channel_id: { 
            type: 'uuid', 
            notNull: false 
        },
        constraints: { 
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

    // Add foreign key constraint for default_channel_id
    await db.addForeignKey('post_templates', 'channels', 'fk_post_templates_default_channel',
        { 'default_channel_id': 'id' },
        { onDelete: 'SET NULL', onUpdate: 'CASCADE' });

    // Add indexes for post_templates
    await db.addIndex('post_templates', 'idx_post_templates_owner', ['owner_principal_id']);
    await db.addIndex('post_templates', 'idx_post_templates_created_at', ['created_at']);

    // Create generation_sessions table - AI generation attempts
    await db.createTable('generation_sessions', {
        id: { 
            type: 'uuid', 
            primaryKey: true, 
            defaultValue: new String('gen_random_uuid()') 
        },
        owner_principal_id: { 
            type: 'uuid', 
            notNull: true 
        },
        post_id: { 
            type: 'uuid', 
            notNull: false 
        },
        template_id: { 
            type: 'uuid', 
            notNull: false 
        },
        prompt: { 
            type: 'text', 
            notNull: true 
        },
        status: { 
            type: 'string', 
            length: 20, 
            notNull: true, 
            defaultValue: 'in_progress' 
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

    // Add foreign key constraints for generation_sessions
    await db.addForeignKey('generation_sessions', 'posts', 'fk_generation_sessions_post',
        { 'post_id': 'id' },
        { onDelete: 'SET NULL', onUpdate: 'CASCADE' });

    await db.addForeignKey('generation_sessions', 'post_templates', 'fk_generation_sessions_template',
        { 'template_id': 'id' },
        { onDelete: 'SET NULL', onUpdate: 'CASCADE' });

    // Add indexes for generation_sessions
    await db.addIndex('generation_sessions', 'idx_generation_sessions_owner', ['owner_principal_id']);
    await db.addIndex('generation_sessions', 'idx_generation_sessions_status', ['status']);
    await db.addIndex('generation_sessions', 'idx_generation_sessions_created_at', ['created_at']);

    // Create generation_suggestions table - AI-generated candidates
    await db.createTable('generation_suggestions', {
        id: { 
            type: 'uuid', 
            primaryKey: true, 
            defaultValue: new String('gen_random_uuid()') 
        },
        generation_session_id: { 
            type: 'uuid', 
            notNull: true 
        },
        channel_id: { 
            type: 'uuid', 
            notNull: true 
        },
        content: { 
            type: 'text', 
            notNull: true 
        },
        score: { 
            type: 'decimal', 
            precision: 5, 
            scale: 2, 
            notNull: false 
        },
        accepted: { 
            type: 'boolean', 
            notNull: true, 
            defaultValue: false 
        },
        created_at: { 
            type: 'timestamp', 
            notNull: true, 
            defaultValue: new String('CURRENT_TIMESTAMP') 
        }
    });

    // Add foreign key constraints for generation_suggestions
    await db.addForeignKey('generation_suggestions', 'generation_sessions', 'fk_generation_suggestions_session',
        { 'generation_session_id': 'id' },
        { onDelete: 'CASCADE', onUpdate: 'CASCADE' });

    await db.addForeignKey('generation_suggestions', 'channels', 'fk_generation_suggestions_channel',
        { 'channel_id': 'id' },
        { onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

    // Add indexes for generation_suggestions
    await db.addIndex('generation_suggestions', 'idx_generation_suggestions_session', ['generation_session_id']);
    await db.addIndex('generation_suggestions', 'idx_generation_suggestions_accepted', ['accepted']);
    await db.addIndex('generation_suggestions', 'idx_generation_suggestions_created_at', ['created_at']);
};

exports.down = async function(db) {
    // Drop tables in reverse order (respect foreign keys)
    await db.dropTable('generation_suggestions');
    await db.dropTable('generation_sessions');
    await db.dropTable('post_templates');
};

exports._meta = {
    'version': 1
};

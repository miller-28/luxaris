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
    // Create schedules table - instructions to publish variants at specific times
    await db.createTable('schedules', {
        id: { 
            type: 'uuid', 
            primaryKey: true, 
            defaultValue: new String('gen_random_uuid()') 
        },
        post_variant_id: { 
            type: 'uuid', 
            notNull: true 
        },
        channel_connection_id: { 
            type: 'uuid', 
            notNull: true 
        },
        run_at: { 
            type: 'timestamp with time zone', 
            notNull: true 
        },
        timezone: { 
            type: 'string', 
            length: 50, 
            notNull: true 
        },
        status: { 
            type: 'string', 
            length: 20, 
            notNull: true, 
            defaultValue: 'pending' 
        },
        attempt_count: { 
            type: 'int', 
            notNull: true, 
            defaultValue: 0 
        },
        last_attempt_at: { 
            type: 'timestamp with time zone', 
            notNull: false 
        },
        error_code: { 
            type: 'string', 
            length: 50, 
            notNull: false 
        },
        error_message: { 
            type: 'text', 
            notNull: false 
        },
        created_at: { 
            type: 'timestamp with time zone', 
            notNull: true, 
            defaultValue: new String('CURRENT_TIMESTAMP') 
        },
        updated_at: { 
            type: 'timestamp with time zone', 
            notNull: true, 
            defaultValue: new String('CURRENT_TIMESTAMP') 
        }
    });

    // Add foreign key constraints
    await db.addForeignKey('schedules', 'post_variants', 'schedules_post_variant_id_fkey',
        { post_variant_id: 'id' },
        { onDelete: 'SET NULL', onUpdate: 'CASCADE' });

    await db.addForeignKey('schedules', 'channel_connections', 'schedules_channel_connection_id_fkey',
        { channel_connection_id: 'id' },
        { onDelete: 'SET NULL', onUpdate: 'CASCADE' });

    // Add indexes for common queries
    await db.addIndex('schedules', 'idx_schedules_status', ['status']);
    await db.addIndex('schedules', 'idx_schedules_run_at', ['run_at']);
    await db.addIndex('schedules', 'idx_schedules_post_variant_id', ['post_variant_id']);
    await db.addIndex('schedules', 'idx_schedules_channel_connection_id', ['channel_connection_id']);
    await db.addIndex('schedules', 'idx_schedules_status_run_at', ['status', 'run_at']);

    // Create publish_events table - detailed audit trail of publish attempts
    await db.createTable('publish_events', {
        id: { 
            type: 'uuid', 
            primaryKey: true, 
            defaultValue: new String('gen_random_uuid()') 
        },
        schedule_id: { 
            type: 'uuid', 
            notNull: true 
        },
        attempt_index: { 
            type: 'int', 
            notNull: true 
        },
        timestamp: { 
            type: 'timestamp with time zone', 
            notNull: true, 
            defaultValue: new String('CURRENT_TIMESTAMP') 
        },
        status: { 
            type: 'string', 
            length: 20, 
            notNull: true 
        },
        external_post_id: { 
            type: 'string', 
            length: 100, 
            notNull: false 
        },
        external_url: { 
            type: 'string', 
            length: 500, 
            notNull: false 
        },
        error_code: { 
            type: 'string', 
            length: 50, 
            notNull: false 
        },
        error_message: { 
            type: 'text', 
            notNull: false 
        },
        raw_response: { 
            type: 'text', 
            notNull: false 
        }
    });

    // Add foreign key constraint with CASCADE delete (events deleted when schedule is deleted)
    await db.addForeignKey('publish_events', 'schedules', 'publish_events_schedule_id_fkey',
        { schedule_id: 'id' },
        { onDelete: 'CASCADE', onUpdate: 'CASCADE' });

    // Add indexes
    await db.addIndex('publish_events', 'idx_publish_events_schedule_id', ['schedule_id']);
    await db.addIndex('publish_events', 'idx_publish_events_timestamp', ['timestamp']);
    await db.addIndex('publish_events', 'idx_publish_events_status', ['status']);

    console.log('✓ Created schedules and publish_events tables with indexes and foreign keys');
};

exports.down = async function(db) {
    // Drop tables in reverse order (children first)
    await db.dropTable('publish_events');
    await db.dropTable('schedules');
  
    console.log('✓ Dropped schedules and publish_events tables');
};

exports._meta = {
    'version': 1
};

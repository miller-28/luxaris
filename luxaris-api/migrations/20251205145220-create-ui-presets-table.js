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

    // Create updated_at trigger function
    await db.runSql(`
        CREATE OR REPLACE FUNCTION ${schema}.update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    // Create user_ui_stateful_presets table
    await db.runSql(`
        CREATE SEQUENCE ${schema}.user_ui_stateful_presets_id_seq;
        CREATE TABLE ${schema}.user_ui_stateful_presets (
            id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.user_ui_stateful_presets_id_seq'),
            name VARCHAR(255) NOT NULL,
            user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE CASCADE,
            role_id INTEGER REFERENCES ${schema}.acl_roles(id) ON DELETE CASCADE,
            is_global BOOLEAN NOT NULL DEFAULT false,
            is_default BOOLEAN NOT NULL DEFAULT false,
            settings JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            
            -- Constraints
            CONSTRAINT check_preset_type CHECK (
                (user_id IS NOT NULL AND role_id IS NULL AND is_global = false) OR
                (user_id IS NULL AND role_id IS NOT NULL AND is_global = false) OR
                (user_id IS NULL AND role_id IS NULL AND is_global = true)
            ),
            CONSTRAINT unique_user_preset UNIQUE (user_id),
            CONSTRAINT unique_role_default_preset UNIQUE (role_id, is_default),
            CONSTRAINT unique_global_preset UNIQUE (is_global)
        );
        ALTER SEQUENCE ${schema}.user_ui_stateful_presets_id_seq OWNED BY ${schema}.user_ui_stateful_presets.id;
    `);

    // Create indexes
    await db.runSql(`
        CREATE INDEX idx_user_ui_presets_user_id 
        ON ${schema}.user_ui_stateful_presets(user_id) 
        WHERE user_id IS NOT NULL;
    `);

    await db.runSql(`
        CREATE INDEX idx_user_ui_presets_role_id 
        ON ${schema}.user_ui_stateful_presets(role_id) 
        WHERE role_id IS NOT NULL;
    `);

    await db.runSql(`
        CREATE INDEX idx_user_ui_presets_global 
        ON ${schema}.user_ui_stateful_presets(is_global) 
        WHERE is_global = true;
    `);

    await db.runSql(`
        CREATE INDEX idx_user_ui_presets_default 
        ON ${schema}.user_ui_stateful_presets(role_id, is_default) 
        WHERE is_default = true;
    `);

    await db.runSql(`
        CREATE INDEX idx_user_ui_presets_settings 
        ON ${schema}.user_ui_stateful_presets USING GIN (settings);
    `);

    // Create trigger for updated_at
    await db.runSql(`
        CREATE TRIGGER update_user_ui_presets_updated_at
        BEFORE UPDATE ON ${schema}.user_ui_stateful_presets
        FOR EACH ROW EXECUTE FUNCTION ${schema}.update_updated_at_column();
    `);

    // Seed global default preset
    await db.runSql(`
        INSERT INTO ${schema}.user_ui_stateful_presets (
            name,
            is_global,
            is_default,
            settings
        ) VALUES (
            'Luxaris Default Layout',
            true,
            false,
            '{
                "menu": {
                    "collapsed": false,
                    "openedGroups": ["posts", "channels"]
                },
                "grids": {
                    "posts": {
                        "columns": [
                            {"field": "title", "visible": true, "width": 250, "order": 0},
                            {"field": "status", "visible": true, "width": 120, "order": 1},
                            {"field": "created_at", "visible": true, "width": 150, "order": 2}
                        ],
                        "filters": {},
                        "sorting": {"field": "created_at", "direction": "desc"},
                        "pagination": {"page": 1, "pageSize": 20}
                    },
                    "schedules": {
                        "columns": [
                            {"field": "post_title", "visible": true, "width": 250, "order": 0},
                            {"field": "scheduled_time", "visible": true, "width": 180, "order": 1},
                            {"field": "status", "visible": true, "width": 120, "order": 2}
                        ],
                        "filters": {},
                        "sorting": {"field": "scheduled_time", "direction": "asc"},
                        "pagination": {"page": 1, "pageSize": 20}
                    },
                    "channels": {
                        "columns": [
                            {"field": "name", "visible": true, "width": 200, "order": 0},
                            {"field": "platform", "visible": true, "width": 120, "order": 1},
                            {"field": "status", "visible": true, "width": 100, "order": 2}
                        ],
                        "filters": {},
                        "sorting": {"field": "name", "direction": "asc"},
                        "pagination": {"page": 1, "pageSize": 20}
                    }
                },
                "components": {
                    "dashboard": {
                        "widgets": [
                            {"id": "recent-posts", "visible": true, "order": 0, "collapsed": false},
                            {"id": "schedule-calendar", "visible": true, "order": 1, "collapsed": false},
                            {"id": "channel-status", "visible": true, "order": 2, "collapsed": false}
                        ]
                    }
                },
                "preferences": {
                    "theme": "light",
                    "locale": "en",
                    "timezone": "UTC",
                    "dateFormat": "YYYY-MM-DD",
                    "timeFormat": "24h"
                }
            }'::jsonb
        );
    `);

    return null;
};

exports.down = async function(db) {

    const schema = process.env.DB_SCHEMA || 'luxaris';

    await db.runSql(`DROP TRIGGER IF EXISTS update_user_ui_presets_updated_at ON ${schema}.user_ui_stateful_presets;`);
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.user_ui_stateful_presets;`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.user_ui_stateful_presets_id_seq CASCADE;`);
    await db.runSql(`DROP FUNCTION IF EXISTS ${schema}.update_updated_at_column() CASCADE;`);
    return null;
};

exports._meta = {
    'version': 1
};

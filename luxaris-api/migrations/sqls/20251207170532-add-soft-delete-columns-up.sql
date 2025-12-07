-- Add is_deleted column to main entities for soft delete functionality

-- Users table
ALTER TABLE luxaris.users ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE luxaris.users ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_users_is_deleted ON luxaris.users(is_deleted);

-- Posts table
ALTER TABLE luxaris.posts ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE luxaris.posts ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_posts_is_deleted ON luxaris.posts(is_deleted);

-- Post variants table
ALTER TABLE luxaris.post_variants ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE luxaris.post_variants ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_post_variants_is_deleted ON luxaris.post_variants(is_deleted);

-- Post templates table
ALTER TABLE luxaris.post_templates ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE luxaris.post_templates ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_post_templates_is_deleted ON luxaris.post_templates(is_deleted);

-- Channel connections table
ALTER TABLE luxaris.channel_connections ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE luxaris.channel_connections ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_channel_connections_is_deleted ON luxaris.channel_connections(is_deleted);

-- Schedules table
ALTER TABLE luxaris.schedules ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE luxaris.schedules ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_schedules_is_deleted ON luxaris.schedules(is_deleted);

-- Generation sessions table
ALTER TABLE luxaris.generation_sessions ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE luxaris.generation_sessions ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_generation_sessions_is_deleted ON luxaris.generation_sessions(is_deleted);

-- Generation suggestions table
ALTER TABLE luxaris.generation_suggestions ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE luxaris.generation_suggestions ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_generation_suggestions_is_deleted ON luxaris.generation_suggestions(is_deleted);

-- ACL Roles table (for soft delete of custom roles)
ALTER TABLE luxaris.acl_roles ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE luxaris.acl_roles ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_acl_roles_is_deleted ON luxaris.acl_roles(is_deleted);

-- UI Presets table
ALTER TABLE luxaris.user_ui_stateful_presets ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE luxaris.user_ui_stateful_presets ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_user_ui_stateful_presets_is_deleted ON luxaris.user_ui_stateful_presets(is_deleted);
-- Remove soft delete columns

-- UI Presets
DROP INDEX IF EXISTS luxaris.idx_user_ui_stateful_presets_is_deleted;
ALTER TABLE luxaris.user_ui_stateful_presets DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE luxaris.user_ui_stateful_presets DROP COLUMN IF EXISTS is_deleted;

-- ACL Roles
DROP INDEX IF EXISTS luxaris.idx_acl_roles_is_deleted;
ALTER TABLE luxaris.acl_roles DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE luxaris.acl_roles DROP COLUMN IF EXISTS is_deleted;

-- Generation suggestions
DROP INDEX IF EXISTS luxaris.idx_generation_suggestions_is_deleted;
ALTER TABLE luxaris.generation_suggestions DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE luxaris.generation_suggestions DROP COLUMN IF EXISTS is_deleted;

-- Generation sessions
DROP INDEX IF EXISTS luxaris.idx_generation_sessions_is_deleted;
ALTER TABLE luxaris.generation_sessions DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE luxaris.generation_sessions DROP COLUMN IF EXISTS is_deleted;

-- Schedules
DROP INDEX IF EXISTS luxaris.idx_schedules_is_deleted;
ALTER TABLE luxaris.schedules DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE luxaris.schedules DROP COLUMN IF EXISTS is_deleted;

-- Channel connections
DROP INDEX IF EXISTS luxaris.idx_channel_connections_is_deleted;
ALTER TABLE luxaris.channel_connections DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE luxaris.channel_connections DROP COLUMN IF EXISTS is_deleted;

-- Post templates
DROP INDEX IF EXISTS luxaris.idx_post_templates_is_deleted;
ALTER TABLE luxaris.post_templates DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE luxaris.post_templates DROP COLUMN IF EXISTS is_deleted;

-- Post variants
DROP INDEX IF EXISTS luxaris.idx_post_variants_is_deleted;
ALTER TABLE luxaris.post_variants DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE luxaris.post_variants DROP COLUMN IF EXISTS is_deleted;

-- Posts
DROP INDEX IF EXISTS luxaris.idx_posts_is_deleted;
ALTER TABLE luxaris.posts DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE luxaris.posts DROP COLUMN IF EXISTS is_deleted;

-- Users
DROP INDEX IF EXISTS luxaris.idx_users_is_deleted;
ALTER TABLE luxaris.users DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE luxaris.users DROP COLUMN IF EXISTS is_deleted;
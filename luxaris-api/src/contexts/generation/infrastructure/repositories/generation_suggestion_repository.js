const connection_manager = require('../../../../core/infrastructure/connection-manager');

class GenerationSuggestionRepository {
/**
   * Create a new generation suggestion
   */
    async create(suggestion_data) {
        const query = `
      INSERT INTO generation_suggestions (
        generation_session_id, channel_id, content, score, accepted
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
        const values = [
            suggestion_data.generation_session_id,
            suggestion_data.channel_id,
            suggestion_data.content,
            suggestion_data.score || null,
            suggestion_data.accepted || false
        ];
    
        const result = await connection_manager.get_db_pool().query(query, values);
        return result.rows[0];
    }

    /**
   * Bulk create suggestions (for multi-channel generation)
   */
    async bulk_create(suggestions_data) {
        if (!suggestions_data || suggestions_data.length === 0) {
            return [];
        }

        const values = [];
        const placeholders = [];
        const param_count = 0;

        suggestions_data.forEach((suggestion, index) => {
            const base = index * 5;
            placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
            values.push(
                suggestion.generation_session_id,
                suggestion.channel_id,
                suggestion.content,
                suggestion.score || null,
                suggestion.accepted || false
            );
        });

        const query = `
      INSERT INTO generation_suggestions (
        generation_session_id, channel_id, content, score, accepted
      )
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

        const result = await connection_manager.get_db_pool().query(query, values);
        return result.rows;
    }

    /**
   * Find suggestion by ID
   */
    async find_by_id(suggestion_id) {
        const query = 'SELECT * FROM generation_suggestions WHERE id = $1 AND is_deleted = false';
        const result = await connection_manager.get_db_pool().query(query, [suggestion_id]);
        return result.rows[0] || null;
    }

    /**
   * List suggestions by session
   */
    async list_by_session(session_id, filters = {}) {
        let query = 'SELECT * FROM generation_suggestions WHERE generation_session_id = $1 AND is_deleted = false';
        const values = [session_id];
        let param_count = 1;

        // Filter by channel
        if (filters.channel_id) {
            param_count++;
            query += ` AND channel_id = $${param_count}`;
            values.push(filters.channel_id);
        }

        // Filter by accepted status
        if (filters.accepted !== undefined) {
            param_count++;
            query += ` AND accepted = $${param_count}`;
            values.push(filters.accepted);
        }

        // Ordering by score (descending, nulls last) then created_at
        query += ' ORDER BY score DESC NULLS LAST, created_at ASC';

        const result = await connection_manager.get_db_pool().query(query, values);
        return result.rows;
    }

    /**
   * Mark suggestion as accepted
   */
    async mark_as_accepted(suggestion_id) {
        const query = `
      UPDATE generation_suggestions 
      SET accepted = true
      WHERE id = $1
      RETURNING *
    `;
    
        const result = await connection_manager.get_db_pool().query(query, [suggestion_id]);
        return result.rows[0] || null;
    }

    /**
   * Get owner principal ID for a suggestion (through session)
   */
    async get_owner_principal_id(suggestion_id) {
        const query = `
      SELECT gs.owner_principal_id 
      FROM generation_suggestions gsug
      JOIN generation_sessions gs ON gsug.generation_session_id = gs.id
      WHERE gsug.id = $1
    `;
        const result = await connection_manager.get_db_pool().query(query, [suggestion_id]);
        return result.rows[0]?.owner_principal_id || null;
    }

    /**
   * Delete suggestion (soft delete)
   */
    async delete(suggestion_id) {
        const query = 'UPDATE generation_suggestions SET is_deleted = true, deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND is_deleted = false RETURNING id';
        const result = await connection_manager.get_db_pool().query(query, [suggestion_id]);
        return result.rowCount > 0;
    }

    /**
   * Delete all suggestions for a session (soft delete)
   */
    async delete_by_session(session_id) {
        const query = 'UPDATE generation_suggestions SET is_deleted = true, deleted_at = NOW(), updated_at = NOW() WHERE generation_session_id = $1 AND is_deleted = false';
        const result = await connection_manager.get_db_pool().query(query, [session_id]);
        return result.rowCount;
    }
}

module.exports = GenerationSuggestionRepository;

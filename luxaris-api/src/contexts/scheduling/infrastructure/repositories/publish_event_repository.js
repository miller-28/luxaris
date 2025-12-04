const PublishEvent = require('../models/publish_event');

class PublishEventRepository {
    constructor(db_pool) {
        this.db = db_pool;
    }

    /**
   * Create a new publish event
   */
    async create(event_data) {
        const result = await this.db.query(
            `INSERT INTO publish_events (
        schedule_id, attempt_index, status, 
        external_post_id, external_url, 
        error_code, error_message, raw_response
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
            [
                event_data.schedule_id,
                event_data.attempt_index,
                event_data.status,
                event_data.external_post_id || null,
                event_data.external_url || null,
                event_data.error_code || null,
                event_data.error_message || null,
                event_data.raw_response || null
            ]
        );
        return new PublishEvent(result.rows[0]);
    }

    /**
   * Find event by ID
   */
    async find_by_id(event_id) {
        const result = await this.db.query(
            'SELECT * FROM publish_events WHERE id = $1',
            [event_id]
        );
        return result.rows[0] ? new PublishEvent(result.rows[0]) : null;
    }

    /**
   * List events for a schedule
   */
    async list_by_schedule(schedule_id) {
        const result = await this.db.query(
            `SELECT * FROM publish_events 
       WHERE schedule_id = $1 
       ORDER BY attempt_index ASC`,
            [schedule_id]
        );
        return result.rows.map(row => new PublishEvent(row));
    }

    /**
   * Get latest event for a schedule
   */
    async get_latest_by_schedule(schedule_id) {
        const result = await this.db.query(
            `SELECT * FROM publish_events 
       WHERE schedule_id = $1 
       ORDER BY attempt_index DESC 
       LIMIT 1`,
            [schedule_id]
        );
        return result.rows[0] ? new PublishEvent(result.rows[0]) : null;
    }

    /**
   * List events with filters
   */
    async list(filters = {}, pagination = {}) {
        const conditions = [];
        const params = [];
        let param_count = 0;

        if (filters.schedule_id) {
            conditions.push(`schedule_id = $${++param_count}`);
            params.push(filters.schedule_id);
        }

        if (filters.status) {
            conditions.push(`status = $${++param_count}`);
            params.push(filters.status);
        }

        if (filters.timestamp_from) {
            conditions.push(`timestamp >= $${++param_count}`);
            params.push(filters.timestamp_from);
        }

        if (filters.timestamp_to) {
            conditions.push(`timestamp <= $${++param_count}`);
            params.push(filters.timestamp_to);
        }

        const where_clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
        const limit = pagination.limit || 50;
        const offset = pagination.offset || 0;

        const query = `
      SELECT * FROM publish_events
      ${where_clause}
      ORDER BY timestamp DESC
      LIMIT $${++param_count} OFFSET $${++param_count}
    `;
        params.push(limit, offset);

        const result = await this.db.query(query, params);
        return result.rows.map(row => new PublishEvent(row));
    }

    /**
   * Count events matching filters
   */
    async count(filters = {}) {
        const conditions = [];
        const params = [];
        let param_count = 0;

        if (filters.schedule_id) {
            conditions.push(`schedule_id = $${++param_count}`);
            params.push(filters.schedule_id);
        }

        if (filters.status) {
            conditions.push(`status = $${++param_count}`);
            params.push(filters.status);
        }

        if (filters.timestamp_from) {
            conditions.push(`timestamp >= $${++param_count}`);
            params.push(filters.timestamp_from);
        }

        if (filters.timestamp_to) {
            conditions.push(`timestamp <= $${++param_count}`);
            params.push(filters.timestamp_to);
        }

        const where_clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await this.db.query(
            `SELECT COUNT(*) as total FROM publish_events ${where_clause}`,
            params
        );
        return parseInt(result.rows[0].total);
    }

    /**
   * Delete events for a schedule (cascade handled by FK, but exposed for manual cleanup)
   */
    async delete_by_schedule(schedule_id) {
        await this.db.query('DELETE FROM publish_events WHERE schedule_id = $1', [schedule_id]);
    }
}

module.exports = PublishEventRepository;

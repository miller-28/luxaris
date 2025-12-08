const Schedule = require('../models/schedule');
const connection_manager = require('../../../../core/infrastructure/connection-manager');

class ScheduleRepository {
/**
   * Create a new schedule
   */
    async create(schedule_data) {
        const result = await connection_manager.get_db_pool().query(
            `INSERT INTO schedules (
        post_variant_id, channel_connection_id, run_at, timezone, 
        status, attempt_count
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
            [
                schedule_data.post_variant_id,
                schedule_data.channel_connection_id,
                schedule_data.run_at,
                schedule_data.timezone,
                schedule_data.status || 'pending',
                schedule_data.attempt_count || 0
            ]
        );
        return new Schedule(result.rows[0]);
    }

    /**
   * Find schedule by ID
   */
    async find_by_id(schedule_id) {
        const result = await connection_manager.get_db_pool().query(
            'SELECT * FROM schedules WHERE id = $1',
            [schedule_id]
        );
        return result.rows[0] ? new Schedule(result.rows[0]) : null;
    }

    /**
   * Find schedule by ID with row-level lock (FOR UPDATE)
   * Used by scanner to prevent double-queuing
   */
    async find_by_id_for_update(schedule_id, transaction = null) {
        const client = transaction || this.db;
        const result = await client.query(
            'SELECT * FROM schedules WHERE id = $1 AND is_deleted = false FOR UPDATE',
            [schedule_id]
        );
        return result.rows[0] ? new Schedule(result.rows[0]) : null;
    }

    /**
   * List schedules with filters and pagination
   */
    async list(filters = {}, pagination = {}) {
        const conditions = ['is_deleted = false'];
        const params = [];
        let param_count = 0;

        if (filters.post_variant_id) {
            conditions.push(`post_variant_id = $${++param_count}`);
            params.push(filters.post_variant_id);
        }

        if (filters.channel_connection_id) {
            conditions.push(`channel_connection_id = $${++param_count}`);
            params.push(filters.channel_connection_id);
        }

        if (filters.status) {
            conditions.push(`status = $${++param_count}`);
            params.push(filters.status);
        }

        if (filters.run_at_from) {
            conditions.push(`run_at >= $${++param_count}`);
            params.push(filters.run_at_from);
        }

        if (filters.run_at_to) {
            conditions.push(`run_at <= $${++param_count}`);
            params.push(filters.run_at_to);
        }

        const where_clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
        const limit = pagination.limit || 50;
        const offset = pagination.offset || 0;

        const query = `
      SELECT * FROM schedules
      ${where_clause}
      ORDER BY run_at ASC
      LIMIT $${++param_count} OFFSET $${++param_count}
    `;
        params.push(limit, offset);

        const result = await connection_manager.get_db_pool().query(query, params);
        return result.rows.map(row => new Schedule(row));
    }

    /**
   * Count schedules with filters
   */
    async count(filters = {}) {
        const conditions = ['is_deleted = false'];
        const params = [];
        let param_count = 0;

        if (filters.post_variant_id) {
            conditions.push(`post_variant_id = $${++param_count}`);
            params.push(filters.post_variant_id);
        }

        if (filters.channel_connection_id) {
            conditions.push(`channel_connection_id = $${++param_count}`);
            params.push(filters.channel_connection_id);
        }

        if (filters.status) {
            conditions.push(`status = $${++param_count}`);
            params.push(filters.status);
        }

        if (filters.run_at_from) {
            conditions.push(`run_at >= $${++param_count}`);
            params.push(filters.run_at_from);
        }

        if (filters.run_at_to) {
            conditions.push(`run_at <= $${++param_count}`);
            params.push(filters.run_at_to);
        }

        const where_clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await connection_manager.get_db_pool().query(
            `SELECT COUNT(*) as total FROM schedules ${where_clause}`,
            params
        );
        return parseInt(result.rows[0].total);
    }

    /**
   * Find schedules that are due for execution
   * Returns schedules that are pending and past their run_at time
   */
    async find_due_schedules(current_time, limit = 100) {
        const result = await connection_manager.get_db_pool().query(
            `SELECT * FROM schedules
       WHERE status = 'pending' AND run_at <= $1 AND is_deleted = false
       ORDER BY run_at ASC
       LIMIT $2`,
            [current_time, limit]
        );
        return result.rows.map(row => new Schedule(row));
    }

    /**
   * Update schedule
   */
    async update(schedule_id, updates) {
        const fields = [];
        const params = [];
        let param_count = 0;

        const allowed_fields = [
            'run_at', 'timezone', 'status', 'attempt_count', 
            'last_attempt_at', 'error_code', 'error_message'
        ];

        for (const field of allowed_fields) {
            if (updates[field] !== undefined) {
                fields.push(`${field} = $${++param_count}`);
                params.push(updates[field]);
            }
        }

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        // Always update updated_at
        fields.push('updated_at = CURRENT_TIMESTAMP');

        params.push(schedule_id);
        const query = `
      UPDATE schedules
      SET ${fields.join(', ')}
      WHERE id = $${++param_count}
      RETURNING *
    `;

        const result = await connection_manager.get_db_pool().query(query, params);
        return result.rows[0] ? new Schedule(result.rows[0]) : null;
    }

    /**
   * Update schedule status
   */
    async update_status(schedule_id, status, error_details = {}) {
        const updates = { status };
    
        if (error_details.error_code) {
            updates.error_code = error_details.error_code;
        }
        if (error_details.error_message) {
            updates.error_message = error_details.error_message;
        }
        if (error_details.last_attempt_at) {
            updates.last_attempt_at = error_details.last_attempt_at;
        }
    
        return this.update(schedule_id, updates);
    }

    /**
   * Increment attempt count
   */
    async increment_attempt(schedule_id) {
        const result = await connection_manager.get_db_pool().query(
            `UPDATE schedules
       SET attempt_count = attempt_count + 1,
           last_attempt_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
            [schedule_id]
        );
        return result.rows[0] ? new Schedule(result.rows[0]) : null;
    }

    /**
   * Delete schedule (soft delete)
   */
    async delete(schedule_id) {
        const result = await connection_manager.get_db_pool().query(
            'UPDATE schedules SET is_deleted = true, deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND is_deleted = false RETURNING id',
            [schedule_id]
        );
        return result.rowCount > 0;
    }

    /**
   * Get the post_variant_id for a schedule (for ownership validation)
   */
    async get_post_variant_id(schedule_id) {
        const result = await connection_manager.get_db_pool().query(
            'SELECT post_variant_id FROM schedules WHERE id = $1 AND is_deleted = false',
            [schedule_id]
        );
        return result.rows[0] ? result.rows[0].post_variant_id : null;
    }
}

module.exports = ScheduleRepository;

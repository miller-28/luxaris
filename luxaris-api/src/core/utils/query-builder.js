/**
 * Safe Query Builder Utilities
 * 
 * Provides utilities for building dynamic SQL queries safely with parameterization
 * and whitelisting to prevent SQL injection attacks.
 */

const InputValidator = require('./input-validator');

class QueryBuilder {
    /**
     * Build WHERE clause with parameterized conditions
     * @param {Object} filters - Filter conditions { field: value }
     * @param {Object} allowed_fields - Allowed field names with their operators { field: ['=', 'LIKE', 'IN'] }
     * @param {number} param_offset - Starting parameter number (default: 1)
     * @returns {Object} { clause: string, params: Array, next_param: number }
     */
    static build_where_clause(filters, allowed_fields, param_offset = 1) {
        if (!filters || typeof filters !== 'object') {
            return { clause: '', params: [], next_param: param_offset };
        }
        
        const conditions = [];
        const params = [];
        let param_count = param_offset;
        
        for (const [field, value] of Object.entries(filters)) {
            // Validate field is allowed (whitelist)
            if (!allowed_fields[field]) {
                throw new Error(`Invalid filter field: ${field}`);
            }
            
            // Handle different value types
            if (value === null) {
                conditions.push(`${field} IS NULL`);
            } else if (Array.isArray(value)) {
                // IN clause
                if (!allowed_fields[field].includes('IN')) {
                    throw new Error(`IN operator not allowed for field: ${field}`);
                }
                
                if (value.length === 0) {
                    conditions.push('FALSE'); // Empty IN clause
                } else {
                    const placeholders = value.map(() => `$${param_count++}`).join(', ');
                    conditions.push(`${field} IN (${placeholders})`);
                    params.push(...value);
                }
            } else if (typeof value === 'string' && value.includes('%')) {
                // LIKE clause
                if (!allowed_fields[field].includes('LIKE')) {
                    throw new Error(`LIKE operator not allowed for field: ${field}`);
                }
                conditions.push(`${field} LIKE $${param_count++}`);
                params.push(value);
            } else {
                // Equality
                if (!allowed_fields[field].includes('=')) {
                    throw new Error(`Equality operator not allowed for field: ${field}`);
                }
                conditions.push(`${field} = $${param_count++}`);
                params.push(value);
            }
        }
        
        const clause = conditions.length > 0 ? 
            `WHERE ${conditions.join(' AND ')}` : 
            '';
        
        return { clause, params, next_param: param_count };
    }

    /**
     * Build ORDER BY clause with whitelisted column names
     * @param {string} sort_field - Field to sort by
     * @param {string} sort_order - Sort order ('asc' or 'desc')
     * @param {Array<string>} allowed_fields - Allowed field names (whitelist)
     * @param {string} default_field - Default field if none specified
     * @returns {string} ORDER BY clause
     */
    static build_order_by_clause(sort_field, sort_order, allowed_fields, default_field = 'created_at') {
        // Default sort
        let field = default_field;
        let order = 'DESC';
        
        // Validate sort_field against whitelist
        if (sort_field) {
            if (!allowed_fields.includes(sort_field)) {
                throw new Error(`Invalid sort field: ${sort_field}`);
            }
            field = sort_field;
        }
        
        // Validate sort_order
        if (sort_order) {
            const normalized_order = sort_order.toUpperCase();
            if (!['ASC', 'DESC'].includes(normalized_order)) {
                throw new Error(`Invalid sort order: ${sort_order}`);
            }
            order = normalized_order;
        }
        
        return `ORDER BY ${field} ${order}`;
    }

    /**
     * Build LIMIT and OFFSET clause with validation
     * @param {number} limit - Limit value
     * @param {number} offset - Offset value
     * @param {number} max_limit - Maximum allowed limit (default: 100)
     * @returns {Object} { clause: string, params: Array }
     */
    static build_pagination_clause(limit, offset, max_limit = 100) {
        const validated = InputValidator.validate_pagination(limit, offset, max_limit);
        
        return {
            clause: `LIMIT ${validated.limit} OFFSET ${validated.offset}`,
            limit: validated.limit,
            offset: validated.offset
        };
    }

    /**
     * Build complete SELECT query with filters, sorting, and pagination
     * @param {Object} options - Query options
     * @param {string} options.table - Table name (validated)
     * @param {Array<string>} options.columns - Column names to select (whitelist)
     * @param {Object} options.filters - Filter conditions
     * @param {Object} options.allowed_filter_fields - Allowed filter fields with operators
     * @param {string} options.sort_field - Sort field
     * @param {string} options.sort_order - Sort order
     * @param {Array<string>} options.allowed_sort_fields - Allowed sort fields
     * @param {number} options.limit - Limit
     * @param {number} options.offset - Offset
     * @returns {Object} { query: string, params: Array }
     */
    static build_select_query(options) {
        const {
            table,
            columns = ['*'],
            filters = {},
            allowed_filter_fields = {},
            sort_field,
            sort_order,
            allowed_sort_fields = [],
            limit,
            offset,
            max_limit = 100
        } = options;
        
        // Validate table name (simple alphanumeric + underscore)
        if (!/^[a-z0-9_]+$/.test(table)) {
            throw new Error(`Invalid table name: ${table}`);
        }
        
        // Validate column names
        const validated_columns = columns.map(col => {
            if (col === '*') return '*';
            if (!/^[a-z0-9_\.]+$/.test(col)) {
                throw new Error(`Invalid column name: ${col}`);
            }
            return col;
        });
        
        // Build query parts
        let query = `SELECT ${validated_columns.join(', ')} FROM ${table}`;
        let params = [];
        
        // Add WHERE clause
        const where_result = this.build_where_clause(filters, allowed_filter_fields);
        if (where_result.clause) {
            query += ` ${where_result.clause}`;
            params = where_result.params;
        }
        
        // Add ORDER BY clause
        if (allowed_sort_fields.length > 0) {
            const order_by = this.build_order_by_clause(sort_field, sort_order, allowed_sort_fields);
            query += ` ${order_by}`;
        }
        
        // Add LIMIT and OFFSET
        if (limit !== undefined || offset !== undefined) {
            const pagination = this.build_pagination_clause(limit, offset, max_limit);
            query += ` ${pagination.clause}`;
        }
        
        return { query, params };
    }
}

module.exports = QueryBuilder;

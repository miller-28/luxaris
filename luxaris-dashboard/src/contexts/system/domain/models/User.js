/**
 * User Domain Model
 * Represents a user entity in the system
 */
export class User {
    constructor(data = {}) {
        this.id = data.id || null;
        this.email = data.email || '';
        this.name = data.name || '';
        this.avatar = data.avatar || null;
        this.timezone = data.timezone || 'UTC';
        this.locale = data.locale || 'en';
        this.is_root_admin = data.is_root_admin || false;
        this.status = data.status || 'active'; // active, pending, suspended
        this.roles = data.roles || [];
        this.permissions = data.permissions || [];
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    /**
   * Check if user has a specific permission
   */
    hasPermission(resource, action) {
    // Root admin has all permissions
        if (this.is_root_admin) {
            return true;
        }

        // Check direct permissions
        const permission = `${resource}:${action}`;
        return this.permissions.includes(permission);
    }

    /**
   * Check if user has a specific role
   */
    hasRole(roleName) {
        return this.roles.some(role => role.name === roleName);
    }

    /**
   * Check if user is admin
   */
    isAdmin() {
        return this.is_root_admin || this.hasRole('admin');
    }

    /**
   * Check if user is pending approval
   */
    isPending() {
        return this.status === 'pending';
    }

    /**
   * Check if user is active
   */
    isActive() {
        return this.status === 'active';
    }

    /**
   * Get full name or email as fallback
   */
    getDisplayName() {
        return this.name || this.email;
    }

    /**
   * Create User instance from API response
   */
    static fromApiResponse(data) {
        return new User(data);
    }

    /**
   * Convert to plain object for API submission
   */
    toApiPayload() {
        return {
            email: this.email,
            name: this.name,
            timezone: this.timezone,
            locale: this.locale,
        };
    }
}

// ACL middleware - skeleton for Phase 2 implementation
// Will check user permissions for requested resource and action

function acl_middleware(resource, action) {
    return async (req, res, next) => {
        // TODO: Phase 2 - Implement ACL checks
        // 1. Extract user from req.user (set by auth_middleware)
        // 2. Check if user has permission for resource + action
        // 3. Query acl_permissions table via cache
        // 4. Handle wildcard permissions (*)
        // 5. Return 403 if unauthorized

        // For now, allow all requests through
        next();
    };
}

module.exports = acl_middleware;

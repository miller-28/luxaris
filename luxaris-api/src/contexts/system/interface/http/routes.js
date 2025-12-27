const express = require('express');

function create_auth_routes(auth_handler, auth_middleware) {

    const router = express.Router();

    // Standard email/password auth
    router.post('/register', (req, res, next) => auth_handler.register(req, res, next));
    router.post('/login', (req, res, next) => auth_handler.login(req, res, next));
    router.post('/refresh', (req, res, next) => auth_handler.refresh(req, res, next));
    router.post('/logout', auth_middleware, (req, res, next) => auth_handler.logout(req, res, next));
    router.get('/me', auth_middleware, (req, res, next) => auth_handler.get_current_user(req, res, next));

    // OAuth routes
    router.get('/google', (req, res, next) => auth_handler.google_authorize(req, res, next));
    router.get('/google/callback', (req, res, next) => auth_handler.google_callback(req, res, next));

    return router;
}

function create_preset_routes(preset_handler, auth_middleware) {

    const router = express.Router();

    // User preset routes (authenticated users)
    router.get('/users/:user_id/ui-preset', auth_middleware, (req, res) => 
        preset_handler.get_user_preset(req, res));
    
    router.post('/ui-presets/new', auth_middleware, (req, res) => 
        preset_handler.create_user_preset(req, res));
    
    router.patch('/ui-presets/:preset_id', auth_middleware, (req, res) => 
        preset_handler.update_preset(req, res));
    
    router.post('/ui-presets/:preset_id/clone', auth_middleware, (req, res) => 
        preset_handler.clone_preset(req, res));
    
    router.delete('/ui-presets/:preset_id', auth_middleware, (req, res) => 
        preset_handler.delete_preset(req, res));

    // Admin routes (role and global presets)
    router.get('/admin/roles/:role_id/ui-preset', auth_middleware, (req, res) => 
        preset_handler.get_role_preset(req, res));
    
    router.post('/admin/roles/:role_id/ui-preset', auth_middleware, (req, res) => 
        preset_handler.create_role_preset(req, res));
    
    router.get('/admin/ui-presets/global', auth_middleware, (req, res) => 
        preset_handler.get_global_preset(req, res));
    
    router.post('/admin/ui-presets/global', auth_middleware, (req, res) => 
        preset_handler.create_global_preset(req, res));

    return router;
}

function create_user_routes(user_handler, auth_middleware) {
    
    const router = express.Router();

    // User profile update (authenticated users)
    router.patch('/users/:user_id', auth_middleware, (req, res) => 
        user_handler.update_user(req, res));

    return router;
}

function create_user_management_routes(user_management_handler, auth_middleware, acl_middleware) {
    
    const router = express.Router();

    // User management (requires admin permission)
    router.get('/users', 
        auth_middleware, 
        acl_middleware({ resource: 'users', action: 'read' }), 
        (req, res) => user_management_handler.list_users(req, res));
    
    router.get('/users/:user_id', 
        auth_middleware, 
        acl_middleware({ resource: 'users', action: 'read' }), 
        (req, res) => user_management_handler.get_user(req, res));
    
    router.post('/users/:user_id/approve', 
        auth_middleware, 
        acl_middleware({ resource: 'users', action: 'approve' }), 
        (req, res) => user_management_handler.approve_user(req, res));
    
    router.post('/users/:user_id/disable', 
        auth_middleware, 
        acl_middleware({ resource: 'users', action: 'update' }), 
        (req, res) => user_management_handler.disable_user(req, res));
    
    router.post('/users/:user_id/enable', 
        auth_middleware, 
        acl_middleware({ resource: 'users', action: 'update' }), 
        (req, res) => user_management_handler.enable_user(req, res));
    
    router.patch('/users/:user_id', 
        auth_middleware, 
        acl_middleware({ resource: 'users', action: 'update' }), 
        (req, res) => user_management_handler.update_user(req, res));
    
    router.delete('/users/:user_id', 
        auth_middleware, 
        acl_middleware({ resource: 'users', action: 'delete' }), 
        (req, res) => user_management_handler.delete_user(req, res));

    return router;
}

function create_ops_routes(ops_handler) {
    
    const router = express.Router();

    // Health check endpoints (public)
    router.get('/health', (req, res, next) => ops_handler.get_health(req, res, next));
    router.get('/status', (req, res, next) => ops_handler.get_status(req, res, next));

    // Feature flag endpoints (public read access)
    router.get('/flags', (req, res, next) => ops_handler.get_feature_flags(req, res, next));
    router.get('/flags/:key', (req, res, next) => ops_handler.get_feature_flag(req, res, next));
    router.get('/flags/:key/check', (req, res, next) => ops_handler.check_feature_flag(req, res, next));

    // App data endpoint (public - timezones and countries)
    router.get('/app-data', (req, res, next) => ops_handler.get_app_data(req, res, next));

    return router;
}

module.exports = {
    create_auth_routes,
    create_preset_routes,
    create_user_routes,
    create_user_management_routes,
    create_ops_routes
};

const express = require('express');

function create_auth_routes(auth_handler) {
    const router = express.Router();

    // Standard email/password auth
    router.post('/register', (req, res, next) => auth_handler.register(req, res, next));
    router.post('/login', (req, res, next) => auth_handler.login(req, res, next));
    router.post('/refresh', (req, res, next) => auth_handler.refresh(req, res, next));

    // OAuth routes
    router.get('/google', (req, res, next) => auth_handler.google_authorize(req, res, next));
    router.get('/google/callback', (req, res, next) => auth_handler.google_callback(req, res, next));

    return router;
}

function create_preset_routes(preset_handler, auth_middleware) {
    const router = express.Router();

    // User preset routes (authenticated users)
    router.get('/users/:user_id/ui-preset', auth_middleware, (req, res) => 
        preset_handler.get_user_preset(req, res)
    );
    
    router.post('/ui-presets/new', auth_middleware, (req, res) => 
        preset_handler.create_user_preset(req, res)
    );
    
    router.patch('/ui-presets/:preset_id', auth_middleware, (req, res) => 
        preset_handler.update_preset(req, res)
    );
    
    router.post('/ui-presets/:preset_id/clone', auth_middleware, (req, res) => 
        preset_handler.clone_preset(req, res)
    );
    
    router.delete('/ui-presets/:preset_id', auth_middleware, (req, res) => 
        preset_handler.delete_preset(req, res)
    );

    // Admin routes (role and global presets)
    router.get('/admin/roles/:role_id/ui-preset', auth_middleware, (req, res) => 
        preset_handler.get_role_preset(req, res)
    );
    
    router.post('/admin/roles/:role_id/ui-preset', auth_middleware, (req, res) => 
        preset_handler.create_role_preset(req, res)
    );
    
    router.get('/admin/ui-presets/global', auth_middleware, (req, res) => 
        preset_handler.get_global_preset(req, res)
    );
    
    router.post('/admin/ui-presets/global', auth_middleware, (req, res) => 
        preset_handler.create_global_preset(req, res)
    );

    return router;
}

function create_user_routes(user_handler, auth_middleware) {
    const router = express.Router();

    // User profile update (authenticated users)
    router.patch('/users/:user_id', auth_middleware, (req, res) => 
        user_handler.update_user(req, res)
    );

    return router;
}

module.exports = {
    create_auth_routes,
    create_preset_routes,
    create_user_routes
};

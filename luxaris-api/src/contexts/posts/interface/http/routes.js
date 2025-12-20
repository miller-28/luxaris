const express = require('express');
const PostHandler = require('./handlers/post-handler');
const PostVariantHandler = require('./handlers/post-variant-handler');

/**
 * Create Post Routes
 * 
 * HTTP endpoints for posts management
 */
function create_post_routes(post_handler, auth_middleware, error_handler) {

    const router = express.Router();

    // Post CRUD operations
    router.post('/', auth_middleware, (req, res, next) => post_handler.create_post(req, res, next));
    router.get('/', auth_middleware, (req, res, next) => post_handler.list_posts(req, res, next));
    router.get('/:id', auth_middleware, (req, res, next) => post_handler.get_post(req, res, next));
    router.patch('/:id', auth_middleware, (req, res, next) => post_handler.update_post(req, res, next));
    router.delete('/:id', auth_middleware, (req, res, next) => post_handler.delete_post(req, res, next));

    // Register error handler
    if (error_handler) {
        router.use(error_handler);
    }

    return router;
}

/**
 * Create Post Variant Routes
 * 
 * HTTP endpoints for post variants management
 */
function create_post_variant_routes(post_variant_handler, auth_middleware, error_handler) {
    
    const router = express.Router();

    // Variant operations under posts
    router.post('/posts/:post_id/variants', auth_middleware, (req, res, next) => 
        post_variant_handler.create_variant(req, res, next));
    router.get('/posts/:post_id/variants', auth_middleware, (req, res, next) => 
        post_variant_handler.list_variants(req, res, next));

    // Standalone variant operations
    router.get('/variants/:id', auth_middleware, (req, res, next) => 
        post_variant_handler.get_variant(req, res, next));
    router.patch('/variants/:id', auth_middleware, (req, res, next) => 
        post_variant_handler.update_variant(req, res, next));
    router.post('/variants/:id/mark-ready', auth_middleware, (req, res, next) => 
        post_variant_handler.mark_ready(req, res, next));
    router.delete('/variants/:id', auth_middleware, (req, res, next) => 
        post_variant_handler.delete_variant(req, res, next));

    // Register error handler
    if (error_handler) {
        router.use(error_handler);
    }

    return router;
}

module.exports = {
    create_post_routes,
    create_post_variant_routes,
    PostHandler,
    PostVariantHandler
};

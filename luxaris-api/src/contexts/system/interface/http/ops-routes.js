const router = require('express').Router();

function create_ops_routes(ops_handler) {
    // Health check endpoints (public)
    router.get('/health', (req, res, next) => ops_handler.get_health(req, res, next));
    router.get('/status', (req, res, next) => ops_handler.get_status(req, res, next));

    // Feature flag endpoints (public read access)
    router.get('/flags', (req, res, next) => ops_handler.get_feature_flags(req, res, next));
    router.get('/flags/:key', (req, res, next) => ops_handler.get_feature_flag(req, res, next));
    router.get('/flags/:key/check', (req, res, next) => ops_handler.check_feature_flag(req, res, next));

    return router;
}

module.exports = create_ops_routes;

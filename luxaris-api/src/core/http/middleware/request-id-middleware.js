let request_counter = 0;

function request_id_middleware() {
    return function(req, res, next) {
        // Simple incrementing counter for request IDs
        request_counter = (request_counter + 1) % 2147483647; // Max INTEGER in PostgreSQL
        req.id = request_counter;
        res.setHeader('X-Request-ID', req.id.toString());
        next();
    };
}

module.exports = request_id_middleware;

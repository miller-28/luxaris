const crypto = require('crypto');

function request_id_middleware() {
	return function(req, res, next) {
		req.id = crypto.randomUUID();
		res.setHeader('X-Request-ID', req.id);
		next();
	};
}

module.exports = request_id_middleware;

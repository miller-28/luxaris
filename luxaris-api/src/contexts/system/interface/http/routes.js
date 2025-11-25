const express = require('express');

function create_auth_routes(auth_handler) {
	const router = express.Router();

	router.post('/register', (req, res, next) => auth_handler.register(req, res, next));
	router.post('/login', (req, res, next) => auth_handler.login(req, res, next));
	router.post('/refresh', (req, res, next) => auth_handler.refresh(req, res, next));

	return router;
}

module.exports = create_auth_routes;

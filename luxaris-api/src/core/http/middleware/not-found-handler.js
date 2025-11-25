function not_found_handler(req, res) {
  res.status(404).json({
    errors: [{
      error_code: 'ROUTE_NOT_FOUND',
      error_description: `Route ${req.method} ${req.path} not found`,
      error_severity: 'error'
    }]
  });
}

module.exports = not_found_handler;

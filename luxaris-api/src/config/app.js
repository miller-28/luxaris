function get_app_config() {
  return {
    node_env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000,
    api_version: process.env.API_VERSION || 'v1',
    log_level: process.env.LOG_LEVEL || 'info',
    cors_origin: process.env.CORS_ORIGIN || '*',
    rate_limit_window_ms: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    rate_limit_max_requests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  };
}

function validate_app_config(config) {
  if (!config.port || config.port < 1 || config.port > 65535) {
    throw new Error('Invalid PORT configuration');
  }

  const valid_environments = ['development', 'test', 'staging', 'production'];
  if (!valid_environments.includes(config.node_env)) {
    throw new Error(`Invalid NODE_ENV: ${config.node_env}`);
  }

  return true;
}

module.exports = {
  get_app_config,
  validate_app_config
};

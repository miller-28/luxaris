function get_auth_config() {
    
    return {
        jwt_secret: process.env.JWT_SECRET,
        jwt_expiration: process.env.JWT_EXPIRATION || '24h',
        jwt_refresh_expiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
        
        // Google OAuth (for user authentication)
        google_client_id: process.env.GOOGLE_CLIENT_ID,
        google_client_secret: process.env.GOOGLE_CLIENT_SECRET,
        google_redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        
        // LinkedIn OAuth redirect URI (credentials configured via UI)
        linkedin_redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        
        // X (Twitter) OAuth redirect URI (credentials configured via UI)
        x_redirect_uri: process.env.X_REDIRECT_URI
    };
}

function validate_auth_config(config) {
    const required_fields = ['jwt_secret'];
    const missing_fields = required_fields.filter(field => !config[field]);

    if (missing_fields.length > 0) {
        throw new Error(`Missing required auth configuration: ${missing_fields.join(', ')}`);
    }

    return true;
}

module.exports = {
    get_auth_config,
    validate_auth_config
};

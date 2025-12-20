/**
 * Channel OAuth Credentials Handler
 * 
 * Handles HTTP requests for OAuth credentials management (admin only)
 */
class ChannelOAuthCredentialsHandler {
    
    constructor(oauth_credentials_service) {
        this.oauth_credentials_service = oauth_credentials_service;
    }

    /**
     * GET /api/v1/channels/:channel_key/oauth-credentials
     * Get OAuth credentials summary or full credentials for editing
     */
    async get_credentials(req, res, next) {
        try {
            const channel_key = req.params.channel_key;
            const include_secrets = req.query.include_secrets === 'true';
            
            if (include_secrets) {
                // Return decrypted credentials for editing
                const credentials = await this.oauth_credentials_service.get_credentials_by_key(channel_key);
                
                if (!credentials) {
                    return res.json({
                        data: {
                            configured: false
                        }
                    });
                }
                
                return res.json({
                    data: {
                        configured: true,
                        client_id: credentials.client_id,
                        client_secret: credentials.client_secret
                    }
                });
            }
            
            // Return masked summary
            const summary = await this.oauth_credentials_service.get_credentials_summary_by_key(channel_key);
            
            if (!summary) {
                return res.json({
                    data: {
                        configured: false
                    }
                });
            }
            
            res.json({
                data: {
                    configured: true,
                    ...summary
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/channels/:channel_key/oauth-credentials
     * Save or update OAuth credentials
     */
    async save_credentials(req, res, next) {
        try {
            const channel_key = req.params.channel_key;
            const { client_id, client_secret } = req.body;

            if (!client_id || !client_secret) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'VALIDATION_ERROR',
                        error_description: 'client_id and client_secret are required',
                        error_severity: 'error'
                    }]
                });
            }

            await this.oauth_credentials_service.save_credentials_by_key(
                req.principal,
                channel_key,
                client_id,
                client_secret
            );

            res.json({
                message: 'OAuth credentials saved successfully',
                channel_key: channel_key
            });
        } catch (error) {
            if (error.message && error.message.includes('Channel not found')) {
                return res.status(404).json({
                    errors: [{
                        error_code: 'CHANNEL_NOT_FOUND',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    }

    /**
     * DELETE /api/v1/channels/:channel_key/oauth-credentials
     * Delete OAuth credentials
     */
    async delete_credentials(req, res, next) {
        try {
            const channel_key = req.params.channel_key;

            await this.oauth_credentials_service.delete_credentials_by_key(
                req.principal,
                channel_key
            );

            res.json({
                message: 'OAuth credentials deleted successfully',
                channel_key: channel_key
            });
        } catch (error) {
            if (error.message && error.message.includes('Channel not found')) {
                return res.status(404).json({
                    errors: [{
                        error_code: 'CHANNEL_NOT_FOUND',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    }
}

module.exports = ChannelOAuthCredentialsHandler;

const crypto = require('crypto');

/**
 * Channel OAuth Credentials Service
 * 
 * Manages OAuth credentials with encryption
 */
class ChannelOAuthCredentialsService {

    constructor(credentials_repository, channel_service, system_logger) {
        this.credentials_repo = credentials_repository;
        this.channel_service = channel_service;
        this.logger = system_logger;
        this.logger_name = 'ChannelOAuthCredentialsService';

        // Encryption key from environment
        this.encryption_key = process.env.OAUTH_CREDENTIALS_ENCRYPTION_KEY || process.env.JWT_SECRET;
        
        if (!this.encryption_key) {
            throw new Error('OAUTH_CREDENTIALS_ENCRYPTION_KEY or JWT_SECRET must be set');
        }
    }

    /**
     * Encrypt sensitive data
     */
    _encrypt(text) {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(this.encryption_key, 'salt', 32);
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypt sensitive data
     */
    _decrypt(encrypted_text) {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(this.encryption_key, 'salt', 32);
        
        const parts = encrypted_text.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    /**
     * Save OAuth credentials for a channel by key
     */
    async save_credentials_by_key(principal, channel_key, client_id, client_secret) {
        // Get channel by key to obtain channel_id
        const channel = await this.channel_service.get_channel_by_key(channel_key);
        if (!channel) {
            throw new Error(`Channel not found: ${channel_key}`);
        }

        // Use the existing save_credentials method with the resolved channel_id
        return await this.save_credentials(principal, channel.id, client_id, client_secret);
    }

    /**
     * Save OAuth credentials for a channel (deprecated - use save_credentials_by_key)
     */
    async save_credentials(principal, channel_id, client_id, client_secret) {
        // Validate channel exists
        await this.channel_service.get_channel(channel_id);

        // Encrypt sensitive data
        const encrypted_client_id = this._encrypt(client_id);
        const encrypted_client_secret = this._encrypt(client_secret);

        // Check if credentials already exist
        const existing = await this.credentials_repo.has_credentials(channel_id);

        let credentials;
        if (existing) {
            // Update existing
            credentials = await this.credentials_repo.update(channel_id, {
                client_id: encrypted_client_id,
                client_secret: encrypted_client_secret,
                updated_by_user_id: principal.id
            });

            await this.logger.info(this.logger_name, 'OAuth credentials updated', {
                channel_id,
                updated_by: principal.id
            });
        } else {
            // Create new
            credentials = await this.credentials_repo.create({
                channel_id,
                client_id: encrypted_client_id,
                client_secret: encrypted_client_secret,
                created_by_user_id: principal.id
            });

            await this.logger.info(this.logger_name, 'OAuth credentials created', {
                channel_id,
                created_by: principal.id
            });
        }

        return credentials;
    }

    /**
     * Get decrypted credentials for OAuth flow by channel key
     */
    async get_credentials_by_key(channel_key) {
        const credentials = await this.credentials_repo.get_active_credentials_by_key(channel_key);
        
        if (!credentials) {
            return null;
        }

        // Decrypt sensitive data
        try {
            return {
                client_id: this._decrypt(credentials.client_id),
                client_secret: this._decrypt(credentials.client_secret),
                is_active: credentials.is_active
            };
        } catch (error) {
            await this.logger.error(this.logger_name, 'Failed to decrypt credentials', {
                channel_key,
                error: error.message
            });
            throw new Error('Failed to decrypt credentials');
        }
    }

    /**
     * Get decrypted credentials for OAuth flow (deprecated - use get_credentials_by_key)
     */
    async get_credentials(channel_id) {
        const credentials = await this.credentials_repo.get_active_credentials(channel_id);
        
        if (!credentials) {
            return null;
        }

        // Decrypt sensitive data
        try {
            return {
                client_id: this._decrypt(credentials.client_id),
                client_secret: this._decrypt(credentials.client_secret),
                is_active: credentials.is_active
            };
        } catch (error) {
            await this.logger.error(this.logger_name, 'Failed to decrypt credentials', {
                channel_id,
                error: error.message
            });
            throw new Error('Failed to decrypt credentials');
        }
    }

    /**
     * Get credentials summary by channel key (for display, no sensitive data)
     */
    async get_credentials_summary_by_key(channel_key) {
        const credentials = await this.credentials_repo.get_credentials_summary_by_key(channel_key);
        
        if (!credentials) {
            return null;
        }

        // Decrypt client_id and mask it for display
        try {
            const decrypted_client_id = this._decrypt(credentials.client_id);
            const masked_client_id = this._mask_client_id(decrypted_client_id);

            return {
                id: credentials.id,
                channel_id: credentials.channel_id,
                client_id_masked: masked_client_id,
                is_active: credentials.is_active,
                created_at: credentials.created_at,
                updated_at: credentials.updated_at
            };
        } catch (error) {
            await this.logger.error(this.logger_name, 'Failed to process credentials summary', {
                channel_key,
                error: error.message
            });
            throw new Error('Failed to process credentials summary');
        }
    }

    /**
     * Get credentials summary (deprecated - use get_credentials_summary_by_key)
     */
    async get_credentials_summary(channel_id) {
        const credentials = await this.credentials_repo.get_credentials_summary(channel_id);
        
        if (!credentials) {
            return null;
        }

        // Decrypt client_id and mask it for display
        try {
            const decrypted_client_id = this._decrypt(credentials.client_id);
            const masked_client_id = this._mask_client_id(decrypted_client_id);

            return {
                id: credentials.id,
                channel_id: credentials.channel_id,
                client_id_masked: masked_client_id,
                is_active: credentials.is_active,
                created_at: credentials.created_at,
                updated_at: credentials.updated_at
            };
        } catch (error) {
            await this.logger.error(this.logger_name, 'Failed to process credentials summary', {
                channel_id,
                error: error.message
            });
            throw new Error('Failed to process credentials summary');
        }
    }

    /**
     * Mask client ID for display (show first 8 and last 4 characters)
     */
    _mask_client_id(client_id) {
        if (!client_id || client_id.length <= 12) {
            return client_id; // Too short to mask meaningfully
        }
        
        const start = client_id.substring(0, 8);
        const end = client_id.substring(client_id.length - 4);
        return `${start}...${end}`;
    }

    /**
     * Delete OAuth credentials by channel key
     */
    async delete_credentials_by_key(principal, channel_key) {
        // Get channel by key to obtain channel_id
        const channel = await this.channel_service.get_channel_by_key(channel_key);
        if (!channel) {
            throw new Error(`Channel not found: ${channel_key}`);
        }

        return await this.delete_credentials(principal, channel.id);
    }

    /**
     * Delete OAuth credentials (deprecated - use delete_credentials_by_key)
     */
    async delete_credentials(principal, channel_id) {
        const deleted = await this.credentials_repo.delete(channel_id, principal.id);

        if (deleted) {
            await this.logger.info(this.logger_name, 'OAuth credentials deleted', {
                channel_id,
                deleted_by: principal.id
            });
        }

        return deleted;
    }

    /**
     * Check if channel has OAuth configured by key
     */
    async has_credentials_by_key(channel_key) {
        const credentials = await this.credentials_repo.get_active_credentials_by_key(channel_key);
        return credentials !== null;
    }

    /**
     * Check if channel has OAuth configured (deprecated - use has_credentials_by_key)
     */
    async has_credentials(channel_id) {
        return await this.credentials_repo.has_credentials(channel_id);
    }
}

module.exports = ChannelOAuthCredentialsService;

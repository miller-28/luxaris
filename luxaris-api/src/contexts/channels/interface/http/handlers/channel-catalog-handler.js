/**
 * Channel Catalog Handler
 * 
 * Handles HTTP requests for channel catalog operations
 */
class ChannelCatalogHandler {
    
    constructor(channel_service) {
        this.channel_service = channel_service;
    }

    /**
     * GET /api/v1/channels
     * List all available channels (catalog)
     */
    async list_channels(req, res, next) {
        try {
            const channels = await this.channel_service.list_available_channels();

            res.json({
                data: channels.map(channel => ({
                    id: channel.id,
                    key: channel.key,
                    name: channel.display_name,  // Use display_name for client display
                    status: channel.status,
                    limits: channel.limits,
                    created_at: channel.created_at,
                    updated_at: channel.updated_at
                }))
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = ChannelCatalogHandler;

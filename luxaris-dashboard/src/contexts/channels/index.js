/**
 * Channels Context - Entry Point
 * Exports for external use
 */

// Domain Models
export { Channel } from './domain/models/Channel';
export { ChannelConnection } from './domain/models/ChannelConnection';

// Validation Schemas
export * from './domain/rules/channelSchemas';

// API Repositories
export { channelsRepository } from './infrastructure/api/channelsRepository';
export { connectionsRepository } from './infrastructure/api/connectionsRepository';

// Store
export { useChannelsStore } from './infrastructure/store/channelsStore';

// Composables
export { useChannels } from './application/composables/useChannels';
export { useConnections } from './application/composables/useConnections';

// Routes
export { default as channelsRoutes } from './presentation/routes';

// Components (for potential reuse in other contexts)
export { default as ChannelCard } from './presentation/components/ChannelCard.vue';
export { default as ConnectionCard } from './presentation/components/ConnectionCard.vue';
export { default as DisconnectModal } from './presentation/components/DisconnectModal.vue';

// Views
export { default as ChannelsView } from './presentation/views/ChannelsView.vue';

/**
 * Channels Routes Configuration
 */
import AvailableChannelsView from './views/AvailableChannelsView.vue';
import ConnectedChannelsView from './views/ConnectedChannelsView.vue';

export const channelsRoutes = [
  {
    path: '/dashboard/channels',
    redirect: '/dashboard/channels/available'
  },
  {
    path: '/dashboard/channels/available',
    name: 'AvailableChannels',
    component: AvailableChannelsView,
    meta: {
      requiresAuth: true,
      permission: 'channels:read',
      title: 'Available Channels'
    }
  },
  {
    path: '/dashboard/channels/connections',
    name: 'ConnectedChannels',
    component: ConnectedChannelsView,
    meta: {
      requiresAuth: true,
      permission: 'channels:read',
      title: 'Connected Channels'
    }
  }
];

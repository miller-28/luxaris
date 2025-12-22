/**
 * Channels Routes Configuration
 */
import ChannelsView from './presentation/views/ChannelsView.vue';

export const channelsRoutes = [
  {
    path: '/dashboard/channels',
    redirect: '/dashboard/channels/all'
  },
  {
    path: '/dashboard/channels/all',
    name: 'Channels',
    component: ChannelsView,
    meta: {
      requiresAuth: true,
      permission: 'channels:read',
      title: 'Channels'
    }
  },
  // Legacy redirects for backwards compatibility
  {
    path: '/dashboard/channels/available',
    redirect: '/dashboard/channels/all'
  },
  {
    path: '/dashboard/channels/connections',
    redirect: '/dashboard/channels/all'
  }
];

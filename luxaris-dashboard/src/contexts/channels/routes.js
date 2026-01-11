/**
 * Channels Routes Configuration
 */
import ChannelsView from './presentation/views/ChannelsView.vue';

export default [
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
    }
];

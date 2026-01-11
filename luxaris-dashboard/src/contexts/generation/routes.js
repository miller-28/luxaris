/**
 * Templates Routes Configuration
 */
import TemplatesView from './presentation/views/TemplatesView.vue';

export default [
    {
        path: '/dashboard/templates',
        name: 'Templates',
        component: TemplatesView,
        meta: {
            requiresAuth: true,
            permission: 'templates:read',
            title: 'Templates'
        }
    }
];

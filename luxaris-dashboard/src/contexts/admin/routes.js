/**
 * Admin Routes
 */
export default [
    {
        path: '/dashboard/admin/users',
        name: 'AdminUsers',
        component: () => import('./presentation/views/UsersView.vue'),
        meta: {
            requiresAuth: true,
            permission: 'users:read'
        }
    },
    {
        path: '/dashboard/admin/users/:id',
        name: 'AdminUserDetail',
        component: () => import('./presentation/views/UserDetailView.vue'),
        meta: {
            requiresAuth: true,
            permission: 'users:read'
        }
    }
];

/**
 * Posts Routes Configuration
 */
import PostsView from './presentation/views/PostsView.vue';
import PostDetailView from './presentation/views/PostDetailView.vue';

export default [
    {
        path: '/dashboard/posts',
        name: 'Posts',
        component: PostsView,
        meta: { 
            requiresAuth: true,
            permission: 'posts:read',
            title: 'Posts'
        }
    },
    {
        path: '/dashboard/posts/:id',
        name: 'PostDetail',
        component: PostDetailView,
        meta: { 
            requiresAuth: true,
            permission: 'posts:read',
            title: 'Post Detail'
        }
    }
];

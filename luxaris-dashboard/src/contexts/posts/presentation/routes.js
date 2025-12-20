/**
 * Posts Routes Configuration
 */
import PostsView from './views/PostsView.vue';
import PostDetailView from './views/PostDetailView.vue';

export const postsRoutes = [
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

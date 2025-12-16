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
            title: 'Posts'
        }
    },
    {
        path: '/dashboard/posts/:id',
        name: 'PostDetail',
        component: PostDetailView,
        meta: { 
            requiresAuth: true,
            title: 'Post Detail'
        }
    }
];

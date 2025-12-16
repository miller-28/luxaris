<template>
    <div class="posts-grid">
        <v-row v-if="loading && posts.length === 0">
            <v-col v-for="n in 6" :key="n" cols="12" sm="6" md="4">
                <v-skeleton-loader type="card" />
            </v-col>
        </v-row>
        
        <v-row v-else-if="posts.length === 0">
            <v-col cols="12" class="text-center py-8">
                <v-icon icon="mdi-file-document-outline" size="64" color="grey" class="mb-4" />
                <div class="text-h6 text-grey">{{ $t('posts.noPostsFound') }}</div>
                <div class="text-body-2 text-grey mt-2">
                    {{ emptyMessage || $t('posts.emptyMessage') }}
                </div>
                <v-btn 
                    v-if="showCreateButton"
                    color="primary" 
                    class="mt-4"
                    @click="$emit('create')"
                >
                    {{ $t('posts.createYourFirstPost') }}
                </v-btn>
            </v-col>
        </v-row>
        
        <v-row v-else>
            <v-col 
                v-for="post in posts" 
                :key="post.id"
                cols="12" 
                sm="6" 
                md="4"
            >
                <PostCard 
                    :post="post"
                    :selected="selectedPostId === post.id"
                    :show-actions="showActions"
                    @click="$emit('select', post)"
                    @edit="$emit('edit', post)"
                    @delete="$emit('delete', post)"
                    @publish="$emit('publish', post)"
                    @unpublish="$emit('unpublish', post)"
                />
            </v-col>
        </v-row>
        
        <v-row v-if="loading && posts.length > 0">
            <v-col cols="12" class="text-center">
                <v-progress-circular indeterminate color="primary" />
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import PostCard from './PostCard.vue';

const { t: $t } = useI18n();

defineProps({
    posts: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    selectedPostId: {
        type: [Number, String, null],
        default: null
    },
    showActions: {
        type: Boolean,
        default: true
    },
    emptyMessage: {
        type: String,
        default: 'Create your first post to get started'
    },
    showCreateButton: {
        type: Boolean,
        default: true
    }
});

defineEmits(['select', 'edit', 'delete', 'publish', 'unpublish', 'create']);
</script>

<style scoped>
.posts-grid {
    width: 100%;
}
</style>

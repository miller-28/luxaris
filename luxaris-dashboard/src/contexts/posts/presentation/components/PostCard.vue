<template>
    <v-card 
        hover
        @click="handleClick"
        class="post-card"
        :class="{ 'post-card--selected': selected }"
    >
        <v-card-title class="d-flex align-center">
            <span class="text-truncate flex-grow-1">{{ post.title }}</span>
            <PostStatusBadge :status="post.status" class="ml-2" />
        </v-card-title>
        
        <v-card-text>
            <div v-if="post.description" class="text-body-2 text-grey-darken-1 mb-2 post-excerpt">
                {{ excerpt }}
            </div>
            
            <v-chip-group v-if="post.tags && post.tags.length > 0">
                <v-chip 
                    v-for="tag in post.tags" 
                    :key="tag"
                    size="x-small"
                    variant="outlined"
                >
                    {{ tag }}
                </v-chip>
            </v-chip-group>
            
            <div class="text-caption text-grey mt-3">
                <v-icon icon="mdi-clock-outline" size="x-small" class="mr-1" />
                {{ $t('posts.stats.updated') }} {{ formattedDate }}
            </div>
        </v-card-text>
        
        <v-card-actions v-if="showActions">
            <v-btn 
                icon="mdi-pencil" 
                size="small"
                variant="text"
                @click.stop="$emit('edit', post)"
            />
            <v-btn 
                icon="mdi-delete" 
                size="small"
                variant="text"
                color="error"
                @click.stop="$emit('delete', post)"
            />
            <v-spacer />
            <v-btn 
                v-if="post.status === 'draft'"
                color="primary"
                size="small"
                variant="text"
                @click.stop="$emit('publish', post)"
            >
                {{ $t('posts.actions.publish') }}
            </v-btn>
            <v-btn 
                v-else
                color="grey"
                size="small"
                variant="text"
                @click.stop="$emit('unpublish', post)"
            >
                {{ $t('posts.actions.unpublish') }}
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import PostStatusBadge from './PostStatusBadge.vue';

const { t: $t } = useI18n();

const props = defineProps({
    post: {
        type: Object,
        required: true
    },
    selected: {
        type: Boolean,
        default: false
    },
    showActions: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['click', 'edit', 'delete', 'publish', 'unpublish']);

const excerpt = computed(() => {
    if (!props.post.description) return '';
    return props.post.description.length > 150 
        ? props.post.description.substring(0, 150) + '...' 
        : props.post.description;
});

const formattedDate = computed(() => {
    const date = new Date(props.post.updated_at);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return $t('posts.time.justNow');
    if (minutes < 60) return $t('posts.time.minutesAgo', { count: minutes });
    if (hours < 24) return $t('posts.time.hoursAgo', { count: hours });
    if (days < 7) return $t('posts.time.daysAgo', { count: days });
    
    return date.toLocaleDateString();
});

const handleClick = () => {
    emit('click', props.post);
};
</script>

<style scoped>
.post-card {
    transition: all 0.2s;
    cursor: pointer;
}

.post-card:hover {
    transform: translateY(-2px);
}

.post-card--selected {
    border: 2px solid rgb(var(--v-theme-primary));
}

.post-excerpt {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    line-height: 1.5;
    max-height: 4.5em;
}
</style>

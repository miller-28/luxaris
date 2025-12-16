<template>
    <div class="variants-grid">
        <v-row v-if="loading && variants.length === 0">
            <v-col v-for="n in 3" :key="n" cols="12" md="6">
                <v-skeleton-loader type="card" />
            </v-col>
        </v-row>
        
        <v-row v-else-if="variants.length === 0">
            <v-col cols="12" class="text-center py-8">
                <v-icon icon="mdi-view-grid-outline" size="64" color="grey" class="mb-4" />
                <div class="text-h6 text-grey">{{ $t('posts.variants.noVariantsFound') }}</div>
                <div class="text-body-2 text-grey mt-2">
                    {{ $t('posts.variants.emptyMessage') }}
                </div>
                <v-btn 
                    color="primary" 
                    class="mt-4"
                    @click="$emit('create')"
                >
                    {{ $t('posts.variants.createVariant') }}
                </v-btn>
            </v-col>
        </v-row>
        
        <v-row v-else>
            <v-col 
                v-for="variant in variants" 
                :key="variant.id"
                cols="12" 
                md="6"
            >
                <v-card>
                    <v-card-title class="d-flex align-center">
                        <v-icon :icon="getPlatformIcon(variant.platform)" class="mr-2" />
                        <span>{{ variant.channelName }}</span>
                        <v-spacer />
                        <v-chip size="small" variant="tonal">
                            {{ variant.platform }}
                        </v-chip>
                    </v-card-title>
                    
                    <v-card-text>
                        <div class="text-body-2 mb-3 variant-content">
                            {{ variant.content }}
                        </div>
                        
                        <v-chip-group v-if="variant.media_urls && variant.media_urls.length > 0">
                            <v-chip 
                                v-for="(url, index) in variant.media_urls" 
                                :key="index"
                                size="small"
                                prepend-icon="mdi-image"
                            >
                                {{ $t('posts.variants.stats.media', { index: index + 1 }) }}
                            </v-chip>
                        </v-chip-group>
                        
                        <div class="text-caption text-grey mt-3">
                            {{ $t('posts.variants.stats.characters') }}: {{ variant.character_count || 0 }}
                        </div>
                    </v-card-text>
                    
                    <v-card-actions>
                        <v-btn 
                            icon="mdi-pencil" 
                            size="small"
                            variant="text"
                            @click="$emit('edit', variant)"
                        />
                        <v-btn 
                            icon="mdi-delete" 
                            size="small"
                            variant="text"
                            color="error"
                            @click="$emit('delete', variant)"
                        />
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const props = defineProps({
    variants: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    }
});

defineEmits(['create', 'edit', 'delete']);

const getPlatformIcon = (platform) => {
    const icons = {
        twitter: 'mdi-twitter',
        facebook: 'mdi-facebook',
        instagram: 'mdi-instagram',
        linkedin: 'mdi-linkedin',
        youtube: 'mdi-youtube'
    };
    return icons[platform?.toLowerCase()] || 'mdi-web';
};
</script>

<style scoped>
.variants-grid {
    width: 100%;
}

.variant-content {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    line-height: 1.5;
    max-height: 6em;
}
</style>

<template>
    <v-dialog v-model="dialog" max-width="600" scrollable>
        <template v-slot:activator="{ props }">
            <v-text-field
                v-bind="props"
                prepend-inner-icon="mdi-magnify"
                :placeholder="$t('common.searchPlaceholder')"
                variant="outlined"
                density="compact"
                hide-details
                readonly
                class="search-trigger"
                @click="openSearch"
            />
        </template>

        <v-card>
            <v-card-title>
                <v-text-field
                    v-model="searchQuery"
                    prepend-inner-icon="mdi-magnify"
                    :placeholder="$t('common.searchDetailedPlaceholder')"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    autofocus
                    clearable
                    @update:model-value="handleSearch"
                />
            </v-card-title>

            <v-divider />

            <v-card-text style="max-height: 400px;">
                <!-- Loading -->
                <div v-if="searching" class="text-center py-8">
                    <v-progress-circular indeterminate color="primary" />
                </div>

                <!-- No Results -->
                <div v-else-if="searchQuery && results.length === 0" class="text-center py-8">
                    <v-icon size="48" color="grey-lighten-1">mdi-magnify</v-icon>
                    <div class="text-body-2 mt-2 text-grey">{{ $t('common.noResultsFound') }}</div>
                </div>

                <!-- Results -->
                <v-list v-else-if="results.length > 0">
                    <template v-for="(group, groupName) in groupedResults" :key="groupName">
                        <v-list-subheader>{{ groupName }}</v-list-subheader>
                        <v-list-item
                            v-for="item in group"
                            :key="item.id"
                            :to="item.url"
                            @click="dialog = false"
                        >
                            <template v-slot:prepend>
                                <v-icon>{{ item.icon }}</v-icon>
                            </template>
                            <v-list-item-title>{{ item.title }}</v-list-item-title>
                            <v-list-item-subtitle>{{ item.subtitle }}</v-list-item-subtitle>
                        </v-list-item>
                    </template>
                </v-list>

                <!-- Empty State -->
                <div v-else class="text-center py-8">
                    <v-icon size="48" color="grey-lighten-1">mdi-text-search</v-icon>
                    <div class="text-body-2 mt-2 text-grey">Start typing to search</div>
                </div>
            </v-card-text>

            <v-divider />

            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="dialog = false">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const dialog = ref(false);
const searchQuery = ref('');
const searching = ref(false);
const results = ref([]);

// Mock search results (will be replaced with real API)
const mockResults = [
    {
        id: 1,
        type: 'posts',
        title: 'Getting Started with Vue 3',
        subtitle: 'Draft • Created 2 days ago',
        icon: 'mdi-file-document',
        url: '/dashboard/posts/1',
    },
    {
        id: 2,
        type: 'posts',
        title: 'Introduction to Composition API',
        subtitle: 'Published • 1 week ago',
        icon: 'mdi-file-document',
        url: '/dashboard/posts/2',
    },
    {
        id: 3,
        type: 'schedules',
        title: 'Social Media Post - LinkedIn',
        subtitle: 'Scheduled for Dec 15, 2025',
        icon: 'mdi-calendar-clock',
        url: '/dashboard/schedules/1',
    },
    {
        id: 4,
        type: 'templates',
        title: 'Product Launch Template',
        subtitle: 'Template • Last used yesterday',
        icon: 'mdi-file-document-edit',
        url: '/dashboard/templates/1',
    },
];

const groupedResults = computed(() => {
    const groups = {};
  
    results.value.forEach(item => {
        const groupName = item.type.charAt(0).toUpperCase() + item.type.slice(1);
        if (!groups[groupName]) {
            groups[groupName] = [];
        }
        groups[groupName].push(item);
    });
  
    return groups;
});

const openSearch = () => {
    dialog.value = true;
};

const handleSearch = (query) => {
    if (!query || query.length < 2) {
        results.value = [];
        return;
    }

    searching.value = true;

    // Simulate API delay
    setTimeout(() => {
        results.value = mockResults.filter(item =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.subtitle.toLowerCase().includes(query.toLowerCase()));
        searching.value = false;
    }, 300);
};

// Keyboard shortcut (Ctrl+K or Cmd+K)
const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        openSearch();
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.search-trigger {
  max-width: 400px;
}
</style>

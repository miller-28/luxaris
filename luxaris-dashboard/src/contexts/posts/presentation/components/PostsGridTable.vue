<template>
    <AbstractGridTable
        :headers="headers"
        :items="posts"
        :loading="loading"
        :items-per-page="itemsPerPage"
        :page="page"
        :sort-by="sortBy"
        :total-records="totalRecords"
        table-class="posts-grid-table"
        :empty-icon="'mdi-file-document-outline'"
        :empty-title="$t('posts.noPostsFound')"
        :empty-message="$t('posts.emptyMessage')"
        :empty-action-text="$t('posts.createYourFirstPost')"
        :show-empty-action="true"
        @row-click="handleRowClick"
        @sort-change="$emit('sort-change', $event)"
        @page-change="$emit('page-change', $event)"
        @per-page-change="$emit('per-page-change', $event)"
        @empty-action="$emit('create')"
    >
        <!-- Title Column -->
        <template #item.title="{ item }">
            <div class="text-truncate" style="max-width: 300px;">
                {{ item.title }}
            </div>
        </template>

        <!-- Description Column -->
        <template #item.description="{ item }">
            <div class="text-truncate text-grey" style="max-width: 400px;">
                {{ item.description }}
            </div>
        </template>

        <!-- Tags Column -->
        <template #item.tags="{ item }">
            <v-chip
                v-for="tag in (item.tags || []).slice(0, 2)"
                :key="tag"
                size="small"
                class="mr-1"
            >
                {{ tag }}
            </v-chip>
            <span v-if="item.tags && item.tags.length > 2" class="text-caption text-grey">
                +{{ item.tags.length - 2 }}
            </span>
        </template>

        <!-- Status Column -->
        <template #item.status="{ item }">
            <v-chip
                :color="item.status === 'published' ? 'success' : 'default'"
                size="small"
            >
                {{ $t(`posts.status.${item.status}`) }}
            </v-chip>
        </template>

        <!-- Updated At Column -->
        <template #item.updated_at="{ item }">
            <span class="text-caption">
                <template v-if="item.updated_at">
                    {{ new Date(item.updated_at).toLocaleDateString() }}
                    <br>
                    {{ new Date(item.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) }}
                </template>
                <template v-else>-</template>
            </span>
        </template>

        <!-- Actions Column -->
        <template #item.actions="{ item }">
            <div class="d-flex gap-1">
                <v-btn
                    icon="mdi-eye"
                    size="small"
                    variant="text"
                    @click.stop="$emit('view', item)"
                />
                <v-btn
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click.stop="$emit('edit', item)"
                />
                <v-btn
                    v-if="item.status === 'draft'"
                    icon="mdi-upload"
                    size="small"
                    variant="text"
                    color="success"
                    @click.stop="$emit('publish', item)"
                />
                <v-btn
                    v-else
                    icon="mdi-download"
                    size="small"
                    variant="text"
                    color="warning"
                    @click.stop="$emit('unpublish', item)"
                />
                <v-btn
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="error"
                    @click.stop="$emit('delete', item)"
                />
            </div>
        </template>
    </AbstractGridTable>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AbstractGridTable from '@/shared/components/AbstractGridTable.vue';

const { t: $t } = useI18n();

const props = defineProps({
    posts: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    itemsPerPage: {
        type: Number,
        default: 10
    },
    page: {
        type: Number,
        default: 1
    },
    sortBy: {
        type: Array,
        default: () => [{ key: 'updated_at', order: 'desc' }]
    },
    totalRecords: {
        type: Number,
        required: true
    }
});

const emit = defineEmits(['row-click', 'view', 'edit', 'delete', 'publish', 'unpublish', 'create', 'sort-change', 'page-change', 'per-page-change']);

// Table headers definition
const headers = computed(() => [
    { title: $t('posts.fields.title'), key: 'title', sortable: true },
    { title: $t('posts.fields.description'), key: 'description', sortable: true },
    { title: $t('posts.fields.tags'), key: 'tags', sortable: true },
    { title: $t('posts.fields.status'), key: 'status', sortable: true },
    { title: $t('posts.fields.updatedAt'), key: 'updated_at', sortable: true },
    { title: $t('posts.actions.actions'), key: 'actions', sortable: false }
]);

const handleRowClick = (event, { item }) => {
    emit('row-click', item);
};
</script>

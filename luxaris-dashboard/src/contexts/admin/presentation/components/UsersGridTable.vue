<template>
    <AbstractGridTable
        :headers="headers"
        :items="users"
        :loading="loading"
        :items-per-page="itemsPerPage"
        :page="page"
        :sort-by="sortBy"
        :total-records="totalRecords"
        :selectable="selectable"
        :selected-items="selectedItems"
        :item-key="itemKey"
        table-class="users-grid-table"
        :empty-icon="'mdi-account-outline'"
        :empty-title="$t('admin.users.noUsersFound')"
        :empty-message="$t('admin.users.emptyMessage')"
        @row-click="handleRowClick"
        @sort-change="$emit('sort-change', $event)"
        @page-change="$emit('page-change', $event)"
        @per-page-change="$emit('per-page-change', $event)"
        @update:selected-items="$emit('update:selected-items', $event)"
    >
        <!-- Name Column -->
        <template #item.name="{ item }">
            <div class="d-flex align-center gap-2">
                <div>
                    <div class="font-weight-medium">{{ item.name }}</div>
                    <div class="text-caption text-grey">{{ item.email }}</div>
                </div>
            </div>
        </template>

        <!-- Auth Method Column -->
        <template #item.auth_method="{ item }">
            <v-chip
                :color="item.auth_method === 'password' ? 'default' : 'info'"
                size="small"
            >
                {{ $t(`admin.users.authMethod.${item.auth_method}`) }}
            </v-chip>
        </template>

        <!-- Status Column -->
        <template #item.status="{ item }">
            <v-chip
                :color="getStatusColor(item.status)"
                size="small"
            >
                {{ $t(`admin.users.status.${item.status}`) }}
            </v-chip>
        </template>

        <!-- Root Badge Column -->
        <template #item.is_root="{ item }">
            <v-chip
                v-if="item.is_root"
                color="error"
                size="small"
            >
                {{ $t('admin.users.rootAdmin') }}
            </v-chip>
        </template>

        <!-- Created At Column -->
        <template #item.created_at="{ item }">
            <span class="text-caption">
                <template v-if="item.created_at">
                    {{ new Date(item.created_at).toLocaleDateString() }}
                    <br>
                    {{ new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) }}
                </template>
                <template v-else>-</template>
            </span>
        </template>

        <!-- Actions Column -->
        <template #item.actions="{ item }">
            <div class="d-flex gap-1">
                <v-btn
                    v-if="item.status === 'pending_approval'"
                    icon="mdi-check"
                    size="small"
                    variant="text"
                    color="success"
                    @click.stop="$emit('approve', item)"
                >
                    <v-icon>mdi-check</v-icon>
                    <v-tooltip activator="parent">{{ $t('admin.users.actions.approve') }}</v-tooltip>
                </v-btn>
                <v-btn
                    v-if="item.status === 'active' && !item.is_root"
                    icon="mdi-cancel"
                    size="small"
                    variant="text"
                    color="warning"
                    @click.stop="$emit('disable', item)"
                >
                    <v-icon>mdi-cancel</v-icon>
                    <v-tooltip activator="parent">{{ $t('admin.users.actions.disable') }}</v-tooltip>
                </v-btn>
                <v-btn
                    v-if="item.status === 'disabled'"
                    icon="mdi-check-circle"
                    size="small"
                    variant="text"
                    color="success"
                    @click.stop="$emit('enable', item)"
                >
                    <v-icon>mdi-check-circle</v-icon>
                    <v-tooltip activator="parent">{{ $t('admin.users.actions.enable') }}</v-tooltip>
                </v-btn>
                <v-btn
                    v-if="!item.is_root"
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="error"
                    @click.stop="$emit('delete', item)"
                >
                    <v-icon>mdi-delete</v-icon>
                    <v-tooltip activator="parent">{{ $t('admin.users.actions.delete') }}</v-tooltip>
                </v-btn>
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
    users: {
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
        default: () => [{ key: 'created_at', order: 'desc' }]
    },
    totalRecords: {
        type: Number,
        required: true
    },
    selectable: {
        type: Boolean,
        default: false
    },
    selectedItems: {
        type: Array,
        default: () => []
    },
    itemKey: {
        type: String,
        default: 'id'
    }
});

const emit = defineEmits([
    'row-click', 
    'approve', 
    'disable', 
    'enable', 
    'delete', 
    'sort-change', 
    'page-change', 
    'per-page-change', 
    'update:selected-items'
]);

// Table headers definition
const headers = computed(() => [
    { title: $t('admin.users.fields.name'), key: 'name', sortable: true },
    { title: $t('admin.users.fields.authMethod'), key: 'auth_method', sortable: true },
    { title: $t('admin.users.fields.status'), key: 'status', sortable: true },
    { title: $t('admin.users.fields.role'), key: 'is_root', sortable: true },
    { title: $t('admin.users.fields.createdAt'), key: 'created_at', sortable: true },
    { title: $t('admin.users.actions.actions'), key: 'actions', sortable: false }
]);

const handleRowClick = (event, { item }) => {
    emit('row-click', item);
};

const getInitials = (name) => {
    if (!name) {
        return '?';
    }
    const parts = name.split(' ');
    if (parts.length === 1) {
        return name.charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getStatusColor = (status) => {
    const colors = {
        'active': 'success',
        'pending_approval': 'warning',
        'disabled': 'error'
    };
    return colors[status] || 'default';
};
</script>

<style scoped>
.users-grid-table {
    /* Custom styles for users grid */
    min-height: 200px;
}
</style>

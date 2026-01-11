<template>
    <AbstractGridTable
        :headers="headers"
        :items="connections"
        :loading="loading"
        :items-per-page="connections.length || 10"
        :page="1"
        :total-records="connections.length"
        :hide-pagination="true"
        table-class="connections-grid-table"
        :empty-icon="'mdi-link-variant-off'"
        :empty-title="$t('channels.empty.noConnections')"
        :empty-message="$t('channels.connectionsDescription')"
        :show-empty-action="false"
        @row-click="handleRowClick"
    >
        <!-- Channel Name Column -->
        <template #item.channel_name="{ item }">
            <div class="d-flex align-center">
                <v-icon 
                    :icon="getChannelIcon(item.channel_key)" 
                    :color="getChannelColor(item.channel_key)" 
                    size="24" 
                    class="mr-2"
                />
                <div>
                    <div class="font-weight-medium">{{ item.channel_display_name }}</div>
                    <div class="text-caption text-grey">{{ item.channel_key }}</div>
                </div>
            </div>
        </template>

        <!-- Account Column -->
        <template #item.account="{ item }">
            <div v-if="item.account_username || item.account_email">
                <div class="text-body-2">{{ item.account_username || item.account_email }}</div>
                <div v-if="item.account_display_name" class="text-caption text-grey">{{ item.account_display_name }}</div>
            </div>
            <span v-else class="text-grey">-</span>
        </template>

        <!-- Status Column -->
        <template #item.status="{ item }">
            <v-chip
                :color="getStatusColor(item.status)"
                size="small"
                variant="tonal"
            >
                <v-icon
                    :icon="getStatusIcon(item.status)"
                    start
                    size="16"
                />
                {{ $t(`channels.status.${item.status}`) }}
            </v-chip>
        </template>

        <!-- Last Used Column -->
        <template #item.last_used_at="{ item }">
            <span class="text-caption">
                <template v-if="item.last_used_at">
                    {{ new Date(item.last_used_at).toLocaleDateString() }}
                    <br>
                    {{ new Date(item.last_used_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) }}
                </template>
                <template v-else>{{ $t('common.never') }}</template>
            </span>
        </template>

        <!-- Created At Column -->
        <template #item.created_at="{ item }">
            <span class="text-caption">
                {{ new Date(item.created_at).toLocaleDateString() }}
                <br>
                {{ new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) }}
            </span>
        </template>

        <!-- Actions Column -->
        <template #item.actions="{ item }">
            <div class="d-flex gap-1">
                <v-btn
                    icon="mdi-link-variant-off"
                    size="small"
                    variant="text"
                    color="error"
                    @click.stop="$emit('disconnect', item)"
                >
                    <v-icon icon="mdi-link-variant-off" />
                    <v-tooltip activator="parent" location="top">
                        {{ $t('channels.actions.disconnect') }}
                    </v-tooltip>
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
    connections: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['disconnect']);

const headers = computed(() => [
    {
        title: $t('channels.fields.channelName'),
        key: 'channel_name',
        sortable: true,
        width: '25%'
    },
    {
        title: $t('channels.fields.accountUsername'),
        key: 'account',
        sortable: true,
        width: '20%'
    },
    {
        title: $t('common.status'),
        key: 'status',
        sortable: true,
        width: '15%'
    },
    {
        title: $t('channels.fields.lastUsed'),
        key: 'last_used_at',
        sortable: true,
        width: '15%'
    },
    {
        title: $t('channels.fields.createdAt'),
        key: 'created_at',
        sortable: true,
        width: '15%'
    },
    {
        title: $t('common.actions'),
        key: 'actions',
        sortable: false,
        align: 'end',
        width: '10%'
    }
]);

const getChannelIcon = (key) => {
    const icons = {
        'linkedin': 'mdi-linkedin',
        'x': 'mdi-twitter',
        'twitter': 'mdi-twitter',
        'google': 'mdi-google'
    };
    return icons[key] || 'mdi-pound';
};

const getChannelColor = (key) => {
    const colors = {
        'linkedin': 'primary',
        'x': 'blue-darken-2',
        'twitter': 'blue-darken-2',
        'google': 'red'
    };
    return colors[key] || 'grey';
};

const getStatusColor = (status) => {
    const colors = {
        'active': 'success',
        'connected': 'success',
        'error': 'error',
        'expired': 'warning'
    };
    return colors[status] || 'default';
};

const getStatusIcon = (status) => {
    const icons = {
        'active': 'mdi-check-circle',
        'connected': 'mdi-check-circle',
        'error': 'mdi-alert-circle',
        'expired': 'mdi-clock-alert'
    };
    return icons[status] || 'mdi-circle-outline';
};

const handleRowClick = (event, { item }) => {
    // Optional: could navigate to connection detail view
};
</script>

<style scoped>
.connections-grid-table {
    height: 100%;
}
</style>

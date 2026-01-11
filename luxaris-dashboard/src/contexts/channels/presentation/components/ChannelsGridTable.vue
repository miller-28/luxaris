<template>
    <AbstractGridTable
        :headers="headers"
        :items="channelItems"
        :loading="loading"
        :items-per-page="channelItems.length || 10"
        :page="1"
        :total-records="channelItems.length"
        :hide-pagination="true"
        :selectable="selectable"
        :selected-items="selectedItems"
        :item-key="itemKey"
        table-class="channels-grid-table"
        :empty-icon="'mdi-pound'"
        :empty-title="$t('channels.empty.noChannels')"
        :empty-message="$t('channels.description')"
        :show-empty-action="false"
        @row-click="handleRowClick"
        @update:selected-items="$emit('update:selected-items', $event)"
    >
        <!-- Channel Name Column -->
        <template #item.name="{ item }">
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

        <!-- Status Column -->
        <template #item.status="{ item }">
            <v-chip
                :color="getStatusColor(item)"
                size="small"
                variant="tonal"
            >
                <v-icon
                    :icon="getStatusIcon(item)"
                    start
                    size="16"
                />
                {{ getStatusText(item) }}
            </v-chip>
        </template>

        <!-- Supported Features Column -->
        <template #item.features="{ item }">
            <div v-if="item.limits" class="d-flex flex-wrap" style="gap: 8px;">
                <v-chip
                    v-if="item.limits.max_images"
                    size="x-small"
                    variant="outlined"
                    class="mr-1"
                >
                    <v-icon icon="mdi-image" start size="12" />
                    {{ item.limits.max_images }} images
                </v-chip>
                <v-chip
                    v-if="item.limits.supports_links"
                    size="x-small"
                    variant="outlined"
                    color="primary"
                    class="mr-1"
                >
                    <v-icon icon="mdi-link" start size="12" />
                    Links
                </v-chip>
                <v-chip
                    v-if="item.limits.max_text_length"
                    size="x-small"
                    variant="outlined"
                >
                    <v-icon icon="mdi-text" start size="12" />
                    {{ item.limits.max_text_length }} chars
                </v-chip>
            </div>
            <span v-else class="text-grey">-</span>
        </template>

        <!-- Connected At Column -->
        <template #item.connected_at="{ item }">
            <span v-if="item.connection && item.connection.created_at" class="text-caption">
                {{ new Date(item.connection.created_at).toLocaleDateString() }}
                <br>
                {{ new Date(item.connection.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) }}
            </span>
            <span v-else class="text-grey">-</span>
        </template>

        <!-- Actions Column -->
        <template #item.actions="{ item }">
            <div class="d-flex gap-1">
                <!-- Connect Button (when not connected) -->
                <v-btn
                    v-if="!item.connection"
                    color="primary"
                    size="small"
                    variant="flat"
                    @click.stop="$emit('connect', item.channel_id)"
                >
                    <v-icon icon="mdi-link" start size="16" />
                    {{ $t('channels.actions.connect') }}
                </v-btn>

                <!-- Disconnect Button (when connected) -->
                <v-btn
                    v-else
                    size="small"
                    variant="flat"
                    color="error"
                    @click.stop="$emit('disconnect', item.connection)"
                >
                    <v-icon icon="mdi-link-variant-off" start size="16" />
                    {{ $t('channels.actions.disconnect') }}
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
    channels: {
        type: Array,
        default: () => []
    },
    connections: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
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
        default: 'channel_id'
    }
});

const emit = defineEmits(['connect', 'disconnect', 'update:selected-items']);

// Merge channels with their connections
const channelItems = computed(() => {
    return props.channels.map(channel => {
        // Find connection for this channel
        const connection = props.connections.find(conn => conn.channel_id === channel.id);
        
        return {
            channel_id: channel.id,
            channel_key: channel.key,
            channel_display_name: channel.display_name,
            limits: channel.limits,
            connection: connection || null
        };
    });
});

const headers = computed(() => [
    {
        title: $t('channels.fields.channelName'),
        key: 'name',
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
        title: $t('channels.fields.supportedFeatures'),
        key: 'features',
        sortable: false,
        width: '35%'
    },
    {
        title: $t('channels.fields.connectedAt'),
        key: 'connected_at',
        sortable: true,
        width: '15%'
    },
    {
        title: $t('common.actions'),
        key: 'actions',
        sortable: false,
        align: 'end',
        width: '15%'
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

const getStatusColor = (item) => {
    if (!item.connection) {
        return 'default';
    }
    
    const status = item.connection.status;
    const colors = {
        'active': 'success',
        'connected': 'success',
        'error': 'error',
        'expired': 'warning'
    };
    return colors[status] || 'success';
};

const getStatusIcon = (item) => {
    if (!item.connection) {
        return 'mdi-circle-outline';
    }
    
    const status = item.connection.status;
    const icons = {
        'active': 'mdi-check-circle',
        'connected': 'mdi-check-circle',
        'error': 'mdi-alert-circle',
        'expired': 'mdi-clock-alert'
    };
    return icons[status] || 'mdi-check-circle';
};

const getStatusText = (item) => {
    if (!item.connection) {
        return $t('channels.status.notConnected');
    }
    
    const status = item.connection.status;
    return $t(`channels.status.${status}`);
};

const handleRowClick = (event, { item }) => {
    if (!item.connection) {
        emit('connect', item.channel_id);
    }
};
</script>

<style scoped>
.channels-grid-table {
    height: 100%;
}
</style>

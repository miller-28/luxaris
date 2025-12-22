<template>
    
    <AbstractGridTable
        :headers="headers"
        :items="channels"
        :loading="loading"
        :items-per-page="channels.length || 10"
        :page="1"
        :total-records="channels.length"
        :hide-pagination="true"
        table-class="channels-grid-table"
        :empty-icon="'mdi-pound'"
        :empty-title="$t('channels.empty.noChannels')"
        :empty-message="$t('channels.availableDescription')"
        :show-empty-action="false"
        @row-click="handleRowClick"
    >
        <!-- Channel Name Column -->
        <template #item.name="{ item }">
            <div class="d-flex align-center">
                <v-icon 
                    :icon="getChannelIcon(item.key)" 
                    :color="getChannelColor(item.key)" 
                    size="24" 
                    class="mr-2"
                />
                <span class="font-weight-medium">{{ item.display_name }}</span>
            </div>
        </template>

        <!-- Key Column -->
        <template #item.key="{ item }">
            <span class="text-caption text-grey">{{ item.key }}</span>
        </template>

        <!-- Status Column -->
        <template #item.status="{ item }">
            <v-chip
                :color="isConnected(item.id) ? 'success' : 'default'"
                size="small"
                variant="tonal"
            >
                <v-icon
                    :icon="isConnected(item.id) ? 'mdi-check-circle' : 'mdi-circle-outline'"
                    start
                    size="16"
                />
                {{ isConnected(item.id) ? $t('channels.status.connected') : $t('channels.status.notConnected') }}
            </v-chip>
        </template>

        <!-- Features Column -->
        <template #item.features="{ item }">
            <v-chip
                v-for="feature in (item.supported_features || []).slice(0, 3)"
                :key="feature"
                size="x-small"
                class="mr-1"
                variant="outlined"
            >
                {{ feature }}
            </v-chip>
            <span v-if="item.supported_features && item.supported_features.length > 3" class="text-caption text-grey">
                +{{ item.supported_features.length - 3 }}
            </span>
        </template>

        <!-- Actions Column -->
        <template #item.actions="{ item }">
            <div class="d-flex gap-1">
                <v-btn
                    v-if="!isConnected(item.id)"
                    :color="'primary'"
                    size="small"
                    variant="flat"
                    @click.stop="$emit('connect', item.id)"
                >
                    <v-icon icon="mdi-link" start size="16" />
                    {{ $t('channels.actions.connect') }}
                </v-btn>
                <v-btn
                    v-else
                    color="primary"
                    size="small"
                    variant="tonal"
                    @click.stop="$emit('view-connections', item.id)"
                >
                    <v-icon icon="mdi-eye" start size="16" />
                    {{ $t('channels.actions.viewConnection') }}
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
    loading: {
        type: Boolean,
        default: false
    },
    isConnected: {
        type: Function,
        required: true
    }
});

const emit = defineEmits(['connect', 'view-connections']);

const headers = computed(() => [
    {
        title: $t('channels.fields.channelName'),
        key: 'name',
        sortable: true,
        width: '25%'
    },
    {
        title: $t('common.key'),
        key: 'key',
        sortable: true,
        width: '15%'
    },
    {
        title: $t('channels.fields.status'),
        key: 'status',
        sortable: false,
        width: '15%'
    },
    {
        title: $t('channels.fields.supportedFeatures'),
        key: 'features',
        sortable: false,
        width: '25%'
    },
    {
        title: $t('common.actions'),
        key: 'actions',
        sortable: false,
        align: 'end',
        width: '20%'
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

const handleRowClick = (event, { item }) => {
    if (!props.isConnected(item.id)) {
        emit('connect', item.id);
    } else {
        emit('view-connections', item.id);
    }
};
</script>

<style scoped>
.channels-grid-table {
    height: 100%;
}
</style>

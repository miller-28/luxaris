<template>
    
    <AbstractGridTable
        :headers="headers"
        :items="channels"
        :loading="loading"
        :items-per-page="channels.length || 10"
        :page="1"
        :total-records="channels.length"
        :hide-pagination="true"
        table-class="admin-channels-grid-table"
        :empty-icon="'mdi-cog'"
        :empty-title="$t('admin.channels.noChannels')"
        :empty-message="$t('admin.channels.description')"
        :show-empty-action="false"
    >
        <!-- Channel Name Column -->
        <template #item.name="{ item }">
            <div class="d-flex align-center">
                <v-icon 
                    :icon="getChannelIcon(item.channel_key)" 
                    :color="getChannelColor(item.channel_key)" 
                    size="32" 
                    class="mr-3"
                />
                <span class="text-h6">{{ item.display_name }}</span>
            </div>
        </template>

        <!-- Client ID Column -->
        <template #item.client_id="{ item }">
            <div v-if="item.configured && item.client_id_masked" class="font-monospace text-caption">
                {{ item.client_id_masked }}
            </div>
            <span v-else class="text-grey">-</span>
        </template>

        <!-- Status Column -->
        <template #item.status="{ item }">
            <v-chip
                :color="item.configured ? 'success' : 'warning'"
                size="small"
                variant="tonal"
            >
                <v-icon
                    :icon="item.configured ? 'mdi-check-circle' : 'mdi-alert-circle'"
                    start
                    size="16"
                />
                {{ item.configured ? $t('admin.channels.configured') : $t('admin.channels.notConfigured') }}
            </v-chip>
        </template>

        <!-- Actions Column -->
        <template #item.actions="{ item }">
            <div class="d-flex justify-end" style="gap: 12px;">
                <v-btn
                    color="primary"
                    size="small"
                    variant="flat"
                    @click.stop="$emit('configure', item.channel_key, item.display_name)"
                    class="mr-2"
                >
                    <v-icon icon="mdi-cog" start size="16" />
                    {{ item.configured ? $t('admin.channels.reconfigure') : $t('admin.channels.configure') }}
                </v-btn>
                <v-btn
                    v-if="item.configured"
                    color="error"
                    size="small"
                    variant="flat"
                    @click.stop="$emit('delete', item.display_name, item.channel_key)"
                >
                    <v-icon icon="mdi-delete" start size="16" />
                    {{ $t('admin.channels.delete') }}
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
    }
});

const emit = defineEmits(['configure', 'delete']);

const headers = computed(() => [
    {
        title: $t('channels.fields.channelName'),
        key: 'name',
        sortable: true,
        width: '30%'
    },
    {
        title: $t('admin.channels.clientId'),
        key: 'client_id',
        sortable: false,
        width: '25%'
    },
    {
        title: $t('common.status'),
        key: 'status',
        sortable: true,
        width: '20%'
    },
    {
        title: $t('common.actions'),
        key: 'actions',
        sortable: false,
        align: 'end',
        width: '25%'
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
</script>

<style scoped>
.admin-channels-grid-table {
    height: 100%;
}
</style>

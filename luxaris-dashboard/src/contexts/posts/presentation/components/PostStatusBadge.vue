<template>
    <v-chip 
        :color="statusConfig[status].color" 
        size="small"
        variant="flat"
    >
        <v-icon :icon="statusConfig[status].icon" start size="small" />
        {{ statusConfig[status].text }}
    </v-chip>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    status: {
        type: String,
        required: true,
        validator: (value) => ['draft', 'published'].includes(value)
    }
});

const statusConfig = computed(() => ({
    draft: {
        color: 'grey',
        text: 'Draft',
        icon: 'mdi-file-document-outline'
    },
    published: {
        color: 'success',
        text: 'Published',
        icon: 'mdi-check-circle'
    }
}));
</script>

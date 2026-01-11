<template>
    <v-card 
        elevation="2"
        :class="{ 'clickable-card': clickable }"
        @click="handleClick"
    >
        <v-card-text>
            <div class="dashboard-total-container">
                <div class="dashboard-total-content">
                    <div class="dashboard-total-header">
                        <div class="text-grey text-body-2">{{ title }}</div>
                    </div>
                    
                    <div class="dashboard-total-body">
                        <div class="dashboard-total-main">
                            <div class="text-h4 font-weight-bold">{{ count }}</div>
                        </div>
                        
                        <div v-if="secondaryCount !== null && secondaryCount !== undefined" class="dashboard-total-secondary">
                            <v-chip
                                size="small"
                                variant="tonal"
                                :color="secondaryColor"
                            >
                                {{ secondaryCount }} {{ secondaryLabel }}
                            </v-chip>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-total-icon">
                    <v-icon size="48" color="primary">{{ icon }}</v-icon>
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
const props = defineProps({
    title: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    secondaryCount: {
        type: Number,
        default: null
    },
    secondaryLabel: {
        type: String,
        default: ''
    },
    secondaryColor: {
        type: String,
        default: 'grey'
    },
    clickable: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['click']);

const handleClick = () => {
    if (props.clickable) {
        emit('click');
    }
};
</script>

<style scoped>
.dashboard-total-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
}

.dashboard-total-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
}

.dashboard-total-header {
    margin-bottom: 4px;
}

.dashboard-total-body {
    display: flex;
    align-items: center;
    gap: 16px;
}

.dashboard-total-main {
    flex-shrink: 0;
}

.dashboard-total-secondary {
    flex-shrink: 0;
}

.dashboard-total-icon {
    flex-shrink: 0;
}

.clickable-card {
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

.clickable-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}
</style>

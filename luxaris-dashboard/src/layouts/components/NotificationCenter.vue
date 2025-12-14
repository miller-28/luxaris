<template>
    <v-menu offset-y>
        <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props">
                <v-badge
                    :content="unreadCount"
                    :model-value="unreadCount > 0"
                    color="error"
                    overlap
                >
                    <v-icon>mdi-bell-outline</v-icon>
                </v-badge>
            </v-btn>
        </template>

        <v-card min-width="350" max-width="400">
            <v-card-title class="d-flex align-center justify-space-between">
                <span>Notifications</span>
                <v-btn
                    v-if="notifications.length > 0"
                    variant="text"
                    size="small"
                    @click="markAllAsRead"
                >
                    Mark all read
                </v-btn>
            </v-card-title>

            <v-divider />

            <v-list v-if="notifications.length > 0" max-height="400" class="overflow-y-auto">
                <v-list-item
                    v-for="notification in notifications"
                    :key="notification.id"
                    :class="{ 'bg-blue-grey-lighten-5': !notification.read }"
                    @click="markAsRead(notification.id)"
                >
                    <template v-slot:prepend>
                        <v-icon :color="getNotificationColor(notification.type)">
                            {{ getNotificationIcon(notification.type) }}
                        </v-icon>
                    </template>

                    <v-list-item-title>{{ notification.title }}</v-list-item-title>
                    <v-list-item-subtitle>{{ notification.message }}</v-list-item-subtitle>

                    <template v-slot:append>
                        <v-list-item-action>
                            <span class="text-caption">{{ formatTime(notification.created_at) }}</span>
                        </v-list-item-action>
                    </template>
                </v-list-item>
            </v-list>

            <v-card-text v-else class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-bell-off-outline</v-icon>
                <div class="text-body-2 mt-2 text-grey">No notifications</div>
            </v-card-text>

            <v-divider />

            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" size="small" to="/dashboard/notifications">
                    View all
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-menu>
</template>

<script setup>
import { ref, computed } from 'vue';
import { formatDistanceToNow } from 'date-fns';

// Mock notifications (will be replaced with real API)
const notifications = ref([
    {
        id: 1,
        type: 'success',
        title: 'Post Published',
        message: 'Your post "Getting Started with Vue 3" has been published successfully.',
        read: false,
        created_at: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
        id: 2,
        type: 'warning',
        title: 'Schedule Pending',
        message: 'Post scheduled for today at 3:00 PM is pending approval.',
        read: false,
        created_at: new Date(Date.now() - 30 * 60 * 1000),
    },
    {
        id: 3,
        type: 'info',
        title: 'New Connection',
        message: 'LinkedIn account connected successfully.',
        read: true,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
]);

const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.read).length;
});

const getNotificationIcon = (type) => {
    const icons = {
        success: 'mdi-check-circle',
        error: 'mdi-alert-circle',
        warning: 'mdi-alert',
        info: 'mdi-information',
    };
    return icons[type] || 'mdi-bell';
};

const getNotificationColor = (type) => {
    const colors = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info',
    };
    return colors[type] || 'grey';
};

const formatTime = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
};

const markAsRead = (id) => {
    const notification = notifications.value.find(n => n.id === id);
    if (notification) {
        notification.read = true;
    }
};

const markAllAsRead = () => {
    notifications.value.forEach(n => {
        n.read = true;
    });
};
</script>

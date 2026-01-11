<template>
    <v-list density="compact" nav>
        <!-- Dashboard -->
        <v-list-item
            prepend-icon="mdi-view-dashboard"
            :title="$t('nav.dashboard')"
            value="dashboard"
            to="/dashboard"
            :active="isActive('/dashboard')"
        />

        <!-- Channels -->
        <v-list-item
            v-if="can('read', 'channels')"
            prepend-icon="mdi-pound"
            :title="$t('nav.channels')"
            value="channels"
            to="/dashboard/channels"
            :active="isActive('/dashboard/channels')"
        />

        <!-- Posts -->
        <v-list-item
            v-if="can('read', 'posts')"
            prepend-icon="mdi-file-document-multiple"
            :title="$t('nav.posts')"
            value="posts"
            to="/dashboard/posts"
            :active="isActive('/dashboard/posts')"
        />

        <!-- Templates -->
        <v-list-item
            v-if="can('read', 'templates')"
            prepend-icon="mdi-file-document-edit"
            :title="$t('nav.templates')"
            value="templates"
            to="/dashboard/templates"
            :active="isActive('/dashboard/templates')"
        />

        <!-- Schedules -->
        <v-list-item
            v-if="can('read', 'schedules')"
            prepend-icon="mdi-calendar-clock"
            :title="$t('nav.schedules')"
            value="schedules"
            to="/dashboard/schedules"
            :active="isActive('/dashboard/schedules')"
        />

        <v-divider class="my-2" />

        <!-- Admin Section -->
        <v-list-group v-if="isAdmin" class="admin-group">
            <template v-slot:activator="{ props }">
                <v-list-item
                    v-bind="props"
                    prepend-icon="mdi-shield-crown"
                    :title="$t('nav.admin')"
                />
            </template>

            <v-list-item
                prepend-icon="mdi-account-multiple"
                :title="$t('nav.users')"
                value="admin-users"
                to="/dashboard/admin/users"
                :active="isActive('/dashboard/admin/users')"
                class="sub-menu-item"
            />

            <v-list-item
                prepend-icon="mdi-link-variant"
                :title="$t('nav.adminChannels')"
                value="admin-channels"
                to="/dashboard/admin/channels"
                :active="isActive('/dashboard/admin/channels')"
                class="sub-menu-item"
            />

            <v-list-item
                prepend-icon="mdi-cog"
                :title="$t('nav.settings')"
                value="admin-settings"
                to="/dashboard/admin/settings"
                :active="isActive('/dashboard/admin/settings')"
                class="sub-menu-item"
            />
        </v-list-group>
    </v-list>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePermissions } from '@/contexts/system/application/composables/usePermissions';

const route = useRoute();
const { can, isAdmin } = usePermissions();

const isActive = (path) => {
    // Exact match for dashboard home only
    if (path === '/dashboard') {
        return route.path === '/dashboard';
    }
    // For other routes, check if current path starts with it
    return route.path === path || route.path.startsWith(path + '/');
};
</script>

<style scoped>
/* Remove default indentation from Vuetify sub-menu items */
.channels-group :deep(.v-list-group__items),
.admin-group :deep(.v-list-group__items) {
    padding-inline-start: 0 !important;
    --indent-padding: 0 !important;
}

/* Remove padding from individual sub-menu items */
.channels-group :deep(.v-list-group__items .v-list-item),
.admin-group :deep(.v-list-group__items .v-list-item) {
    padding-inline-start: 16px !important;
}

/* Add different background color to sub-menu items */
.sub-menu-item {
    background-color: rgba(255, 255, 255, 0.03) !important;
}

.sub-menu-item:hover {
    background-color: rgba(255, 255, 255, 0.08) !important;
}

/* Style active sub-menu items */
.sub-menu-item.v-list-item--active {
    background-color: rgba(255, 255, 255, 0.1) !important;
}
</style>

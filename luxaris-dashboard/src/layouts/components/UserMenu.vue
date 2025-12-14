<template>
  <v-menu offset-y>
    <template v-slot:activator="{ props }">
      <v-btn icon v-bind="props">
        <v-avatar size="36" color="primary">
          <v-icon v-if="!user?.avatar">mdi-account</v-icon>
          <v-img v-else :src="user.avatar" :alt="user.name" />
        </v-avatar>
      </v-btn>
    </template>

    <v-card min-width="250">
      <v-list>
        <!-- User Info -->
        <v-list-item>
          <template v-slot:prepend>
            <v-avatar color="primary" size="40">
              <v-icon v-if="!user?.avatar">mdi-account</v-icon>
              <v-img v-else :src="user.avatar" :alt="user.name" />
            </v-avatar>
          </template>

          <v-list-item-title>{{ user?.name || $t('user.user') }}</v-list-item-title>
          <v-list-item-subtitle>{{ user?.email }}</v-list-item-subtitle>
        </v-list-item>

        <v-divider class="my-2" />

        <!-- Profile -->
        <v-list-item
          prepend-icon="mdi-account-circle"
          :title="$t('user.profile')"
          to="/dashboard/profile"
        />

        <!-- Settings -->
        <v-list-item
          prepend-icon="mdi-cog"
          :title="$t('user.settings')"
          to="/dashboard/settings"
        />

        <v-divider class="my-2" />

        <!-- Theme Switcher -->
        <v-list-item>
          <template v-slot:prepend>
            <v-icon>{{ themeIcon }}</v-icon>
          </template>
          <v-list-item-title>{{ $t('user.theme') }}</v-list-item-title>
          <template v-slot:append>
            <v-btn-toggle
              :model-value="theme.mode"
              mandatory
              density="compact"
              @update:model-value="toggleTheme"
            >
              <v-btn value="light" size="x-small" icon>
                <v-icon size="small">mdi-white-balance-sunny</v-icon>
              </v-btn>
              <v-btn value="dark" size="x-small" icon>
                <v-icon size="small">mdi-moon-waning-crescent</v-icon>
              </v-btn>
            </v-btn-toggle>
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <!-- Logout -->
        <v-list-item
          prepend-icon="mdi-logout"
          :title="$t('user.logout')"
          @click="handleLogout"
        />
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup>
import { computed } from 'vue';
import { useTheme } from 'vuetify';
import { useAuth } from '@/contexts/system/application/composables/useAuth';
import { usePreset } from '@/contexts/system/application/composables/usePreset';

const vuetifyTheme = useTheme();
const { user, logout } = useAuth();
const { theme, updateTheme } = usePreset();

const themeIcon = computed(() => {
  return theme.value.mode === 'dark' ? 'mdi-moon-waning-crescent' : 'mdi-white-balance-sunny';
});

const toggleTheme = (mode) => {
  // Update Vuetify theme
  vuetifyTheme.global.name.value = mode === 'dark' ? 'dark' : 'light';
  
  // Save to preset
  updateTheme({ mode });
};

const handleLogout = async () => {
  await logout();
};
</script>

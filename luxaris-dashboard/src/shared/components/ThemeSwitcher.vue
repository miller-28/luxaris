<template>
    <v-menu>
        <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props">
                <v-icon>{{ themeIcon }}</v-icon>
            </v-btn>
        </template>
    
        <v-list>
            <v-list-item @click="setTheme('light')">
                <template v-slot:prepend>
                    <v-icon>mdi-white-balance-sunny</v-icon>
                </template>
                <v-list-item-title>Light</v-list-item-title>
                <template v-slot:append v-if="theme.mode === 'light'">
                    <v-icon>mdi-check</v-icon>
                </template>
            </v-list-item>
      
            <v-list-item @click="setTheme('dark')">
                <template v-slot:prepend>
                    <v-icon>mdi-moon-waning-crescent</v-icon>
                </template>
                <v-list-item-title>Dark</v-list-item-title>
                <template v-slot:append v-if="theme.mode === 'dark'">
                    <v-icon>mdi-check</v-icon>
                </template>
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script setup>
import { computed } from 'vue';
import { useTheme } from 'vuetify';
import { usePreset } from '@/contexts/system/application/composables/usePreset';

const vuetifyTheme = useTheme();
const { theme, updateTheme } = usePreset();

const themeIcon = computed(() => {
    return theme.value.mode === 'dark' ? 'mdi-moon-waning-crescent' : 'mdi-white-balance-sunny';
});

const setTheme = (mode) => {
    // Update Vuetify theme
    vuetifyTheme.global.name.value = mode === 'dark' ? 'dark' : 'light';
  
    // Save to preset
    updateTheme({ mode });
};
</script>

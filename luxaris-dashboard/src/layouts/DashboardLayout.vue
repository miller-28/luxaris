<template>
    <v-layout>
        <!-- App Bar -->
        <v-app-bar color="surface" elevation="0" border="b">
            <!-- Mobile Menu Toggle -->
            <v-app-bar-nav-icon
                class="d-md-none"
                @click="openMobileNav"
            />

            <!-- Desktop Sidebar Toggle -->
            <v-app-bar-nav-icon
                class="d-none d-md-flex"
                @click="rail = !rail"
            />

            <!-- Logo / Title -->
            <v-toolbar-title class="d-flex align-center">
                <v-icon size="28" color="primary" class="mr-2">mdi-infinity</v-icon>
                <span class="font-weight-bold">Luxaris</span>
            </v-toolbar-title>

            <v-spacer />

            <!-- Global Search (Desktop) -->
            <div class="d-none d-md-block mx-4">
                <GlobalSearch />
            </div>

            <v-spacer />

            <!-- Notification Center -->
            <NotificationCenter />

            <!-- User Menu -->
            <UserMenu />
        </v-app-bar>

        <!-- Desktop Navigation Drawer -->
        <v-navigation-drawer
            v-model="drawer"
            :rail="rail"
            permanent
            class="d-none d-md-flex"
        >
            <template v-slot:prepend>
                <v-list-item
                    v-if="!rail"
                    class="px-2"
                    prepend-icon="mdi-infinity"
                    title="Luxaris"
                    subtitle="Dashboard"
                />
            </template>

            <SidebarNav />

            <template v-slot:append>
                <div class="pa-2">
                    <v-btn
                        v-if="!rail"
                        block
                        variant="outlined"
                        prepend-icon="mdi-chevron-left"
                        @click="rail = true"
                    >
                        Collapse
                    </v-btn>
                    <v-btn
                        v-else
                        icon
                        variant="text"
                        @click="rail = false"
                    >
                        <v-icon>mdi-chevron-right</v-icon>
                    </v-btn>
                </div>
            </template>
        </v-navigation-drawer>

        <!-- Mobile Navigation Drawer -->
        <MobileNav ref="mobileNavRef" class="d-md-none" />

        <!-- Main Content -->
        <v-main style="background-color: #0A0A0A;">
            <v-container fluid>
                <slot />
            </v-container>
        </v-main>
    </v-layout>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { usePreset } from '@/contexts/system/application/composables/usePreset';
import SidebarNav from './components/SidebarNav.vue';
import NotificationCenter from './components/NotificationCenter.vue';
import UserMenu from './components/UserMenu.vue';
import GlobalSearch from './components/GlobalSearch.vue';
import MobileNav from './components/MobileNav.vue';

const { sidebarState, updateSidebarState, isLoaded } = usePreset();

const drawer = ref(true);
const rail = ref(false);
const mobileNavRef = ref(null);

// Load saved sidebar state from preset
onMounted(() => {
    if (isLoaded.value) {
        rail.value = sidebarState.value.collapsed;
    }
});

// Watch for preset loading
watch(isLoaded, (loaded) => {
    if (loaded) {
        rail.value = sidebarState.value.collapsed;
    }
});

// Save sidebar state changes to preset
watch(rail, (newValue) => {
    if (isLoaded.value) {
        updateSidebarState({ collapsed: newValue });
    }
});

// Open mobile navigation
const openMobileNav = () => {
    mobileNavRef.value?.open();
};
</script>

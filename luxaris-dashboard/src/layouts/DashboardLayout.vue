<template>
    <v-layout>
        <!-- App Bar -->
        <v-app-bar 
            color="surface" 
            elevation="0" 
            border="b"
        >
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
                <span class="font-weight-bold">Luxaris</span>
            </v-toolbar-title>

            <v-spacer />

            <!-- Global Search (Desktop) - Wider search field -->
            <div class="d-none d-md-block" style="width: 350px; max-width: 350px;">
                <GlobalSearch />
            </div>

            <!-- Notification Center -->
            <NotificationCenter />

            <!-- User Menu -->
            <UserMenu />
        </v-app-bar>

        <!-- Desktop Navigation Drawer -->
        <v-navigation-drawer
            v-if="isDesktop"
            v-model="drawer"
            :rail="rail"
            permanent
        >
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

        <!-- Mobile Vertical Menu -->
        <div
            v-if="mobileMenuOpen"
            class="d-md-none mobile-menu-overlay"
            @click="mobileMenuOpen = false"
        ></div>
        <v-slide-y-transition>
            <div
                v-if="mobileMenuOpen"
                class="d-md-none mobile-menu-container"
            >
                <v-card color="surface" elevation="8" class="mobile-menu-card">
                    <v-card-text class="pa-0">
                        <SidebarNav @navigate="mobileMenuOpen = false" />
                    </v-card-text>
                </v-card>
            </div>
        </v-slide-y-transition>

        <!-- Main Content -->
        <v-main class="app-main">
            <v-container
                fluid
                class="main-container"
                :class="{ 'mobile-container': $vuetify.display.mobile }"
            >
                <slot />
            </v-container>
        </v-main>
    </v-layout>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePreset } from '@/contexts/system/application/composables/usePreset';
import SidebarNav from './components/SidebarNav.vue';
import NotificationCenter from './components/NotificationCenter.vue';
import UserMenu from './components/UserMenu.vue';
import GlobalSearch from './components/GlobalSearch.vue';
import { useDisplay } from 'vuetify';

const { sidebarState, updateSidebarState, isLoaded } = usePreset();
const route = useRoute();

const drawer = ref(true);
const rail = ref(false);
const mobileMenuOpen = ref(false);
const appBarHeight = ref(56);
const display = useDisplay();
const isDesktop = computed(() => display.mdAndUp.value);

// Load saved sidebar state from preset
onMounted(() => {
    if (isLoaded.value) {
        rail.value = sidebarState.value.collapsed;
    }
    
    // Get actual app bar height
    setTimeout(() => {
        const appBar = document.querySelector('.v-app-bar');
        if (appBar) {
            appBarHeight.value = appBar.offsetHeight;
        }
    }, 100);
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

// Close mobile menu on route change
watch(() => route.path, () => {
    mobileMenuOpen.value = false;
});

// Toggle mobile navigation
const openMobileNav = () => {
    mobileMenuOpen.value = !mobileMenuOpen.value;
};

// Lock body scroll when mobile menu is open
watch(mobileMenuOpen, (open) => {
    const body = document.body;
    if (!body) {
        return;
    }
    if (open) {
        body.dataset.prevOverflow = body.style.overflow || '';
        body.style.overflow = 'hidden';
    } else {
        body.style.overflow = body.dataset.prevOverflow || '';
        delete body.dataset.prevOverflow;
    }
});
</script>

<style scoped>

/* Mobile menu overlay (backdrop) */
.mobile-menu-overlay {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
}

/* Mobile menu container */
.mobile-menu-container {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1001;
    width: 100%;
    overflow-y: auto;
}

.mobile-menu-card {
    border-radius: 0 !important;
    width: 100%;
    margin: 0;
}

/* Mobile container styling */
:deep(.mobile-container) {
    padding: 12px !important;
    max-width: 100% !important;
}

/* Ensure app bar stays on top */
:deep(.v-app-bar) {
    position: fixed !important;
    top: 0 !important;
    z-index: 1002 !important;
}

.app-main {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    background-color: #0A0A0A;
    --v-layout-top: 0px !important;
    --v-layout-bottom: 0px !important;
}

:deep(.app-main .v-main__wrap) {
    padding: 0 !important;
}

.main-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0 !important;
    max-width: 100% !important;
}
</style>

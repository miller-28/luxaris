<template>
    <v-navigation-drawer
        v-model="drawer"
        temporary
        location="left"
        width="280"
    >
        <v-list density="compact" nav>
            <v-list-item
                prepend-icon="mdi-close"
                title="Close"
                @click="drawer = false"
            />
        </v-list>

        <v-divider class="mb-2" />

        <SidebarNav />
    </v-navigation-drawer>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import SidebarNav from './SidebarNav.vue';

const drawer = ref(false);
const route = useRoute();

// Close drawer on route change
watch(() => route.path, () => {
    drawer.value = false;
});

// Expose method to open drawer
defineExpose({
    open: () => {
        drawer.value = true;
    },
});
</script>

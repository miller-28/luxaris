<template>
    <DashboardLayout>
        <div class="page-content">
            <!-- Header -->
            <AbstractPageHeader
                :title="$t('nav.dashboard')"
                :subtitle="$t('app.welcomeMessage')"
            />

            <v-row class="ma-4 dashboard-tiles-row">
                <v-col cols="12" sm="6" md="3">
                    <AbstractDashboardTotalContainer
                        :title="$t('dashboard.totalPosts')"
                        :count="totalPosts"
                        icon="mdi-file-document"
                        :secondary-count="draftPosts"
                        :secondary-label="$t('posts.status.draft').toLowerCase()"
                        secondary-color="grey"
                        :clickable="true"
                        @click="navigateToPosts"
                    />
                </v-col>

                <v-col cols="12" sm="6" md="3">
                    <AbstractDashboardTotalContainer
                        :title="$t('dashboard.channels')"
                        :count="totalChannels"
                        icon="mdi-pound"
                        :secondary-count="connectedChannels"
                        :secondary-label="$t('channels.status.connected').toLowerCase()"
                        secondary-color="success"
                        :clickable="true"
                        @click="navigateToChannels"
                    />
                </v-col>

                <v-col cols="12" sm="6" md="3">
                    <AbstractDashboardTotalContainer
                        :title="$t('dashboard.scheduled')"
                        :count="0"
                        icon="mdi-calendar-clock"
                    />
                </v-col>

                <v-col cols="12" sm="6" md="3">
                    <AbstractDashboardTotalContainer
                        :title="$t('dashboard.generated')"
                        :count="0"
                        icon="mdi-sparkles"
                    />
                </v-col>
            </v-row>

            <v-card class="ma-4" elevation="2">
                <v-card-title>{{ $t('dashboard.recentActivity') }}</v-card-title>
                <v-card-text>
                    <p class="text-grey">{{ $t('dashboard.noRecentActivity') }}</p>
                </v-card-text>
            </v-card>
        </div>
    </DashboardLayout>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import AbstractPageHeader from '@/shared/components/AbstractPageHeader.vue';
import AbstractDashboardTotalContainer from '@/shared/components/AbstractDashboardTotalContainer.vue';
import { usePosts } from '@/contexts/posts/application/composables/usePosts';
import { useChannels } from '@/contexts/channels/application/composables/useChannels';
import { useConnections } from '@/contexts/channels/application/composables/useConnections';

const router = useRouter();
const { posts, loadPosts } = usePosts();
const { channels, loadChannels } = useChannels();
const { activeConnections, loadConnections } = useConnections();

// Total posts count
const totalPosts = computed(() => posts.value.length);

// Draft posts count
const draftPosts = computed(() => {
    return posts.value.filter(post => post.status === 'draft').length;
});

// Total channels count
const totalChannels = computed(() => channels.value.length);

// Connected channels count
const connectedChannels = computed(() => activeConnections.value.length);

// Navigation methods
const navigateToPosts = () => {
    router.push('/dashboard/posts');
};

const navigateToChannels = () => {
    router.push('/dashboard/channels');
};

onMounted(async () => {
    await Promise.all([
        loadPosts(),
        loadChannels(),
        loadConnections()
    ]);
});
</script>

<style scoped>

</style>

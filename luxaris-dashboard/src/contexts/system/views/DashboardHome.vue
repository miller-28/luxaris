<template>
  <DashboardLayout>
    <div>
      
      <h1 class="text-h4 font-weight-bold mb-2">{{ $t('nav.dashboard') }}</h1>
      <p class="text-body-1 text-grey-darken-1 mb-6">{{ $t('app.welcomeMessage') }}</p>

      <v-row>
        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2">
            <v-card-text>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-grey text-body-2">{{ $t('dashboard.totalPosts') }}</div>
                  <div class="text-h4 font-weight-bold mt-2">0</div>
                </div>
                <v-icon size="48" color="primary">mdi-file-document</v-icon>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2">
            <v-card-text>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-grey text-body-2">{{ $t('dashboard.channels') }}</div>
                  <div class="text-h4 font-weight-bold mt-2">0</div>
                </div>
                <v-icon size="48" color="primary">mdi-pound</v-icon>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2">
            <v-card-text>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-grey text-body-2">{{ $t('dashboard.scheduled') }}</div>
                  <div class="text-h4 font-weight-bold mt-2">0</div>
                </div>
                <v-icon size="48" color="primary">mdi-calendar-clock</v-icon>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2">
            <v-card-text>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-grey text-body-2">{{ $t('dashboard.generated') }}</div>
                  <div class="text-h4 font-weight-bold mt-2">0</div>
                </div>
                <v-icon size="48" color="primary">mdi-sparkles</v-icon>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card class="mt-6" elevation="2">
        <v-card-title>{{ $t('dashboard.recentActivity') }}</v-card-title>
        <v-card-text>
          <p class="text-grey">{{ $t('dashboard.noRecentActivity') }}</p>
        </v-card-text>
      </v-card>
    </div>
  </DashboardLayout>
</template>

<script setup>
import DashboardLayout from '@/layouts/DashboardLayout.vue';
</script>

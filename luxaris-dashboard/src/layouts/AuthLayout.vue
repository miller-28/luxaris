<template>
  <v-container fluid class="fill-height auth-bg">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="5">
        <slot />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// Auth layout for login/register pages
</script>

<style scoped>
.auth-bg {
  background: #0A0A0A;
}
</style>

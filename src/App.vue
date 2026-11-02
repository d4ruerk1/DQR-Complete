<script setup lang="ts">
import MainLayout from './components/MainLayout.vue';
import { Pages, useGlobalState } from './composables/app-state';
import { useAutomations } from './composables/automations';
import HomeView from './pages/HomeView.vue';
import LogsView from './pages/LogsView.vue';
import SettingsView from './pages/SettingsView.vue';

const appState = useGlobalState();
const { page } = appState;

// Start the automation scheduler for the whole app lifetime.
useAutomations();
</script>

<template>
  <MainLayout>
    <HomeView v-show="page === Pages.HOME"/>
    <LogsView v-show="page === Pages.LOGS"/>
    <SettingsView v-show="page === Pages.SETTINGS"/>
  </MainLayout>
</template>

<style>
/* Global styles are managed by Tailwind CSS */
</style>

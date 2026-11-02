<script setup lang="ts">
import { useGlobalState } from "@/composables/app-state";

const { logs, clearLogs } = useGlobalState();

function formatTime(date: Date) {
  const d = new Date(date);
  return d.toLocaleTimeString();
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-4 sm:px-6">
    <section class="card card-pad">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-base font-bold text-gray-900 sm:text-lg dark:text-white">Logs</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">Tracciamento eventi e diagnostica in tempo reale</p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          @click="clearLogs"
        >
          Clear Logs
        </button>
      </div>
      <div class="h-auto max-h-[calc(100vh-250px)] overflow-y-auto rounded-lg bg-gray-950 p-4 font-mono text-xs border border-gray-800">
        <div v-if="logs.length === 0" class="text-gray-500">Nessun log registrato.</div>
        <div v-for="(log, idx) in logs" :key="idx" class="mb-1.5 leading-relaxed">
          <span class="text-gray-500">{{ formatTime(log.timestamp) }}</span>
          <span
            :class="{
              'text-blue-400': log.type === 'info',
              'text-yellow-400': log.type === 'warning',
              'text-red-400': log.type === 'error',
              'text-gray-400': log.type === 'debug'
            }"
            class="ml-2 font-semibold uppercase"
          >[{{ log.type }}]</span>
          <span class="ml-2 text-gray-200">{{ log.message }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

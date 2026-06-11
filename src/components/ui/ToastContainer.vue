<script setup>
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
const { toasts } = storeToRefs(ui)

const styles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  error: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
    <transition-group name="fade">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg"
        :class="styles[t.type]"
      >
        <span class="mt-0.5 shrink-0">
          <font-awesome-icon v-if="t.type === 'success'" :icon="['fas', 'check']" class="h-5 w-5" />
          <font-awesome-icon v-else-if="t.type === 'error'" :icon="['fas', 'triangle-exclamation']" class="h-5 w-5" />
          <font-awesome-icon v-else :icon="['fas', 'circle-info']" class="h-5 w-5" />
        </span>
        <p class="flex-1 leading-snug">{{ t.message }}</p>
        <button class="shrink-0 opacity-60 hover:opacity-100" @click="ui.dismissToast(t.id)">
          <font-awesome-icon :icon="['fas', 'xmark']" class="h-4 w-4" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

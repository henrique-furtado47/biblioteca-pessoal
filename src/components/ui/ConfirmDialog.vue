<script setup>
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui.store'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

const ui = useUiStore()
const { confirmState } = storeToRefs(ui)
</script>

<template>
  <BaseModal
    :model-value="confirmState.open"
    :title="confirmState.title"
    size="sm"
    @update:model-value="(v) => !v && ui.resolveConfirm(false)"
  >
    <p class="text-sm text-slate-600 dark:text-slate-300">{{ confirmState.message }}</p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" @click="ui.resolveConfirm(false)">
          {{ confirmState.cancelText }}
        </BaseButton>
        <BaseButton :variant="confirmState.variant" @click="ui.resolveConfirm(true)">
          {{ confirmState.confirmText }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

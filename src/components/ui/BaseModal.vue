<script setup>
import { watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg | xl
})
const emit = defineEmits(['update:modelValue'])

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

function close() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)
</script>

<template>
  <transition name="fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @keydown.esc="close"
    >
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="close" />
      <div
        class="card relative z-10 w-full overflow-hidden"
        :class="sizes[size]"
        role="dialog"
        aria-modal="true"
      >
        <div
          v-if="title || $slots.header"
          class="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"
        >
          <slot name="header">
            <h3 class="text-lg font-semibold">{{ title }}</h3>
          </slot>
          <button
            class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            @click="close"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="max-h-[75vh] overflow-y-auto p-5">
          <slot />
        </div>
        <div v-if="$slots.footer" class="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </transition>
</template>

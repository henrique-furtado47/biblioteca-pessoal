<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 }, // 0 a 5, em passos de 0.5
  readonly: { type: Boolean, default: false },
  size: { type: String, default: 'md' }, // sm | md | lg
})
const emit = defineEmits(['update:modelValue'])

const hover = ref(0)
const sizeClass = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }

const current = computed(() => hover.value || props.modelValue || 0)

// Para cada estrela (1..5), define se está cheia, metade ou vazia
function fillFor(i) {
  const v = current.value
  if (v >= i) return 'full'
  if (v >= i - 0.5) return 'half'
  return 'empty'
}

function pick(i, isHalf) {
  if (props.readonly) return
  const value = isHalf ? i - 0.5 : i
  emit('update:modelValue', value === props.modelValue ? 0 : value)
}

function onHover(i, isHalf) {
  if (props.readonly) return
  hover.value = isHalf ? i - 0.5 : i
}
</script>

<template>
  <div class="inline-flex items-center gap-0.5" @mouseleave="hover = 0">
    <span
      v-for="i in 5"
      :key="i"
      class="relative inline-block"
      :class="[sizeClass[size], readonly ? '' : 'cursor-pointer']"
    >
      <!-- metade esquerda (0.5) -->
      <span
        v-if="!readonly"
        class="absolute inset-y-0 left-0 z-10 w-1/2"
        @mouseenter="onHover(i, true)"
        @click="pick(i, true)"
      />
      <!-- metade direita (inteiro) -->
      <span
        v-if="!readonly"
        class="absolute inset-y-0 right-0 z-10 w-1/2"
        @mouseenter="onHover(i, false)"
        @click="pick(i, false)"
      />
      <svg :class="sizeClass[size]" viewBox="0 0 24 24">
        <defs>
          <linearGradient :id="`half-${i}`">
            <stop offset="50%" stop-color="#f59e0b" />
            <stop offset="50%" stop-color="transparent" />
          </linearGradient>
        </defs>
        <path
          d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z"
          :fill="
            fillFor(i) === 'full'
              ? '#f59e0b'
              : fillFor(i) === 'half'
              ? `url(#half-${i})`
              : 'transparent'
          "
          stroke="#f59e0b"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <span v-if="modelValue" class="ml-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
      {{ modelValue.toFixed(1) }}
    </span>
  </div>
</template>

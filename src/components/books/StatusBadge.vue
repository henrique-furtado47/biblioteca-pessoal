<script setup>
import { STATUS_LABELS, STATUS_STYLES } from '@/constants'
defineProps({ status: { type: String, required: true } })
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="STATUS_STYLES[status]"
  >
    {{ STATUS_LABELS[status] || status }}
  </span>
</template>

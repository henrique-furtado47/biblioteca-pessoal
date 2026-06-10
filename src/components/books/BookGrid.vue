<script setup>
import { ref } from 'vue'
import BookCard from './BookCard.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const props = defineProps({
  books: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  skeletonCount: { type: Number, default: 8 },
  readonly: { type: Boolean, default: false },
  bookPage: { type: Boolean, default: false },
  draggable: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle-favorite', 'reorder'])

const dragFrom = ref(null)

function onDrop(to) {
  const from = dragFrom.value
  dragFrom.value = null
  if (from === null || from === to) return
  const arr = [...props.books]
  const [moved] = arr.splice(from, 1)
  arr.splice(to, 0, moved)
  emit('reorder', arr)
}
</script>

<template>
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
    <template v-if="loading">
      <div v-for="n in skeletonCount" :key="n" class="card overflow-hidden">
        <Skeleton class="aspect-[2/3] w-full" rounded="rounded-none" />
        <div class="space-y-2 p-3">
          <Skeleton class="h-3 w-full" />
          <Skeleton class="h-3 w-2/3" />
        </div>
      </div>
    </template>
    <template v-else>
      <div
        v-for="(book, i) in books"
        :key="book.id"
        :draggable="draggable"
        :class="draggable ? 'cursor-move' : ''"
        @dragstart="dragFrom = i"
        @dragover.prevent
        @drop="onDrop(i)"
      >
        <BookCard
          :book="book"
          :readonly="readonly"
          :book-page="bookPage"
          @toggle-favorite="$emit('toggle-favorite', $event)"
        />
      </div>
    </template>
  </div>
</template>

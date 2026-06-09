<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import StatusBadge from './StatusBadge.vue'
import StarRating from '@/components/ui/StarRating.vue'

const props = defineProps({
  book: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
  // true: link para a página da OBRA (por book_id); false: detalhe da estante
  bookPage: { type: Boolean, default: false },
})
defineEmits(['toggle-favorite'])

const detailTo = computed(() =>
  props.bookPage
    ? { name: 'book-page', params: { id: props.book.book_id } }
    : { name: 'book-detail', params: { id: props.book.id } },
)
</script>

<template>
  <div class="card group flex flex-col overflow-hidden transition hover:shadow-md">
    <RouterLink :to="detailTo" class="relative block aspect-[2/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
      <img
        v-if="book.cover_url"
        :src="book.cover_url"
        :alt="book.title"
        loading="lazy"
        class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
        <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.5C10.5 5.5 8.5 5 6.5 5H4v12.5h2.5c2 0 4 .5 5.5 1.5m0-12.5c1.5-1 3.5-1.5 5.5-1.5H20V17.5h-2.5c-2 0-4 .5-5.5 1.5m0-12.5V19"/></svg>
      </div>
      <span v-if="book.status" class="absolute left-2 top-2"><StatusBadge :status="book.status" /></span>
    </RouterLink>

    <div class="flex flex-1 flex-col p-3">
      <button
        v-if="!readonly"
        class="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow transition hover:scale-110 dark:bg-slate-900/90"
        :title="book.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
        @click.stop.prevent="$emit('toggle-favorite', book)"
      >
        <svg class="h-4 w-4" :class="book.favorite ? 'fill-rose-500 text-rose-500' : 'fill-none text-slate-400'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.5-2-4.25-4.2-4.25-1.6 0-3 .9-3.8 2.3C12.2 4.9 10.8 4 9.2 4 7 4 5 5.75 5 8.25c0 4.4 7 9.75 7 9.75s7-5.35 7-9.75z"/></svg>
      </button>

      <RouterLink :to="detailTo" class="line-clamp-2 text-sm font-semibold leading-snug hover:text-brand-600">
        {{ book.title }}
      </RouterLink>
      <p class="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
        {{ book.author?.name || 'Autor desconhecido' }}
      </p>
      <div class="mt-auto pt-2">
        <template v-if="bookPage">
          <div v-if="book.ratings_count" class="flex items-center gap-1 text-xs">
            <svg class="h-4 w-4 fill-amber-400 text-amber-400" viewBox="0 0 24 24"><path d="M11.48 3.5a.56.56 0 011.04 0l2.13 4.32 4.77.69c.46.07.64.63.31.95l-3.45 3.36.81 4.75c.08.46-.4.81-.81.59L12 16.3l-4.27 2.24c-.41.22-.89-.13-.81-.59l.81-4.75-3.45-3.36a.56.56 0 01.31-.95l4.77-.69L11.48 3.5z"/></svg>
            <span class="font-semibold">{{ Number(book.avg_rating).toFixed(1) }}</span>
            <span class="text-slate-400">· {{ book.ratings_count }} aval.</span>
          </div>
          <span v-else class="text-xs text-slate-400">Sem avaliações</span>
        </template>
        <StarRating v-else-if="book.rating" :model-value="Number(book.rating)" readonly size="sm" />
      </div>
    </div>
  </div>
</template>

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
        <font-awesome-icon :icon="['fas', 'book']" class="h-12 w-12" />
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
        <font-awesome-icon :icon="['fas', 'heart']" class="h-4 w-4" :class="book.favorite ? 'text-rose-500' : 'text-slate-300'" />
      </button>

      <RouterLink :to="detailTo" class="line-clamp-2 text-sm font-semibold leading-snug hover:text-brand-600">
        {{ book.title }}
      </RouterLink>
      <p class="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
        {{ book.author?.name || 'Autor desconhecido' }}
      </p>
      <div class="mt-auto pt-2">
        <!-- catálogo: média de avaliações públicas -->
        <template v-if="book.ratings_count !== undefined">
          <div v-if="book.ratings_count" class="flex items-center gap-1 text-xs">
            <font-awesome-icon :icon="['fas', 'star']" class="h-4 w-4 text-amber-400" />
            <span class="font-semibold">{{ Number(book.avg_rating).toFixed(1) }}</span>
            <span class="text-slate-400">· {{ book.ratings_count }} aval.</span>
          </div>
          <span v-else class="text-xs text-slate-400">Sem avaliações</span>
        </template>
        <!-- estante/perfil: a nota que a pessoa deu -->
        <StarRating v-else-if="book.rating" :model-value="Number(book.rating)" readonly size="sm" />
      </div>
    </div>
  </div>
</template>

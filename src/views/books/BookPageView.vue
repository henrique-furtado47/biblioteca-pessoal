<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { booksService } from '@/services/books.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { STATUS_LABELS } from '@/constants'
import BaseButton from '@/components/ui/BaseButton.vue'
import StarRating from '@/components/ui/StarRating.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import BookReviews from '@/components/books/BookReviews.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const book = ref(null)
const myEntry = ref(null)
const loading = ref(true)
const adding = ref(false)
const tab = ref('about')
const reviewCount = ref(0)

onMounted(load)

async function load() {
  loading.value = true
  try {
    book.value = await booksService.getBookPage(route.params.id)
    if (!book.value) throw new Error('not found')
    myEntry.value = await booksService.myEntryForBook(auth.user.id, route.params.id)
  } catch {
    toast.error('Livro não encontrado.')
    router.push({ name: 'catalog' })
  } finally {
    loading.value = false
  }
}

async function addToShelf() {
  adding.value = true
  try {
    const id = await booksService.addExisting(auth.user.id, book.value.id)
    toast.success('Adicionado à sua estante!')
    router.push({ name: 'book-detail', params: { id } })
  } catch (e) {
    if (e.message === 'DUPLICATE_SHELF') toast.info('Este livro já está na sua estante.')
    else toast.error('Erro ao adicionar.')
  } finally {
    adding.value = false
  }
}

const genreList = (b) => b?.genres?.map((g) => g.genre?.name).filter(Boolean) || []
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <button class="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600" @click="router.back()">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Voltar
    </button>

    <div v-if="loading" class="grid gap-8 md:grid-cols-[260px_1fr]">
      <Skeleton class="aspect-[2/3] w-full" />
      <div class="space-y-3">
        <Skeleton class="h-8 w-2/3" />
        <Skeleton class="h-4 w-1/3" />
        <Skeleton class="h-24 w-full" />
      </div>
    </div>

    <div v-else-if="book" class="grid gap-8 md:grid-cols-[260px_1fr]">
      <!-- capa + estante -->
      <div class="space-y-4">
        <div class="card overflow-hidden">
          <div class="aspect-[2/3] bg-slate-100 dark:bg-slate-800">
            <img v-if="book.cover_url" :src="book.cover_url" :alt="book.title" class="h-full w-full object-cover" />
            <div v-else class="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
              <svg class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.5C10.5 5.5 8.5 5 6.5 5H4v12.5h2.5c2 0 4 .5 5.5 1.5m0-12.5c1.5-1 3.5-1.5 5.5-1.5H20V17.5h-2.5c-2 0-4 .5-5.5 1.5m0-12.5V19"/></svg>
            </div>
          </div>
        </div>

        <div v-if="myEntry" class="card space-y-3 p-4 text-sm">
          <p class="text-slate-500 dark:text-slate-400">
            Na sua estante: <span class="font-semibold text-slate-700 dark:text-slate-200">{{ STATUS_LABELS[myEntry.status] }}</span>
          </p>
          <StarRating v-if="myEntry.rating" :model-value="Number(myEntry.rating)" readonly />
          <div class="flex gap-2">
            <BaseButton variant="secondary" block @click="router.push({ name: 'book-detail', params: { id: myEntry.id } })">
              Ver na estante
            </BaseButton>
            <BaseButton variant="ghost" @click="router.push({ name: 'book-edit', params: { id: myEntry.id } })">
              Editar
            </BaseButton>
          </div>
        </div>
        <BaseButton v-else block :loading="adding" @click="addToShelf">Adicionar à minha estante</BaseButton>
      </div>

      <!-- informações -->
      <div class="space-y-6">
        <div>
          <h1 class="text-3xl font-bold leading-tight">{{ book.title }}</h1>
          <p v-if="book.subtitle" class="mt-1 text-lg text-slate-500 dark:text-slate-400">{{ book.subtitle }}</p>
          <p class="mt-2 text-slate-600 dark:text-slate-300">
            por <span class="font-medium">{{ book.author?.name || 'Autor desconhecido' }}</span>
          </p>
        </div>

        <div v-if="genreList(book).length" class="flex flex-wrap gap-2">
          <span v-for="g in genreList(book)" :key="g" class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {{ g }}
          </span>
        </div>

        <div class="card grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
          <div><dt class="text-xs text-slate-400">ISBN</dt><dd class="text-sm font-medium">{{ book.isbn || '—' }}</dd></div>
          <div><dt class="text-xs text-slate-400">Editora</dt><dd class="text-sm font-medium">{{ book.publisher || '—' }}</dd></div>
          <div><dt class="text-xs text-slate-400">Ano</dt><dd class="text-sm font-medium">{{ book.publication_year || '—' }}</dd></div>
          <div><dt class="text-xs text-slate-400">Páginas</dt><dd class="text-sm font-medium">{{ book.pages || '—' }}</dd></div>
          <div><dt class="text-xs text-slate-400">Idioma</dt><dd class="text-sm font-medium">{{ book.language || '—' }}</dd></div>
        </div>

        <!-- abas -->
        <div>
          <div class="flex gap-1 border-b border-slate-200 dark:border-slate-800">
            <button
              class="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition"
              :class="tab === 'about' ? 'border-brand-600 text-brand-700 dark:text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
              @click="tab = 'about'"
            >
              Sobre
            </button>
            <button
              class="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition"
              :class="tab === 'reviews' ? 'border-brand-600 text-brand-700 dark:text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
              @click="tab = 'reviews'"
            >
              Avaliações<span v-if="reviewCount"> ({{ reviewCount }})</span>
            </button>
          </div>

          <div class="pt-5">
            <div v-show="tab === 'about'">
              <p v-if="book.description" class="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {{ book.description }}
              </p>
              <p v-else class="text-sm text-slate-400">Sem descrição cadastrada.</p>
            </div>
            <div v-show="tab === 'reviews'">
              <BookReviews :book-id="book.id" :show-heading="false" @count="reviewCount = $event" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

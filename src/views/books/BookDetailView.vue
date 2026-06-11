<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { booksService } from '@/services/books.service'
import { useBooksStore } from '@/stores/books.store'
import { useShelvesStore } from '@/stores/shelves.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { formatDate } from '@/utils/formatters'
import { STATUS_OPTIONS } from '@/constants'
import StatusBadge from '@/components/books/StatusBadge.vue'
import StarRating from '@/components/ui/StarRating.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import BookReviews from '@/components/books/BookReviews.vue'

const route = useRoute()
const router = useRouter()
const books = useBooksStore()
const shelvesStore = useShelvesStore()
const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

const book = ref(null)
const loading = ref(true)
const bookShelfIds = ref([])

const isOwner = computed(() => book.value && book.value.user_id === auth.user?.id)

onMounted(load)

async function load() {
  loading.value = true
  try {
    book.value = await booksService.getById(route.params.id)
    if (!book.value) throw new Error('not found')
  } catch {
    toast.error('Livro não encontrado.')
    router.push({ name: 'books' })
    return
  } finally {
    loading.value = false
  }
  if (isOwner.value) {
    shelvesStore.fetch()
    bookShelfIds.value = await booksService.shelvesOfBook(book.value.id)
  }
}

async function toggleShelf(shelfId) {
  const set = new Set(bookShelfIds.value)
  set.has(shelfId) ? set.delete(shelfId) : set.add(shelfId)
  const ids = [...set]
  try {
    await booksService.setBookShelves(book.value.id, ids)
    bookShelfIds.value = ids
  } catch {
    toast.error('Não foi possível atualizar as pastas.')
  }
}

async function newFolderForBook() {
  const name = window.prompt('Nome da nova pasta')
  if (!name || !name.trim()) return
  const shelf = await shelvesStore.create(name)
  toggleShelf(shelf.id)
}

async function toggleFavorite() {
  const updated = await booksService.setFavorite(book.value.id, !book.value.favorite)
  book.value.favorite = updated.favorite
}

async function changeStatus(status) {
  const updated = await booksService.setStatus(book.value.id, status)
  book.value.status = updated.status
  book.value.finish_date = updated.finish_date
  book.value.start_date = updated.start_date
  toast.success('Status atualizado.')
}

async function remove() {
  const ok = await confirm({
    title: 'Excluir livro',
    message: `Tem certeza que deseja excluir "${book.value.title}"? Esta ação não pode ser desfeita.`,
    confirmText: 'Excluir',
  })
  if (!ok) return
  try {
    await books.remove(book.value.id)
    toast.success('Livro excluído.')
    router.push({ name: 'books' })
  } catch {
    toast.error('Erro ao excluir.')
  }
}

const genreList = (b) => b?.genres?.map((g) => g.genre?.name).filter(Boolean) || []
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <button class="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600" @click="router.back()">
      <font-awesome-icon :icon="['fas', 'arrow-left']" class="h-4 w-4" />
      Voltar
    </button>

    <!-- loading -->
    <div v-if="loading" class="grid gap-8 md:grid-cols-[260px_1fr]">
      <Skeleton class="aspect-[2/3] w-full" />
      <div class="space-y-3">
        <Skeleton class="h-8 w-2/3" />
        <Skeleton class="h-4 w-1/3" />
        <Skeleton class="h-24 w-full" />
      </div>
    </div>

    <div v-else-if="book" class="grid gap-8 md:grid-cols-[260px_1fr]">
      <!-- capa + ações -->
      <div class="space-y-4">
        <div class="card overflow-hidden">
          <div class="aspect-[2/3] bg-slate-100 dark:bg-slate-800">
            <img v-if="book.cover_url" :src="book.cover_url" :alt="book.title" class="h-full w-full object-cover" />
            <div v-else class="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
              <font-awesome-icon :icon="['fas', 'book']" class="h-16 w-16" />
            </div>
          </div>
        </div>

        <template v-if="isOwner">
          <BaseSelect :model-value="book.status" label="Alterar status" :options="STATUS_OPTIONS" @update:model-value="changeStatus" />

          <div class="flex gap-2">
            <BaseButton variant="secondary" block @click="router.push({ name: 'book-edit', params: { id: book.id } })">
              Editar
            </BaseButton>
            <BaseButton variant="danger" @click="remove">Excluir</BaseButton>
          </div>

          <!-- pastas -->
          <div class="card p-4">
            <p class="mb-2 text-sm font-semibold">Pastas</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="shelf in shelvesStore.items"
                :key="shelf.id"
                type="button"
                class="rounded-full border px-2.5 py-1 text-xs font-medium transition"
                :class="
                  bookShelfIds.includes(shelf.id)
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300'
                "
                @click="toggleShelf(shelf.id)"
              >
                {{ shelf.name }}
              </button>
              <button
                type="button"
                class="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-slate-700"
                @click="newFolderForBook"
              >
                + Nova
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- informações -->
      <div class="space-y-6">
        <div>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h1 class="text-3xl font-bold leading-tight">{{ book.title }}</h1>
              <p v-if="book.subtitle" class="mt-1 text-lg text-slate-500 dark:text-slate-400">{{ book.subtitle }}</p>
            </div>
            <button v-if="isOwner" class="rounded-full p-2 transition hover:scale-110" :title="book.favorite ? 'Remover favorito' : 'Favoritar'" @click="toggleFavorite">
              <font-awesome-icon :icon="['fas', 'heart']" class="h-7 w-7" :class="book.favorite ? 'text-rose-500' : 'text-slate-400'" />
            </button>
          </div>
          <p class="mt-2 text-slate-600 dark:text-slate-300">
            por <span class="font-medium">{{ book.author?.name || 'Autor desconhecido' }}</span>
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge :status="book.status" />
            <StarRating v-if="book.rating" :model-value="Number(book.rating)" readonly />
          </div>
        </div>

        <!-- gêneros -->
        <div v-if="genreList(book).length" class="flex flex-wrap gap-2">
          <span v-for="g in genreList(book)" :key="g" class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {{ g }}
          </span>
        </div>

        <!-- ficha técnica -->
        <div class="card grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
          <div><dt class="text-xs text-slate-400">ISBN</dt><dd class="text-sm font-medium">{{ book.isbn || '—' }}</dd></div>
          <div><dt class="text-xs text-slate-400">Editora</dt><dd class="text-sm font-medium">{{ book.publisher || '—' }}</dd></div>
          <div><dt class="text-xs text-slate-400">Ano</dt><dd class="text-sm font-medium">{{ book.publication_year || '—' }}</dd></div>
          <div><dt class="text-xs text-slate-400">Páginas</dt><dd class="text-sm font-medium">{{ book.pages || '—' }}</dd></div>
          <div><dt class="text-xs text-slate-400">Idioma</dt><dd class="text-sm font-medium">{{ book.language || '—' }}</dd></div>
          <div><dt class="text-xs text-slate-400">Início</dt><dd class="text-sm font-medium">{{ formatDate(book.start_date) }}</dd></div>
          <div><dt class="text-xs text-slate-400">Conclusão</dt><dd class="text-sm font-medium">{{ formatDate(book.finish_date) }}</dd></div>
        </div>

        <div v-if="book.description">
          <h3 class="mb-2 font-semibold">Descrição</h3>
          <p class="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{{ book.description }}</p>
        </div>

        <div v-if="isOwner && book.notes">
          <h3 class="mb-2 font-semibold">Observações pessoais</h3>
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p class="whitespace-pre-line">{{ book.notes }}</p>
          </div>
        </div>

        <BookReviews v-if="book.book_id" :book-id="book.book_id" hide-when-empty />
      </div>
    </div>
  </div>
</template>

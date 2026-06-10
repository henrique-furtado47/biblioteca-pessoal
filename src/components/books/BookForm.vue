<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { useGenresStore } from '@/stores/genres.store'
import { STATUS_OPTIONS, LANGUAGE_OPTIONS } from '@/constants'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StarRating from '@/components/ui/StarRating.vue'
import CoverUpload from './CoverUpload.vue'
import IsbnLookup from './IsbnLookup.vue'
import GenreSelect from './GenreSelect.vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  authorName: { type: String, default: '' }, // nome do autor (texto livre)
  genreIds: { type: Array, default: () => [] }, // ids dos gêneros associados
  submitting: { type: Boolean, default: false },
  isEdit: { type: Boolean, default: false },
})
const emit = defineEmits(['submit', 'cancel'])

// Estado local do formulário
const form = reactive({
  title: '',
  subtitle: '',
  isbn: '',
  publisher: '',
  publication_year: null,
  pages: null,
  language: 'pt-BR',
  description: '',
  status: 'unread',
  rating: 0,
  favorite: false,
  review_public: false,
  notes: '',
  cover_url: '',
  start_date: '',
  finish_date: '',
  ...props.modelValue,
})
const authorNameLocal = ref(props.authorName)
const genreIdsLocal = ref([...props.genreIds])
const errors = ref({})

// Datas coerentes com o status
const canStart = computed(() => !['unread', 'wishlist'].includes(form.status))
const canFinish = computed(() => form.status === 'finished')
watch(
  () => form.status,
  () => {
    if (!canStart.value) form.start_date = ''
    if (!canFinish.value) form.finish_date = ''
  },
)

const genresStore = useGenresStore()
onMounted(() => genresStore.fetch())

// Dicas para mapear categorias (em inglês) das APIs para nossos gêneros (pt-BR)
const CATEGORY_HINTS = {
  fiction: 'Ficção',
  nonfiction: 'Não-ficção',
  'non-fiction': 'Não-ficção',
  fantasy: 'Fantasia',
  'science fiction': 'Ficção Científica',
  romance: 'Romance',
  thriller: 'Suspense',
  suspense: 'Suspense',
  mystery: 'Suspense',
  horror: 'Terror',
  biography: 'Biografia',
  autobiography: 'Biografia',
  history: 'História',
  'self-help': 'Autoajuda',
  technology: 'Tecnologia',
  computers: 'Tecnologia',
  business: 'Negócios',
  poetry: 'Poesia',
  juvenile: 'Infantil',
  philosophy: 'Filosofia',
  psychology: 'Psicologia',
  religion: 'Religião',
  comics: 'Quadrinhos',
}

/** Tenta casar categorias retornadas com os gêneros do catálogo. */
function matchGenreIds(categories = []) {
  const genres = genresStore.items
  const ids = new Set(genreIdsLocal.value)
  for (const cat of categories) {
    const lc = String(cat).toLowerCase()
    // casamento direto com nomes dos nossos gêneros
    for (const g of genres) {
      const gn = g.name.toLowerCase()
      if (lc.includes(gn) || gn.includes(lc)) ids.add(g.id)
    }
    // casamento por dicas (inglês)
    for (const [key, gname] of Object.entries(CATEGORY_HINTS)) {
      if (lc.includes(key)) {
        const g = genres.find((x) => x.name === gname)
        if (g) ids.add(g.id)
      }
    }
  }
  return [...ids]
}

function applyLookup(data) {
  if (data.title) form.title = data.title
  if (data.subtitle) form.subtitle = data.subtitle
  if (data.isbn) form.isbn = data.isbn
  if (data.publisher) form.publisher = data.publisher
  if (data.publication_year) form.publication_year = data.publication_year
  if (data.pages) form.pages = data.pages
  if (data.cover_url) form.cover_url = data.cover_url
  if (data.description) form.description = data.description
  if (data.language) form.language = data.language
  if (data.author) authorNameLocal.value = data.author
  if (data.categories?.length) genreIdsLocal.value = matchGenreIds(data.categories)
}

function submit() {
  errors.value = {}
  if (!form.title.trim()) errors.value.title = 'O título é obrigatório.'
  if (Object.keys(errors.value).length) return

  const payload = {
    ...form,
    title: form.title.trim(),
    publication_year: form.publication_year ? Number(form.publication_year) : null,
    pages: form.pages ? Number(form.pages) : null,
    rating: form.rating ? Number(form.rating) : null,
    start_date: form.start_date || null,
    finish_date: form.finish_date || null,
  }
  emit('submit', {
    payload,
    authorName: authorNameLocal.value.trim(),
    genreIds: [...genreIdsLocal.value],
  })
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="submit">
    <IsbnLookup v-if="!isEdit" @found="applyLookup" />

    <div class="grid gap-6 md:grid-cols-3">
      <!-- coluna capa -->
      <div class="md:col-span-1">
        <CoverUpload v-model="form.cover_url" />
      </div>

      <!-- coluna campos -->
      <div class="space-y-4 md:col-span-2">
        <BaseInput v-model="form.title" label="Título" :error="errors.title" required />
        <BaseInput v-model="form.subtitle" label="Subtítulo" />
        <div class="grid gap-4 sm:grid-cols-2">
          <BaseInput v-model="authorNameLocal" label="Autor" placeholder="Nome do autor" hint="Será criado no catálogo se não existir." />
          <BaseInput v-model="form.isbn" label="ISBN" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <BaseInput v-model="form.publisher" label="Editora" />
          <BaseInput v-model="form.publication_year" label="Ano de publicação" type="number" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <BaseInput v-model="form.pages" label="Número de páginas" type="number" />
          <BaseSelect v-model="form.language" label="Idioma" :options="LANGUAGE_OPTIONS" />
        </div>
      </div>
    </div>

    <div>
      <label class="label-base">Descrição</label>
      <textarea v-model="form.description" rows="4" class="input-base resize-y" placeholder="Sinopse do livro..." />
    </div>

    <GenreSelect v-model="genreIdsLocal" />

    <div class="grid gap-4 sm:grid-cols-2">
      <BaseSelect v-model="form.status" label="Status" :options="STATUS_OPTIONS" />
      <div>
        <label class="label-base">Avaliação</label>
        <StarRating v-model="form.rating" />
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.start_date"
        label="Início da leitura"
        type="date"
        :disabled="!canStart"
        :hint="!canStart ? 'Disponível ao marcar como lendo/lido/abandonado.' : ''"
      />
      <BaseInput
        v-model="form.finish_date"
        label="Fim da leitura"
        type="date"
        :disabled="!canFinish"
        :hint="!canFinish ? 'Disponível apenas quando o status é “Lido”.' : ''"
      />
    </div>

    <div>
      <label class="label-base">Observações pessoais</label>
      <textarea v-model="form.notes" rows="3" class="input-base resize-y" placeholder="Suas anotações..." />
    </div>

    <div class="space-y-3">
      <label class="flex items-center gap-2 text-sm font-medium">
        <input v-model="form.favorite" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        Marcar como favorito
      </label>
      <label class="flex items-start gap-2 text-sm font-medium">
        <input v-model="form.review_public" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        <span>
          Tornar avaliação pública
          <span class="block text-xs font-normal text-slate-400">Sua nota e observações deste livro ficam visíveis para outras pessoas na página do livro.</span>
        </span>
      </label>
    </div>

    <div class="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
      <BaseButton variant="secondary" type="button" @click="$emit('cancel')">Cancelar</BaseButton>
      <BaseButton type="submit" :loading="submitting">
        {{ isEdit ? 'Salvar alterações' : 'Adicionar livro' }}
      </BaseButton>
    </div>
  </form>
</template>

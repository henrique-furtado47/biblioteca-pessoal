<script setup>
import { ref, computed, watch } from 'vue'
import { booksService } from '@/services/books.service'
import { postsService } from '@/services/posts.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StarRating from '@/components/ui/StarRating.vue'
import StatusBadge from '@/components/books/StatusBadge.vue'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'created'])

const auth = useAuthStore()
const toast = useToast()

const myBooks = ref([])
const loaded = ref(false)
const caption = ref('')
const selectedId = ref('') // user_book id
const kind = ref('review')
const submitting = ref(false)

const KIND_OPTIONS = [
  { value: 'review', label: 'Avaliação (nota)' },
  { value: 'status', label: 'Status de leitura' },
  { value: 'favorite', label: 'Favorito' },
  { value: 'added', label: 'Só o livro' },
]

const selectedBook = computed(() => myBooks.value.find((b) => b.id === selectedId.value) || null)

watch(
  () => props.modelValue,
  async (open) => {
    if (open && !loaded.value) {
      const { items } = await booksService.list({ userId: auth.user.id, pageSize: 100 })
      myBooks.value = items
      loaded.value = true
    }
  },
)

// sugere o tipo conforme o livro escolhido
watch(selectedBook, (b) => {
  if (!b) return
  if (b.rating) kind.value = 'review'
  else if (b.favorite) kind.value = 'favorite'
  else kind.value = 'status'
})

// ao compartilhar uma avaliação, traz a legenda já com o texto da avaliação
watch([selectedBook, kind], ([b, k]) => {
  if (k === 'review' && b?.notes && !caption.value.trim()) {
    caption.value = b.notes
  }
})

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (!caption.value.trim() && !selectedBook.value) {
    toast.error('Escreva algo ou anexe um livro.')
    return
  }
  submitting.value = true
  try {
    const b = selectedBook.value
    await postsService.create({
      userId: auth.user.id,
      caption: caption.value,
      kind: b ? kind.value : 'text',
      bookId: b?.book_id ?? null,
      userBookId: b?.id ?? null,
      rating: b && kind.value === 'review' ? b.rating : null,
      status: b && kind.value === 'status' ? b.status : null,
    })
    // ao publicar uma avaliação: sincroniza o texto de volta e torna pública
    if (b && kind.value === 'review') {
      await booksService.updateShelfEntry(b.id, {
        notes: caption.value.trim() || null,
        review_public: true,
      })
    }
    toast.success('Publicado!')
    caption.value = ''
    selectedId.value = ''
    emit('created')
    close()
  } catch (e) {
    toast.error('Não foi possível publicar.')
    console.error(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <BaseModal :model-value="modelValue" title="Nova publicação" @update:model-value="close">
    <div class="space-y-4">
      <div>
        <label class="label-base">Legenda</label>
        <textarea v-model="caption" rows="3" class="input-base resize-y" placeholder="O que você quer compartilhar?" />
      </div>

      <BaseSelect
        v-model="selectedId"
        label="Anexar um livro (opcional)"
        placeholder="Sem livro"
        :options="myBooks.map((b) => ({ value: b.id, label: b.title }))"
      />

      <template v-if="selectedBook">
        <BaseSelect v-model="kind" label="O que compartilhar" :options="KIND_OPTIONS" />

        <div class="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <div class="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
            <img v-if="selectedBook.cover_url" :src="selectedBook.cover_url" :alt="selectedBook.title" class="h-full w-full object-cover" />
          </div>
          <div class="min-w-0">
            <p class="truncate font-medium">{{ selectedBook.title }}</p>
            <div class="mt-1 flex items-center gap-2">
              <StarRating v-if="kind === 'review' && selectedBook.rating" :model-value="Number(selectedBook.rating)" readonly size="sm" />
              <StatusBadge v-if="kind === 'status'" :status="selectedBook.status" />
              <span v-if="kind === 'favorite'" class="text-xs font-medium text-rose-500">♥ Favorito</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <BaseButton variant="secondary" @click="close">Cancelar</BaseButton>
        <BaseButton :loading="submitting" @click="submit">Publicar</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

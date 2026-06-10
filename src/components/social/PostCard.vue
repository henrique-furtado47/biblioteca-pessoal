<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { postsService } from '@/services/posts.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { initialsOf, formatDateTime } from '@/utils/formatters'
import StarRating from '@/components/ui/StarRating.vue'
import StatusBadge from '@/components/books/StatusBadge.vue'
import CommentThread from '@/components/social/CommentThread.vue'

const props = defineProps({ post: { type: Object, required: true } })
const emit = defineEmits(['removed'])

const auth = useAuthStore()
const toast = useToast()

const liked = ref(props.post.liked)
const likeCount = ref(props.post.like_count)
const commentCount = ref(props.post.comment_count)
const commentsOpen = ref(false)

const isOwner = () => props.post.user_id === auth.user?.id
const authorName = () => props.post.author?.display_name || props.post.author?.username || 'Usuário'
const profileTo = () =>
  props.post.author?.username
    ? { name: 'profile', params: { username: props.post.author.username } }
    : {}

async function toggleLike() {
  const was = liked.value
  liked.value = !was
  likeCount.value += was ? -1 : 1
  try {
    await postsService.toggleLike(props.post.id, auth.user.id, was)
  } catch {
    liked.value = was
    likeCount.value += was ? 1 : -1
    toast.error('Não foi possível curtir.')
  }
}

function toggleComments() {
  commentsOpen.value = !commentsOpen.value
}

async function removePost() {
  if (!confirm('Excluir esta publicação?')) return
  try {
    await postsService.remove(props.post.id)
    emit('removed', props.post.id)
  } catch {
    toast.error('Não foi possível excluir.')
  }
}

const bookTo = () => ({ name: 'book-page', params: { id: props.post.book.id } })
</script>

<template>
  <article class="card overflow-hidden">
    <!-- cabeçalho -->
    <div class="flex items-center gap-3 p-4">
      <RouterLink :to="profileTo()" class="shrink-0">
        <span class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-semibold text-white">
          <img v-if="post.author?.avatar_url" :src="post.author.avatar_url" :alt="authorName()" class="h-full w-full object-cover" />
          <template v-else>{{ initialsOf(authorName()) }}</template>
        </span>
      </RouterLink>
      <div class="min-w-0 flex-1">
        <RouterLink :to="profileTo()" class="text-sm font-semibold hover:text-brand-600">{{ authorName() }}</RouterLink>
        <p class="text-xs text-slate-400">{{ formatDateTime(post.created_at) }}</p>
      </div>
      <button v-if="isOwner()" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="Excluir" @click="removePost">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9 7V5h6v2m-1 0v12m-4-12v12M5 7l1 13h12l1-13"/></svg>
      </button>
    </div>

    <!-- mídia: capa grande (estilo Instagram) -->
    <RouterLink v-if="post.book" :to="bookTo()" class="relative block">
      <div class="relative flex items-center justify-center overflow-hidden bg-slate-900">
        <!-- fundo desfocado -->
        <img v-if="post.book.cover_url" :src="post.book.cover_url" alt="" aria-hidden="true" class="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-xl" />
        <img v-if="post.book.cover_url" :src="post.book.cover_url" :alt="post.book.title" class="relative z-10 max-h-[26rem] w-auto object-contain py-2" />
        <div v-else class="flex h-72 w-full items-center justify-center text-slate-600">
          <svg class="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.5C10.5 5.5 8.5 5 6.5 5H4v12.5h2.5c2 0 4 .5 5.5 1.5m0-12.5c1.5-1 3.5-1.5 5.5-1.5H20V17.5h-2.5c-2 0-4 .5-5.5 1.5m0-12.5V19"/></svg>
        </div>
      </div>
    </RouterLink>

    <div class="p-4">
      <!-- ações -->
      <div class="flex items-center gap-4">
        <button class="flex items-center gap-1.5 text-sm" :class="liked ? 'text-rose-500' : 'text-slate-600 hover:text-rose-500 dark:text-slate-300'" @click="toggleLike">
          <svg class="h-6 w-6" :class="liked ? 'fill-rose-500' : 'fill-none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.5-2-4.25-4.2-4.25-1.6 0-3 .9-3.8 2.3C12.2 4.9 10.8 4 9.2 4 7 4 5 5.75 5 8.25c0 4.4 7 9.75 7 9.75s7-5.35 7-9.75z"/></svg>
        </button>
        <button class="flex items-center gap-1.5 text-slate-600 hover:text-brand-600 dark:text-slate-300" @click="toggleComments">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h8M8 8h8m-8 8h5m5-4a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8 8 8 0 018 8z"/></svg>
        </button>
      </div>

      <p v-if="likeCount" class="mt-2 text-sm font-semibold">{{ likeCount }} curtida(s)</p>

      <!-- legenda -->
      <p v-if="post.caption" class="mt-1 whitespace-pre-line text-sm leading-relaxed">
        <RouterLink :to="profileTo()" class="font-semibold">{{ authorName() }}</RouterLink>
        {{ ' ' }}{{ post.caption }}
      </p>

      <!-- info do livro -->
      <RouterLink v-if="post.book" :to="bookTo()" class="mt-2 flex items-center gap-2 text-sm">
        <span class="font-medium hover:text-brand-600">{{ post.book.title }}</span>
        <span class="text-slate-400">· {{ post.book.author?.name || 'Autor desconhecido' }}</span>
      </RouterLink>
      <div v-if="post.book" class="mt-1 flex items-center gap-2">
        <StarRating v-if="post.rating" :model-value="Number(post.rating)" readonly size="sm" />
        <StatusBadge v-if="post.status" :status="post.status" />
        <span v-if="post.kind === 'favorite'" class="text-xs font-medium text-rose-500">♥ Favoritou</span>
      </div>

      <!-- comentários -->
      <button v-if="commentCount && !commentsOpen" class="mt-2 text-sm text-slate-400 hover:text-brand-600" @click="toggleComments">
        Ver {{ commentCount }} comentário(s)
      </button>

      <div v-if="commentsOpen" class="mt-3">
        <CommentThread :post-id="post.id" @count="commentCount = $event" />
      </div>
    </div>
  </article>
</template>

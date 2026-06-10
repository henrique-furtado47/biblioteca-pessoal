<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { postsService } from '@/services/posts.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { initialsOf, formatDateTime } from '@/utils/formatters'
import { STATUS_LABELS } from '@/constants'
import StarRating from '@/components/ui/StarRating.vue'
import StatusBadge from '@/components/books/StatusBadge.vue'

const props = defineProps({ post: { type: Object, required: true } })
const emit = defineEmits(['removed'])

const auth = useAuthStore()
const toast = useToast()

const liked = ref(props.post.liked)
const likeCount = ref(props.post.like_count)
const commentCount = ref(props.post.comment_count)
const commentsOpen = ref(false)
const comments = ref([])
const commentsLoading = ref(false)
const newComment = ref('')
const busy = ref(false)

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

async function toggleComments() {
  commentsOpen.value = !commentsOpen.value
  if (commentsOpen.value && !comments.value.length) {
    commentsLoading.value = true
    try {
      comments.value = await postsService.listComments(props.post.id)
    } finally {
      commentsLoading.value = false
    }
  }
}

async function sendComment() {
  const body = newComment.value.trim()
  if (!body || busy.value) return
  busy.value = true
  try {
    const c = await postsService.addComment(props.post.id, auth.user.id, body)
    comments.value.push({ ...c, author: { display_name: authorName() } })
    commentCount.value += 1
    newComment.value = ''
  } catch {
    toast.error('Não foi possível comentar.')
  } finally {
    busy.value = false
  }
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

const cName = (c) => c.author?.display_name || c.author?.username || 'Usuário'
</script>

<template>
  <article class="card p-4">
    <!-- cabeçalho -->
    <div class="flex items-center gap-3">
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

    <!-- legenda -->
    <p v-if="post.caption" class="mt-3 whitespace-pre-line text-sm leading-relaxed">{{ post.caption }}</p>

    <!-- livro anexado -->
    <RouterLink
      v-if="post.book"
      :to="{ name: 'book-page', params: { id: post.book.id } }"
      class="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 dark:border-slate-800"
    >
      <div class="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
        <img v-if="post.book.cover_url" :src="post.book.cover_url" :alt="post.book.title" class="h-full w-full object-cover" />
      </div>
      <div class="min-w-0">
        <p class="truncate font-medium">{{ post.book.title }}</p>
        <p class="truncate text-sm text-slate-500 dark:text-slate-400">{{ post.book.author?.name || 'Autor desconhecido' }}</p>
        <div class="mt-1 flex items-center gap-2">
          <StarRating v-if="post.rating" :model-value="Number(post.rating)" readonly size="sm" />
          <StatusBadge v-if="post.status" :status="post.status" />
          <span v-if="post.kind === 'favorite'" class="text-xs font-medium text-rose-500">♥ Favoritou</span>
        </div>
      </div>
    </RouterLink>

    <!-- ações -->
    <div class="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
      <button class="flex items-center gap-1.5" :class="liked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'" @click="toggleLike">
        <svg class="h-5 w-5" :class="liked ? 'fill-rose-500' : 'fill-none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.5-2-4.25-4.2-4.25-1.6 0-3 .9-3.8 2.3C12.2 4.9 10.8 4 9.2 4 7 4 5 5.75 5 8.25c0 4.4 7 9.75 7 9.75s7-5.35 7-9.75z"/></svg>
        {{ likeCount }}
      </button>
      <button class="flex items-center gap-1.5 text-slate-500 hover:text-brand-600" @click="toggleComments">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h8M8 8h8m-8 8h5m5-4a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8 8 8 0 018 8z"/></svg>
        {{ commentCount }}
      </button>
    </div>

    <!-- comentários -->
    <div v-if="commentsOpen" class="mt-3 space-y-3">
      <p v-if="commentsLoading" class="text-sm text-slate-400">Carregando...</p>
      <div v-for="c in comments" :key="c.id" class="flex gap-2">
        <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-xs font-semibold text-white">
          <img v-if="c.author?.avatar_url" :src="c.author.avatar_url" :alt="cName(c)" class="h-full w-full object-cover" />
          <template v-else>{{ initialsOf(cName(c)) }}</template>
        </span>
        <div class="rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
          <p class="text-xs font-semibold">{{ cName(c) }}</p>
          <p class="whitespace-pre-line text-sm">{{ c.body }}</p>
        </div>
      </div>

      <form class="flex gap-2" @submit.prevent="sendComment">
        <input
          v-model="newComment"
          type="text"
          placeholder="Escreva um comentário..."
          class="input-base !py-2"
        />
        <button type="submit" class="shrink-0 rounded-xl bg-brand-600 px-3 text-sm font-medium text-white disabled:opacity-60" :disabled="busy || !newComment.trim()">
          Enviar
        </button>
      </form>
    </div>
  </article>
</template>

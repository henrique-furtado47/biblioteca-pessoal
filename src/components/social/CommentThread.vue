<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { postsService } from '@/services/posts.service'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { useToast } from '@/composables/useToast'
import { initialsOf } from '@/utils/formatters'

const props = defineProps({ postId: { type: String, default: '' } })
const emit = defineEmits(['count'])

const auth = useAuthStore()
const profileStore = useProfileStore()
const toast = useToast()

const comments = ref([])
const loading = ref(false)
const draft = ref('')
const replyTo = ref(null)
const replyDraft = ref('')
const busy = ref(false)

onMounted(() => {
  profileStore.loadMe()
  load()
})
watch(() => props.postId, load)

async function load() {
  comments.value = []
  if (!props.postId) return
  loading.value = true
  try {
    comments.value = await postsService.listComments(props.postId, auth.user.id)
    emit('count', comments.value.length)
  } finally {
    loading.value = false
  }
}

async function likeComment(c) {
  const was = c.liked
  c.liked = !was
  c.like_count += was ? -1 : 1
  try {
    await postsService.toggleCommentLike(c.id, auth.user.id, was)
  } catch {
    c.liked = was
    c.like_count += was ? 1 : -1
    toast.error('Não foi possível curtir.')
  }
}

const topLevel = computed(() => comments.value.filter((c) => !c.parent_id))
const repliesOf = (id) => comments.value.filter((c) => c.parent_id === id)

function meAuthor() {
  const m = profileStore.me
  return m
    ? { display_name: m.display_name, username: m.username, avatar_url: m.avatar_url }
    : { display_name: auth.displayName }
}

async function add(body, parentId = null) {
  const text = (body || '').trim()
  if (!text || busy.value) return
  busy.value = true
  try {
    const c = await postsService.addComment(props.postId, auth.user.id, text, parentId)
    comments.value.push({ ...c, author: meAuthor(), like_count: 0, liked: false })
    emit('count', comments.value.length)
  } catch {
    toast.error('Não foi possível comentar.')
  } finally {
    busy.value = false
  }
}

async function submitTop() {
  await add(draft.value)
  draft.value = ''
}

function startReply(comment) {
  replyTo.value = replyTo.value === comment.id ? null : comment.id
  replyDraft.value = ''
}

async function submitReply(comment) {
  await add(replyDraft.value, comment.parent_id || comment.id) // 1 nível de thread
  replyDraft.value = ''
  replyTo.value = null
}

const cName = (c) => c.author?.display_name || c.author?.username || 'Usuário'
const profileTo = (c) =>
  c.author?.username ? { name: 'profile', params: { username: c.author.username } } : {}
</script>

<template>
  <div class="space-y-3">
    <p v-if="loading" class="text-sm text-slate-400">Carregando...</p>

    <div v-for="c in topLevel" :key="c.id" class="space-y-2">
      <!-- comentário -->
      <div class="flex gap-2">
        <RouterLink :to="profileTo(c)" class="mt-0.5 shrink-0">
          <span class="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-xs font-semibold text-white">
            <img v-if="c.author?.avatar_url" :src="c.author.avatar_url" :alt="cName(c)" class="h-full w-full object-cover" />
            <template v-else>{{ initialsOf(cName(c)) }}</template>
          </span>
        </RouterLink>
        <div class="min-w-0">
          <div class="inline-block rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
            <RouterLink :to="profileTo(c)" class="text-xs font-semibold hover:text-brand-600">{{ cName(c) }}</RouterLink>
            <p class="whitespace-pre-line text-sm">{{ c.body }}</p>
          </div>
          <div class="ml-3 mt-0.5 flex items-center gap-3">
            <button class="flex items-center gap-1 text-xs" :class="c.liked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'" @click="likeComment(c)">
              <svg class="h-3.5 w-3.5" :class="c.liked ? 'fill-rose-500' : 'fill-none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.5-2-4.25-4.2-4.25-1.6 0-3 .9-3.8 2.3C12.2 4.9 10.8 4 9.2 4 7 4 5 5.75 5 8.25c0 4.4 7 9.75 7 9.75s7-5.35 7-9.75z"/></svg>
              <span v-if="c.like_count">{{ c.like_count }}</span>
            </button>
            <button class="text-xs text-slate-400 hover:text-brand-600" @click="startReply(c)">Responder</button>
          </div>
        </div>
      </div>

      <!-- respostas -->
      <div v-for="r in repliesOf(c.id)" :key="r.id" class="ml-9 flex gap-2">
        <RouterLink :to="profileTo(r)" class="mt-0.5 shrink-0">
          <span class="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-[10px] font-semibold text-white">
            <img v-if="r.author?.avatar_url" :src="r.author.avatar_url" :alt="cName(r)" class="h-full w-full object-cover" />
            <template v-else>{{ initialsOf(cName(r)) }}</template>
          </span>
        </RouterLink>
        <div>
          <div class="inline-block rounded-2xl bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
            <RouterLink :to="profileTo(r)" class="text-xs font-semibold hover:text-brand-600">{{ cName(r) }}</RouterLink>
            <p class="whitespace-pre-line text-sm">{{ r.body }}</p>
          </div>
          <button class="ml-3 mt-0.5 flex items-center gap-1 text-xs" :class="r.liked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'" @click="likeComment(r)">
            <svg class="h-3.5 w-3.5" :class="r.liked ? 'fill-rose-500' : 'fill-none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.5-2-4.25-4.2-4.25-1.6 0-3 .9-3.8 2.3C12.2 4.9 10.8 4 9.2 4 7 4 5 5.75 5 8.25c0 4.4 7 9.75 7 9.75s7-5.35 7-9.75z"/></svg>
            <span v-if="r.like_count">{{ r.like_count }}</span>
          </button>
        </div>
      </div>

      <!-- caixa de resposta -->
      <form v-if="replyTo === c.id" class="ml-9 flex gap-2" @submit.prevent="submitReply(c)">
        <input v-model="replyDraft" type="text" placeholder="Responder..." class="input-base !py-1.5 text-sm" />
        <button type="submit" class="shrink-0 rounded-xl bg-brand-600 px-3 text-sm font-medium text-white disabled:opacity-60" :disabled="!replyDraft.trim()">
          Enviar
        </button>
      </form>
    </div>

    <!-- novo comentário -->
    <form class="flex gap-2" @submit.prevent="submitTop">
      <input v-model="draft" type="text" placeholder="Escreva um comentário..." class="input-base !py-2" />
      <button type="submit" class="shrink-0 rounded-xl bg-brand-600 px-3 text-sm font-medium text-white disabled:opacity-60" :disabled="busy || !draft.trim()">
        Enviar
      </button>
    </form>
  </div>
</template>

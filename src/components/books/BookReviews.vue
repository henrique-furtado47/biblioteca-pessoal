<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { booksService } from '@/services/books.service'
import { profilesService } from '@/services/profiles.service'
import { friendshipsService } from '@/services/friendships.service'
import { postsService } from '@/services/posts.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { initialsOf } from '@/utils/formatters'
import StarRating from '@/components/ui/StarRating.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import CommentThread from '@/components/social/CommentThread.vue'

const props = defineProps({
  bookId: { type: String, default: '' },
  showHeading: { type: Boolean, default: true },
  hideWhenEmpty: { type: Boolean, default: false },
})
const emit = defineEmits(['count'])

const auth = useAuthStore()
const toast = useToast()
const reviews = ref([])
const loading = ref(false)

// interações por avaliação (review.id = user_book id)
const interactions = reactive({})
const openId = ref(null)

onMounted(load)
watch(() => props.bookId, load)

async function load() {
  reviews.value = []
  emit('count', 0)
  if (!props.bookId) return
  loading.value = true
  try {
    const rows = await booksService.publicReviewsByBookId(props.bookId, auth.user.id)
    if (!rows.length) return
    const [profiles, friends] = await Promise.all([
      profilesService.getByIds(rows.map((r) => r.user_id)),
      friendshipsService.listFriends(auth.user.id),
    ])
    const pMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
    const friendIds = new Set(friends.map((f) => f.id))
    const enriched = rows
      .map((r) => ({ ...r, profile: pMap[r.user_id], isFriend: friendIds.has(r.user_id) }))
      .filter((r) => r.profile)
    enriched.sort((a, b) => Number(b.isFriend) - Number(a.isFriend))
    reviews.value = enriched
    emit('count', enriched.length)

    // carrega curtidas/comentários dos posts vinculados às avaliações
    const map = await postsService.reviewPostsMap(
      enriched.map((r) => r.id),
      auth.user.id,
    )
    for (const r of enriched) {
      interactions[r.id] = map[r.id] || { postId: null, likeCount: 0, liked: false, commentCount: 0 }
    }
  } catch {
    /* avaliações são complementares; silenciar falhas */
  } finally {
    loading.value = false
  }
}

async function ensurePost(reviewId) {
  const it = interactions[reviewId]
  if (it.postId) return it.postId
  it.postId = await postsService.ensureReviewPost(reviewId)
  return it.postId
}

async function like(review) {
  const it = interactions[review.id]
  const was = it.liked
  try {
    const postId = await ensurePost(review.id)
    if (!postId) return
    it.liked = !was
    it.likeCount += was ? -1 : 1
    await postsService.toggleLike(postId, auth.user.id, was)
  } catch {
    it.liked = was
    it.likeCount += was ? 1 : -1
    toast.error('Não foi possível curtir.')
  }
}

async function toggleComments(review) {
  if (openId.value === review.id) {
    openId.value = null
    return
  }
  const postId = await ensurePost(review.id)
  if (!postId) {
    toast.error('Não foi possível abrir os comentários.')
    return
  }
  openId.value = review.id
}

const reviewName = (r) => r.profile?.display_name || r.profile?.username || 'Usuário'
</script>

<template>
  <div>
    <h3 v-if="showHeading && reviews.length" class="mb-2 font-semibold">Avaliações</h3>

    <ul v-if="reviews.length" class="space-y-3">
      <li v-for="r in reviews" :key="r.id" class="card p-4">
        <div class="flex items-center gap-3">
          <RouterLink
            :to="r.profile.username ? { name: 'profile', params: { username: r.profile.username } } : {}"
            class="flex min-w-0 items-center gap-2"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-xs font-semibold text-white">
              <img v-if="r.profile.avatar_url" :src="r.profile.avatar_url" :alt="reviewName(r)" class="h-full w-full object-cover" />
              <template v-else>{{ initialsOf(reviewName(r)) }}</template>
            </span>
            <span class="truncate text-sm font-medium">{{ reviewName(r) }}</span>
          </RouterLink>
          <span v-if="r.isFriend" class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Amigo
          </span>
          <StarRating :model-value="Number(r.rating)" readonly class="ml-auto" />
        </div>
        <p v-if="r.notes" class="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{{ r.notes }}</p>

        <!-- ações da avaliação -->
        <div class="mt-2 flex items-center gap-4 text-sm">
          <button class="flex items-center gap-1.5" :class="interactions[r.id]?.liked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'" @click="like(r)">
            <svg class="h-5 w-5" :class="interactions[r.id]?.liked ? 'fill-rose-500' : 'fill-none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>
            {{ interactions[r.id]?.likeCount || 0 }}
          </button>
          <button class="flex items-center gap-1.5 text-slate-500 hover:text-brand-600" @click="toggleComments(r)">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
            {{ interactions[r.id]?.commentCount || 0 }}
          </button>
        </div>

        <!-- comentários -->
        <div v-if="openId === r.id" class="mt-3">
          <CommentThread :post-id="interactions[r.id].postId" @count="interactions[r.id].commentCount = $event" />
        </div>
      </li>
    </ul>

    <EmptyState
      v-else-if="!loading && !hideWhenEmpty"
      icon="star"
      title="Nenhuma avaliação ainda"
      message="Seja o primeiro a avaliar este livro publicamente."
    />
  </div>
</template>

<script setup>
import ReviewCommentThread from '@/components/books/ReviewCommentThread.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StarRating from '@/components/ui/StarRating.vue'
import { useToast } from '@/composables/useToast'
import { booksService } from '@/services/books.service'
import { friendshipsService } from '@/services/friendships.service'
import { profilesService } from '@/services/profiles.service'
import { reviewsService } from '@/services/reviews.service'
import { useAuthStore } from '@/stores/auth.store'
import { initialsOf } from '@/utils/formatters'
import { onMounted, reactive, ref, watch } from 'vue'

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
const likers = reactive({})

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

    const map = await reviewsService.interactionsMap(
      enriched.map((r) => r.id),
      auth.user.id,
    )
    for (const r of enriched) {
      interactions[r.id] = map[r.id] || { likeCount: 0, liked: false, commentCount: 0 }
    }
  } catch {
    /* avaliações são complementares; silenciar falhas */
  } finally {
    loading.value = false
  }
}

async function like(review) {
  const it = interactions[review.id]
  const was = it.liked
  try {
    it.liked = !was
    it.likeCount += was ? -1 : 1
    await reviewsService.toggleLike(review.id, auth.user.id, was)
    // atualiza lista de quem curtiu se estiver aberta
    if (likers[review.id]?.open) {
      likers[review.id].users = await reviewsService.getLikers(review.id)
    }
  } catch {
    it.liked = was
    it.likeCount += was ? 1 : -1
    toast.error('Não foi possível curtir.')
  }
}

async function toggleLikers(review) {
  if (!likers[review.id]) likers[review.id] = { open: false, loading: false, users: [] }
  const lk = likers[review.id]
  lk.open = !lk.open
  if (lk.open && !lk.users.length) {
    lk.loading = true
    try { lk.users = await reviewsService.getLikers(review.id) }
    finally { lk.loading = false }
  }
}

function toggleComments(review) {
  openId.value = openId.value === review.id ? null : review.id
}

const reviewName = (r) => r.profile?.display_name || r.profile?.username || 'Usuário'
const lName = (u) => u.display_name || u.username || 'Usuário'
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
        <div class="mt-2 flex items-center gap-3 text-sm">
          <!-- coração -->
          <button
            class="flex items-center"
            :class="interactions[r.id]?.liked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'"
            @click="like(r)"
          >
            <font-awesome-icon :icon="['fas', 'heart']" class="h-5 w-5" />
          </button>
          <!-- contagem clicável para ver quem curtiu -->
          <button
            class="text-sm"
            :class="interactions[r.id]?.likeCount ? 'text-slate-600 hover:underline dark:text-slate-300' : 'text-slate-400'"
            :disabled="!interactions[r.id]?.likeCount"
            @click="toggleLikers(r)"
          >
            {{ interactions[r.id]?.likeCount || 0 }}
          </button>
          <!-- comentários -->
          <button class="ml-1 flex items-center gap-1.5 text-slate-500 hover:text-brand-600" @click="toggleComments(r)">
            <font-awesome-icon :icon="['far', 'comment']" class="h-5 w-5" />
            {{ interactions[r.id]?.commentCount || 0 }}
          </button>
        </div>

        <!-- quem curtiu -->
        <div v-if="likers[r.id]?.open" class="mt-2 flex flex-wrap gap-1.5">
          <span v-if="likers[r.id]?.loading" class="text-xs text-slate-400">Carregando...</span>
          <template v-else>
            <span
              v-for="u in likers[r.id].users"
              :key="u.id"
              class="flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800"
            >
              <span class="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-[9px] font-semibold text-white">
                <img v-if="u.avatar_url" :src="u.avatar_url" class="h-full w-full object-cover" />
                <template v-else>{{ initialsOf(lName(u)) }}</template>
              </span>
              {{ lName(u) }}
            </span>
          </template>
        </div>

        <!-- comentários -->
        <div v-if="openId === r.id" class="mt-3">
          <ReviewCommentThread :review-id="r.id" @count="interactions[r.id].commentCount = $event" />
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

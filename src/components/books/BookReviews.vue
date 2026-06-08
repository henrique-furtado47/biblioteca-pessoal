<script setup>
import { onMounted, ref, watch } from 'vue'
import { booksService } from '@/services/books.service'
import { profilesService } from '@/services/profiles.service'
import { friendshipsService } from '@/services/friendships.service'
import { useAuthStore } from '@/stores/auth.store'
import { initialsOf } from '@/utils/formatters'
import StarRating from '@/components/ui/StarRating.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const props = defineProps({
  bookId: { type: String, default: '' },
  showHeading: { type: Boolean, default: true },
  hideWhenEmpty: { type: Boolean, default: false },
})
const emit = defineEmits(['count'])

const auth = useAuthStore()
const reviews = ref([]) // amigos primeiro, cada um com isFriend
const loading = ref(false)

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
    // amigos primeiro
    enriched.sort((a, b) => Number(b.isFriend) - Number(a.isFriend))
    reviews.value = enriched
    emit('count', enriched.length)
  } catch {
    /* avaliações são complementares; silenciar falhas */
  } finally {
    loading.value = false
  }
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
          <span
            v-if="r.isFriend"
            class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          >
            Amigo
          </span>
          <StarRating :model-value="Number(r.rating)" readonly class="ml-auto" />
        </div>
        <p v-if="r.notes" class="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{{ r.notes }}</p>
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

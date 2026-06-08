<script setup>
import { onMounted, ref, watch } from 'vue'
import { booksService } from '@/services/books.service'
import { profilesService } from '@/services/profiles.service'
import { friendshipsService } from '@/services/friendships.service'
import { useAuthStore } from '@/stores/auth.store'
import { initialsOf } from '@/utils/formatters'
import StarRating from '@/components/ui/StarRating.vue'

const props = defineProps({
  bookId: { type: String, default: '' },
})

const auth = useAuthStore()
const friendReviews = ref([])
const communityReviews = ref([])
const loading = ref(false)

onMounted(load)
watch(() => props.bookId, load)

async function load() {
  friendReviews.value = []
  communityReviews.value = []
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
      .map((r) => ({ ...r, profile: pMap[r.user_id] }))
      .filter((r) => r.profile)
    friendReviews.value = enriched.filter((r) => friendIds.has(r.user_id))
    communityReviews.value = enriched.filter((r) => !friendIds.has(r.user_id))
  } catch {
    /* avaliações são complementares; silenciar falhas */
  } finally {
    loading.value = false
  }
}

const reviewName = (r) => r.profile?.display_name || r.profile?.username || 'Usuário'
</script>

<template>
  <div v-if="friendReviews.length || communityReviews.length" class="space-y-6">
    <section v-if="friendReviews.length">
      <h3 class="mb-2 font-semibold">Avaliações de amigos</h3>
      <ul class="space-y-3">
        <li v-for="r in friendReviews" :key="r.id" class="card p-4">
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
            <StarRating :model-value="Number(r.rating)" readonly class="ml-auto" />
          </div>
          <p v-if="r.notes" class="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{{ r.notes }}</p>
        </li>
      </ul>
    </section>

    <section v-if="communityReviews.length">
      <h3 class="mb-2 font-semibold">Avaliações da comunidade</h3>
      <ul class="space-y-3">
        <li v-for="r in communityReviews" :key="r.id" class="card p-4">
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
            <StarRating :model-value="Number(r.rating)" readonly class="ml-auto" />
          </div>
          <p v-if="r.notes" class="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{{ r.notes }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

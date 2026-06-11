<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { useToast } from '@/composables/useToast'
import { initialsOf } from '@/utils/formatters'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

defineEmits(['toggle-sidebar'])

const router = useRouter()
const auth = useAuthStore()
const profileStore = useProfileStore()
const toast = useToast()

const menuOpen = ref(false)

onMounted(() => profileStore.loadMe())

const displayName = computed(() => profileStore.me?.display_name || auth.displayName)
const avatarUrl = computed(() => profileStore.me?.avatar_url || '')
const myProfileTo = computed(() =>
  profileStore.username
    ? { name: 'profile', params: { username: profileStore.username } }
    : { name: 'settings' },
)

async function logout() {
  try {
    await auth.logout()
    toast.success('Sessão encerrada.')
    router.push({ name: 'login' })
  } catch {
    toast.error('Não foi possível sair.')
  }
}
</script>

<template>
  <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
    <!-- toggle sidebar (mobile) -->
    <button
      class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
      @click="$emit('toggle-sidebar')"
    >
      <font-awesome-icon :icon="['fas', 'bars']" class="h-6 w-6" />
    </button>

    <div class="ml-auto flex items-center gap-1.5">
      <ThemeToggle />

      <!-- avatar / menu -->
      <div class="relative">
        <button
          class="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          @click="menuOpen = !menuOpen"
        >
          <span class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-semibold text-white">
            <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" class="h-full w-full object-cover" />
            <template v-else>{{ initialsOf(displayName) }}</template>
          </span>
          <span class="hidden text-sm font-medium sm:block">{{ displayName }}</span>
        </button>

        <transition name="fade">
          <div
            v-if="menuOpen"
            class="card absolute right-0 mt-2 w-56 overflow-hidden p-1.5"
            @click="menuOpen = false"
          >
            <div class="px-3 py-2 text-xs text-slate-400">{{ auth.email }}</div>
            <RouterLink
              :to="myProfileTo"
              class="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Meu Perfil
            </RouterLink>
            <RouterLink
              :to="{ name: 'settings' }"
              class="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Configurações
            </RouterLink>
            <button
              class="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
              @click="logout"
            >
              Sair
            </button>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>

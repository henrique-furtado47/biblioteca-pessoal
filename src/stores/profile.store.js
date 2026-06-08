import { defineStore } from 'pinia'
import { profilesService } from '@/services/profiles.service'
import { useAuthStore } from './auth.store'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    me: null,
    loaded: false,
    loading: false,
  }),
  getters: {
    // Username do usuário atual (ou null se ainda não definido)
    username: (state) => state.me?.username ?? null,
  },
  actions: {
    /** Carrega o perfil do usuário autenticado (uma vez). */
    async loadMe(force = false) {
      if (this.loaded && !force) return this.me
      const userId = useAuthStore().user?.id
      if (!userId) return null
      this.loading = true
      try {
        this.me = await profilesService.getById(userId)
        this.loaded = true
      } finally {
        this.loading = false
      }
      return this.me
    },

    async updateMe(payload) {
      const userId = useAuthStore().user?.id
      this.me = await profilesService.update(userId, payload)
      this.loaded = true
      return this.me
    },

    reset() {
      this.me = null
      this.loaded = false
    },
  },
})

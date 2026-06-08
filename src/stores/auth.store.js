import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    session: null,
    initialized: false,
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    displayName: (state) =>
      state.user?.user_metadata?.full_name || state.user?.email?.split('@')[0] || 'Usuário',
    email: (state) => state.user?.email || '',
  },
  actions: {
    /** Carrega a sessão atual ao iniciar o app (usado no router guard). */
    async loadSession() {
      if (this.initialized) return
      try {
        const session = await authService.getSession()
        this.session = session
        this.user = session?.user ?? null
      } finally {
        this.initialized = true
      }
    },

    listenAuthChanges() {
      authService.onAuthStateChange((session) => {
        this.session = session
        this.user = session?.user ?? null
      })
    },

    async login(email, password) {
      this.loading = true
      try {
        const data = await authService.signIn(email, password)
        this.session = data.session
        this.user = data.user
      } finally {
        this.loading = false
      }
    },

    async register(email, password, fullName) {
      this.loading = true
      try {
        const data = await authService.signUp(email, password, fullName)
        this.session = data.session
        this.user = data.user
        return data
      } finally {
        this.loading = false
      }
    },

    async logout() {
      await authService.signOut()
      this.user = null
      this.session = null
    },

    async sendPasswordReset(email) {
      await authService.resetPasswordForEmail(email)
    },

    async updatePassword(newPassword) {
      await authService.updatePassword(newPassword)
    },
  },
})

import { defineStore } from 'pinia'
import { shelvesService } from '@/services/shelves.service'
import { useAuthStore } from './auth.store'

export const useShelvesStore = defineStore('shelves', {
  state: () => ({
    items: [],
    loaded: false,
    loading: false,
  }),
  actions: {
    _userId() {
      return useAuthStore().user?.id
    },

    async fetch(force = false) {
      if (this.loaded && !force) return
      const userId = this._userId()
      if (!userId) return
      this.loading = true
      try {
        this.items = await shelvesService.list(userId)
        this.loaded = true
      } finally {
        this.loading = false
      }
    },

    async create(name) {
      const shelf = await shelvesService.create(this._userId(), name)
      this.items.push(shelf)
      return shelf
    },

    async rename(id, name) {
      const updated = await shelvesService.rename(id, name)
      const idx = this.items.findIndex((s) => s.id === id)
      if (idx !== -1) this.items[idx] = updated
    },

    async remove(id) {
      await shelvesService.remove(id)
      this.items = this.items.filter((s) => s.id !== id)
    },

    async reorder(orderedIds) {
      this.items = orderedIds.map((id) => this.items.find((s) => s.id === id)).filter(Boolean)
      await shelvesService.reorder(orderedIds)
    },

    reset() {
      this.items = []
      this.loaded = false
    },
  },
})

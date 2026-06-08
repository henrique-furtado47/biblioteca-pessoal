import { defineStore } from 'pinia'
import { genresService } from '@/services/genres.service'

export const useGenresStore = defineStore('genres', {
  state: () => ({
    items: [],
    loaded: false,
    loading: false,
  }),
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      try {
        this.items = await genresService.list()
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
  },
})

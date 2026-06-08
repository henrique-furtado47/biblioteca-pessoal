import { defineStore } from 'pinia'
import { authorsService } from '@/services/authors.service'

export const useAuthorsStore = defineStore('authors', {
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
        this.items = await authorsService.list()
        this.loaded = true
      } finally {
        this.loading = false
      }
    },

    async findOrCreate(name) {
      const author = await authorsService.findOrCreateByName(name)
      if (author && !this.items.some((a) => a.id === author.id)) {
        this.items.push(author)
        this.items.sort((a, b) => a.name.localeCompare(b.name))
      }
      return author
    },
  },
})

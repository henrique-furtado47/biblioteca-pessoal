import { defineStore } from 'pinia'
import { booksService } from '@/services/books.service'
import { useAuthStore } from './auth.store'
import { PAGE_SIZE } from '@/constants'

export const useBooksStore = defineStore('books', {
  state: () => ({
    items: [],
    count: 0,
    loading: false,
    // filtros e paginação
    filters: {
      search: '',
      status: '',
      authorId: '',
      year: '',
      minRating: '',
      favorite: null,
      sort: 'recent',
    },
    page: 1,
    pageSize: PAGE_SIZE,
  }),
  getters: {
    totalPages: (state) => Math.max(1, Math.ceil(state.count / state.pageSize)),
  },
  actions: {
    _userId() {
      return useAuthStore().user?.id
    },

    async fetch() {
      const userId = this._userId()
      if (!userId) return
      this.loading = true
      try {
        const { items, count } = await booksService.list({
          userId,
          page: this.page,
          pageSize: this.pageSize,
          ...this.filters,
        })
        this.items = items
        this.count = count
      } finally {
        this.loading = false
      }
    },

    setFilter(patch) {
      this.filters = { ...this.filters, ...patch }
      this.page = 1
      return this.fetch()
    },

    resetFilters() {
      this.filters = {
        search: '',
        status: '',
        authorId: '',
        year: '',
        minRating: '',
        favorite: null,
        sort: 'recent',
      }
      this.page = 1
      return this.fetch()
    },

    setPage(page) {
      this.page = page
      return this.fetch()
    },

    async create(payload) {
      const userId = this._userId()
      const book = await booksService.create({ ...payload, user_id: userId })
      return book
    },

    async update(id, payload) {
      return booksService.update(id, payload)
    },

    async remove(id) {
      await booksService.remove(id)
      this.items = this.items.filter((b) => b.id !== id)
      this.count = Math.max(0, this.count - 1)
    },

    async toggleFavorite(book) {
      const updated = await booksService.setFavorite(book.id, !book.favorite)
      this._replaceInList(updated)
      return updated
    },

    async changeStatus(book, status) {
      const updated = await booksService.setStatus(book.id, status)
      this._replaceInList(updated)
      return updated
    },

    _replaceInList(updated) {
      const idx = this.items.findIndex((b) => b.id === updated.id)
      if (idx !== -1) this.items[idx] = { ...this.items[idx], ...updated }
    },
  },
})

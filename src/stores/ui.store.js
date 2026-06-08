import { defineStore } from 'pinia'

// ---------------------------------------------------------------------------
//  Tema (claro / escuro) — persistido em localStorage
// ---------------------------------------------------------------------------
export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: 'light', // 'light' | 'dark'
  }),
  actions: {
    init() {
      const saved = localStorage.getItem('theme')
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
      this.theme = saved || (prefersDark ? 'dark' : 'light')
      this.apply()
    },
    apply() {
      const root = document.documentElement
      if (this.theme === 'dark') root.classList.add('dark')
      else root.classList.remove('dark')
    },
    toggle() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', this.theme)
      this.apply()
    },
    set(theme) {
      this.theme = theme
      localStorage.setItem('theme', theme)
      this.apply()
    },
  },
})

// ---------------------------------------------------------------------------
//  UI: toasts + diálogo de confirmação
// ---------------------------------------------------------------------------
let toastSeq = 0

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [],
    confirmState: {
      open: false,
      title: '',
      message: '',
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      variant: 'danger',
      _resolve: null,
    },
  }),
  actions: {
    // --- Toasts -----------------------------------------------------------
    pushToast({ type = 'info', message = '', timeout = 3500 }) {
      const id = ++toastSeq
      this.toasts.push({ id, type, message })
      if (timeout) setTimeout(() => this.dismissToast(id), timeout)
      return id
    },
    dismissToast(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },
    success(message, timeout) {
      return this.pushToast({ type: 'success', message, timeout })
    },
    error(message, timeout) {
      return this.pushToast({ type: 'error', message, timeout })
    },
    info(message, timeout) {
      return this.pushToast({ type: 'info', message, timeout })
    },

    // --- Confirmação ------------------------------------------------------
    confirm(options = {}) {
      return new Promise((resolve) => {
        this.confirmState = {
          open: true,
          title: options.title || 'Tem certeza?',
          message: options.message || '',
          confirmText: options.confirmText || 'Confirmar',
          cancelText: options.cancelText || 'Cancelar',
          variant: options.variant || 'danger',
          _resolve: resolve,
        }
      })
    },
    resolveConfirm(value) {
      this.confirmState._resolve?.(value)
      this.confirmState.open = false
      this.confirmState._resolve = null
    },
  },
})

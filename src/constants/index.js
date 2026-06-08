// Status de leitura ----------------------------------------------------------
export const BOOK_STATUS = {
  unread: 'unread',
  reading: 'reading',
  finished: 'finished',
  abandoned: 'abandoned',
  wishlist: 'wishlist',
}

export const STATUS_LABELS = {
  unread: 'Não lido',
  reading: 'Lendo',
  finished: 'Lido',
  abandoned: 'Abandonado',
  wishlist: 'Lista de desejos',
}

// Classes Tailwind por status (badge)
export const STATUS_STYLES = {
  unread: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  reading: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  finished: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  abandoned: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  wishlist: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

export const STATUS_OPTIONS = Object.keys(STATUS_LABELS).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}))

// Idiomas mais comuns ---------------------------------------------------------
export const LANGUAGE_OPTIONS = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'pt-PT', label: 'Português (Portugal)' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
  { value: 'fr', label: 'Francês' },
  { value: 'de', label: 'Alemão' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: 'Japonês' },
  { value: 'other', label: 'Outro' },
]

// Ordenação -------------------------------------------------------------------
export const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes', column: 'created_at', ascending: false },
  { value: 'oldest', label: 'Mais antigos', column: 'created_at', ascending: true },
  { value: 'rating_desc', label: 'Maior nota', column: 'rating', ascending: false },
  { value: 'rating_asc', label: 'Menor nota', column: 'rating', ascending: true },
  { value: 'title_asc', label: 'Ordem alfabética', column: 'title', ascending: true },
]

export const PAGE_SIZE = 12

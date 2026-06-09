import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const routes = [
  // --- Públicas (autenticação) ---------------------------------------------
  {
    path: '/',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { guestOnly: true },
    children: [
      { path: '', redirect: { name: 'login' } },
      { path: 'login', name: 'login', component: () => import('@/views/auth/LoginView.vue') },
      {
        path: 'cadastro',
        name: 'register',
        component: () => import('@/views/auth/RegisterView.vue'),
      },
      {
        path: 'recuperar-senha',
        name: 'forgot-password',
        component: () => import('@/views/auth/ForgotPasswordView.vue'),
      },
      {
        path: 'reset-password',
        name: 'reset-password',
        component: () => import('@/views/auth/ResetPasswordView.vue'),
        meta: { guestOnly: false }, // acessível com link de recuperação
      },
    ],
  },

  // --- Protegidas (app) ----------------------------------------------------
  {
    path: '/app',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'feed', name: 'feed', component: () => import('@/views/FeedView.vue') },
      { path: 'catalogo', name: 'catalog', component: () => import('@/views/books/CatalogView.vue') },
      {
        path: 'obra/:id',
        name: 'book-page',
        component: () => import('@/views/books/BookPageView.vue'),
      },
      { path: 'livros', name: 'books', component: () => import('@/views/books/BooksListView.vue') },
      {
        path: 'livros/novo',
        name: 'book-new',
        component: () => import('@/views/books/BookFormView.vue'),
      },
      {
        path: 'livros/:id',
        name: 'book-detail',
        component: () => import('@/views/books/BookDetailView.vue'),
      },
      {
        path: 'livros/:id/editar',
        name: 'book-edit',
        component: () => import('@/views/books/BookFormView.vue'),
      },
      { path: 'autores', name: 'authors', component: () => import('@/views/AuthorsView.vue') },
      {
        path: 'autores/:id',
        name: 'author-detail',
        component: () => import('@/views/AuthorDetailView.vue'),
      },
      { path: 'desejos', name: 'wishlist', component: () => import('@/views/WishlistView.vue') },
      { path: 'favoritos', name: 'favorites', component: () => import('@/views/FavoritesView.vue') },
      {
        path: 'estatisticas',
        name: 'statistics',
        component: () => import('@/views/StatisticsView.vue'),
      },
      {
        path: 'configuracoes',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
      },
      {
        path: 'comunidade',
        name: 'community',
        component: () => import('@/views/CommunityView.vue'),
      },
      {
        path: 'u/:username',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
      },
    ],
  },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.loadSession()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  return true
})

export default router

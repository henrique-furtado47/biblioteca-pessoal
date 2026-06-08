# 📚 Minha Biblioteca Pessoal

Aplicação web para organizar, acompanhar e visualizar sua coleção de livros — lidos, em leitura, não lidos, abandonados e desejados.

Stack: **Vue 3 (Composition API) · Vite · Pinia · Vue Router · Tailwind CSS · Axios** no frontend e **Supabase** (Auth + PostgreSQL + Storage) no backend.

---

## 🚀 Como executar

### 1. Pré-requisitos
- Node.js 18+
- Uma conta no [Supabase](https://supabase.com) (plano gratuito serve)

### 2. Criar o projeto no Supabase
1. Crie um novo projeto no painel do Supabase.
2. Abra **SQL Editor** → **New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
   - Isso cria o enum `book_status`, as tabelas (`authors`, `genres`, `books`, `book_genres`), políticas de **RLS**, o bucket de Storage `covers` com suas políticas e popula os gêneros iniciais.
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
4. (Opcional) Em **Authentication → Providers → Email**, desative "Confirm email" se quiser login imediato no cadastro durante o desenvolvimento.

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
```
Edite `.env`:
```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-public-key
```
> A `anon key` é pública por design (protegida por RLS) — segura para uso no frontend.

### 4. Instalar e rodar
```bash
npm install
npm run dev
```
Acesse `http://localhost:5173`.

### 5. Build de produção
```bash
npm run build
npm run preview
```

---

## ☁️ Deploy no Vercel

1. Suba o repositório no GitHub.
2. No Vercel, importe o projeto (framework detectado: **Vite**).
3. Em **Settings → Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Deploy. O arquivo [`vercel.json`](vercel.json) já trata o roteamento SPA (rewrites).

> Em **Supabase → Authentication → URL Configuration**, adicione a URL do Vercel em *Site URL* / *Redirect URLs* para que a recuperação de senha funcione em produção.

---

## 🗂️ Estrutura

```
src/
├─ components/   # ui/ (genéricos), layout/, books/, authors/, stats/
├─ composables/  # useToast, useConfirm, useOpenLibrary
├─ layouts/      # AuthLayout, DefaultLayout
├─ router/       # rotas + guard de autenticação
├─ services/     # acesso ao Supabase e Open Library
├─ stores/       # Pinia: auth, books, authors, ui (tema/toasts/confirm)
├─ views/        # páginas
├─ constants/    # status, idiomas, ordenação
└─ utils/        # formatters, validators
```

---

## 🧭 Roadmap (entrega faseada)

- [x] **Fase 1** — Autenticação (login, cadastro, recuperação, logout) · rotas protegidas · CRUD de livros · upload de capa · avaliação por estrelas · Dashboard · Favoritos · Lista de Desejos · tema claro/escuro · toasts, modais, skeletons, paginação, empty states · integração Open Library por ISBN
- [ ] **Fase 2** — Gestão completa de Autores (biografia/foto) · associação de Gêneros aos livros
- [ ] **Fase 3** — Filtros avançados (gênero, ano) e refinamentos de busca
- [ ] **Fase 4** — Estatísticas com Chart.js (por ano/mês/gênero/status, páginas lidas, autores mais lidos)

> Observação: a integração Open Library e o tema já foram adiantados na Fase 1.

---

## 🔐 Segurança

O isolamento por usuário é garantido no banco via **Row Level Security**: cada `book` só é visível/editável pelo seu dono (`auth.uid() = user_id`). `authors` e `genres` são catálogos globais (leitura/escrita para autenticados). O bucket `covers` permite que cada usuário gerencie apenas arquivos sob o prefixo `{user_id}/`.
```

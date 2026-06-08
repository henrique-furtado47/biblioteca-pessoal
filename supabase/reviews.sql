-- ============================================================================
--  Biblioteca Pessoal — Fase 5c: Avaliações públicas (por livro / ISBN)
--  Execute no SQL Editor do Supabase (Run) DEPOIS de social.sql.
--  Idempotente o suficiente para reexecução em desenvolvimento.
-- ============================================================================

-- Marca se a avaliação (nota + observações) deste livro é pública.
-- Opt-in: por padrão NÃO é pública.
alter table public.books
  add column if not exists review_public boolean not null default false;

-- ----------------------------------------------------------------------------
--  RLS: qualquer autenticado pode LER um livro cuja avaliação é pública,
--  mesmo que a biblioteca do dono seja privada (opt-in independente).
--  Policy permissiva — somada às demais *_select_*.
-- ----------------------------------------------------------------------------
drop policy if exists "books_select_public_review" on public.books;
create policy "books_select_public_review" on public.books
  for select using (review_public = true);

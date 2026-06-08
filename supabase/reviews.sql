-- ============================================================================
--  Biblioteca Pessoal — Fase 5c: Avaliações públicas (por obra)
--  Execute no SQL Editor do Supabase (Run) DEPOIS de schema.sql + social.sql.
--  A coluna user_books.review_public já é criada no schema.sql.
--  Idempotente o suficiente para reexecução em desenvolvimento.
-- ============================================================================

-- Qualquer autenticado pode LER uma entrada de estante cuja avaliação é
-- pública (opt-in), mesmo que a biblioteca do dono seja privada.
-- Policy permissiva — somada às demais user_books_select_*.
drop policy if exists "user_books_select_public_review" on public.user_books;
create policy "user_books_select_public_review" on public.user_books
  for select using (review_public = true);

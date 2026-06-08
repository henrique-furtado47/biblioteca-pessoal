-- ============================================================================
--  Biblioteca Pessoal — Schema completo (PostgreSQL / Supabase)
--  Modelo: catálogo de OBRAS compartilhado (books) + ESTANTE por usuário
--  (user_books). Vários usuários compartilham a mesma obra; cada um tem a
--  própria estante (status, nota, resenha, favorito, datas).
--
--  Execute este arquivo no SQL Editor do Supabase (Run).
--  ATENÇÃO: recria as tabelas de livros (reset de dados de livros).
--  Depois rode social.sql, friendships.sql e reviews.sql.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
--  ENUM de status de leitura
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'book_status') then
    create type book_status as enum
      ('unread', 'reading', 'finished', 'abandoned', 'wishlist');
  end if;
end$$;

-- ----------------------------------------------------------------------------
--  Função utilitária: manter updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
--  Catálogos GLOBAIS: authors e genres
-- ----------------------------------------------------------------------------
create table if not exists public.authors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  biography   text,
  photo_url   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.genres (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

-- ----------------------------------------------------------------------------
--  RESET das tabelas de livros (modelo antigo -> novo)
--  Dropar books em cascata remove book_genres e user_books dependentes.
-- ----------------------------------------------------------------------------
drop table if exists public.user_books cascade;
drop table if exists public.book_genres cascade;
drop table if exists public.books cascade;

-- ----------------------------------------------------------------------------
--  Tabela: books  (OBRA compartilhada — catálogo)
-- ----------------------------------------------------------------------------
create table public.books (
  id                uuid primary key default gen_random_uuid(),
  isbn              text unique,
  title             text not null,
  subtitle          text,
  description       text,
  publisher         text,
  publication_year  integer,
  pages             integer,
  language          text,
  cover_url         text,
  author_id         uuid references public.authors(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists books_author_id_idx on public.books(author_id);
create index if not exists books_title_idx      on public.books(title);

drop trigger if exists trg_books_updated_at on public.books;
create trigger trg_books_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
--  Tabela: book_genres  (N:N entre OBRA e gênero)
-- ----------------------------------------------------------------------------
create table public.book_genres (
  book_id   uuid not null references public.books(id) on delete cascade,
  genre_id  uuid not null references public.genres(id) on delete cascade,
  primary key (book_id, genre_id)
);

-- ----------------------------------------------------------------------------
--  Tabela: user_books  (ESTANTE — vínculo usuário x obra, dados pessoais)
-- ----------------------------------------------------------------------------
create table public.user_books (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  book_id        uuid not null references public.books(id) on delete cascade,
  status         book_status not null default 'unread',
  rating         numeric(2,1) check (rating is null or (rating >= 0.5 and rating <= 5.0)),
  notes          text,
  favorite       boolean not null default false,
  review_public  boolean not null default false,
  start_date     date,
  finish_date    date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, book_id)
);

create index if not exists user_books_user_id_idx  on public.user_books(user_id);
create index if not exists user_books_book_id_idx   on public.user_books(book_id);
create index if not exists user_books_status_idx     on public.user_books(status);
create index if not exists user_books_favorite_idx   on public.user_books(favorite);

drop trigger if exists trg_user_books_updated_at on public.user_books;
create trigger trg_user_books_updated_at
  before update on public.user_books
  for each row execute function public.set_updated_at();

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.authors     enable row level security;
alter table public.genres      enable row level security;
alter table public.books       enable row level security;
alter table public.book_genres enable row level security;
alter table public.user_books  enable row level security;

-- --- authors: catálogo global (leitura/escrita p/ autenticados) -------------
drop policy if exists "authors_select_all" on public.authors;
create policy "authors_select_all" on public.authors
  for select using (auth.role() = 'authenticated');
drop policy if exists "authors_insert_auth" on public.authors;
create policy "authors_insert_auth" on public.authors
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authors_update_auth" on public.authors;
create policy "authors_update_auth" on public.authors
  for update using (auth.role() = 'authenticated');

-- --- genres: catálogo global ------------------------------------------------
drop policy if exists "genres_select_all" on public.genres;
create policy "genres_select_all" on public.genres
  for select using (auth.role() = 'authenticated');
drop policy if exists "genres_insert_auth" on public.genres;
create policy "genres_insert_auth" on public.genres
  for insert with check (auth.role() = 'authenticated');

-- --- books: OBRA compartilhada -> leitura/escrita p/ autenticados -----------
drop policy if exists "books_select_all" on public.books;
create policy "books_select_all" on public.books
  for select using (auth.role() = 'authenticated');
drop policy if exists "books_insert_auth" on public.books;
create policy "books_insert_auth" on public.books
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "books_update_auth" on public.books;
create policy "books_update_auth" on public.books
  for update using (auth.role() = 'authenticated');

-- --- book_genres: gêneros da obra (leitura/escrita p/ autenticados) ---------
drop policy if exists "book_genres_select_all" on public.book_genres;
create policy "book_genres_select_all" on public.book_genres
  for select using (auth.role() = 'authenticated');
drop policy if exists "book_genres_write_auth" on public.book_genres;
create policy "book_genres_write_auth" on public.book_genres
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --- user_books: cada usuário gerencia a própria estante --------------------
drop policy if exists "user_books_select_own" on public.user_books;
create policy "user_books_select_own" on public.user_books
  for select using (auth.uid() = user_id);
drop policy if exists "user_books_insert_own" on public.user_books;
create policy "user_books_insert_own" on public.user_books
  for insert with check (auth.uid() = user_id);
drop policy if exists "user_books_update_own" on public.user_books;
create policy "user_books_update_own" on public.user_books
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "user_books_delete_own" on public.user_books;
create policy "user_books_delete_own" on public.user_books
  for delete using (auth.uid() = user_id);
-- (políticas de visibilidade social e de avaliações públicas: ver social.sql / reviews.sql)

-- ============================================================================
--  STORAGE — bucket de capas/avatares
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists "covers_public_read" on storage.objects;
create policy "covers_public_read" on storage.objects
  for select using (bucket_id = 'covers');

drop policy if exists "covers_insert_own" on storage.objects;
create policy "covers_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "covers_update_own" on storage.objects;
create policy "covers_update_own" on storage.objects
  for update using (
    bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "covers_delete_own" on storage.objects;
create policy "covers_delete_own" on storage.objects
  for delete using (
    bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
--  SEED — gêneros iniciais
-- ============================================================================
insert into public.genres (name) values
  ('Ficção'), ('Não-ficção'), ('Fantasia'), ('Ficção Científica'),
  ('Romance'), ('Suspense'), ('Terror'), ('Biografia'), ('História'),
  ('Autoajuda'), ('Tecnologia'), ('Negócios'), ('Poesia'), ('Infantil'),
  ('Filosofia'), ('Psicologia'), ('Religião'), ('Quadrinhos')
on conflict (name) do nothing;

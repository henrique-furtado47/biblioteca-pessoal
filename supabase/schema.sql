-- ============================================================================
--  Biblioteca Pessoal — Schema completo (PostgreSQL / Supabase)
--  Execute este arquivo no SQL Editor do Supabase (Run).
--  Idempotente o suficiente para reexecução em ambiente de desenvolvimento.
-- ============================================================================

-- Extensão para gen_random_uuid()
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
--  Tabela: authors  (catálogo GLOBAL — compartilhado entre usuários)
-- ----------------------------------------------------------------------------
create table if not exists public.authors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  biography   text,
  photo_url   text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  Tabela: genres  (catálogo GLOBAL)
-- ----------------------------------------------------------------------------
create table if not exists public.genres (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

-- ----------------------------------------------------------------------------
--  Tabela: books  (privada por usuário)
-- ----------------------------------------------------------------------------
create table if not exists public.books (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  author_id         uuid references public.authors(id) on delete set null,
  title             text not null,
  subtitle          text,
  isbn              text,
  description       text,
  publisher         text,
  publication_year  integer,
  pages             integer,
  language          text,
  cover_url         text,
  status            book_status not null default 'unread',
  rating            numeric(2,1) check (rating is null or (rating >= 0.5 and rating <= 5.0)),
  start_date        date,
  finish_date       date,
  favorite          boolean not null default false,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists books_user_id_idx       on public.books(user_id);
create index if not exists books_status_idx         on public.books(status);
create index if not exists books_author_id_idx      on public.books(author_id);
create index if not exists books_favorite_idx       on public.books(favorite);

-- ----------------------------------------------------------------------------
--  Tabela: book_genres  (N:N entre books e genres)
-- ----------------------------------------------------------------------------
create table if not exists public.book_genres (
  book_id   uuid not null references public.books(id) on delete cascade,
  genre_id  uuid not null references public.genres(id) on delete cascade,
  primary key (book_id, genre_id)
);

-- ----------------------------------------------------------------------------
--  Trigger: manter updated_at
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

drop trigger if exists trg_books_updated_at on public.books;
create trigger trg_books_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.books        enable row level security;
alter table public.book_genres  enable row level security;
alter table public.authors      enable row level security;
alter table public.genres       enable row level security;

-- --- books: cada usuário só acessa os próprios -----------------------------
drop policy if exists "books_select_own" on public.books;
create policy "books_select_own" on public.books
  for select using (auth.uid() = user_id);

drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own" on public.books
  for insert with check (auth.uid() = user_id);

drop policy if exists "books_update_own" on public.books;
create policy "books_update_own" on public.books
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own" on public.books
  for delete using (auth.uid() = user_id);

-- --- book_genres: ligados a um book do próprio usuário ----------------------
drop policy if exists "book_genres_all_own" on public.book_genres;
create policy "book_genres_all_own" on public.book_genres
  for all
  using (exists (
    select 1 from public.books b
    where b.id = book_genres.book_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.books b
    where b.id = book_genres.book_id and b.user_id = auth.uid()
  ));

-- --- authors: catálogo global -> leitura/escrita para autenticados ----------
drop policy if exists "authors_select_all" on public.authors;
create policy "authors_select_all" on public.authors
  for select using (auth.role() = 'authenticated');

drop policy if exists "authors_insert_auth" on public.authors;
create policy "authors_insert_auth" on public.authors
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "authors_update_auth" on public.authors;
create policy "authors_update_auth" on public.authors
  for update using (auth.role() = 'authenticated');

-- --- genres: catálogo global -> leitura/escrita para autenticados -----------
drop policy if exists "genres_select_all" on public.genres;
create policy "genres_select_all" on public.genres
  for select using (auth.role() = 'authenticated');

drop policy if exists "genres_insert_auth" on public.genres;
create policy "genres_insert_auth" on public.genres
  for insert with check (auth.role() = 'authenticated');

-- ============================================================================
--  STORAGE — bucket de capas
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

-- Leitura pública das capas
drop policy if exists "covers_public_read" on storage.objects;
create policy "covers_public_read" on storage.objects
  for select using (bucket_id = 'covers');

-- Cada usuário gerencia arquivos sob o seu próprio prefixo: {user_id}/arquivo
drop policy if exists "covers_insert_own" on storage.objects;
create policy "covers_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "covers_update_own" on storage.objects;
create policy "covers_update_own" on storage.objects
  for update using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "covers_delete_own" on storage.objects;
create policy "covers_delete_own" on storage.objects
  for delete using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
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

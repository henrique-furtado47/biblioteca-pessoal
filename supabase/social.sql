-- ============================================================================
--  Biblioteca Pessoal — Fase 5a: Perfis públicos + visibilidade + seguir
--  Execute este arquivo no SQL Editor do Supabase (Run) DEPOIS do schema.sql.
--  Idempotente o suficiente para reexecução em desenvolvimento.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Tabela: profiles  (1:1 com auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique,
  display_name        text,
  bio                 text,
  avatar_url          text,
  library_visibility  text not null default 'public'
                        check (library_visibility in ('public', 'private', 'followers')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Busca case-insensitive por username
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
--  Criação automática de profile ao cadastrar usuário + backfill
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill de usuários já existentes
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
--  Tabela: follows  (relação unidirecional follower -> following)
-- ----------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id   uuid not null references auth.users(id) on delete cascade,
  following_id  uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows(following_id);

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.follows  enable row level security;

-- --- profiles: leitura para autenticados; cada um edita o próprio ----------
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- --- follows: leitura para autenticados; só gerencia os próprios follows ----
drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all" on public.follows
  for select using (auth.role() = 'authenticated');

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows
  for insert with check (follower_id = auth.uid());

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows
  for delete using (follower_id = auth.uid());

-- ----------------------------------------------------------------------------
--  Abertura condicional da biblioteca de outros usuários
--  (policies SELECT adicionais — permissivas, somadas às *_select_own)
-- ----------------------------------------------------------------------------
drop policy if exists "books_select_public" on public.books;
create policy "books_select_public" on public.books
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = books.user_id
        and (
          p.library_visibility = 'public'
          or (
            p.library_visibility = 'followers'
            and exists (
              select 1 from public.follows f
              where f.following_id = books.user_id and f.follower_id = auth.uid()
            )
          )
        )
    )
  );

-- Gêneros dos livros visíveis também ficam legíveis
drop policy if exists "book_genres_select_public" on public.book_genres;
create policy "book_genres_select_public" on public.book_genres
  for select using (
    exists (
      select 1
      from public.books b
      join public.profiles p on p.id = b.user_id
      where b.id = book_genres.book_id
        and (
          p.library_visibility = 'public'
          or (
            p.library_visibility = 'followers'
            and exists (
              select 1 from public.follows f
              where f.following_id = b.user_id and f.follower_id = auth.uid()
            )
          )
        )
    )
  );

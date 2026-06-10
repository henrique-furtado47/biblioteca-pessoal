-- ============================================================================
--  Biblioteca Pessoal — Pastas / Estantes personalizadas (modelo tags)
--  Um livro da sua estante pode estar em VÁRIAS pastas.
--  Execute no SQL Editor do Supabase (Run) DEPOIS de schema.sql.
--  Idempotente o suficiente para reexecução em desenvolvimento.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Tabela: shelves  (pastas do usuário)
-- ----------------------------------------------------------------------------
create table if not exists public.shelves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists shelves_user_idx on public.shelves(user_id);

drop trigger if exists trg_shelves_updated_at on public.shelves;
create trigger trg_shelves_updated_at
  before update on public.shelves
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
--  Tabela: user_book_shelves  (N:N entre entradas da estante e pastas)
--  position = ordem do livro DENTRO da pasta.
-- ----------------------------------------------------------------------------
create table if not exists public.user_book_shelves (
  shelf_id      uuid not null references public.shelves(id) on delete cascade,
  user_book_id  uuid not null references public.user_books(id) on delete cascade,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  primary key (shelf_id, user_book_id)
);

create index if not exists ubs_user_book_idx on public.user_book_shelves(user_book_id);

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.shelves           enable row level security;
alter table public.user_book_shelves enable row level security;

-- --- shelves: cada usuário gerencia as próprias pastas ----------------------
drop policy if exists "shelves_select_own" on public.shelves;
create policy "shelves_select_own" on public.shelves
  for select using (user_id = auth.uid());
drop policy if exists "shelves_insert_own" on public.shelves;
create policy "shelves_insert_own" on public.shelves
  for insert with check (user_id = auth.uid());
drop policy if exists "shelves_update_own" on public.shelves;
create policy "shelves_update_own" on public.shelves
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "shelves_delete_own" on public.shelves;
create policy "shelves_delete_own" on public.shelves
  for delete using (user_id = auth.uid());

-- --- user_book_shelves: ligados a uma pasta do próprio usuário --------------
drop policy if exists "ubs_all_own" on public.user_book_shelves;
create policy "ubs_all_own" on public.user_book_shelves
  for all
  using (
    exists (select 1 from public.shelves s where s.id = shelf_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.shelves s where s.id = shelf_id and s.user_id = auth.uid())
  );

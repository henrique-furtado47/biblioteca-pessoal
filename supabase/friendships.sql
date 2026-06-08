-- ============================================================================
--  Biblioteca Pessoal — Fase 5b: Amizades (pedido / aceite)
--  Execute no SQL Editor do Supabase (Run) DEPOIS de social.sql.
--  Idempotente o suficiente para reexecução em desenvolvimento.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Tabela: friendships  (vínculo mútuo com fluxo de pedido/aceite)
--  Uma linha por par. requester pede; addressee aceita.
-- ----------------------------------------------------------------------------
create table if not exists public.friendships (
  requester_id  uuid not null references auth.users(id) on delete cascade,
  addressee_id  uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friendships_addressee_idx on public.friendships(addressee_id);

drop trigger if exists trg_friendships_updated_at on public.friendships;
create trigger trg_friendships_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.friendships enable row level security;

-- Só enxerga vínculos em que participa
drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own" on public.friendships
  for select using (auth.uid() in (requester_id, addressee_id));

-- Envia pedido como você mesmo
drop policy if exists "friendships_insert_own" on public.friendships;
create policy "friendships_insert_own" on public.friendships
  for insert with check (requester_id = auth.uid());

-- Apenas o destinatário pode aceitar (atualizar status)
drop policy if exists "friendships_update_addressee" on public.friendships;
create policy "friendships_update_addressee" on public.friendships
  for update using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());

-- Qualquer um dos dois pode cancelar/recusar/desfazer
drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own" on public.friendships
  for delete using (auth.uid() in (requester_id, addressee_id));

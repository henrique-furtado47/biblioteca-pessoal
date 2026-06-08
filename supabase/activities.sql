-- ============================================================================
--  Biblioteca Pessoal — Fase 5d: Feed de atividades
--  Execute no SQL Editor do Supabase (Run) DEPOIS de schema.sql + social.sql
--  + friendships.sql. Idempotente o suficiente para reexecução em dev.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Tabela: activities  (eventos da estante para o feed)
--  type: added | status | rating | favorite
-- ----------------------------------------------------------------------------
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('added', 'status', 'rating', 'favorite')),
  book_id     uuid references public.books(id) on delete cascade,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists activities_user_idx    on public.activities(user_id);
create index if not exists activities_created_idx  on public.activities(created_at desc);

-- ----------------------------------------------------------------------------
--  Trigger: registra atividades a partir de mudanças na estante (user_books)
--  security definer -> a inserção em activities ignora a RLS (gatilho confiável)
-- ----------------------------------------------------------------------------
create or replace function public.log_user_book_activity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.activities (user_id, type, book_id, data)
    values (new.user_id, 'added', new.book_id, jsonb_build_object('status', new.status));

  elsif (tg_op = 'UPDATE') then
    if new.status is distinct from old.status then
      insert into public.activities (user_id, type, book_id, data)
      values (new.user_id, 'status', new.book_id, jsonb_build_object('status', new.status));
    end if;
    if new.rating is distinct from old.rating and new.rating is not null then
      insert into public.activities (user_id, type, book_id, data)
      values (new.user_id, 'rating', new.book_id, jsonb_build_object('rating', new.rating));
    end if;
    if new.favorite is distinct from old.favorite and new.favorite then
      insert into public.activities (user_id, type, book_id, data)
      values (new.user_id, 'favorite', new.book_id, '{}'::jsonb);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_user_book_activity_ins on public.user_books;
create trigger trg_user_book_activity_ins
  after insert on public.user_books
  for each row execute function public.log_user_book_activity();

drop trigger if exists trg_user_book_activity_upd on public.user_books;
create trigger trg_user_book_activity_upd
  after update on public.user_books
  for each row execute function public.log_user_book_activity();

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.activities enable row level security;

-- Vê a própria atividade, de quem segue, de amigos, ou de perfis públicos.
drop policy if exists "activities_select_visible" on public.activities;
create policy "activities_select_visible" on public.activities
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = activities.user_id and p.library_visibility = 'public'
    )
    or exists (
      select 1 from public.follows f
      where f.following_id = activities.user_id and f.follower_id = auth.uid()
    )
    or exists (
      select 1 from public.friendships fr
      where fr.status = 'accepted'
        and (
          (fr.requester_id = auth.uid() and fr.addressee_id = activities.user_id)
          or (fr.addressee_id = auth.uid() and fr.requester_id = activities.user_id)
        )
    )
  );

drop policy if exists "activities_insert_own" on public.activities;
create policy "activities_insert_own" on public.activities
  for insert with check (user_id = auth.uid());

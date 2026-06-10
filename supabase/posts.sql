-- ============================================================================
--  Biblioteca Pessoal — Feed social: publicações, curtidas e comentários
--  Execute no SQL Editor do Supabase (Run) DEPOIS de schema.sql + social.sql
--  + friendships.sql. Idempotente o suficiente para reexecução em dev.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Função auxiliar: posso ver o conteúdo social de `target`?
--  (eu mesmo, perfil público, quem eu sigo, ou amigo aceito)
-- ----------------------------------------------------------------------------
create or replace function public.can_view_user(target uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    target = auth.uid()
    or exists (select 1 from public.profiles p where p.id = target and p.library_visibility = 'public')
    or exists (select 1 from public.follows f where f.following_id = target and f.follower_id = auth.uid())
    or exists (
      select 1 from public.friendships fr
      where fr.status = 'accepted'
        and ((fr.requester_id = auth.uid() and fr.addressee_id = target)
          or (fr.addressee_id = auth.uid() and fr.requester_id = target))
    );
$$;

-- ----------------------------------------------------------------------------
--  Tabela: posts  (publicações)
-- ----------------------------------------------------------------------------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  caption       text,
  kind          text not null default 'text'
                  check (kind in ('text', 'review', 'status', 'favorite', 'added')),
  book_id       uuid references public.books(id) on delete set null,
  user_book_id  uuid references public.user_books(id) on delete set null,
  rating        numeric(2,1),
  status        book_status,
  created_at    timestamptz not null default now()
);

create index if not exists posts_user_idx        on public.posts(user_id);
create index if not exists posts_created_idx       on public.posts(created_at desc);
create index if not exists posts_user_book_idx     on public.posts(user_book_id);

-- ----------------------------------------------------------------------------
--  Tabela: post_likes
-- ----------------------------------------------------------------------------
create table if not exists public.post_likes (
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ----------------------------------------------------------------------------
--  Tabela: post_comments
-- ----------------------------------------------------------------------------
create table if not exists public.post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- resposta a outro comentário (1 nível de thread)
alter table public.post_comments
  add column if not exists parent_id uuid references public.post_comments(id) on delete cascade;

create index if not exists post_comments_post_idx on public.post_comments(post_id, created_at);
create index if not exists post_comments_parent_idx on public.post_comments(parent_id);

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.posts         enable row level security;
alter table public.post_likes    enable row level security;
alter table public.post_comments enable row level security;

-- --- posts ------------------------------------------------------------------
drop policy if exists "posts_select_visible" on public.posts;
create policy "posts_select_visible" on public.posts
  for select using (public.can_view_user(user_id));
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert with check (user_id = auth.uid());
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete using (user_id = auth.uid());

-- --- post_likes: ver se o post é visível; curtir/descurtir como você --------
drop policy if exists "post_likes_select" on public.post_likes;
create policy "post_likes_select" on public.post_likes
  for select using (
    exists (select 1 from public.posts p where p.id = post_id and public.can_view_user(p.user_id))
  );
drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own" on public.post_likes
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id and public.can_view_user(p.user_id))
  );
drop policy if exists "post_likes_delete_own" on public.post_likes;
create policy "post_likes_delete_own" on public.post_likes
  for delete using (user_id = auth.uid());

-- --- post_comments ----------------------------------------------------------
drop policy if exists "post_comments_select" on public.post_comments;
create policy "post_comments_select" on public.post_comments
  for select using (
    exists (select 1 from public.posts p where p.id = post_id and public.can_view_user(p.user_id))
  );
drop policy if exists "post_comments_insert_own" on public.post_comments;
create policy "post_comments_insert_own" on public.post_comments
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id and public.can_view_user(p.user_id))
  );
drop policy if exists "post_comments_delete_own" on public.post_comments;
create policy "post_comments_delete_own" on public.post_comments
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
--  Garante (ou recupera) o post vinculado a uma avaliação pública.
--  Permite que curtidas/comentários de uma avaliação usem um post como base.
--  security definer: o post pertence ao AUTOR da avaliação.
-- ----------------------------------------------------------------------------
create or replace function public.ensure_review_post(p_user_book_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_post_id uuid;
  v_user_id uuid;
  v_book_id uuid;
  v_rating  numeric(2,1);
  v_public  boolean;
begin
  select id into v_post_id from public.posts where user_book_id = p_user_book_id limit 1;
  if v_post_id is not null then
    return v_post_id;
  end if;

  select user_id, book_id, rating, review_public
    into v_user_id, v_book_id, v_rating, v_public
  from public.user_books where id = p_user_book_id;

  -- só cria para avaliações públicas
  if v_user_id is null or v_public is not true then
    return null;
  end if;

  insert into public.posts (user_id, kind, book_id, user_book_id, rating)
  values (v_user_id, 'review', v_book_id, p_user_book_id, v_rating)
  returning id into v_post_id;
  return v_post_id;
end;
$$;

grant execute on function public.ensure_review_post(uuid) to authenticated;

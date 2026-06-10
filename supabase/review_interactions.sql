-- ============================================================================
--  Biblioteca Pessoal — Curtidas e comentários nativos de avaliações
--  Execute no SQL Editor do Supabase DEPOIS de schema.sql + reviews.sql.
--  Idempotente para reexecução em dev.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Tabela: review_likes
-- ----------------------------------------------------------------------------
create table if not exists public.review_likes (
  review_id  uuid not null references public.user_books(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index if not exists review_likes_review_idx on public.review_likes(review_id);

-- ----------------------------------------------------------------------------
--  Tabela: review_comments
-- ----------------------------------------------------------------------------
create table if not exists public.review_comments (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.user_books(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  parent_id  uuid references public.review_comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists review_comments_review_idx  on public.review_comments(review_id, created_at);
create index if not exists review_comments_parent_idx  on public.review_comments(parent_id);

-- ----------------------------------------------------------------------------
--  Tabela: review_comment_likes
-- ----------------------------------------------------------------------------
create table if not exists public.review_comment_likes (
  comment_id uuid not null references public.review_comments(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists review_comment_likes_comment_idx on public.review_comment_likes(comment_id);

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.review_likes         enable row level security;
alter table public.review_comments      enable row level security;
alter table public.review_comment_likes enable row level security;

-- helper: avaliação é visível se review_public = true
create or replace function public.can_view_review(p_review_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_books ub
    where ub.id = p_review_id
      and ub.review_public = true
  );
$$;

-- --- review_likes -----------------------------------------------------------
drop policy if exists "review_likes_select"      on public.review_likes;
drop policy if exists "review_likes_insert_own"  on public.review_likes;
drop policy if exists "review_likes_delete_own"  on public.review_likes;

create policy "review_likes_select" on public.review_likes
  for select using (public.can_view_review(review_id));

create policy "review_likes_insert_own" on public.review_likes
  for insert with check (
    user_id = auth.uid()
    and public.can_view_review(review_id)
  );

create policy "review_likes_delete_own" on public.review_likes
  for delete using (user_id = auth.uid());

-- --- review_comments --------------------------------------------------------
drop policy if exists "review_comments_select"     on public.review_comments;
drop policy if exists "review_comments_insert_own" on public.review_comments;
drop policy if exists "review_comments_delete_own" on public.review_comments;

create policy "review_comments_select" on public.review_comments
  for select using (public.can_view_review(review_id));

create policy "review_comments_insert_own" on public.review_comments
  for insert with check (
    user_id = auth.uid()
    and public.can_view_review(review_id)
  );

create policy "review_comments_delete_own" on public.review_comments
  for delete using (user_id = auth.uid());

-- --- review_comment_likes ---------------------------------------------------
drop policy if exists "review_comment_likes_select"     on public.review_comment_likes;
drop policy if exists "review_comment_likes_insert_own" on public.review_comment_likes;
drop policy if exists "review_comment_likes_delete_own" on public.review_comment_likes;

create policy "review_comment_likes_select" on public.review_comment_likes
  for select using (
    exists (
      select 1 from public.review_comments c
      where c.id = comment_id
        and public.can_view_review(c.review_id)
    )
  );

create policy "review_comment_likes_insert_own" on public.review_comment_likes
  for insert with check (user_id = auth.uid());

create policy "review_comment_likes_delete_own" on public.review_comment_likes
  for delete using (user_id = auth.uid());

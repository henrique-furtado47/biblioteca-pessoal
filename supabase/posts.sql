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
--  Tabela: comment_likes  (curtidas em comentários e respostas)
-- ----------------------------------------------------------------------------
create table if not exists public.comment_likes (
  comment_id  uuid not null references public.post_comments(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

drop policy if exists "comment_likes_select" on public.comment_likes;
create policy "comment_likes_select" on public.comment_likes
  for select using (
    exists (
      select 1 from public.post_comments c
      join public.posts p on p.id = c.post_id
      where c.id = comment_id and public.can_view_user(p.user_id)
    )
  );
drop policy if exists "comment_likes_insert_own" on public.comment_likes;
create policy "comment_likes_insert_own" on public.comment_likes
  for insert with check (user_id = auth.uid());
drop policy if exists "comment_likes_delete_own" on public.comment_likes;
create policy "comment_likes_delete_own" on public.comment_likes
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
  v_post_id    uuid;
  v_user_id    uuid;
  v_book_id    uuid;
  v_rating     numeric(2,1);
  v_public     boolean;
  v_notes      text;
  v_comment    record;
  v_new_id     uuid;
  v_parent_new uuid;
begin
  select id into v_post_id from public.posts where user_book_id = p_user_book_id limit 1;
  if v_post_id is not null then
    return v_post_id;
  end if;

  select user_id, book_id, rating, review_public, notes
    into v_user_id, v_book_id, v_rating, v_public, v_notes
  from public.user_books where id = p_user_book_id;

  -- só publica avaliações públicas
  if v_user_id is null or v_public is not true then
    return null;
  end if;

  insert into public.posts (user_id, kind, book_id, user_book_id, rating, caption)
  values (v_user_id, 'review', v_book_id, p_user_book_id, v_rating, v_notes)
  returning id into v_post_id;

  -- migra curtidas nativas da avaliação para o post
  insert into public.post_likes (post_id, user_id, created_at)
  select v_post_id, user_id, created_at
  from public.review_likes
  where review_id = p_user_book_id
  on conflict do nothing;

  -- migra comentários: tabela temp para mapear old_id -> new_id
  create temp table _cmap (old_id uuid primary key, new_id uuid) on commit drop;

  -- nível raiz
  for v_comment in
    select id, user_id, body, created_at
    from public.review_comments
    where review_id = p_user_book_id and parent_id is null
    order by created_at
  loop
    insert into public.post_comments (post_id, user_id, body, created_at)
    values (v_post_id, v_comment.user_id, v_comment.body, v_comment.created_at)
    returning id into v_new_id;
    insert into _cmap values (v_comment.id, v_new_id);
  end loop;

  -- respostas (1 nível)
  for v_comment in
    select rc.id, rc.user_id, rc.body, rc.parent_id, rc.created_at
    from public.review_comments rc
    where rc.review_id = p_user_book_id and rc.parent_id is not null
    order by rc.created_at
  loop
    select new_id into v_parent_new from _cmap where old_id = v_comment.parent_id;
    insert into public.post_comments (post_id, user_id, body, parent_id, created_at)
    values (v_post_id, v_comment.user_id, v_comment.body, v_parent_new, v_comment.created_at)
    returning id into v_new_id;
    insert into _cmap values (v_comment.id, v_new_id);
  end loop;

  return v_post_id;
end;
$$;

grant execute on function public.ensure_review_post(uuid) to authenticated;

-- Backfill: posts de avaliação criados sem legenda recebem o texto da avaliação
update public.posts p
set caption = ub.notes
from public.user_books ub
where p.user_book_id = ub.id
  and p.kind = 'review'
  and p.caption is null
  and ub.notes is not null;

-- ============================================================================
--  VISIBILIDADE POR PUBLICAÇÃO  (pública / seguidores / amigos)
--  pública  -> qualquer autenticado
--  seguidores -> quem segue + amigos
--  amigos   -> apenas amigos aceitos
-- ============================================================================
alter table public.posts
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'followers', 'friends'));

create or replace function public.can_view_post(p_author uuid, p_visibility text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    p_author = auth.uid()
    or p_visibility = 'public'
    or (p_visibility = 'followers' and (
        exists (select 1 from public.follows f where f.following_id = p_author and f.follower_id = auth.uid())
        or exists (
          select 1 from public.friendships fr
          where fr.status = 'accepted'
            and ((fr.requester_id = auth.uid() and fr.addressee_id = p_author)
              or (fr.addressee_id = auth.uid() and fr.requester_id = p_author)))
      ))
    or (p_visibility = 'friends' and exists (
        select 1 from public.friendships fr
        where fr.status = 'accepted'
          and ((fr.requester_id = auth.uid() and fr.addressee_id = p_author)
            or (fr.addressee_id = auth.uid() and fr.requester_id = p_author))
      ));
$$;

-- Recria as policies de leitura para considerar a visibilidade do post
drop policy if exists "posts_select_visible" on public.posts;
create policy "posts_select_visible" on public.posts
  for select using (public.can_view_post(user_id, visibility));

drop policy if exists "post_likes_select" on public.post_likes;
create policy "post_likes_select" on public.post_likes
  for select using (
    exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p.user_id, p.visibility))
  );

drop policy if exists "post_comments_select" on public.post_comments;
create policy "post_comments_select" on public.post_comments
  for select using (
    exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p.user_id, p.visibility))
  );

drop policy if exists "comment_likes_select" on public.comment_likes;
create policy "comment_likes_select" on public.comment_likes
  for select using (
    exists (
      select 1 from public.post_comments c
      join public.posts p on p.id = c.post_id
      where c.id = comment_id and public.can_view_post(p.user_id, p.visibility)
    )
  );

-- também ajusta o check de inserção de curtidas/comentários para a visibilidade
drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own" on public.post_likes
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p.user_id, p.visibility))
  );

drop policy if exists "post_comments_insert_own" on public.post_comments;
create policy "post_comments_insert_own" on public.post_comments
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p.user_id, p.visibility))
  );

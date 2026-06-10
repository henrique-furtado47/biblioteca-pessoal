-- ============================================================================
--  Biblioteca Pessoal — Datas coerentes com o status
--  - Término (finish_date) só existe para "lido": ao virar lido e sem data,
--    preenche com hoje; em qualquer outro status, zera a data de término.
--  - Início (start_date) só para quem começou: em "não lido"/"desejo", zera.
--  Vale para qualquer caminho (detalhe, formulário…).
--  Execute no SQL Editor do Supabase (Run). Idempotente, NÃO reseta dados.
-- ============================================================================

create or replace function public.set_finish_date()
returns trigger
language plpgsql
as $$
begin
  -- data de término só faz sentido para "lido"
  if new.status <> 'finished' then
    new.finish_date := null;
  elsif new.finish_date is null
        and (tg_op = 'INSERT' or old.status is distinct from 'finished') then
    new.finish_date := current_date;
  end if;

  -- data de início só para livros que começaram (não "não lido"/"desejo")
  if new.status in ('unread', 'wishlist') then
    new.start_date := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_books_finish_date on public.user_books;
create trigger trg_user_books_finish_date
  before insert or update on public.user_books
  for each row execute function public.set_finish_date();

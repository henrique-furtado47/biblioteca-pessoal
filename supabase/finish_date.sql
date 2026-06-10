-- ============================================================================
--  Biblioteca Pessoal — Data de término automática
--  Ao marcar um livro como "lido" (finished), se não houver data de término,
--  preenche com a data atual. Vale para qualquer caminho (detalhe, formulário…).
--  Execute no SQL Editor do Supabase (Run). Idempotente, NÃO reseta dados.
-- ============================================================================

create or replace function public.set_finish_date()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'finished'
     and new.finish_date is null
     and (tg_op = 'INSERT' or old.status is distinct from 'finished') then
    new.finish_date := current_date;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_books_finish_date on public.user_books;
create trigger trg_user_books_finish_date
  before insert or update on public.user_books
  for each row execute function public.set_finish_date();

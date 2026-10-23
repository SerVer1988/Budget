-- Удаление аккаунта из приложения: Настройки → Данные → «Удалить аккаунт».
-- Как применить: Supabase → SQL Editor → вставить → Run. Можно запускать повторно.
-- Функция удаляет все данные текущего пользователя (во всех таблицах, где есть колонка user_id), общую книгу пары,
-- старый общий бюджет (если пользователь в нём последний) и сам аккаунт. Привязка у партнёра исчезает вместе с аккаунтом.

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  pk text;
  hid uuid;
  r record;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  -- 1. Общая книга пары (после удаления аккаунта она никому не доступна).
  begin
    pk := public.my_pair_key();
    if pk is not null then delete from public.shared_data where pair_key = pk; end if;
  exception when undefined_function or undefined_table then null;
  end;

  -- 2. Старый общий бюджет: если вы в нём последний участник, удаляем его целиком.
  begin
    for hid in select household_id from public.household_members where user_id = uid loop
      if (select count(*) from public.household_members where household_id = hid) <= 1 then
        delete from public.households where id = hid;
      end if;
    end loop;
  exception when undefined_table then null;
  end;

  -- 3. Все остальные строки пользователя: каждая таблица public с колонкой user_id.
  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'user_id' and t.table_type = 'BASE TABLE'
  loop
    execute format('delete from public.%I where user_id = $1', r.table_name) using uid;
  end loop;

  -- 4. Сам аккаунт (привязки и приглашения с внешними ключами уходят каскадом).
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

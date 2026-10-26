-- Виджет на главном экране телефона: краткая сводка (остатки по трём бюджетам, траты за сегодня) для чтения виджетом.
-- Как применить: Supabase → SQL Editor → вставить → Run. Можно запускать повторно.
-- Виджет не знает ваш пароль: у него отдельный ключ, который можно отозвать кнопкой «Отключить виджет» в настройках.
-- Ключ хранится на сервере только в виде хэша; по нему читается одна короткая сводка, больше ничего.

create table if not exists public.widget_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists widget_data_token_idx on public.widget_data (token_hash);

alter table public.widget_data enable row level security;
revoke all on public.widget_data from anon, authenticated;   -- напрямую таблица закрыта; доступ только через функции ниже

-- Выпустить ключ виджета (старый перестаёт работать). Сам ключ возвращается один раз и на сервере не хранится.
create or replace function public.create_widget_token()
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  t := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.widget_data (user_id, token_hash)
  values (auth.uid(), encode(extensions.digest(t, 'sha256'), 'hex'))
  on conflict (user_id) do update set token_hash = excluded.token_hash;
  return t;
end $$;

-- Сохранить сводку: её присылает приложение, пока вы им пользуетесь (только если виджет подключён).
create or replace function public.save_widget_summary(p_data jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_data is null or pg_column_size(p_data) > 4000 then raise exception 'too_large'; end if;
  update public.widget_data set data = p_data, updated_at = now() where user_id = auth.uid();
end $$;

-- Прочитать сводку по ключу: это вызывает сам виджет на телефоне. Неверный ключ даёт пустой ответ.
create or replace function public.widget_summary(p_token text)
returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select data from public.widget_data
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
  limit 1;
$$;

-- Отключить виджет: ключ и сводка удаляются.
create or replace function public.widget_disable()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from public.widget_data where user_id = auth.uid();
end $$;

revoke all on function public.create_widget_token(), public.save_widget_summary(jsonb), public.widget_disable() from public, anon;
grant execute on function public.create_widget_token(), public.save_widget_summary(jsonb), public.widget_disable() to authenticated;
revoke all on function public.widget_summary(text) from public;
grant execute on function public.widget_summary(text) to anon, authenticated;

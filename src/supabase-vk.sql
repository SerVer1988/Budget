-- Вход через VK ID: связь «пользователь VK ↔ аккаунт Бюджета».
-- Как применить: Supabase → SQL Editor → вставить → Run. Можно запускать повторно.
-- Затем создайте функцию vk-login (supabase/functions/vk-login/index.ts), см. инструкцию в чате.

create table if not exists public.vk_links (
  vk_id text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.vk_links enable row level security;
revoke all on public.vk_links from anon, authenticated;   -- напрямую таблица закрыта: пишет только серверная функция

-- Привязан ли VK к моему аккаунту.
create or replace function public.vk_link_status()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.vk_links where user_id = auth.uid());
$$;

-- Отвязать VK. Если у аккаунта нет настоящей почты (он создан входом через VK), отвязывать нельзя: человек потеряет доступ.
create or replace function public.vk_unlink()
returns void
language plpgsql security definer set search_path = public as $$
declare mail text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select email into mail from auth.users where id = auth.uid();
  if mail is null or mail like '%@vk.budget.invalid' then raise exception 'only_login_method'; end if;
  delete from public.vk_links where user_id = auth.uid();
end $$;

revoke all on function public.vk_link_status(), public.vk_unlink() from public, anon;
grant execute on function public.vk_link_status(), public.vk_unlink() to authenticated;

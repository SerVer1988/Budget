-- Push-уведомления на устройство (Web Push): где хранятся подписки устройств.
-- Нужен выполненный supabase-partner.sql. Как применить: Supabase → SQL Editor → вставить → Run. Можно запускать повторно.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'webpush',
  endpoint text not null unique,
  p256dh text,
  auth text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;   -- напрямую таблица закрыта; работают функции ниже
grant select on public.push_subscriptions to authenticated;

drop policy if exists "own push select" on public.push_subscriptions;
create policy "own push select" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());

-- Сохранить подписку этого устройства за текущим аккаунтом (если на устройстве раньше был другой аккаунт, подписка переходит к новому).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_ua text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_endpoint is null or length(p_endpoint) < 20 then raise exception 'bad_endpoint'; end if;
  insert into push_subscriptions (user_id, provider, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), 'webpush', p_endpoint, p_p256dh, p_auth, left(p_ua, 200))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent, created_at = now();
end $$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
end $$;

revoke all on function public.save_push_subscription(text, text, text, text), public.remove_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text), public.remove_push_subscription(text) to authenticated;

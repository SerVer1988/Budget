-- Привязка двух аккаунтов («пространства»): у каждого остаются свои данные, а партнёр может ТОЛЬКО ЧИТАТЬ
-- бюджет, если вы сами разрешили. Это не «общий бюджет» из supabase-household.sql, он не нужен и не меняется.
-- Как применить: Supabase → SQL Editor → вставить весь файл → Run. Скрипт можно запускать повторно.
-- Сначала должен быть выполнен supabase-security.sql (личные данные app_data).

-- 1. Таблицы -----------------------------------------------------------------------------
-- Одна строка на человека: «я привязан к такому-то, и показываю ему свой бюджет (share) или нет».
create table if not exists public.partner_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  share boolean not null default true,
  linked_at timestamptz not null default now(),
  check (user_id <> partner_id)
);

-- Приглашения по коду (живут сутки, один активный код на человека).
create table if not exists public.partner_invites (
  code text primary key,
  inviter uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.partner_links enable row level security;
alter table public.partner_invites enable row level security;
revoke all on public.partner_links, public.partner_invites from anon, authenticated;   -- только через функции ниже

-- 2. Кому разрешено читать: «владелец p_owner открыл свой бюджет мне» (security definer — без зацикливания правил)
create or replace function public.partner_shares_with_me(p_owner uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.partner_links l
    where l.user_id = p_owner and l.partner_id = auth.uid() and l.share
  );
$$;

-- 3. Правило чтения чужих данных: только настройки и операции, только если владелец разрешил.
--    Это ДОПОЛНИТЕЛЬНОЕ правило: свои строки по-прежнему читаются прежним правилом. Писать в чужие строки нельзя.
drop policy if exists "partner read" on public.app_data;
create policy "partner read" on public.app_data
  for select to authenticated
  using (key in ('settings', 'transactions') and public.partner_shares_with_me(user_id));

-- 4. Действия ------------------------------------------------------------------------------
create or replace function public.create_partner_invite()
returns text
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from partner_links where user_id = auth.uid()) then raise exception 'already_linked'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  delete from partner_invites where inviter = auth.uid();
  insert into partner_invites (code, inviter) values (v_code, auth.uid());
  return v_code;
end $$;

create or replace function public.accept_partner_invite(p_code text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_inviter uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select inviter into v_inviter from partner_invites
    where code = upper(trim(p_code)) and created_at > now() - interval '1 day';
  if v_inviter is null then raise exception 'invalid_code'; end if;
  if v_inviter = auth.uid() then raise exception 'own_code'; end if;
  if exists (select 1 from partner_links where user_id in (auth.uid(), v_inviter)) then raise exception 'already_linked'; end if;
  insert into partner_links (user_id, partner_id) values (auth.uid(), v_inviter), (v_inviter, auth.uid());
  delete from partner_invites where inviter = v_inviter;
end $$;

-- Кто мой партнёр, показываю ли я ему свой бюджет и показывает ли он мне свой.
create or replace function public.partner_info()
returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  select json_build_object(
    'partner', json_build_object('id', l.partner_id, 'email', u.email),
    'i_share', l.share,
    'partner_shares', coalesce((select p.share from partner_links p where p.user_id = l.partner_id and p.partner_id = l.user_id), false)
  ) into r
  from partner_links l join auth.users u on u.id = l.partner_id
  where l.user_id = auth.uid();
  return r;
end $$;

create or replace function public.set_partner_sharing(p_share boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update partner_links set share = coalesce(p_share, false) where user_id = auth.uid();
end $$;

create or replace function public.unlink_partner()
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from partner_links where user_id = auth.uid() or partner_id = auth.uid();
  delete from partner_invites where inviter = auth.uid();
end $$;

revoke all on function public.partner_shares_with_me(uuid), public.create_partner_invite(), public.accept_partner_invite(text),
  public.partner_info(), public.set_partner_sharing(boolean), public.unlink_partner() from public, anon;
grant execute on function public.partner_shares_with_me(uuid), public.create_partner_invite(), public.accept_partner_invite(text),
  public.partner_info(), public.set_partner_sharing(boolean), public.unlink_partner() to authenticated;

-- 5. Проверка (запустить отдельно после скрипта):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';          -- везде true
--   select policyname, cmd from pg_policies where tablename = 'app_data' order by 1;   -- есть «partner read» (select)

-- Совместный бюджет («режим двоих»): общие данные для двух человек.
-- Как применить: Supabase → SQL Editor → вставить весь файл → Run. Скрипт можно запускать повторно.
-- Сначала должен быть выполнен supabase-security.sql (личные данные).

-- 1. Таблицы -----------------------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Наш бюджет',
  invite_code text not null unique,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)                      -- один человек состоит только в одном совместном бюджете
);

create table if not exists public.household_data (
  household_id uuid not null references public.households(id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  primary key (household_id, key)
);

-- 2. Проверка членства (security definer — чтобы правила не зацикливались) -------------------
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

-- 3. Правила доступа (RLS) -------------------------------------------------------------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_data enable row level security;

revoke all on public.households, public.household_members, public.household_data from anon;
grant select on public.households, public.household_members to authenticated;
grant select, insert, update, delete on public.household_data to authenticated;

drop policy if exists "households select" on public.households;
create policy "households select" on public.households
  for select to authenticated using (public.is_household_member(id));

drop policy if exists "members select" on public.household_members;
create policy "members select" on public.household_members
  for select to authenticated using (user_id = auth.uid() or public.is_household_member(household_id));

drop policy if exists "household_data select" on public.household_data;
drop policy if exists "household_data insert" on public.household_data;
drop policy if exists "household_data update" on public.household_data;
drop policy if exists "household_data delete" on public.household_data;
create policy "household_data select" on public.household_data
  for select to authenticated using (public.is_household_member(household_id));
create policy "household_data insert" on public.household_data
  for insert to authenticated with check (public.is_household_member(household_id));
create policy "household_data update" on public.household_data
  for update to authenticated using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy "household_data delete" on public.household_data
  for delete to authenticated using (public.is_household_member(household_id));

-- 4. Действия (только через функции: напрямую таблицы households/household_members менять нельзя) --
create or replace function public.create_household(p_name text default 'Наш бюджет')
returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then raise exception 'already_member'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into households (name, invite_code, created_by)
    values (coalesce(nullif(trim(p_name), ''), 'Наш бюджет'), v_code, auth.uid())
    returning id into v_id;
  insert into household_members (household_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return json_build_object('id', v_id, 'invite_code', v_code);
end $$;

create or replace function public.join_household(p_code text)
returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then raise exception 'already_member'; end if;
  select id into v_id from households where invite_code = upper(trim(p_code));
  if v_id is null then raise exception 'invalid_code'; end if;
  if (select count(*) from household_members where household_id = v_id) >= 2 then raise exception 'household_full'; end if;
  insert into household_members (household_id, user_id, role) values (v_id, auth.uid(), 'member');
  return json_build_object('id', v_id);
end $$;

create or replace function public.leave_household()
returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_role text;
begin
  select household_id, role into v_id, v_role from household_members where user_id = auth.uid();
  if v_id is null then return; end if;
  delete from household_members where user_id = auth.uid();
  if not exists (select 1 from household_members where household_id = v_id) then
    delete from households where id = v_id;                      -- ушёл последний: данные удаляются
  elsif v_role = 'owner' then
    update household_members set role = 'owner' where household_id = v_id;   -- права переходят оставшемуся
  end if;
end $$;

create or replace function public.household_info()
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v_role text; r json;
begin
  select household_id, role into v_id, v_role from household_members where user_id = auth.uid();
  if v_id is null then return null; end if;
  select json_build_object(
    'id', h.id,
    'name', h.name,
    'role', v_role,
    'invite_code', case when v_role = 'owner' then h.invite_code else null end,
    'members', (
      select coalesce(json_agg(json_build_object('id', m.user_id, 'email', u.email, 'role', m.role) order by m.joined_at), '[]'::json)
      from household_members m join auth.users u on u.id = m.user_id
      where m.household_id = h.id
    )
  ) into r from households h where h.id = v_id;
  return r;
end $$;

create or replace function public.regenerate_invite()
returns text
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text;
begin
  select household_id into v_id from household_members where user_id = auth.uid() and role = 'owner';
  if v_id is null then raise exception 'not_owner'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  update households set invite_code = v_code where id = v_id;
  return v_code;
end $$;

create or replace function public.remove_member(p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select household_id into v_id from household_members where user_id = auth.uid() and role = 'owner';
  if v_id is null then raise exception 'not_owner'; end if;
  if p_user = auth.uid() then raise exception 'use_leave'; end if;
  delete from household_members where household_id = v_id and user_id = p_user;
end $$;

revoke all on function public.create_household(text), public.join_household(text), public.leave_household(),
  public.household_info(), public.regenerate_invite(), public.remove_member(uuid), public.is_household_member(uuid)
  from public, anon;
grant execute on function public.create_household(text), public.join_household(text), public.leave_household(),
  public.household_info(), public.regenerate_invite(), public.remove_member(uuid), public.is_household_member(uuid)
  to authenticated;

-- 5. Проверка (запустить отдельно после скрипта):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';   -- везде true
--   select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2;

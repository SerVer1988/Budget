-- Отчёты о проблемах: кнопка «Сообщить о проблеме» в приложении (Настройки → Помощь и поддержка).
-- Как применить: Supabase → SQL Editor → вставить → Run. Можно запускать повторно.
-- Прочитать отчёты: Supabase → Table Editor → problem_reports.
-- В отчёт попадают только текст пользователя и технический журнал ошибок (без операций и сумм): см. src/diagnostics.js.

create table if not exists public.problem_reports (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  app text,
  user_agent text,
  message text not null,
  log text,
  contact text
);

alter table public.problem_reports enable row level security;
revoke all on public.problem_reports from anon, authenticated;   -- читать и писать напрямую нельзя, только через функцию ниже
revoke all on sequence public.problem_reports_id_seq from anon, authenticated;

create or replace function public.submit_problem_report(
  p_message text,
  p_log text default null,
  p_contact text default null,
  p_app text default null,
  p_ua text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_message is null or length(trim(p_message)) < 3 then raise exception 'empty_message'; end if;
  -- не больше 10 отчётов в сутки с одного аккаунта (защита от спама)
  if (select count(*) from problem_reports where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too_many_reports';
  end if;
  insert into problem_reports (user_id, app, user_agent, message, log, contact)
  values (auth.uid(), left(p_app, 120), left(p_ua, 300), left(p_message, 3000), left(p_log, 20000), left(p_contact, 200));
end $$;

revoke all on function public.submit_problem_report(text, text, text, text, text) from public, anon;
grant execute on function public.submit_problem_report(text, text, text, text, text) to authenticated;

-- Global entry gate: FIFO waiting queue + concurrent cap + daily-usage guard. Polled via REST RPC (no Realtime while waiting).
create table if not exists public.gate_cfg (id int primary key default 1 check (id = 1), cap int not null default 60, low_cap int not null default 30, daily_budget int not null default 5000, guard_pct int not null default 80, wait_ttl_s int not null default 25, live_ttl_s int not null default 75);
insert into public.gate_cfg (id) values (1) on conflict do nothing;
create table if not exists public.gate_q (cid text primary key, admitted boolean not null default false, joined timestamptz not null default now(), seen timestamptz not null default now(), qa boolean not null default false);
create table if not exists public.gate_daily (day date primary key, sessions int not null default 0);
alter table public.gate_cfg enable row level security; alter table public.gate_q enable row level security; alter table public.gate_daily enable row level security;
create or replace function public.gate_beat(p_cid text, p_qa boolean default false) returns json language plpgsql security definer set search_path = public as $$
declare c gate_cfg; me gate_q; live int; ecap int; pos int; used int; ns int := case when p_qa then 1 else 0 end;
begin
  if p_cid is null or length(p_cid) > 40 then raise exception 'bad cid'; end if;
  perform pg_advisory_xact_lock(424242 + ns);
  select * into c from gate_cfg where id = 1;
  delete from gate_q where qa = p_qa and ((not admitted and seen < now() - make_interval(secs => c.wait_ttl_s)) or (admitted and seen < now() - make_interval(secs => c.live_ttl_s)));
  insert into gate_q (cid, qa) values (p_cid, p_qa) on conflict (cid) do update set seen = now();
  select * into me from gate_q where cid = p_cid;
  select coalesce(sessions, 0) into used from gate_daily where day = (now() at time zone 'Asia/Seoul')::date; used := coalesce(used, 0);
  ecap := case when p_qa then (select cap from gate_qa where id = 1) else c.cap end;
  if used >= c.daily_budget * c.guard_pct / 100 then ecap := least(ecap, c.low_cap); end if;
  select count(*) into live from gate_q where qa = p_qa and admitted;
  if not me.admitted then
    select count(*) + 1 into pos from gate_q where qa = p_qa and not admitted and (joined < me.joined or (joined = me.joined and cid < me.cid));
    if live < ecap and pos <= ecap - live then
      update gate_q set admitted = true where cid = p_cid; live := live + 1; pos := 0;
      insert into gate_daily (day, sessions) values ((now() at time zone 'Asia/Seoul')::date, 1) on conflict (day) do update set sessions = gate_daily.sessions + 1;
      return json_build_object('ok', true, 'pos', 0, 'live', live, 'cap', ecap, 'guard', used >= c.daily_budget * c.guard_pct / 100);
    end if;
    return json_build_object('ok', false, 'pos', pos, 'live', live, 'cap', ecap, 'guard', used >= c.daily_budget * c.guard_pct / 100);
  end if;
  return json_build_object('ok', true, 'pos', 0, 'live', live, 'cap', ecap, 'guard', used >= c.daily_budget * c.guard_pct / 100);
end $$;
create or replace function public.gate_leave(p_cid text) returns void language sql security definer set search_path = public as $$ delete from gate_q where cid = p_cid $$;
-- QA-only knob: lets the simulator set a small cap for the qa namespace without touching production.
create table if not exists public.gate_qa (id int primary key default 1 check (id = 1), cap int not null default 5);
insert into public.gate_qa (id) values (1) on conflict do nothing; alter table public.gate_qa enable row level security;
revoke all on function public.gate_beat(text, boolean) from public; revoke all on function public.gate_leave(text) from public;
grant execute on function public.gate_beat(text, boolean) to anon, authenticated; grant execute on function public.gate_leave(text) to anon, authenticated;

-- Size the gate from MEASURED Supabase Free limits (real-connection load test 2026-10-31):
--   project cap 100 Realtime msgs/s → 10 real clients = 71.8 msg/s; 50 clients hit "Too many messages per second".
--   cap 10 ≈ 75% of the ~13-user ceiling. Monthly 2,000,000 msgs → budget guard on an estimate accumulated by heartbeats.
alter table public.gate_cfg add column if not exists month_msgs int not null default 2000000, add column if not exists msg_a numeric not null default 1.0, add column if not exists msg_b numeric not null default 0.8, add column if not exists hard_pct int not null default 95;
update public.gate_cfg set cap = 10, low_cap = 4, guard_pct = 80 where id = 1;
update public.gate_qa set cap = 10 where id = 1;
create table if not exists public.gate_month (month text primary key, est_msgs bigint not null default 0, user_s bigint not null default 0);
alter table public.gate_month enable row level security;
alter table public.gate_daily add column if not exists est_msgs bigint not null default 0;
create or replace function public.gate_beat(p_cid text, p_qa boolean default false) returns json language plpgsql security definer set search_path = public as $$
declare c gate_cfg; me gate_q; live int; ecap int; pos int; mon bigint; dayu bigint; el numeric; d date := (now() at time zone 'Asia/Seoul')::date; mk text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM'); g text := 'none';
begin
  if p_cid is null or length(p_cid) > 40 then raise exception 'bad cid'; end if;
  perform pg_advisory_xact_lock(424242 + case when p_qa then 1 else 0 end);
  select * into c from gate_cfg where id = 1;
  delete from gate_q where qa = p_qa and ((not admitted and seen < now() - make_interval(secs => c.wait_ttl_s)) or (admitted and seen < now() - make_interval(secs => c.live_ttl_s)));
  select * into me from gate_q where cid = p_cid;
  select count(*) into live from gate_q where qa = p_qa and admitted;
  -- usage estimate: an admitted heartbeat stands for the seconds since its last beat, at (a + b·(live-1)) msgs/s per user (fitted to the load test)
  if me.admitted and not p_qa then el := least(extract(epoch from now() - me.seen), c.live_ttl_s);
    insert into gate_month (month, est_msgs, user_s) values (mk, (el * (c.msg_a + c.msg_b * greatest(live - 1, 0)))::bigint, el::bigint)
      on conflict (month) do update set est_msgs = gate_month.est_msgs + excluded.est_msgs, user_s = gate_month.user_s + excluded.user_s;
    insert into gate_daily (day, est_msgs) values (d, (el * (c.msg_a + c.msg_b * greatest(live - 1, 0)))::bigint) on conflict (day) do update set est_msgs = gate_daily.est_msgs + excluded.est_msgs; end if;
  insert into gate_q (cid, qa) values (p_cid, p_qa) on conflict (cid) do update set seen = now();
  select * into me from gate_q where cid = p_cid;
  select coalesce(max(est_msgs), 0) into mon from gate_month where month = mk; select coalesce(max(est_msgs), 0) into dayu from gate_daily where day = d;
  ecap := case when p_qa then (select cap from gate_qa where id = 1) else c.cap end;
  if not p_qa then
    if mon >= c.month_msgs::bigint * c.hard_pct / 100 then ecap := 0; g := 'month_hard';
    elsif mon >= c.month_msgs::bigint * c.guard_pct / 100 or dayu >= c.month_msgs::bigint * c.guard_pct / 100 / 30 then ecap := least(ecap, c.low_cap); g := case when mon >= c.month_msgs::bigint * c.guard_pct / 100 then 'month' else 'day' end; end if;
  end if;
  if ecap = 0 then return json_build_object('ok', false, 'full', true, 'pos', 0, 'live', live, 'cap', 0, 'guard', g); end if;
  if not me.admitted then
    select count(*) + 1 into pos from gate_q where qa = p_qa and not admitted and (joined < me.joined or (joined = me.joined and cid < me.cid));
    if live < ecap and pos <= ecap - live then
      update gate_q set admitted = true where cid = p_cid; live := live + 1;
      insert into gate_daily (day, sessions) values (d, 1) on conflict (day) do update set sessions = gate_daily.sessions + 1;
      return json_build_object('ok', true, 'pos', 0, 'live', live, 'cap', ecap, 'guard', g);
    end if;
    return json_build_object('ok', false, 'pos', pos, 'live', live, 'cap', ecap, 'guard', g);
  end if;
  return json_build_object('ok', true, 'pos', 0, 'live', live, 'cap', ecap, 'guard', g);
end $$;
revoke all on function public.gate_beat(text, boolean) from public; grant execute on function public.gate_beat(text, boolean) to anon, authenticated;

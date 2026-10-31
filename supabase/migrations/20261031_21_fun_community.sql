-- h30: prayer reports (auto-hide at 3), neighbor guestbook, batched neighborhood activity, weekly shared goal + plaques, warm ranking
alter table prayers add column if not exists reports int not null default 0, add column if not exists hidden boolean not null default false;
create table if not exists prayer_reports(pid bigint not null, h text not null, created_at timestamptz default now(), primary key(pid,h));
alter table prayer_reports enable row level security;
drop policy if exists "read public prayers" on prayers;
create policy "read public prayers" on prayers for select using (is_public and not hidden and created_at > now() - interval '30 days');
create or replace function prayer_report(p_id bigint, p_secret text) returns int language plpgsql security definer set search_path to 'public' as $$
declare vh text := public.h64(p_secret); n int;
begin if char_length(coalesce(p_secret,'')) < 16 then raise exception 'bad secret'; end if;
 if (select count(*) from prayer_reports where prayer_reports.h = vh and created_at > now() - interval '10 minutes') >= 10 then raise exception 'rate_limited'; end if;
 insert into prayer_reports(pid,h) values(p_id,vh) on conflict do nothing;
 update prayers set reports=(select count(*) from prayer_reports where pid=p_id), hidden=(select count(*) from prayer_reports where pid=p_id)>=3 where id=p_id returning reports into n; return coalesce(n,0); end $$;

create table if not exists guestbook(id bigserial primary key, room text not null, name text not null default '이웃', body text not null, owner_hash text not null, home text, reports int not null default 0, hidden boolean not null default false, created_at timestamptz not null default now());
create index if not exists guestbook_room on guestbook(room, created_at desc);
alter table guestbook enable row level security;
drop policy if exists "read guestbook" on guestbook;
create policy "read guestbook" on guestbook for select using (not hidden and created_at > now() - interval '30 days');
create table if not exists guestbook_reports(gid bigint not null, h text not null, created_at timestamptz default now(), primary key(gid,h));
alter table guestbook_reports enable row level security;
create or replace function trg_ugc_gb() returns trigger language plpgsql as $$ begin new.body := left(ugc_clean(new.body), 50); new.name := left(ugc_clean(new.name), 12); return new; end $$;
drop trigger if exists ugc_gb on guestbook; create trigger ugc_gb before insert or update on guestbook for each row execute function trg_ugc_gb();
create or replace function gb_post(p_room text, p_name text, p_body text, p_home text, p_secret text) returns bigint language plpgsql security definer set search_path to 'public' as $$
declare h text := public.h64(p_secret); nid bigint;
begin if char_length(coalesce(p_secret,'')) < 16 then raise exception 'bad secret'; end if;
 if char_length(trim(coalesce(p_body,''))) = 0 or char_length(p_body) > 50 then raise exception 'body length'; end if;
 if (select count(*) from guestbook where owner_hash = h and created_at > now() - interval '10 minutes') >= 3 then raise exception 'rate_limited'; end if;
 if (select count(*) from guestbook where room = p_room and created_at > now() - interval '1 minute') >= 20 then raise exception 'rate_limited'; end if;
 insert into guestbook(room,name,body,owner_hash,home) values(left(p_room,40), left(coalesce(nullif(trim(p_name),''),'이웃'),12), p_body, h, left(p_home,40)) returning id into nid; return nid; end $$;
create or replace function gb_report(p_id bigint, p_secret text) returns int language plpgsql security definer set search_path to 'public' as $$
declare vh text := public.h64(p_secret); n int;
begin if char_length(coalesce(p_secret,'')) < 16 then raise exception 'bad secret'; end if;
 insert into guestbook_reports(gid,h) values(p_id,vh) on conflict do nothing;
 update guestbook set reports=(select count(*) from guestbook_reports where gid=p_id), hidden=(select count(*) from guestbook_reports where gid=p_id)>=3 where id=p_id returning reports into n; return coalesce(n,0); end $$;

-- batched activity: one upsert per client per day per room (client sends its session total, capped), never per tap
create table if not exists dong_acts(room text not null, day date not null, h text not null, n int not null default 0, primary key(room,day,h));
alter table dong_acts enable row level security;
create or replace function dong_checkin(p_room text, p_n int, p_secret text) returns int language plpgsql security definer set search_path to 'public' as $$
declare vh text := public.h64(p_secret); d date := (now() at time zone 'Asia/Seoul')::date; v int;
begin if char_length(coalesce(p_secret,'')) < 16 or coalesce(p_room,'') = '' then return 0; end if;
 insert into dong_acts(room,day,h,n) values(left(p_room,40), d, vh, least(greatest(p_n,1),30))
 on conflict (room,day,h) do update set n = least(30, greatest(dong_acts.n, excluded.n)) returning n into v; return v; end $$;
create or replace function dong_score(p_room text, p_from date) returns int language sql stable security definer set search_path to 'public' as $$
 select coalesce((select sum(n) from dong_acts where room=p_room and day>=p_from),0)::int
  + coalesce((select count(distinct h)*5 from dong_acts where room=p_room and day>=p_from),0)::int
  + coalesce((select count(*)*3 + sum(amen_count) from prayers where room=p_room and is_public and not hidden and created_at >= p_from),0)::int
  + coalesce((select count(*)*2 from guestbook where room=p_room and not hidden and created_at >= p_from),0)::int $$;
create or replace function dong_goal(p_room text) returns json language plpgsql stable security definer set search_path to 'public' as $$
declare wk date := date_trunc('week', now() at time zone 'Asia/Seoul')::date; s int; pl int := 0; i int;
begin s := dong_score(p_room, wk);
 for i in 1..12 loop if dong_score(p_room, wk - i*7) - dong_score(p_room, wk - (i-1)*7) >= 100 then pl := pl + 1; end if; end loop;
 return json_build_object('score', s, 'target', 100, 'plaques', pl + case when s >= 100 then 1 else 0 end, 'week', wk); end $$;
create or replace function warm_rank() returns table(room text, score int, people int) language sql stable security definer set search_path to 'public' as $$
 with wk as (select date_trunc('week', now() at time zone 'Asia/Seoul')::date d), r as (select distinct a.room from dong_acts a, wk where a.day >= wk.d union select p.room from prayers p, wk where p.created_at >= wk.d union select g.room from guestbook g, wk where g.created_at >= wk.d)
 select r.room, dong_score(r.room, (select d from wk)), (select count(distinct h)::int from dong_acts a where a.room=r.room and a.day >= (select d from wk)) from r order by 2 desc limit 20 $$;
revoke all on prayer_reports, guestbook_reports, dong_acts from anon, authenticated;
revoke insert, update, delete on guestbook from anon, authenticated; grant select on guestbook to anon, authenticated;
grant execute on function prayer_report(bigint,text), gb_post(text,text,text,text,text), gb_report(bigint,text), dong_checkin(text,int,text), dong_goal(text), warm_rank() to anon, authenticated;
revoke execute on function dong_score(text,date) from anon, authenticated, public;

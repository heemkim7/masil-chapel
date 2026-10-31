-- h31: answered prayers -> testimony, "보고 싶어요" greetings for absent members (fixed text, rate-limited)
alter table prayers add column if not exists answered boolean not null default false;
alter table prayers add column if not exists testimony text;
create or replace function prayer_answer(p_id bigint, p_note text, p_secret text) returns boolean language plpgsql security definer set search_path to 'public' as $$
declare vh text := public.h64(p_secret); t text := left(btrim(public.ugc_clean(coalesce(p_note,''))), 60);
begin update prayers set answered = true, testimony = nullif(t,'') where id = p_id and owner_hash = vh; return found; end $$;
create table if not exists members (room text not null, h text not null, name text not null, last_day date not null, primary key (room, h));
alter table members enable row level security;
create table if not exists missyou (id bigserial primary key, room text not null, to_h text not null, from_h text not null, from_name text not null, day date not null, seen boolean not null default false, unique (to_h, from_h, day));
alter table missyou enable row level security;
create or replace function member_seen(p_room text, p_name text, p_secret text) returns void language plpgsql security definer set search_path to 'public' as $$
declare vh text := public.h64(p_secret); d date := (now() at time zone 'Asia/Seoul')::date; nm text := left(btrim(public.ugc_clean(coalesce(p_name,'이웃'))), 12);
begin if p_room is null or length(p_room) > 40 then return; end if;
insert into members values (p_room, vh, coalesce(nullif(nm,''),'이웃'), d) on conflict (room, h) do update set name = excluded.name, last_day = d; end $$;
-- absent 3..60 days; id = opaque hash prefix
create or replace function miss_list(p_room text, p_secret text) returns table(id text, name text, days int) language sql security definer set search_path to 'public' as $$
  select left(m.h, 16), m.name, ((now() at time zone 'Asia/Seoul')::date - m.last_day)::int from members m
  where m.room = p_room and m.h <> public.h64(p_secret) and m.last_day <= (now() at time zone 'Asia/Seoul')::date - 3 and m.last_day > (now() at time zone 'Asia/Seoul')::date - 60
  order by m.last_day desc limit 12 $$;
create or replace function miss_send(p_room text, p_to text, p_name text, p_secret text) returns int language plpgsql security definer set search_path to 'public' as $$
declare vh text := public.h64(p_secret); d date := (now() at time zone 'Asia/Seoul')::date; th text; n int;
begin select count(*) into n from missyou where from_h = vh and day = d; if n >= 5 then raise exception 'rate_limited'; end if;
select h into th from members where room = p_room and left(h,16) = p_to limit 1; if th is null or th = vh then return 0; end if;
insert into missyou(room,to_h,from_h,from_name,day) values (p_room, th, vh, coalesce(nullif(left(btrim(public.ugc_clean(coalesce(p_name,''))),12),''),'이웃'), d) on conflict do nothing; return 1; end $$;
create or replace function miss_inbox(p_secret text) returns table(from_name text, room text) language plpgsql security definer set search_path to 'public' as $$
declare vh text := public.h64(p_secret);
begin return query with u as (update missyou set seen = true where to_h = vh and not seen returning missyou.from_name, missyou.room) select * from u limit 20; end $$;
revoke all on function prayer_answer(bigint,text,text), member_seen(text,text,text), miss_list(text,text), miss_send(text,text,text,text), miss_inbox(text) from public;
grant execute on function prayer_answer(bigint,text,text), member_seen(text,text,text), miss_list(text,text), miss_send(text,text,text,text), miss_inbox(text) to anon, authenticated;
grant select (answered, testimony) on prayers to anon, authenticated;

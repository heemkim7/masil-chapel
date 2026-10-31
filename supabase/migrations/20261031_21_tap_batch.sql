-- Batched taps from the Cloudflare Room DO ('함께 기도했어요' + hall candles). The DO dedupes per user and flushes every 20 taps / 30s.
-- Caller proves itself with a Worker secret; only its sha256 is stored here (not secret).
create schema if not exists priv;
create table if not exists priv.cfg(k text primary key, v text not null);
insert into priv.cfg values ('flush_key_sha256', 'e2b72daf0e77c1880b9f0da3d965bec00fd2144972875ab8fec99aee8fccd4fc') on conflict (k) do update set v = excluded.v;
revoke all on schema priv from anon, authenticated;
create table if not exists public.hall_candles(room text not null, day date not null default (now() at time zone 'utc')::date, n int not null default 0, primary key(room, day));
alter table public.hall_candles enable row level security;
drop policy if exists hall_candles_read on public.hall_candles; create policy hall_candles_read on public.hall_candles for select using (true);
create or replace function public.tap_batch(p_key text, p_items jsonb) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare it jsonb; out jsonb := '[]'::jsonb; n int; c int; r text;
begin
  if encode(digest(coalesce(p_key,''), 'sha256'), 'hex') is distinct from (select v from priv.cfg where k = 'flush_key_sha256') then raise exception 'denied'; end if;
  if jsonb_array_length(p_items) > 500 then raise exception 'too many'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    r := it->>'ref';
    if it->>'kind' = 'pray' and r ~ '^[0-9]+$' and exists (select 1 from prayers where id = r::bigint and is_public) then
      insert into prayer_amens(prayer_id, client_hash) values (r::bigint, h64('uid:' || (it->>'uid'))) on conflict do nothing; get diagnostics n = row_count;
      if n > 0 then update prayers set amen_count = amen_count + 1 where id = r::bigint; end if;
    elsif it->>'kind' = 'candle' then
      insert into hall_candles(room, n) values (left(r, 64), 1) on conflict (room, day) do update set n = hall_candles.n + 1;
    end if;
  end loop;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into out from (
    select 'pray' kind, p.id::text ref, p.amen_count n from prayers p where p.id::text in (select e->>'ref' from jsonb_array_elements(p_items) e where e->>'kind' = 'pray')
    union all select 'candle', h.room, h.n from hall_candles h where h.day = (now() at time zone 'utc')::date and h.room in (select e->>'ref' from jsonb_array_elements(p_items) e where e->>'kind' = 'candle')) x;
  return out;
end $$;
revoke all on function public.tap_batch(text, jsonb) from public; grant execute on function public.tap_batch(text, jsonb) to anon, authenticated;

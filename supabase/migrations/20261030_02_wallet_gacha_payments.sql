-- Server-authoritative 달란트 wallet, earn caps, server-side gacha, payment-ready tables (no real payments).
create table if not exists wallets (owner_hash text primary key, talent int not null default 0 check (talent >= 0),
  day date not null default current_date, earned_today int not null default 0, seeded boolean not null default false,
  created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists wallet_ledger (id bigserial primary key, owner_hash text not null, delta int not null, kind text not null,
  ref text, balance int not null, created_at timestamptz default now());
create index if not exists wallet_ledger_o on wallet_ledger(owner_hash, created_at desc);
create table if not exists inventory (owner_hash text, item_id text, n int not null default 1, primary key(owner_hash,item_id));
create table if not exists gacha_pool (item_id text primary key, name text not null, kind text not null, rar text not null, w int not null check (w > 0), active boolean default true);
create table if not exists gacha_logs (id bigserial primary key, owner_hash text not null, item_id text not null, rar text, at_box boolean, cost int, created_at timestamptz default now());
create table if not exists earn_rules (kind text primary key, amount int not null, per_day int not null, min_gap_s int not null default 0);
-- payment-ready (stub; all writes via service role / security definer only)
create table if not exists products (id text primary key, name text not null, kind text not null default 'manna', manna int not null default 0,
  price_krw int not null, store_sku_ios text, store_sku_android text, active boolean default false);
create table if not exists manna_wallets (owner_hash text primary key, manna int not null default 0 check (manna >= 0), updated_at timestamptz default now());
create table if not exists orders (id uuid primary key default gen_random_uuid(), owner_hash text not null, product_id text references products(id),
  provider text not null, status text not null default 'pending' check (status in ('pending','paid','granted','refunded','failed')),
  amount_krw int, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists payment_transactions (id bigserial primary key, order_id uuid references orders(id), provider text not null,
  provider_tx_id text not null, raw jsonb, verified boolean default false, created_at timestamptz default now(), unique(provider, provider_tx_id));
create table if not exists grants (order_id uuid primary key references orders(id), owner_hash text not null, manna int not null, created_at timestamptz default now());
create table if not exists refunds (order_id uuid primary key references orders(id), owner_hash text not null, manna_clawback int not null,
  negative_balance int not null default 0, reason text, created_at timestamptz default now());
create table if not exists blocks (owner_hash text, target text, created_at timestamptz default now(), primary key(owner_hash,target));
create table if not exists eula_accepts (owner_hash text primary key, version text not null, created_at timestamptz default now());
do $$ declare t text; begin foreach t in array array['wallets','wallet_ledger','inventory','gacha_pool','gacha_logs','earn_rules','products','manna_wallets','orders','payment_transactions','grants','refunds','blocks','eula_accepts'] loop
  execute format('alter table %I enable row level security', t); execute format('revoke all on %I from anon, authenticated', t); end loop; end $$;
create policy gacha_pool_read on gacha_pool for select to anon, authenticated using (active);
grant select on gacha_pool to anon, authenticated;

insert into earn_rules values ('collect',15,20,3),('worship',80,6,40),('quest',100,1,0),('mission',20,4,5),('mission_bonus',50,1,0),('service',20,3,60),('dup',40,30,0)
  on conflict (kind) do update set amount=excluded.amount, per_day=excluded.per_day, min_gap_s=excluded.min_gap_s;
insert into gacha_pool values ('beanie','니트 비니','acc','일반',40),('dove','비둘기 친구','acc','일반',35),('crown','꽃 화관','acc','희귀',15),('sparkle','반짝 요정','acc','희귀',15),
 ('halo','빛나는 후광','acc','전설',5),('wings','천사 날개','acc','전설',5),('bench','나무 벤치','decor','일반',30),('pot','꽃 화분','decor','일반',35),('lamp','가로등','decor','희귀',15),
 ('fence','하얀 울타리','decor','일반',25),('flowers','꽃밭','decor','희귀',12),('starlamp','별 장식','decor','전설',4) on conflict (item_id) do update set w=excluded.w, rar=excluded.rar, name=excluded.name;

create or replace function _owner(p_secret text) returns text language plpgsql immutable as $$
begin if char_length(coalesce(p_secret,'')) < 16 or char_length(p_secret) > 64 then raise exception 'bad secret'; end if; return public.h64(p_secret); end $$;

-- first call seeds from the device's legacy local balance, capped at 500
create or replace function wallet_get(p_secret text, p_seed int default 0) returns json language plpgsql security definer set search_path = public as $$
declare o text := _owner(p_secret); w wallets;
begin
  insert into wallets(owner_hash, talent, seeded) values (o, least(greatest(coalesce(p_seed,150),0),500), true) on conflict do nothing;
  select * into w from wallets where owner_hash = o;
  if w.day <> current_date then update wallets set day = current_date, earned_today = 0 where owner_hash = o returning * into w; end if;
  return json_build_object('talent', w.talent, 'earned_today', w.earned_today, 'cap', 1500);
end $$;

create or replace function _wallet_add(o text, d int, k text, r text) returns int language plpgsql security definer set search_path = public as $$
declare b int; begin
  insert into wallets(owner_hash, talent, seeded) values (o, 150, true) on conflict do nothing;
  update wallets set talent = talent + d, updated_at = now() where owner_hash = o and talent + d >= 0 returning talent into b;
  if b is null then raise exception 'insufficient'; end if;
  insert into wallet_ledger(owner_hash, delta, kind, ref, balance) values (o, d, k, r, b); return b; end $$;

create or replace function earn(p_secret text, p_kind text, p_n int default 1) returns json language plpgsql security definer set search_path = public as $$
declare o text := _owner(p_secret); r earn_rules; n int; amt int; last timestamptz; w wallets; b int;
begin
  select * into r from earn_rules where kind = p_kind; if not found then raise exception 'bad kind'; end if;
  perform wallet_get(p_secret);
  select * into w from wallets where owner_hash = o for update;
  select count(*), max(created_at) into n, last from wallet_ledger where owner_hash = o and kind = 'earn:'||p_kind and created_at >= current_date;
  if n >= r.per_day then return json_build_object('talent', w.talent, 'granted', 0, 'why', 'daily'); end if;
  if last is not null and last > now() - make_interval(secs => r.min_gap_s) then return json_build_object('talent', w.talent, 'granted', 0, 'why', 'gap'); end if;
  amt := least(r.amount, greatest(1, coalesce(p_n, 1)));  -- client may request less (e.g. partial worship), never more
  if p_kind in ('collect','worship') then amt := least(r.amount, greatest(1, coalesce(p_n,1))); else amt := r.amount; end if;
  amt := least(amt, 1500 - w.earned_today); if amt <= 0 then return json_build_object('talent', w.talent, 'granted', 0, 'why', 'cap'); end if;
  update wallets set earned_today = earned_today + amt where owner_hash = o;
  b := _wallet_add(o, amt, 'earn:'||p_kind, null);
  return json_build_object('talent', b, 'granted', amt);
end $$;

create or replace function spend(p_secret text, p_amount int, p_item text) returns json language plpgsql security definer set search_path = public as $$
declare o text := _owner(p_secret); b int;
begin
  if p_amount is null or p_amount < 1 or p_amount > 5000 then raise exception 'bad amount'; end if;
  if char_length(coalesce(p_item,'')) > 40 then raise exception 'bad item'; end if;
  perform wallet_get(p_secret);
  b := _wallet_add(o, -p_amount, 'spend', p_item);
  if p_item is not null then insert into inventory values (o, p_item, 1) on conflict (owner_hash,item_id) do update set n = inventory.n + 1; end if;
  return json_build_object('talent', b);
end $$;

create or replace function gacha_odds() returns json language sql stable security definer set search_path = public as $$
  with t as (select sum(w) s, sum(case when rar='일반' then w else w*1.8 end) sb from gacha_pool where active)
  select json_agg(json_build_object('id', item_id, 'name', name, 'kind', kind, 'rar', rar, 'w', w, 'pct', round(100.0 * w / t.s, 2),
    'pct_box', round(100.0 * (case when rar='일반' then w else w*1.8 end) / t.sb, 2)) order by w desc)
  from gacha_pool, t where active $$;

create or replace function _gacha(o text, at_box boolean, cost int) returns json language plpgsql security definer set search_path = public as $$
declare tot numeric; x numeric; g record; dup boolean;
begin
  select sum(case when rar='일반' or not at_box then w else w*1.8 end) into tot from gacha_pool where active;
  x := random() * tot;
  for g in select *, case when rar='일반' or not at_box then w else w*1.8 end ww from gacha_pool where active order by item_id loop
    x := x - g.ww; if x < 0 then exit; end if; end loop;
  dup := g.kind = 'acc' and exists(select 1 from inventory where owner_hash = o and item_id = g.item_id);
  insert into inventory values (o, g.item_id, 1) on conflict (owner_hash,item_id) do update set n = inventory.n + 1;
  insert into gacha_logs(owner_hash, item_id, rar, at_box, cost) values (o, g.item_id, g.rar, at_box, cost);
  return json_build_object('id', g.item_id, 'name', g.name, 'kind', g.kind, 'rar', g.rar, 'dup', dup, 'glass', random() < (case when at_box then .6 else .35 end), 'cos', random() < .4);
end $$;

drop function if exists offer(text,text,text,integer,text);
create or replace function offer(p_dong text, p_dong_name text, p_name text, p_amount integer, p_secret text, p_at_box boolean default false) returns json
language plpgsql security definer set search_path = public as $$
declare o text; before bigint; after bigint; bal int; it json;
begin
  if p_dong = '0' then p_dong := '0000000000'; end if;  -- 모두의 광장
  if p_dong !~ '^[0-9]{10}$' then raise exception 'bad dong'; end if;
  if p_amount is null or p_amount not in (10,30,100,300) then raise exception 'bad amount'; end if;
  if char_length(coalesce(p_name,'')) < 1 or char_length(p_name) > 12 then raise exception 'bad name'; end if;
  o := _owner(p_secret);
  if (select count(*) from offerings where owner_hash = o and created_at > now() - interval '1 minute') >= 6 then raise exception 'rate limited'; end if;
  if (select coalesce(sum(amount),0) from offerings where owner_hash = o and created_at > now() - interval '1 hour') + p_amount > 3000 then raise exception 'hourly cap'; end if;
  if (select count(*) from offerings where dong = p_dong and created_at > now() - interval '1 minute') >= 60 then raise exception 'room rate limited'; end if;
  perform wallet_get(p_secret);
  bal := _wallet_add(o, -p_amount, 'offer', p_dong);   -- raises 'insufficient'
  it := _gacha(o, coalesce(p_at_box,false), p_amount);
  if (it->>'dup')::boolean then bal := _wallet_add(o, 40, 'earn:dup', it->>'id'); end if;
  select total into before from churches where dong = p_dong; before := coalesce(before, 0);
  insert into offerings (dong, owner_hash, name, amount) values (p_dong, o, p_name, p_amount);
  insert into churches (dong, name, total) values (p_dong, left(coalesce(nullif(p_dong_name,''), p_dong), 20), p_amount)
    on conflict (dong) do update set total = churches.total + excluded.total, updated_at = now() returning total into after;
  return json_build_object('total', after, 'tier', church_tier(after), 'leveled', church_tier(after) > church_tier(before), 'talent', bal, 'item', it);
end $$;

-- payments (stubs; service role only — Edge Functions verify receipts then call grant_order)
create or replace function grant_order(p_order uuid) returns json language plpgsql security definer set search_path = public as $$
declare od orders; m int;
begin
  select * into od from orders where id = p_order for update; if not found then raise exception 'no order'; end if;
  if exists(select 1 from grants where order_id = p_order) then return json_build_object('ok', true, 'idempotent', true); end if;
  if od.status <> 'paid' then raise exception 'not paid'; end if;
  select manna into m from products where id = od.product_id;
  insert into manna_wallets(owner_hash, manna) values (od.owner_hash, m) on conflict (owner_hash) do update set manna = manna_wallets.manna + m, updated_at = now();
  insert into grants values (p_order, od.owner_hash, m); update orders set status = 'granted', updated_at = now() where id = p_order;
  return json_build_object('ok', true, 'manna', m);
end $$;
create or replace function refund_order(p_order uuid, p_reason text) returns json language plpgsql security definer set search_path = public as $$
declare g grants; cur int; take int;
begin
  select * into g from grants where order_id = p_order; if not found then raise exception 'not granted'; end if;
  if exists(select 1 from refunds where order_id = p_order) then return json_build_object('ok', true, 'idempotent', true); end if;
  select manna into cur from manna_wallets where owner_hash = g.owner_hash for update; take := least(coalesce(cur,0), g.manna);
  update manna_wallets set manna = manna - take, updated_at = now() where owner_hash = g.owner_hash;
  insert into refunds values (p_order, g.owner_hash, take, g.manna - take, left(p_reason,200)); update orders set status = 'refunded', updated_at = now() where id = p_order;
  return json_build_object('ok', true, 'clawback', take, 'shortfall', g.manna - take);
end $$;

revoke all on function _owner(text), _wallet_add(text,int,text,text), _gacha(text,boolean,int), grant_order(uuid), refund_order(uuid,text) from public, anon, authenticated;
revoke all on function wallet_get(text,int), earn(text,text,int), spend(text,int,text), gacha_odds(), offer(text,text,text,integer,text,boolean) from public;
grant execute on function wallet_get(text,int), earn(text,text,int), spend(text,int,text), gacha_odds(), offer(text,text,text,integer,text,boolean) to anon, authenticated;

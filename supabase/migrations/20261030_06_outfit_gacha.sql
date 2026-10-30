-- 6 gacha-only outfits (unlock both genders). Weights mirror config.json gacha.pool.
insert into gacha_pool(item_id,name,kind,rar,w,active) values
 ('o_hanbok','한복 (옷)','cos','희귀',8,true),('o_formal','예배 정장 (옷)','cos','희귀',8,true),('o_winter','성탄 옷 (옷)','cos','희귀',8,true),
 ('o_summer','여름 마린룩 (옷)','cos','일반',14,true),('o_spring','봄 옷 (옷)','cos','일반',14,true),('o_autumn','가을 체크 (옷)','cos','일반',14,true)
on conflict (item_id) do update set name=excluded.name, kind=excluded.kind, rar=excluded.rar, w=excluded.w, active=true;

create or replace function _gacha(o text, at_box boolean, cost int) returns json language plpgsql security definer set search_path = public as $$
declare tot numeric; x numeric; g record; dup boolean;
begin
  select sum(case when rar='일반' or not at_box then w else w*1.8 end) into tot from gacha_pool where active;
  x := random() * tot;
  for g in select *, case when rar='일반' or not at_box then w else w*1.8 end ww from gacha_pool where active order by item_id loop
    x := x - g.ww; if x < 0 then exit; end if; end loop;
  dup := g.kind in ('acc','cos') and exists(select 1 from inventory where owner_hash = o and item_id = g.item_id);
  insert into inventory values (o, g.item_id, 1) on conflict (owner_hash,item_id) do update set n = inventory.n + 1;
  insert into gacha_logs(owner_hash, item_id, rar, at_box, cost) values (o, g.item_id, g.rar, at_box, cost);
  return json_build_object('id', g.item_id, 'name', g.name, 'kind', g.kind, 'rar', g.rar, 'dup', dup, 'glass', random() < (case when at_box then .6 else .35 end), 'cos', random() < .4);
end $$;
revoke all on function _gacha(text,boolean,int) from public, anon, authenticated;

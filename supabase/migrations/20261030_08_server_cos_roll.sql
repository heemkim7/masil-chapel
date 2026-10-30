-- Server-authoritative 헌금 축복: the 40% cosmetic roll now happens in _gacha (not on the client).
-- Rarity weights mirror js/avatar.js rollCos (일반 10 · 희귀 3.5/6 · 영웅 1/2.2 · 전설 .3/.8 at box). Catalog mirrors AV.COS.
create table if not exists cos_catalog(item_id text primary key, name text not null, rar text not null, active boolean not null default true);
alter table cos_catalog enable row level security;
revoke all on cos_catalog from anon, authenticated;
insert into cos_catalog(item_id,name,rar) values ('c00','밀짚모자','일반'),('c01','빨간 베레모','일반'),('c02','방울 비니','일반'),('c03','파란 캡모자','일반'),('c04','꽃 화관','희귀'),('c05','황금 왕관','전설'),('c06','신사 실크햇','영웅'),('c07','토끼 머리띠','희귀'),('c08','고양이 머리띠','희귀'),('c09','산타 모자','희귀'),('c10','학사모','영웅'),('c11','요리사 모자','희귀'),('c12','천사 링','전설'),('c13','분홍 리본','일반'),('c14','썬바이저','일반'),('c15','초록 벙거지','희귀'),('c16','동글 안경','일반'),('c17','하트 선글라스','희귀'),('c18','별 선글라스','영웅'),('c19','외눈 안경','희귀'),('c20','하트 볼터치','일반'),('c21','콧수염','희귀'),('c22','하얀 마스크','일반'),('c23','나비 핀','희귀'),('c24','천사 날개','전설'),('c25','나비 날개','영웅'),('c26','빨간 망토','희귀'),('c27','노란 백팩','일반'),('c28','곰돌이 백팩','희귀'),('c29','기타','영웅'),('c30','무지개 목도리','희귀'),('c31','요정 날개','전설'),('c32','꽃다발','희귀'),('c33','하트 풍선','일반'),('c34','등불','희귀'),('c35','작은 성경','일반'),('c36','왕사탕','일반'),('c37','아이스크림','일반'),('c38','곰인형','희귀'),('c39','우산','희귀'),('c40','물뿌리개','일반'),('c41','촛불','희귀'),('c42','십자가 목걸이','영웅'),('c43','별 요술봉','영웅'),('c44','커피 한 잔','일반'),('c45','바게트','일반'),('c46','종이비행기','일반'),('c47','음표 팻말','희귀')
on conflict (item_id) do update set name=excluded.name, rar=excluded.rar, active=true;

create or replace function _gacha(o text, at_box boolean, cost int) returns json language plpgsql security definer set search_path = public as $$
declare tot numeric; x numeric; g record; c record; dup boolean;
begin
  if random() < .4 then
    select sum(case rar when '일반' then 10 when '희귀' then (case when at_box then 6 else 3.5 end) when '영웅' then (case when at_box then 2.2 else 1 end) else (case when at_box then .8 else .3 end) end) into tot
      from cos_catalog k where active and not exists(select 1 from inventory where owner_hash = o and item_id = k.item_id);
    if coalesce(tot,0) > 0 then
      x := random() * tot;
      for c in select k.*, case rar when '일반' then 10 when '희귀' then (case when at_box then 6 else 3.5 end) when '영웅' then (case when at_box then 2.2 else 1 end) else (case when at_box then .8 else .3 end) end ww
        from cos_catalog k where active and not exists(select 1 from inventory where owner_hash = o and item_id = k.item_id) order by item_id loop
        x := x - c.ww; if x < 0 then exit; end if; end loop;
      insert into inventory values (o, c.item_id, 1) on conflict (owner_hash,item_id) do update set n = inventory.n + 1;
      insert into gacha_logs(owner_hash, item_id, rar, at_box, cost) values (o, c.item_id, c.rar, at_box, cost);
      return json_build_object('id', c.item_id, 'name', c.name, 'kind', 'cos', 'rar', c.rar, 'dup', false, 'glass', random() < (case when at_box then .6 else .35 end), 'cos', false);
    end if;
  end if;
  select sum(case when rar='일반' or not at_box then w else w*1.8 end) into tot from gacha_pool where active;
  x := random() * tot;
  for g in select *, case when rar='일반' or not at_box then w else w*1.8 end ww from gacha_pool where active order by item_id loop
    x := x - g.ww; if x < 0 then exit; end if; end loop;
  dup := g.kind in ('acc','cos') and exists(select 1 from inventory where owner_hash = o and item_id = g.item_id);
  insert into inventory values (o, g.item_id, 1) on conflict (owner_hash,item_id) do update set n = inventory.n + 1;
  insert into gacha_logs(owner_hash, item_id, rar, at_box, cost) values (o, g.item_id, g.rar, at_box, cost);
  return json_build_object('id', g.item_id, 'name', g.name, 'kind', g.kind, 'rar', g.rar, 'dup', dup, 'glass', random() < (case when at_box then .6 else .35 end), 'cos', false);
end $$;
revoke all on function _gacha(text,boolean,int) from public, anon, authenticated;

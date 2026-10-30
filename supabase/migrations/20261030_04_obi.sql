-- 오병이어 (five loaves & two fish) shared event: catching the rain grants free 달란트 once per player per day
insert into earn_rules values ('obi', 60, 1, 0) on conflict (kind) do update set amount=excluded.amount, per_day=excluded.per_day, min_gap_s=excluded.min_gap_s;

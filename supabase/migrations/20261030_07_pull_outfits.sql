-- Pull the 6 gacha outfits (failed visual QA: fake hanbok, skin specks at legs/hem). Mirrors config.json gacha.pool.
update gacha_pool set active=false where item_id in ('o_hanbok','o_formal','o_winter','o_summer','o_spring','o_autumn');

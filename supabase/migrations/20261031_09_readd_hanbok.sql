-- v19: o_hanbok regenerated (real jeogori+chima / jeogori+baji, 5 dirs x 2 genders), per-cell + 3x checks passed. Re-activate it only; the other 5 outfits stay pulled.
update gacha_pool set active = true where item_id = 'o_hanbok';

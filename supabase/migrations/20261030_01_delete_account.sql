-- Account delete / '처음부터 다시 시작': removes every row tied to this player's secret.
create or replace function public.delete_account(p_secret text) returns json
language plpgsql security definer set search_path = public as $$
declare o text := public.h64(p_secret); j text := md5('j:'||coalesce(p_secret,'')); n int := 0; k int;
begin
  if char_length(coalesce(p_secret,'')) < 16 or char_length(p_secret) > 64 then raise exception 'bad secret'; end if;
  delete from prayer_amens where client_hash = o; get diagnostics k = row_count; n := n + k;
  delete from prayers where owner_hash = o; get diagnostics k = row_count; n := n + k;
  delete from placement_reports where reporter = o;
  delete from placements where owner_hash = o; get diagnostics k = row_count; n := n + k;
  delete from bible_marks where owner_hash = o; get diagnostics k = row_count; n := n + k;
  delete from journeys where owner = j; get diagnostics k = row_count; n := n + k;
  -- offerings keep the dong total (church gauge is communal) but lose identity
  update offerings set owner_hash = 'deleted', name = '(탈퇴)' where owner_hash = o; get diagnostics k = row_count; n := n + k;
  if to_regclass('public.wallets') is not null then
    execute 'delete from wallets where owner_hash = $1' using o; execute 'delete from wallet_ledger where owner_hash = $1' using o;
    execute 'delete from inventory where owner_hash = $1' using o; execute 'delete from gacha_logs where owner_hash = $1' using o;
    execute 'delete from blocks where owner_hash = $1' using o; execute 'delete from eula_accepts where owner_hash = $1' using o;
  end if;
  return json_build_object('ok', true, 'rows', n);
end $$;
revoke all on function public.delete_account(text) from public;
grant execute on function public.delete_account(text) to anon, authenticated;

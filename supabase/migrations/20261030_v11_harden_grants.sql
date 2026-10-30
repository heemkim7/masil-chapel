-- v11: least-privilege grants (TRUNCATE bypasses RLS), helper search_path, internal fn execute
do $$ declare t text; begin for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' loop execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t); end loop; end $$;
revoke insert, update, delete on public.bible_marks, public.churches, public.placements, public.placement_reports, public.prayer_amens, public.prayers from anon, authenticated;
revoke update, delete on public.chat_messages, public.reports from anon, authenticated;
revoke delete on public.account_links from authenticated;
revoke all on public.account_links from anon;
alter function public._owner(text) set search_path = public;
alter function public.h64(text) set search_path = public, extensions;
alter function public.church_tier(bigint) set search_path = public;
alter function public.ugc_clean(text) set search_path = public;
alter function public.trg_ugc_chat() set search_path = public;
alter function public.trg_ugc_prayer() set search_path = public;
revoke execute on function public.h64(text), public._owner(text), public.ugc_clean(text), public.trg_ugc_chat(), public.trg_ugc_prayer(), public.reports_rate() from public, anon, authenticated;
grant execute on function public.ugc_clean(text) to anon, authenticated;

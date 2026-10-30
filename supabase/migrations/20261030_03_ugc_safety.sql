-- UGC safety: server-side banned-word masking for chat/prayers, block + EULA RPCs, report auto-hide for chat.
create or replace function ugc_clean(t text) returns text language sql immutable as $$
  select regexp_replace(regexp_replace(regexp_replace(coalesce(t,''),
    '(시[._*~-]*발|씨[._*~-]*발|ㅅ[._*~-]*ㅂ|ㅆ[._*~-]*ㅂ|병[._*~-]*신|개[._*~-]*새|좆|존[._*~-]*나|지[._*~-]*랄|염[._*~-]*병|미친[놈년]|니애미|느금|섹[._*~-]*스|야[._*~-]*동|fuck|shit|bitch|porn|nigger)', '♡♡', 'gi'),
    '(https?://\S+|www\.\S+|t\.me/\S+|오픈채팅|텔레그램)', '(링크)', 'gi'),
    '01[016789][ -]?[0-9]{3,4}[ -]?[0-9]{4}', '(번호)', 'g') $$;
create or replace function trg_ugc_chat() returns trigger language plpgsql as $$ begin new.body := left(ugc_clean(new.body), 80); new.name := left(ugc_clean(new.name), 12); return new; end $$;
create or replace function trg_ugc_prayer() returns trigger language plpgsql as $$ begin new.body := ugc_clean(new.body); new.name := ugc_clean(new.name); return new; end $$;
drop trigger if exists ugc_chat on chat_messages; create trigger ugc_chat before insert or update on chat_messages for each row execute function trg_ugc_chat();
drop trigger if exists ugc_prayer on prayers; create trigger ugc_prayer before insert or update on prayers for each row execute function trg_ugc_prayer();
create or replace function block_user(p_secret text, p_target text) returns boolean language plpgsql security definer set search_path = public as $$
begin if char_length(coalesce(p_target,'')) < 1 or char_length(p_target) > 40 then raise exception 'bad target'; end if;
  if (select count(*) from blocks where owner_hash = _owner(p_secret)) >= 500 then raise exception 'too many'; end if;
  insert into blocks values (_owner(p_secret), p_target) on conflict do nothing; return true; end $$;
create or replace function eula_accept(p_secret text, p_version text) returns boolean language plpgsql security definer set search_path = public as $$
begin insert into eula_accepts values (_owner(p_secret), left(p_version, 20)) on conflict (owner_hash) do update set version = excluded.version, created_at = now(); return true; end $$;
revoke all on function block_user(text,text), eula_accept(text,text) from public; grant execute on function block_user(text,text), eula_accept(text,text) to anon, authenticated;

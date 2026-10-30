-- Account linking: a signed-in Supabase Auth user (email OTP/magic link, later Google/Kakao) owns one row
-- that maps to the guest identity (maeul_secret) + a snapshot of the local save, so logging in on any device restores
-- the same chapel, character and wallet. RLS: a user can only see/write their own row; the anon key can't read any.
create table if not exists public.account_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  secret text not null check (length(secret) between 16 and 80),
  save jsonb not null default '{}'::jsonb check (pg_column_size(save) < 65536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.account_links enable row level security;
revoke all on public.account_links from anon;
grant select, insert, update on public.account_links to authenticated;
drop policy if exists al_sel on public.account_links; create policy al_sel on public.account_links for select to authenticated using (user_id = auth.uid());
drop policy if exists al_ins on public.account_links; create policy al_ins on public.account_links for insert to authenticated with check (user_id = auth.uid());
drop policy if exists al_upd on public.account_links; create policy al_upd on public.account_links for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

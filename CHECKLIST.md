# 마실채플 2.5D — CHECKLIST
[x] done · [~] partial · [ ] not started. Updated 2026-10-30.

## Phase 1 (core village)
- [x] Village map, walking, chapel enter/exit, interior with pews/pulpit, NPC dialog
- [x] Avatar customization, emotes, chat, speech bubbles
- [x] Supabase Realtime presence per dong (publishable key only)

## Phase 2
- [x] Church tiers (server `church_tier` 1–5), offering RPC (free 달란트 only), leaderboard
- [x] Nationwide dong map, per-dong village variation, Bible reader, worship mode

## Phase 3 — feedback fixes
- [x] Space/E interact + dialog advance (typing completes first), Shift jump, Tab map (preventDefault), Esc, Enter chat, no keys while chat focused
- [x] H help / desktop hints / title hint updated  · [~] mobile button labels (unchanged icons)
- [x] Dark skin blotches (masks regenerated + soft blending)
- [x] Hair poking over hats (hat clip)
- [x] Speech bubble word wrap (max 4 lines)
- [x] Map above missions panel
- [x] Big chapel exterior (bell tower, stained glass, steps) + per-tier art Lv1 천막→Lv2 통나무→Lv3 벽돌→Lv4 대성당
- [ ] Larger/grander interior (existing side-view interior kept)
- [x] Offering box moved in front of pews (visible)
- [x] Wandering villagers talkable
- [x] Leaderboard renamed '동네 예배당 성장 순위'
- [x] Collision: chapel/building boxes, prop circles, axis sliding, debug toggle (` / ?debug=col); lake via walk mask, perimeter fence margin, placed-decor footprints, stuck escape; NPCs stroll along painted paths
- [x] Gold light pillars on nationwide map (height ∝ √church total, sido/sgg aggregate)
- [x] 오병이어 나눔: 1F button → room broadcast → tappable bread/fish rain for everyone; `earn('obi')` 60 달란트 once/day (server rule); 10-min local cooldown

## Payment-ready / anti-abuse / launch
- [x] 만나 wallet, products/orders/grants/refunds/payment_transactions tables, RLS
- [x] grant_order idempotent stub, verify_receipt / webhook Edge Function stubs (not deployed), refund clawback
- [x] Gacha probability table + '[? 확률 정보]' modal, gacha_logs, server-side random
- [x] Reward audit (earn/spend via server), per-kind rate limits, daily cap 1500, tamper tests (test_wallet.py)
- [x] payments.js (iap / web providers, disabled), PAYMENT_READY.md, LAUNCH_CHECKLIST.md
- [x] Pilgrim NPC bots for cold start (fill to 2 when room is quiet, leave when real players join)
- [x] EULA checkbox, banned-word filter (client + DB triggers), report/block, account delete RPC
- [x] Mobile hardening (dpr cap + adaptive, safe-area, visualViewport, visibility pause, realtime unsubscribe/rejoin)

## Future
- [ ] Pet/instrument gacha + merge · [ ] Offline meditation · [ ] 동행 패스 · [ ] 9pm co-op defense
- [ ] B2B pins · [ ] Per-dong maps · [ ] Capacitor app · [ ] Real payments · [ ] Social login
- [ ] LAUNCH_CHECKLIST: 사업자등록, 통신판매업, 15% small-business programs, IARC rating

## v8 hotfix (2026-10-30, dpl_Ee5ZQyfQAEa5VK2X17gc1Li6DTRq)
- [x] A. Lv1 grand church → Lv5 upgrades (thresholds 0/1000/5000/20000/80000); tent/cabin art removed
- [x] B. Interior 1F sanctuary / 2F choir loft / B1 fellowship cafe+prayer room, stairs (Space/E), cover-fit desktop+mobile
- [x] C. Door sign '동천동 마실채플 Lv.N' + progress bar, HUD chip, levels panel (locked dimmed + lock, unlocks, 달란트 needed)
- [x] D. '처음부터 다시 시작' full wipe + ?reset=1 (delete_account RPC)
- [x] E. Exit: 잠깐 나가기 / 로그아웃
- [x] F. CC0/PD hymn recordings (assets/audio/LICENSES.md), synth fallback; ⚙️/Esc settings (BGM/SFX/voice/notification toggles, logout, reset)
- [x] test_v8 local+live: 0 errors desktop/mobile; test_p3 live regression: 0 errors
- [x] Remote players on 2F/B1: floor synced via presence/broadcast `fl`; other-floor players hidden (test_floor.py)

## v9 backlog (2026-10-30 KST) — deploys dpl_6BgSGpsfqh5xQmsarpnVYKwv5Ppy, dpl_8S1bTXadQQvcVgp6BeRUMRzXXAvi, dpl_CuZqEH3aMwLuwVrRAN212QpeQH5N
- [x] UGC safety (842acbd) · [x] mobile + floor sync (aa39c68) · [x] phase 4 (bf58ab9, cb907c1) · [x] collision/paths (8ac8028)
- [x] Live: test_v8 / test_p4 / test_floor / test_wallet → 0 page errors

## 계정 연동 (Supabase Auth) — 2026-10-30
- 손님 시작 유지: 정체성은 기기의 `maeul_secret`. 연동 = Supabase Auth 사용자 1명 ↔ `public.account_links` 1행 {secret, save 스냅샷}.
- 마이그레이션: `supabase/migrations/20261030_05_account_links.sql` (적용됨). RLS: 본인 행만 select/insert/update, anon 권한 없음. (롤백 트랜잭션으로 타인 조회 0행·타인 수정 불가 확인)
- 이메일: `signInWithOtp` → 메일의 6자리 코드(`verifyOtp`) 또는 매직 링크. 코드를 쓰려면 Auth → Email Templates의 Magic Link 템플릿에 `{{ .Token }}` 추가.
- Site URL / Redirect URLs: `https://maeul-chapel-25d.vercel.app` (설정됨으로 보고받음).
- Google: 클라이언트는 `/auth/v1/settings`의 `external.google`이 true일 때만 버튼을 보여줌. 손님이 익명 세션이면 `linkIdentity`, 아니면 `signInWithOAuth` (redirectTo = 사이트).
  - 2026-10-30 15:50 KST 확인 결과 **external.google = false** (아직 적용 안 됨). Google Cloud OAuth 클라이언트 ID/Secret을 Auth → Providers → Google에 넣고 저장해야 함. 승인된 리디렉션 URI: `https://gisykxqhticmdhmupnry.supabase.co/auth/v1/callback`.
  - Manual Linking(`security_manual_linking_enabled`): linkIdentity를 쓰려면 Auth → Settings에서 켜야 함. 이 환경엔 관리 API 도구가 없어 확인/변경 못 함 → 대시보드에서 확인 필요. 익명 로그인(anonymous sign-ins)도 현재 꺼져 있어 지금은 signInWithOAuth 경로만 사용됨(동작엔 문제 없음).
- Kakao / Naver: 숨김. 켜려면 Providers에 키 등록 후 `window.MAEUL_KAKAO = true` 플래그. 키는 절대 저장소에 커밋하지 않음.
- 로그아웃: 손님이면 경고 + "먼저 계정 연동" 제안, 연동됐으면 백업 후 로그아웃. 다시 로그인 → secret·저장 복원 후 새로고침 → 같은 예배당·캐릭터·지갑(지갑은 서버에서 secret 기준).
- 알려진 한계: "처음부터 다시 시작"(delete_account)은 account_links 행을 지우지 않음 → 재로그인 시 빈 기록의 옛 secret으로 돌아감.

## v13 milestone (2026-10-30) — character scale/hair + presence
- [x] Full bbox spread across S/W/E/N, all frames: ≤1px per combo (was up to 28px); body 148–149px — tools/test_walk_scale.py PASS
- [x] Back-view double hair: piece drawn exactly once; base-sheet hair re-textured
- [x] Gait cycleLen 120 (was ~204 px, causing a glide)
- [x] Presence: stable per-device id, self excluded, one room channel, 10s leave debounce, no toasts on local leave — tools/test_presence.py PASS (live, 3 solo toggles + 190s idle)
- [x] QA isolation: ?qa=1 or navigator.webdriver → 'chapelqa:' namespace (no real rooms, lobby, or chat history)
- [x] NPC pilgrims are tagged 'NPC 순례자 …'; the online count is real humans only
- [ ] OPEN: tan blotches at hoodie cuffs and hood edges; white halo on silver hair; HUD v13 CSS not visually verified; help modal, audio, menus, maps, Google login not started

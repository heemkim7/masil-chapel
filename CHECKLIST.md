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

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
- [~] Collision: box footprints for chapel + buildings, circles for trees/props, axis sliding, debug toggle (` key / ?debug=col). [ ] lake/fences/decor footprints, [ ] NPC pathing audit
- [ ] Gold light pillars on nationwide map for high-tier dongs
- [ ] 오병이어 나눔 (RPC + broadcast + bread/fish rain)

## Payment-ready / anti-abuse / launch (not started — server work)
- [ ] 만나 wallet, products/orders/grants/refunds/payment_transactions tables, RLS
- [ ] grant_order idempotent stub, verify_receipt / webhook Edge Function stubs, refund clawback
- [ ] Gacha probability table + '확률 보기' modal, gacha_logs, server-side random
- [ ] Client Math.random reward audit, rate limits, daily caps, tamper tests
- [ ] payments.js (iap / web providers), PAYMENT_READY.md, LAUNCH_CHECKLIST.md
- [ ] Pilgrim NPC bots for cold start
- [ ] EULA checkbox, banned-word filter, report/block, account delete RPC
- [ ] Mobile hardening (dpr cap, safe-area, visualViewport, visibility pause, realtime unsubscribe)

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
- [ ] Remote players on 2F/B1 (floor not synced yet)

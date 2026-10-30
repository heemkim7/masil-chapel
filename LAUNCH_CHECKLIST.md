# 마실채플 — LAUNCH_CHECKLIST (2026-10-30)

## Legal / business (KR)
- [ ] 사업자등록, 통신판매업 신고 (before any paid item)
- [ ] 게임물 등급: GRAC 자체등급분류 / IARC questionnaire (UGC chat + 확률형 아이템 disclosed)
- [x] 확률형 아이템 정보 공개 (게임산업법): in-game `[? 확률 정보]` table from the server pool; server-side random; gacha_logs
- [ ] 개인정보 처리방침 + 이용약관 hosted pages (in-game EULA v1-2026-10 is a summary)
- [ ] App store small-business programs (15% fee) enrollment
- [ ] 청소년 결제 한도 / 환불 정책 page (payments still disabled)

## Safety / UGC
- [x] EULA checkbox gate on the title screen and before the first chat (v1-2026-10)
- [x] Banned-word masking on the client and in DB triggers (chat_messages, prayers); links and phone numbers masked
- [x] Report (🚩 → reports table) and block (local + `block_user` RPC); unblock-all in settings
- [x] Account delete (`delete_account` RPC, ⚙️ → 처음부터 다시 시작)
- [ ] Moderator review flow for `reports` (dashboard/SQL view), 24h response SLA

## Anti-abuse
- [x] Server-authoritative 달란트 wallet, earn rules (per-day, gap), daily cap 1500, seed cap 500
- [x] Tamper test: a localStorage balance of 99999 resyncs to the server value; a repeated quest earn is refused
- [x] No user↔user transfer or trade
- [ ] Rate-limit chat inserts per client (DB-side)

## Mobile / perf
- [x] DPR cap 2 with adaptive drop to 1.5/1 on slow frames; safe-area insets; visualViewport keyboard offset
- [x] Background >45 s → realtime channels released; rejoined on return; audio suspended
- [x] No long-press menu or double-tap zoom on the game surface; 16 px inputs (no iOS zoom)
- [ ] Real-device pass: iPhone SE / mid Android (Chrome, Samsung Internet), KakaoTalk in-app browser

## Ops
- [x] Production: https://maeul-chapel-25d.vercel.app (Vercel heemkim-s-projects); repo heemkim7/masil-chapel
- [ ] Supabase backups / PITR, error monitoring, uptime check
- [ ] Remove dev hooks (`window.G` test helpers) or gate them behind `?debug`

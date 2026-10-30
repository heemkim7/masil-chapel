# 마실채플 — PAYMENT_READY (status 2026-10-30, payments DISABLED)

Real-money payments are **not live**. Everything below is wired so they can be switched on after the launch checklist, without schema changes.

## Currency rules (fixed)
- **달란트** — free, earned by play only. Never sold. The only currency for 헌금(offering) and the blessing-gift gacha. No user↔user transfer or trade.
- **만나** — the future paid currency, for cosmetics only. It can never be converted to 달란트 and never used for 헌금 or gacha.

## Server (Supabase gisykxqhticmdhmupnry, migration 20261030_02)
| Table | Purpose |
|---|---|
| wallets / wallet_ledger | server-authoritative 달란트 balance + append-only ledger |
| earn_rules | per-kind amount, per-day count, min gap (collect, worship, quest, mission, mission_bonus, service, dup, obi); daily cap 1500 |
| gacha_pool / gacha_logs | odds source of truth (public read of active rows) + every roll logged (server `random()`) |
| products | SKU catalog (`active=false` until launch) |
| manna_wallets | paid-currency balance |
| orders / payment_transactions | order lifecycle + raw provider transactions |
| grants / refunds | idempotent grants (unique per order) + clawback records |

- RLS is on for every table, and anon/authenticated have no direct access. Writes go through security-definer RPCs only.
- `grant_order(order_id)` is idempotent and `refund_order(order_id)` claws back 만나 up to the current balance (never below 0) and records the refund. Both are **revoked from anon** and are service-role only.
- The Edge Function stubs `supabase/functions/verify_receipt` and `payment_webhook` return 503 unless `PAYMENTS_ENABLED=true`. They are **not deployed**.

## Client
- `js/payments.js` → `PAY` (`enabled:false`, providers `iap` | `web`). `buy()` shows "아직 결제 기능이 없어요".
- `js/wallet.js` → `W.sync/earn/spend/odds`. Any local balance edit is overwritten by the server on the next sync.
- The offering modal has a `[? 확률 정보]` link. It opens a table with per-item odds, both normal and at the offering box (1.8× for rare items), plus the duplicate refund and the 40% cosmetic note.

## To enable (in order)
1. Complete LAUNCH_CHECKLIST.md §Legal (사업자등록 / 통신판매업 / 확률표시 의무).
2. Create store products. Then fill the `products` SKUs and set `active=true`.
3. Deploy the Edge Functions with `PAYMENTS_ENABLED=true`, plus store/PG secrets set as **function secrets only** (never in git).
4. `verify_receipt`: validate with Apple/Google/PG, insert `payment_transactions`, then call `grant_order`.
5. `payment_webhook`: verify the signature. Refund or chargeback calls `refund_order`.
6. Set `PAY.enabled=true` and the provider. QA covers: double-submit, replayed receipt, refund after spend, offline.

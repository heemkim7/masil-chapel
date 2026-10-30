# Beta Readiness — 2026-10-30 KST
Quality score: 160/160 automated cases pass (100%); open issues: 0 blocker, 0 high, 2 low.
Low: world level sign clips at 390 medium zoom; portrait front view is small (but fits).
Payments: dormant (PAY.enabled=false), no paid entry points — not a blocker.
User-only: real-device testing; store/payment accounts when payments are resumed.

## v13 (2026-10-30) found / fixed / open
- FIXED: size jitter while walking; back-view double hair; walk glide; white speckles on tinted hoodies; presence self-duplication and toast flaps; test clients showing up in real rooms; NPCs not labelled.
- OPEN: hoodie cuff tan blotches; silver hair halo; HUD v13 not visually verified; help modal, audio, menus, Tab map labels, dong breadcrumb, Google login.

## v13b avatar artifacts (2026-10-30)
- FIXED: tan lining/cuffs on tinted hoodies (navy/sky/lav/peach) — cream "skin"-masked fabric below face band reclassed to outfit (near-fabric only).
- FIXED: back-view ghost skirt (semi-transparent baked alpha) — body-only alpha solidify.
- FIXED (regression during work): blue blotches on faces from lining rule — face band raised to .43, solidify limited to body.
- OPEN: thin cyan/purple eye-rim specks on some girl front frames (mask defect); silver-hair white halo at fringe edges; lav ponytail hair looks translucent/layered on S/N; small tint patches on sky back-view boots. Only ~7 combos zoom-reviewed, not all hair×outfit×skin×direction; two-clean-pass review NOT yet achieved.
Before: qa_walk/art_before/z1.png,z2.png  After (LIVE): qa_walk/art_a1/live1.png

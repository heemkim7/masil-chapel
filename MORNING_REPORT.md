# Morning report (2026-10-30 KST)

## Done
- Security: RLS audit, grant hardening migration, two-anon test, advisor clean (search_path). Google provider live (authorize 302 -> accounts.google.com). QA chat rows (room qa_rls, 2 rows) deleted. Anonymous test users NOT deleted: 5 anon users exist from 16:59-17:00 KST and the test ones can't be told apart safely from real guests.
- Character rig: qa_rig 618 combos / 17,156 frames, maxDrift 0 px, missing 0; skin-through cleanup re-run 0 px. Commit 9af1200.
- Settings character reset (appearance-only / typed full reset, linked-account sync): tools/test_reset.py 12/12, 0 errors. Commit 1c9d181, deploy maeul-chapel-25d-2b25goayl.
- Protestant exterior: 5 new level arts (brick + white steeple + plain/red cross, no rose windows), level names 동네 작은 교회 / 함께 자라는 교회 / 교육관이 있는 교회 / 카페가 있는 교회 / 온 동네의 교회. Old art in assets/v7/catholic_bak/. Screens: shots/prot_world_l1.png, shots/prot_levels.png (before: shots/ui/reset_3_confirm.png background).

## Remaining
- See the end of this file (items 1-8 done).

## Interior (Protestant) — deployed
- deploy maeul-chapel-25d-rclar0uth, commit 9591f9e. Screenshot shots/prot_in_t1.png (before: assets/catholic_bak/).

## Item 5 Icons — deployed
- New menu icons: 기도벽=note board w/ heart, 꾸미기=palette, 배치=sofa, 헌금뽑기=capsule machine, 지도=folded map, 설정=gear, 임무=checklist, 도움말, 성경(cross), 기도=praying hands. White highlight strokes (.h), duotone .2.
- Contact sheet: shots/icons_sheet_v2.png (32/64px), shots/icons_sheet_v3.png (2x crop). Self-QA: all legible at 32px; pray redrawn after first pass read as a tent.

## Icon fix + Item 6 place switcher + known-issue fixes
- 헌금하기 button now uses the offering icon (`offer`); capsule kept for gacha UI only. Per-button icons are now chosen inside the emoji→SVG converter (icons.js `conv`, BTN map) — the 1.5s re-apply interval is removed.
- Top-bar place switcher (`#dongbtn` → `V.openPlaces()`): shows current place (`current()`), lists 모두의 광장 / 우리 동네 / up to 4 recently visited dongs / 다른 동네 찾기 / 같은 장소 다른 방 / 혼자 모드, marks "지금 여기". `goPlace('plaza'|'home')` resets shard; tickRoom() rejoins the new room. Phones drop the "마실채플 ·" prefix so the place name fits.
- Test tools/test_places.py: 12/12 pass, 0 page errors (room id d0:in ↔ d{home}:in verified). Shots: shots/ui/places_390.png, places_list_390.png.
- Fixed: 오병이어 button moved left of the right menu column; toast + counter moved below the top HUD on ≤760px. Stair labels moved to the stair foot (no longer overlap seated name tags / pulpit). Before: shots/ui/in_b_{1366,390}.png, after: in_c_{1366,390}.png.

- Deploy for the place switcher: maeul-chapel-25d-cz9rpdipl (dpl_3L7yXKrBWoaPuwUx8twxoVkgotGR), commit 6627f65.

## Item 7: worship hall (본당 예배) — deployed
- Docs: CHURCH_RESEARCH.md (common elements) and WORSHIP_DESIGN.md.
- Code and assets: js/worship.js, css/worship.css, assets/worship/ (hall, 4 rest spots, window mask).
- Entry points:
  - the 예배 side button
  - the 성가대 spot inside the chapel
  - the timetable card on the board, with a 본당 입장 button
- The view is a 3/4 elevated rear-diagonal over 120 seats. Empty seats are filled by pilgrims (38% at dawn).
- Weather and time windows: dawn, sunset, night, rainy night, rain, snow. Soft traffic and rain ambience.
- Bottom bar: 기도 / 찬양 / 아멘. Lyrics karaoke, subtitles, front-facing reaction inset, and a crowd "아멘!" ripple.
- Services follow a 7-phase order on a shared clock, led by a host NPC.
- Sheet tabs:
  - 시간표, with countdowns and 10-minute and start notifications
  - 섬기는 사람들 (8 roles, NPC now, assignable to users later)
  - 프로그램 (6)
  - 공동체: members, greet, report and block, 중보기도 with a pray counter, cell, streak
  - 쉼터 (4 spots with 묵상, 말씀, 피아노, 설교)
- Rewards are free 달란트 only, through the existing 'service' rule after 2 minutes.
- QA:
  - 120 seats plus 30 simulated clients: 60 fps at 1366x768 and 60 fps at 390x844, unthrottled, 0 page errors.
  - Emulated mobile at 390x844, dpr 3 and CPU x4 throttle, on a box with no GPU: 34-38 fps. It was 22 fps before I added the adaptive dpr and the cached static crowd layer.
  - Two-context realtime test: each client sees the other (peers 1/1), and state syncs.
- Shots:
  - shots/ui/wh_a_1366.png and wh_b_390_amen.png
  - wh_b_390_sheet.png, wh_c_dawn390.png, wh_c_roof390.png
  - wh_d3.png (dawn) and wh_d4.png (rainy night)
- Bug found and fixed: the window mask had no alpha.
- Deploy maeul-chapel-25d-1hztb885w, commit bcd4060.
- Risks:
  - There is no user hosting or role assignment yet; the host is a clock-synced NPC.
  - Browser notifications only fire while a tab is open.

## Item 8: UX audit — see UX_AUDIT.md
- 6 viewports x 6 screens, with bounding-box overlap and tap-size checks.
- Overlaps between hit-testable controls: 0 on all 36 screens after the fixes.
- Touch tap targets under 44px: from 25-28 per screen down to 1-3, and only low-severity ones remain.
- Fixed:
  - the 360px top bar overflow
  - the 나가기 label under the emotes
  - a flush, consistent right column
  - the nowrap action label
  - 44px touch targets
  - keep-all line breaks
  - the worship portrait layout
- Shots: shots/ux/a_* (before), c_* (after).
- Deploy: maeul-chapel-25d-k05salpzw (aliased to maeul-chapel-25d.vercel.app).

## v14 worship hall: camera views, aisles, walking (deploy maeul-chapel-25d-hqi90e98t)
- Pastor stands on a raised platform behind a lowered pulpit, so his upper body shows.
- Camera button (top right, 44px, key C) cycles 뒤에서 → 앞에서 (front-facing congregation) → 목사님 close-up → 내 자리. The transitions are eased and the choice is saved (wh_view).
- Pews are split into 4 blocks with a centre aisle and two side aisles. There are 120 seats and about 16% are left empty.
- Walking:
  - you walk in from the back door, down an aisle, then slide into the pew
  - tapping an empty seat walks you there
  - 나가기 or Esc walks you out first
  - other players see all of this through the presence `w` flag and the 'out' message
- World toasts are hidden while the hall is open; the hall has its own toast.
- QA, unthrottled, 1366 and 390: 60fps, 120 seats, 30 simulated peers, 0 errors.
- QA, 390 at dpr 3 with 4x CPU throttle: rear 43, front 56, pastor 41, seat 39 fps.
- Shots: shots/ui/cam_v2_{1366,390}_{walkin,rear,front,pastor,seat,move}.png

## 10-30 18:31 KST beta loop
Suite 160/160, settings/offer/shop polish, seat collision fix, BETA_TEST_PLAN/READINESS written.

## 2026-10-30 evening — v13 milestone
Root causes: (1) hair was sized by each direction's rig head width (102–133px, not normalised) and the rig head y0 jumped 6px → full bbox 149–177. Fixed with a constant per-character reference and the measured alpha top, so the spread is now ≤1px. (2) The back view drew the hair piece twice, and the baked base-sheet hair showed through. (3) Presence: a random id per Net instance and overlapping join() calls during solo↔room left stale channels, so your own old session appeared as a peer → '님이 접속/나갔어요' flaps and 3명↔1명. (4) '베타' and '처음이' seen on live were our automated beta_suite clients (Playwright), which were joining real rooms; they are now isolated in the 'chapelqa:' namespace.
Tests: beta_suite 160/160 local; test_walk_scale PASS; test_presence 6/6 PASS on live.

## Overnight batch: outfits / hairs / cosmetics / gacha (2026-10-30 KST)
- Commit 1ae44ee (deployed): 6 gacha outfits (hanbok, formal, winter, summer, spring, autumn) x 2 genders as layered stills; boy recolours + choir robe; gacha pool +6 outfit items (희귀 8x3, 일반 14x3, pool total 302); rollCos odds shown in labels (offerRates); server migration 20261030_06 applied (pool rows + cos dup refund), matches config.json.
- Batch 2 (this commit): cosmetic placement in AV.still: back items rescaled/re-anchored to the neck, held items anchored to the hand, mask/scarf height, beanie no longer covers girl's eyes, top hat fit.
- Counts vs targets: hats 17 (>=10), face 7, back 8, held 15 (all >=6). Outfits: girl 12 (6 free + 6 gacha), boy 13 (7 + 6). Locked outfits show only when owned.
- Eye-checked contact sheets: /workspace/mk/prod/cos_{hat,face,back,held}.jpg (all pass except c19 monocle faint on girl). In-game check: /workspace/mk/prod/g5.jpg and the composed still st1.jpg (top hat, glasses, wings, lantern all drawn). Outfit S check: /workspace/mk/prod/outS_chk.jpg.
- Beta suite 160/160.

### Known defects (honest)
- **Boy "hanbok" is not a hanbok**: the asset is a green tee + navy shorts (looks like a recolour). The girl hanbok is also a yellow/red top + skirt rather than a real hanbok. Needs regeneration.
- New outfits have small orange skin-fringe pixels around the legs/hem.
- Girl hairs h00/h01/h02/h11 still fail and are mapped via NEAR_H to shipped hairs.
- Boy shorts keep white piping; N hem fringe. Choir robe waist seam. Pre-existing outfits not cleaned.
- Wings (c24) are pale and hard to see on light grass in-game.
- Held items hidden on N/NW by design; balloon floats at face height.
- rollCos caveat: the client rolls the cos item, so when the server cos flag is true the server inventory records the pool item instead.
- Stray Vercel project **"exp"** (exp-inky-three.vercel.app, behind Vercel auth) was created by accident from an unlinked export. Not deleted — needs your approval.

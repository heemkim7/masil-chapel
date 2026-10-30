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

## 23:15 KST: outfits pulled (only ship what passes)
- All 6 gacha outfits (hanbok, formal, winter, summer, spring, autumn), both genders, were pulled: the boy and girl hanbok aren't real hanbok, and all 12 share one leg template with skin specks at the legs and hem (identical speck counts across recolours).
- Removed from config.json gacha.pool (now 12 items, weight 236) and from the UI (SHIP NEW_O = []; owned codes fall back to basic). Server: migration 20261030_07 sets active=false. Verified the active server pool is 12 items / 236, matching config. The beta suite is 160/160.
- Players who already own an o_* item keep it in their inventory, but it shows as basic until a fixed version ships.

## Batch 3: server-authoritative gacha, wings, monocle
- Gacha: the 40% cosmetic roll for 헌금 축복 moved into the server's `_gacha` (migration 20261030_08, new private table cos_catalog, 48 rows mirroring AV.COS, same rarity weights as rollCos). The client no longer re-rolls; it shows and stores exactly the item the server returns. Dry-run (300 rolls, rolled back): 48 distinct cosmetics, 0 cosmetic duplicates, then pool items; no rows left behind.
  - Remaining edge: if a player's local s.cos has an item the server inventory doesn't, the server can award it, and the client then shows it as a duplicate without a server refund.
- Wings c24: 2x resample, cool outline and edge shading, w 1.35. They now read clearly on grass (eye-checked /workspace/mk/prod/wm1.jpg, S/SW/W/NW/N x boy and girl).
- Monocle c19: bigger (w .38), translucent lens, raised, with a per-direction SW offset. It sits on the eye at S and SW for the boy and both girl hairs (wm3c.jpg) and passes on W.
- Beta suite 160/160.

## 10-31 batch 4 (KST) — real hanbok re-added (o_hanbok only)
- Regenerated from scratch (not a recolour): girl = yellow jeogori with saekdong sleeves and red otgoreum + red chima; boy = sky-blue jeogori with saekdong sleeves and navy otgoreum + dark-indigo baji with red daenim ankle ties. 5 directions × 2 genders, fitted onto the existing bases.
- Rejected along the way (not shipped): girl SW came out as a front view (regenerated); boy v1 cream baji was segmented out as background → bare legs; boy SW/W walking pose didn't match the base stride (regenerated to match); base-skin specks at the ankles and a hole in the white sleeve stripe at boy W (fixed and re-checked).
- Checks: every cell at 3x by eye ×3 (layer composite, legs/hem close-up, in-game AV.still render) — no skin specks at legs/hems, no holes. New icon cos/o_hanbok.png made from the new outfit.
- Re-added in all three places, consistently: config gacha.pool (o_hanbok 희귀 w8 → 13 items/244), NEW_O=['hanbok'], server gacha_pool active (migration 20261031_09; server active = 13/244, matches config).
- Still pulled: o_formal, o_winter, o_summer, o_spring, o_autumn (not regenerated yet). Boy-shorts piping, choir seam and girl hairs h00/h01/h02/h11 are not done yet.
- Beta suite 160/160.

## 10-31 batch 5: formal (예배 정장) re-added
- Regenerated all 10 cells: girl navy blazer, blouse with red bow, pleated skirt and tights; boy charcoal-navy suit with red tie. The boy cells are edits of the base pose, so they match the stride.
- Girl NW: the generated NW came out front-facing, so it uses the N back view (same approach as the hanbok). Girl SW is frontal, which is acceptable at this size.
- Pipeline additions: outfit interiors are forced fully opaque, and brown specks over white shoes are dropped at the feet (boy SW).
- Checks passed: per-cell fit, 3x upper and lower body, 6x feet and blouse close-ups, in-game 5-direction stills for f and m.
- Re-added in all three places: config pool 14 items / 252, NEW_O=['hanbok','formal'], migration 20261031_10 applied. Server active pool matches.
- Beta suite 160/160.

## Batch 6 — 성탄 옷 (winter) + 여름 마린룩 (summer) re-added (2026-10-31)
- Both regenerated across 5 directions (S/SW/W/NW/N; the other 3 are mirrored), both characters. Checked with per-cell 6x close-ups, the 3x zoom by eye, and in-game stills.
- Winter: the girl N hood was regenerated as a crew neck. Ankle skin specks and muddy snowflakes were fixed in the pipeline. Known minor: the girl W hand is half hidden by the skirt, and the girl SW hands have faint marks. Neither is visible at game scale.
- Summer (bare arms and legs): a new bare-limb cleanup drops generated skin and socks so the base limbs show, fills undershirt gaps, and clips the boy's outfit to his silhouette. Girl NW uses the N view. Boy NW also uses the N view, because the generated NW stride didn't match the base.
- Server gacha_pool is now 16 active / weight 274, which matches the config. Beta suite 160/160.
- Still pulled: spring and autumn.

## Batch 7: spring re-added (00:5x KST, Oct 31)
- **Spring (o_spring '봄 옷 (옷)', w14)** is back in the pool, with a new design. The girl wears a rose-pink dress with white flowers. The boy wears a mint floral hoodie with light-blue denim shorts. The old long jeans failed because the walking poses didn't line up.
- Checks: all 5 directions passed per-cell and 3x by eye, and the in-game stills are clean. Fixes made: the base's white shorts peeked out on the boy SW/W (filled with denim colour), and dark collar specks were removed on S/SW. Minor issue left: the boy's SW shorts hem is slightly ragged.
- Server pool is now 17 active / weight 288 (migration 20261031_13). beta_suite 160/160.
- Still pulled: autumn. Not deleted: the stray Vercel project 'exp' (it needs your approval).

## Batch 8: autumn re-added, spring boy hem fixed (Oct 31 KST)
- **Autumn (o_autumn '가을 체크 (옷)', w14)** is back in the pool, with a new colour scheme. The girl wears a burgundy tartan dress with green maple leaves. The boy wears a burgundy maple-leaf hoodie with dark green tartan shorts. I tried orange and brown first, but the skin-colour filter treats them as skin, which stripped the sleeves and shredded the hems. Burgundy and green avoid that.
- Fixes: holes along the tartan lines in the hem were closed with nearest-colour fill. On the boy, leaf holes were filled, the base's white shorts were covered with tartan, and collar specks were removed.
- **Spring boy SW hem** is now smooth. I removed the grey fringe and the dark blob, then refilled from the base's shorts outline. One tiny notch is left.
- All 5 directions passed 3x by eye, and the in-game stills are clean. Server pool is now 18 active / weight 302 (migration 20261031_14). beta_suite 160/160.

## Batch 9 — boy shorts piping + choir seam (00:40 KST)
- Boy `basic` and `mint`: the white piping/edge lines on the shorts are removed, along with the white edges on the mint sleeves. They're recoloured to the nearest outfit colour. Checked at 3x and 6x, and in game in all 5 directions.
- Boy `choir`: the robe skirt was a flat untextured fill, which made a hard waist seam. It now continues the top's per-column shading, with a soft vertical blend across the seam and a slight darkening toward the hem. On W, the arm used to be chopped flat by the skirt; it now ends in a rounded hand. Checked at 3x and 6x, and in game.
- Assets only: no pool or config change (still 18 / 302). Beta suite 160/160.

## Batch 10 — girl hairs h00/h01/h02/h11 shipped (00:52 KST)
- 똥머리 (h00), 양갈래 (h01), 포니테일 (h02) and 낮은 묶음 (h11) are now real layered hairs. Before, they were remapped to other hairs via NEAR_H; now `NEAR_H.f` is the identity and `SHIP.f.hairs = [0..7]`, so old codes show the hair that was actually picked.
- Repairs: removed a stray braid and stub at the right shoulder on h02 S; filled the hair-to-head gaps on h00 SW and h01 S/SW, using mid-tone hair only, so no dark blobs; filled small enclosed holes in the pigtails and tails across all 20 cells.
- Checks: hair_check gate OK on all 20 cells; viewed by eye at 1.5x and 2x on a composite; viewed in game in 4 hair colours with basic, choir, mint and autumn outfits. Beta suite 160/160.
- Remaining nit (honest): the h02 ponytail is long at NW/N and covers most of the back. This is by design of the source art.

### Status after batch 10
- All items from the 00:26 request are done: autumn (batch 8), the spring SW hem (batch 8), the boy shorts piping (batch 9), the choir seam (batch 9) and the girl hairs (batch 10).
- Still needs your call: the stray Vercel project "exp". It's not deleted.

## Batch 11 — face accessories eye-anchored (안경 삐뚤어짐 fix)
- Cause: face items were placed from the head box (top+0.6·head height) with the image's bounding box centred, not its lenses. The glasses art has a temple arm on one side only, and the right lens sits 2–4° lower (c16 2.1°, c17 2.4°, c18 3.9°), so the glasses read off-centre, crooked and 11–15px below the eyes. In W the full front-view pair floated on the cheek.
- Fix: per-character EYE table (measured eye centres S/SW/W), lens anchors per item; affine draw maps the lens centres → the eye centres (rotation cancels the art tilt, SW horizontal foreshortening, the bridge on the nose midpoint). W = the near lens + temple only, on the eye. Monocle on one eye; blush = one heart under each eye (one in W); mustache/mask anchored to the eye midpoint + eye-distance offsets.
- Walk/mirror: the face layer is baked into the still, so the bob/tilt/flip move it with the head (checked in walk captures).
- Sheets: /workspace/mk/prod/glasses_before.jpg, glasses_after.jpg. Beta suite 160/160.

## Walk animation restore (02:4x KST)
- Root cause: commit e3e5ecc (avatar v17 layered 2D) replaced sprite-sheet walk frames with ONE still per direction; `_lpose` always returned `L:<dir>`, so legs never moved (only bob/tilt/squash).
- Fix: `AV.walkStill(ch,d,f)` builds 8 stepping frames per direction from the composed still (front/back: alternate leg lift split at the crotch gap, SW/NW forward offset; W/E: legs split and scissored). world.js `_lpose` picks the frame from walked distance. Accessory WIP (c16/c22) postponed, not shipped (saved in /workspace/mk/bak/acc_wip).
- beta suite 160/160.

## walk2 — readable stepping (2026-10-31)
- Front/back (S/SW/N/NW): alternating leg lift (~24% of leg below hem/crotch, min 6px), lifted leg drawn last, opposite arm swing (small), hem sway; bob synced to step phase.
- Side (W/E): wider scissor (A=max(12,.34L)), darker back leg, chocolate rim on front leg; long skirts: only feet below hem scissor.
- Hem detection = narrowest ankle row → scan up until filled width > 1.25x (fixes skirt/dress centre tears for hanbok/formal/dresses).
- No accessory changes. Suite 160/160.
- Known limits: residual foot slide at ~7.6 steps/s; arm swing subtle; blue/purple fleck on boy sky/lav side-foot is in source art.

## walk3 — stride sync, skirts, ponytail (2026-10-31)
- Cadence: stepLen 34→38 (≈6.8 steps/s at speed 260). Side scissor uses a constant-speed (triangle) stance so the planted foot moves with the ground; half-stride = 38/(0.687)/2 ≈ 27.7 still px (capped .62L, skirts 1.1L), swing-leg lift 5px.
- Long skirts: stronger hem sway (front 3px, side 2.2px) + hem lifts on the stepping side; shoe lift min 8px. Arm swing 3→4.5px.
- Girl h02 ponytail N/NW: pixel-edited — head kept intact to the nape (y160), tail tapered 28→~8px, ends ~y196 (mid-back), soft chocolate edge. Originals in /workspace/mk/bak/h02/.
- Suite 160/160. No accessory changes.

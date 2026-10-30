# Morning report (2026-10-30 KST)

## Done
- Security: RLS audit, grant hardening migration, two-anon test, advisor clean (search_path). Google provider live (authorize 302 -> accounts.google.com). QA chat rows (room qa_rls, 2 rows) deleted. Anonymous test users NOT deleted: 5 anon users exist from 16:59-17:00 KST and the test ones can't be told apart safely from real guests.
- Character rig: qa_rig 618 combos / 17,156 frames, maxDrift 0 px, missing 0; skin-through cleanup re-run 0 px. Commit 9af1200.
- Settings character reset (appearance-only / typed full reset, linked-account sync): tools/test_reset.py 12/12, 0 errors. Commit 1c9d181, deploy maeul-chapel-25d-2b25goayl.
- Protestant exterior: 5 new level arts (brick + white steeple + plain/red cross, no rose windows), level names 동네 작은 교회 / 함께 자라는 교회 / 교육관이 있는 교회 / 카페가 있는 교회 / 온 동네의 교회. Old art in assets/v7/catholic_bak/. Screens: shots/prot_world_l1.png, shots/prot_levels.png (before: shots/ui/reset_3_confirm.png background).

## Remaining
- Protestant interior, icon set, place switcher, CHURCH_RESEARCH.md + WORSHIP_DESIGN.md + 100-person worship mode, UX_AUDIT.md strict pass.

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

# 마실채플 Beta Test Plan (payments excluded)
Automated: `python3 tools/beta_suite.py <url> [group]` — groups size/flow/worship/econ/misc/net/multi.
- size: 6 screen sizes (360x640…1920x1080): title, HUD, 44px touch targets, every modal fits, no JS errors
- flow: first-time user (EULA→name→start), returning user auto-resume, keyboard movement
- worship: walk-in, seated pose, 30 peers, 4 camera views, actions/amen, tap-to-move, fps>=50, leave
- econ: gacha roll, gacha broke, offering free-only, no paid UI text, inventory, shop, PAY disabled
- misc: place switch, settings, reset, board, report, map
- net: offline worship+gacha, slow network (150ms/request) boot
- multi: 6 concurrent clients — presence, unique seats, leave propagation
Also: tools test_account (guest→Google link), test_places, test_reset.
Manual (user only): real iOS/Android devices, Google OAuth on production consent screen.

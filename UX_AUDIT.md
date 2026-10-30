# UX audit (item 8) — 2026-10-30 KST

Method: tools/ux_audit.py. 6 viewports (1920x1080, 1366x768, 1280x800, 768x1024, 390x844 touch, 360x740 touch) x 6 screens (title/creator, onboarding, world, chapel interior, worship hall, worship sheet). For every visible button/input it records the bounding box, checks the topmost hit (elementFromPoint), flags tap targets < 44px, and checks overlaps between hit-testable controls. Every screenshot (shots/ux/a_*, b_*, c_*) was reviewed by eye.

Totals: before (run a) 79 overlap pairs over all screens (mostly counted under modals), and on mobile the top bar overflowed with the exit button cut off at 360px. After (runs b and c): 0 overlaps between hit-testable controls on all 36 screens. Touch tap targets under 44px went from 25–28 to 3 (title) and 1 (world).

## High (fixed)
1. **360x740 top bar overflow.** The exit button was cut off at the right edge (content 375px wide in a 352px bar). Fix: on portrait ≤700px #chlv (Lv) is hidden because the quest badge already shows it. Settings and exit are 44x44.
2. **Exit marker "나가기" hidden behind the emote buttons in the chapel on mobile.** Fix: the in-world label is now drawn left of the door (interior.js). The right-column buttons moved to the edge.
3. **Worship hall window mask had no alpha.** The weather layer tinted the whole hall and left a bright box around the pulpit. Fix: winmask.png is converted to an alpha mask.

## Medium (fixed)
4. **Right action column not flush or consistent.** Emote, music and jump sat at three different right offsets, sizes 48, 58 and 85px. Now they share one right edge with the menu column (8px plus safe-area). Secondary buttons are 50px with a 10px gap. The primary 들어가기/나가기 button is 84px.
5. **Primary action label wrapped ("들어가\n기").** Fixed with nowrap at 16px.
6. **Tap targets under 44px on touch.** Creator chips (32px), #online, #dongbtn, settings and menu are now ≥44px under pointer:coarse.
7. **Korean words breaking mid-word** (title tagline, quest line). Fixed with word-break: keep-all.
8. **Worship hall, portrait layout.** The scene was drawn at 51% scale with a large empty band, and the reaction inset covered the pastor. Now the scene fills the height above the subtitles, pans with a drag, and the inset sits above the subtitle card.
9. **Chat width on mobile** now leaves room for the right column (calc(100vw - 112px)).

## Low (open)
- The quest badge "Lv.1 · 오늘 0/4" is 32px tall. It is a secondary tap and the whole quest card is also tappable.
- The EULA checkbox is 16px, but its label row is clickable.
- Desktop (mouse) top pills are 40px. That is acceptable for a fine pointer.
- World-space signs, such as the level sign, can be clipped at the screen edge on 360px. They are part of the world, not the HUD.
- Outer-world toasts (z 60) can briefly show over the worship hall.

## Onboarding / place switcher
- First run: EULA, the creator (scroll rows with fade), then the welcome toast, the quest card "예배당 안 목사님께 인사하기", and the place switcher pill at top showing the current place with ▾. The first visit to the worship hall shows a one-time 안내위원 toast explaining 기도 / 찬양 / 아멘.
- Thumb reach (390x844): primary action, jump, emotes and the worship bar are all in the bottom-right or bottom-centre thumb zone. Menu and exit are at the top (less frequent).

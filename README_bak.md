# ㅇㅇ동 마을예배당 — v4 2.5D 샘플 게임

Canvas2D, ES modules, no build step and no dependencies. All UI is in Korean and uses Pretendard, loaded from a CDN without blocking the page; if the CDN fails it falls back to system fonts.

## Run
```
cd v4_25d_game && python3 -m http.server 18437   # open http://localhost:18437/
```
A server is required because the game fetches `config.json` and `atlas.json`.
Headless test: `python3 test_headless.py` saves screenshots and `walk.gif` to `shots/` and exits 1 on any console error. Set `PORT=` to change the port.

## Controls
- Move: WASD or arrow keys, analog 360° with no direction snapping. You can also click a spot, or use the virtual joystick on touch screens.
- Space / E or the round button: talk, enter, sit, offer, or open the board. During worship it taps the beat.
- 1, 2, 3: emotes (👋 wave, 🙌 jump, 🙏 pray).
- Enter: chat.

## Structure
- `config.json`: all tunable data — world, props, NPCs, wanderers, chat lines, quest, gacha pool, accessories, decor, yard, interior layout, worship, levels.
- `js/assets.js`: loader, atlas access and 8-direction facing.
- `js/world.js`: walk mask, collision and the `Char` class.
- `js/interior.js`: the chapel interior, painted procedurally.
- `js/state.js`: save/load and the game rules. Its `Board` class has an async local adapter, so a network adapter can replace it later with the same API.
- `js/main.js`: scenes, UI, input, game loop and test hooks (`window.G`).
- `assets/characters/<name>/<outfit>/<anim>_<dir>_<frame>.png` plus `atlas.json`:
  - frames are 200×260 with the feet baseline at y=250;
  - the mirror map is E←W, SE←SW, NE←NW.

## Gameplay loop
1. On the title screen, enter a name and pick one of 3 outfits (live walking preview), or choose 이어하기 to continue a save.
2. Enter the chapel through its door and greet the pastor.
3. Talk to 하은 and 양이 outside.
4. Collect 5 hidden ⭐ stars or petals.
5. Bring them to the pastor for coins and XP.
6. Join worship: sit on a pew and play the hymn rhythm game. You earn coins and XP; you can repeat it, and each new star round is generated from a seed.
7. 헌금 뽑기 (at the offering box, or the 🎁 button) gives accessories (일반 / 희귀 / 전설; duplicates refund some coins) and furniture.
8. 꾸미기: change outfit and equip hat, back and pet accessories.
9. 🪑 배치: place furniture in the yard (inside the dotted ellipse) or anywhere on the interior floor. You can set left/right direction, pick items back up, and undo. Placing raises the chapel XP and level bar.
10. 🙏 게시판: post prayer requests and press 함께 기도.
11. Chat: messages appear as a bubble and in the log, and nearby avatars reply.
12. Saving: game state is kept in localStorage (`chapel_v4_save`, `chapel_v4_board`), saved every 3 s and when the page is hidden.

## Limitations
- The sprites are AI-generated, so frames drift slightly in detail.
- There is no true back-3/4 view; NW/NE use the back view.
- The lamb has no back view.
- Idle and emotes exist only for player/basic and the NPCs. The NPCs have just one frame for most emotes, animated with squash and bob.
- choir and mint have no idle frames; their idle is the first walk frame plus breathing squash.
- Wandering "players" reuse the player outfits, so they look alike apart from their name tags.
- The interior is drawn procedurally, not painted.
- Furniture "rotation" is a left/right mirror only.
- The walk mask is approximate.
- Multiplayer is fake (local bots); chat and the board are local-only.

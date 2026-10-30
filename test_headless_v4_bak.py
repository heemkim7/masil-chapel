# Headless smoke test: serves this folder, drives the game, saves screenshots + walk GIF, fails on console errors.
import http.server, threading, functools, socketserver, sys, io, os
from playwright.sync_api import sync_playwright
from PIL import Image
PORT = int(os.environ.get('PORT', 18437)); D = os.path.dirname(os.path.abspath(__file__))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', PORT), functools.partial(Q, directory=D)); threading.Thread(target=srv.serve_forever, daemon=True).start()
errs = []; U = f'http://127.0.0.1:{PORT}/index.html'
def hook(pg):
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.on('pageerror', lambda e: errs.append(str(e)))
def shot(pg, n): pg.screenshot(path=f'{D}/shots/{n}.png'); print('shot', n)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1280, 'height': 800}); hook(pg)
    pg.goto(U, wait_until='domcontentloaded'); pg.evaluate('localStorage.clear()'); pg.reload(wait_until='domcontentloaded'); pg.wait_for_function('window.__ready', timeout=60000); pg.wait_for_timeout(800)
    shot(pg, '01_title')
    pg.fill('#pname', '은혜'); pg.click('.ocard[data-o=basic]'); pg.click('#newgame'); pg.wait_for_timeout(900)
    # walking GIF: circle of 8 directions with exact analog angles
    frames = []
    for deg in [90, 45, 0, 315, 270, 225, 180, 135]:
        pg.evaluate(f'G.moveDir({deg}, 700)')
        for _ in range(4): pg.wait_for_timeout(170); frames.append(Image.open(io.BytesIO(pg.screenshot(clip={'x': 500, 'y': 200, 'width': 280, 'height': 300}))).convert('RGB').resize((224, 240)))
    frames[0].save(f'{D}/shots/walk.gif', save_all=True, append_images=frames[1:], duration=120, loop=0, optimize=True); print('gif', len(frames))
    pg.evaluate('G.moveDir(200,1200)'); pg.wait_for_timeout(1700); shot(pg, '02_field')
    # quest: enter chapel, greet pastor
    c = pg.evaluate('G.cfg().chapel.door'); pg.evaluate(f"G.tp({c['x']},{c['y']+40})"); pg.wait_for_timeout(300); pg.evaluate('G.interact()'); pg.wait_for_timeout(600)
    pg.evaluate("G.tp(768,710)"); pg.wait_for_timeout(500); pg.evaluate('G.interact()'); pg.wait_for_timeout(500); shot(pg, '03_interior_pastor')
    pg.click('#dopts button'); pg.evaluate('G.exitChapel()')
    for nid in ['haeun', 'lamb']:
        n = [x for x in pg.evaluate('G.cfg().npcs') if x['id'] == nid][0]; pg.evaluate(f"G.tp({n['x']},{n['y']+70})"); pg.wait_for_timeout(400); pg.evaluate('G.interact()'); pg.wait_for_timeout(400); pg.click('#dopts button')
    pk = pg.evaluate('G.pickups.map(p=>[p.x,p.y])'); assert len(pk) == 5, pk
    pg.evaluate(f"G.tp({pk[0][0]},{pk[0][1]+150})"); pg.wait_for_timeout(700); shot(pg, '04_quest_star')
    for x, y in pk: pg.evaluate(f'G.tp({x},{y})'); pg.wait_for_timeout(120)
    assert pg.evaluate('G.S.quest.stage') == 3
    pg.evaluate('G.enterChapel()'); pg.evaluate('G.tp(768,710)'); pg.wait_for_timeout(300); pg.evaluate('G.interact()'); pg.click('#dopts button'); pg.wait_for_timeout(300)
    # worship mini-game: sit then play with auto-taps on beats
    pg.evaluate('G.tp(768,710)'); pg.evaluate('G.interact()'); pg.wait_for_timeout(200); pg.click('#dopts button >> nth=0')
    pg.evaluate("""(()=>{const tick=()=>{const w=G.worship;if(!w)return;const n=w.notes.find(n=>!n.hit&&Math.abs(n.t-w.t)<.03);if(n)G.worshipTap();requestAnimationFrame(tick)};tick()})()""")
    pg.wait_for_timeout(5500); shot(pg, '05_worship')
    pg.wait_for_function('!G.worship', timeout=30000); pg.wait_for_timeout(300); shot(pg, '06_worship_result'); pg.click('#dopts button')
    print('coins after worship', pg.evaluate('G.S.coins'), 'stage', pg.evaluate('G.S.quest.stage'))
    # gacha via offering box
    pg.evaluate("G.tp(1150,700)"); pg.wait_for_timeout(300); pg.evaluate('G.interact()'); pg.wait_for_timeout(300)
    for _ in range(3): pg.click('#groll'); pg.wait_for_timeout(900)
    shot(pg, '07_gacha'); pg.evaluate('G.closeModal()')
    pg.evaluate("G.S.inv.push('wings','crown','dove');G.S.equip.hat='crown';G.S.equip.back='wings';G.S.equip.pet='dove';G.S.coins+=0")
    pg.evaluate('G.openInv()'); pg.wait_for_timeout(400); shot(pg, '08_inventory'); pg.evaluate('G.closeModal()')
    # interior decorating
    pg.evaluate("G.S.decorInv.pot=3;G.S.decorInv.lamp=2;G.S.decorInv.bench=1"); pg.evaluate('G.openDecor()')
    for d, x, y in [('pot', 300, 900), ('pot', 1200, 900), ('lamp', 250, 560), ('lamp', 1250, 560), ('bench', 1200, 980)]:
        pg.click(f'.ditem[data-d={d}]'); pg.evaluate(f'G.placeAt({x},{y})')
    pg.evaluate('G.tp(750,930)'); pg.wait_for_timeout(600); shot(pg, '09_decor_interior'); pg.click('#ddone')
    # yard decorating + board + chat
    pg.evaluate('G.exitChapel()'); pg.evaluate("G.S.decorInv.bench=2;G.S.decorInv.flowers=2"); pg.evaluate('G.openDecor()')
    for d, x, y in [('bench', 1450, 1180), ('flowers', 1950, 1200), ('bench', 1980, 1100)]:
        pg.click(f'.ditem[data-d={d}]'); pg.evaluate(f'G.placeAt({x},{y})')
    pg.evaluate('G.tp(1700,1250)'); pg.wait_for_timeout(700); shot(pg, '10_decor_yard'); pg.click('#ddone')
    pg.fill('#chatin', '안녕하세요 이웃님들!'); pg.press('#chatin', 'Enter'); pg.evaluate("G.emote('wave')"); pg.wait_for_timeout(1300); shot(pg, '11_chat_emote')
    pg.evaluate('G.enterChapel()'); pg.evaluate('G.openBoard()'); pg.fill('#btext', '할머니 건강을 위해 기도해 주세요'); pg.click('#bpost'); pg.wait_for_timeout(300); pg.click('#blist .post button'); pg.wait_for_timeout(300); shot(pg, '12_board')
    pg.evaluate('G.closeModal()')
    saved = pg.evaluate('JSON.parse(localStorage.chapel_v4_save)'); print('saved inside decor', len(saved['inside']), 'yard', len(saved['yard']), 'lv xp', saved['xp'])
    # reload -> continue keeps decor
    pg.reload(wait_until='domcontentloaded'); pg.wait_for_timeout(300); pg.wait_for_function('window.__ready'); print('after reload', pg.evaluate('[Object.keys(localStorage), document.querySelector("#continue").disabled, location.href]')); pg.click('#continue'); pg.wait_for_timeout(600)
    assert pg.evaluate('G.S.inside.length') == len(saved['inside']) and pg.evaluate('G.S.yard.length') == len(saved['yard'])
    # mobile
    m = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2).new_page(); hook(m)
    m.goto(U, wait_until='domcontentloaded'); m.wait_for_function('window.__ready', timeout=60000); shot(m, '14_mobile_title'); m.fill('#pname', '모바일'); m.tap('.ocard[data-o=mint]'); m.tap('#newgame'); m.wait_for_timeout(600)
    jz = m.locator('#joyzone').bounding_box(); cx, cy = jz['x'] + jz['width'] / 2, jz['y'] + jz['height'] / 2
    cdp = m.context.new_cdp_session(m)
    def t(typ, x, y): cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [] if typ == 'touchEnd' else [{'x': x, 'y': y}]})
    t('touchStart', cx, cy)
    for i in range(1, 25): t('touchMove', cx + 40 * min(1, i / 5), cy - 25 * min(1, i / 5)); m.wait_for_timeout(50)
    p0 = m.evaluate('[G.player.x,G.player.y]'); shot(m, '13_mobile_joystick'); t('touchEnd', 0, 0); print('mobile pos', p0)
    b.close()
srv.shutdown()
print('console errors:', errs); sys.exit(1 if errs else 0)

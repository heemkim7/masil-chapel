import sys, os, functools, threading, http.server, socketserver, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else None; ROOT = os.path.dirname(os.path.abspath(__file__)); LBL = sys.argv[2] if len(sys.argv) > 2 else 'local'
if not URL:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 18494), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start(); URL = 'http://127.0.0.1:18494'
os.makedirs('shots/v8', exist_ok=True); O = f'shots/v8/{LBL}_'; R = {}
def run(p, mob):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(**p.devices['iPhone 13']) if mob else b.new_context(viewport={'width': 1600, 'height': 900})
    pg = ctx.new_page(); errs = []; t = 'm_' if mob else 'd_'
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(URL + '/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000)
    pg.evaluate("G.start('스샷','basic')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(1500)
    d = pg.evaluate('G.cfg().chapel.door')
    for tr in (1,2,3,4,5):
        pg.evaluate(f"P2.forceTier({tr})"); pg.evaluate(f"G.tp({d['x']+60},{d['y']+200})"); pg.wait_for_timeout(900); pg.screenshot(path=O+t+f'church_lv{tr}.png')
    R[t+'chip'] = pg.evaluate("document.getElementById('chlv').textContent")
    sp = pg.evaluate('P2.signPos()'); pg.evaluate(f"G.tp({sp['x']},{sp['y']+30})"); pg.wait_for_timeout(500)
    R[t+'near_sign'] = pg.evaluate('G.nearest()?.type'); pg.screenshot(path=O+t+'sign.png')
    pg.keyboard.press('KeyE'); pg.wait_for_timeout(700); R[t+'levels_modal'] = pg.evaluate('G.modal'); pg.screenshot(path=O+t+'levels_panel.png'); pg.evaluate('G.closeModal()')
    pg.evaluate('P2.forceTier(1)'); pg.evaluate('G.enterChapel(true)'); pg.wait_for_timeout(900)
    R[t+'cover'] = pg.evaluate("(()=>{const I=G.inside; return {zW:G.cam.z*I.view().w>=innerWidth-1, zH:G.cam.z*I.view().h>=innerHeight-1, z:G.cam.z}})()") if pg.evaluate('!!G.cam') else 'no G.cam'
    pg.screenshot(path=O+t+'floor_1F.png')
    o = pg.evaluate('G.cfg().interior.offering'); pg.evaluate(f"G.tp({o['x']},{o['y']+40})"); pg.wait_for_timeout(700); pg.screenshot(path=O+t+'floor_1F_offering.png')
    for st in pg.evaluate('G.cfg().interior.stairs1'):
        pg.evaluate("G.enterChapel(true)"); pg.evaluate(f"G.tp({st['x']},{st['y']})"); pg.wait_for_timeout(400); R[t+'near_'+st['to']] = pg.evaluate('G.nearest()?.type')
        pg.keyboard.press('Space'); pg.wait_for_timeout(900); R[t+'floor_after_'+st['to']] = pg.evaluate('G.inside.floor'); pg.screenshot(path=O+t+f"floor_{st['to']}.png")
        f = pg.evaluate(f"G.cfg().interior.floors.find(f=>f.id==='{st['to']}')")
        for spt in f['spots']: pg.evaluate(f"G.tp({spt['x']},{spt['y']})"); pg.wait_for_timeout(700); pg.screenshot(path=O+t+f"floor_{st['to']}_{spt['t']}.png")
        pg.evaluate(f"G.tp({f['stairs']['x']},{f['stairs']['y']})"); pg.wait_for_timeout(300); pg.keyboard.press('KeyE'); pg.wait_for_timeout(700); R[t+'back_from_'+st['to']] = pg.evaluate('G.inside.floor')
    # audio: hymn on worship start
    pg.mouse.click(5, 300); pg.evaluate("G.enterChapel(true)"); pg.wait_for_timeout(600)
    R[t+'bgm_src'] = pg.evaluate("Aud.el? Aud.el.src.split('/').pop():null"); R[t+'bgm_playing'] = pg.evaluate("Aud.el? !Aud.el.paused:false")
    pg.keyboard.press('Escape'); pg.wait_for_timeout(600); R[t+'esc_settings'] = pg.evaluate('G.modal'); pg.screenshot(path=O+t+'settings.png'); pg.evaluate('G.closeModal()')
    pg.evaluate("document.getElementById('btn-menu').click()"); pg.wait_for_timeout(500); pg.screenshot(path=O+t+'exit_menu.png'); pg.keyboard.press('Escape')
    R[t+'errs'] = errs[:5]; b.close()
def reset(p):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']); pg = b.new_page(); pg.goto(URL + '/'); pg.wait_for_function('window.__ready', timeout=60000)
    pg.evaluate("G.start('리셋','basic')"); pg.wait_for_timeout(2500); R['before_keys'] = pg.evaluate('localStorage.length')
    pg.goto(URL + '/?reset=1'); pg.wait_for_timeout(6000); R['after_url'] = pg.url; R['after_keys'] = pg.evaluate('Object.keys(localStorage)'); b.close()
with sync_playwright() as p:
    run(p, False); run(p, True); reset(p)
print(json.dumps(R, ensure_ascii=False, indent=1))

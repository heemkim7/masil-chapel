import sys, os, functools, threading, http.server, socketserver, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); URL = sys.argv[1] if len(sys.argv) > 1 else None
if not URL:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 18493), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start(); URL = 'http://127.0.0.1:18493'
O = 'shots/av/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for vp, tag in [({'width': 1400, 'height': 860}, 'pc'), ({'width': 390, 'height': 844}, 'm')]:
        pg = b.new_page(viewport=vp, device_scale_factor=2 if tag == 'm' else 1); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        pg.goto(URL + '/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000); pg.wait_for_timeout(800)
        pg.screenshot(path=O + tag + '_title.png')
        for k, v in [('g', 'm'), ('hs', '2'), ('hc', '3'), ('s', '3'), ('o', 'mint')]:
            pg.click(f'#outfits [data-k="{k}"][data-v="{v}"]'); pg.wait_for_timeout(250)
        pg.wait_for_timeout(500); pg.screenshot(path=O + tag + '_title_custom.png')
        if tag == 'm': print('m errs', errs); pg.close(); continue
        pg.fill('#pname', '테스터'); pg.click('#newgame'); pg.wait_for_timeout(1500); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(1200)
        print('av', pg.evaluate('G.S.av'), pg.evaluate('G.player.char'))
        pg.screenshot(path=O + 'pc_ingame.png')
        # grid of combos as NPC chars around the player
        pg.evaluate("""() => { const A = G.AV, ids = Object.keys(A.COS), cs = [];
          const combos = []; for (let i = 0; i < 16; i++) { const g = i % 2 ? 'm' : 'f'; combos.push([g, i % 4, i % 6, i % A.HAIRS[g].length, i % 9, A.OUTFITS[g][i % 6][0], ids.filter(x=>A.COS[x].slot==='hat')[i%10]||'-', i%3?'-':ids.filter(x=>A.COS[x].slot==='face')[i%5]||'-', i%2?ids.filter(x=>A.COS[x].slot==='back')[i%6]||'-':'-', i%3===1?ids.filter(x=>A.COS[x].slot==='held')[i%6]||'-':'-'].join('.')); }
          window.__combos = combos; combos.forEach(c => A.preload(A.parse(c))); }""")
        pg.wait_for_timeout(1500)
        pg.evaluate("""() => { const cv = document.createElement('canvas'); cv.width = 1400; cv.height = 860; cv.id='grid'; Object.assign(cv.style,{position:'fixed',left:0,top:0,zIndex:9999,background:'#e9f7ee'}); document.body.append(cv);
          const g = cv.getContext('2d'); const P = G.player, C = P.constructor; const dirs=['S','SW','W','N'];
          __combos.forEach((code, i) => { for (let d = 0; d < 4; d++) { const ch = new C(P.sprites, 'player', 'basic', 0, 0, { cfg: G.cfg(), drawH: 150 }); G.AV.apply(ch, code); ch.face = dirs[d]; ch.speedNow = 0; ch.x = 45 + (i % 8) * 172 + d * 40; ch.y = 200 + Math.floor(i / 8) * 330 + (d%2)*0;
            ch.drawH = Math.round(ch.drawH*.62); ch.draw(g); } g.fillStyle='#333'; g.font='11px sans-serif'; g.fillText(code, 10 + (i % 8) * 172, 225 + Math.floor(i / 8) * 330); }); }""")
        pg.wait_for_timeout(300); pg.evaluate("() => { const g=document.getElementById('grid'); g.getContext('2d').clearRect(0,0,1400,860); }")
        pg.evaluate("""() => { const cv=document.getElementById('grid'), g = cv.getContext('2d'); const P = G.player, C = P.constructor; const dirs=['S','SW','W','N'];
          __combos.forEach((code, i) => { for (let d = 0; d < 4; d++) { const ch = new C(P.sprites, 'player', 'basic', 0, 0, { cfg: G.cfg(), drawH: 150 }); G.AV.apply(ch, code); ch.face = dirs[d]; ch.x = 45 + (i % 8) * 172 + d * 40; ch.y = 330 + Math.floor(i / 8) * 400; ch.drawH = Math.round(ch.drawH*.7); ch.draw(g); }
            g.fillStyle='#333'; g.font='10px sans-serif'; g.fillText(code, 8 + (i % 8) * 172, 350 + Math.floor(i / 8) * 400); }); }""")
        pg.wait_for_timeout(300); pg.screenshot(path=O + 'grid.png'); pg.evaluate("document.getElementById('grid').remove()")
        pg.evaluate("G.S.coins=5000; G.refreshHud(); P2.openShop(G.cfg().shops[0])"); pg.wait_for_timeout(600); pg.screenshot(path=O + 'shop.png')
        pg.click('.cosgrid [data-cos="c00"]'); pg.wait_for_timeout(300); pg.click('.cosgrid [data-cos="c20"]') if pg.locator('.cosgrid [data-cos="c20"]:not([disabled])').count() else None
        pg.wait_for_timeout(300); print('after buy', pg.evaluate('[G.S.cos, G.S.av, G.S.coins]')); pg.evaluate('G.closeModal()')
        pg.evaluate('Cust.open()'); pg.wait_for_timeout(700); pg.screenshot(path=O + 'cust_modal.png'); pg.click('#czsave'); pg.wait_for_timeout(800); pg.screenshot(path=O + 'after_save.png')
        print('pc errs', errs); pg.close()

import sys, os, functools, threading, http.server, socketserver, json
from playwright.sync_api import sync_playwright
LBL = sys.argv[1]; URL = sys.argv[2] if len(sys.argv) > 2 else None; ROOT = os.path.dirname(os.path.abspath(__file__))
if not URL:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 18492), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start(); URL = 'http://127.0.0.1:18492'
O = f'shots/p2/{LBL}_'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1600, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(URL + '/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000)
    pg.evaluate("G.start('스샷','basic')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(2500)
    pg.screenshot(path=O+'village.png')
    sh = pg.evaluate("G.cfg().shops[2]"); pg.evaluate(f"G.tp({sh['door']['x']},{sh['door']['y']+20})"); pg.wait_for_timeout(1500); pg.screenshot(path=O+'shopfront.png')
    pg.evaluate("G.S.coins=3000; G.refreshHud(); P2.openShop(G.cfg().shops[0])"); pg.wait_for_timeout(500); pg.screenshot(path=O+'shop.png'); pg.evaluate('G.closeModal()')
    res = {}
    for k in 'IKLMJOHCNG':
        pg.keyboard.press('Key'+k); pg.wait_for_timeout(500); m1 = pg.evaluate('G.modal'); pg.screenshot(path=O+f'key_{k}.png')
        pg.keyboard.press('Key'+k); pg.wait_for_timeout(300); m2 = pg.evaluate('G.modal'); res[k] = (m1, m2)
    pg.keyboard.press('KeyB'); pg.wait_for_timeout(400); res['B'] = pg.evaluate('G.S.mode'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300); res['B_esc'] = pg.evaluate('G.S.mode')
    pg.focus('#chatin'); pg.keyboard.press('KeyI'); res['typing_I'] = pg.evaluate('G.modal'); pg.evaluate('document.activeElement.blur()')
    print('keys', json.dumps(res, ensure_ascii=False))
    pg.evaluate("P2.openNation()"); pg.wait_for_timeout(1500); pg.screenshot(path=O+'nation0.png')
    pg.evaluate("document.querySelector('#natq').value='삼청'; document.querySelector('#natq').dispatchEvent(new Event('input'))"); pg.wait_for_timeout(800); pg.screenshot(path=O+'nation_search.png')
    pg.evaluate("document.querySelector('#natres button').click()"); pg.wait_for_timeout(1200); pg.screenshot(path=O+'nation_dong.png'); pg.evaluate('G.closeModal()')
    pg.evaluate("P2.openOffer(false)"); pg.wait_for_timeout(300); pg.click('.am[data-a="100"]'); pg.fill('#p2pray','테스트 기도'); pg.screenshot(path=O+'offer.png'); pg.click('#p2give'); pg.wait_for_timeout(1400); pg.screenshot(path=O+'ritual.png'); pg.wait_for_timeout(2500); pg.screenshot(path=O+'bless.png'); pg.evaluate('G.closeModal()')
    pg.evaluate('G.enterChapel(true)'); pg.wait_for_timeout(1500); pg.evaluate('G.closeModal()'); pg.evaluate('P2.setTier(4)'); pg.wait_for_timeout(500); pg.screenshot(path=O+'interior_t3.png')
    pg.evaluate('G.sitOn(1)'); pg.wait_for_timeout(800); pg.screenshot(path=O+'seated.png')
    pg.evaluate('G.Svc.start()'); pg.wait_for_timeout(1200); pg.evaluate('G.Svc.next(true)'); pg.wait_for_timeout(1500); pg.screenshot(path=O+'service.png')
    print('coins', pg.evaluate('G.S.coins'), 'p2', pg.evaluate('JSON.stringify(P2.st())'))
    print('errors', errs[:8])
    b.close()

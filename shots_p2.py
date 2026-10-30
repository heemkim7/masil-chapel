import sys, os, functools, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
LBL = sys.argv[1]; URL = sys.argv[2] if len(sys.argv) > 2 else None; ROOT = os.path.dirname(os.path.abspath(__file__))
if not URL:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 18491), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start(); URL = 'http://127.0.0.1:18491'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1600, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(URL + '/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000)
    pg.evaluate("G.start('스샷','basic')"); pg.wait_for_timeout(600); pg.evaluate('G.closeModal()')
    pg.evaluate('G.enterChapel(true)'); pg.wait_for_timeout(1500); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(500)
    pg.screenshot(path=f'shots/p2/{LBL}_interior.png')
    if LBL != 'before':
        r = pg.evaluate('JSON.stringify(G.p2test())'); print('p2test', r)
        pg.evaluate('G.sitOn(1)'); pg.wait_for_timeout(800); pg.screenshot(path=f'shots/p2/{LBL}_seated.png')
        pg.evaluate('G.Svc.start()'); pg.wait_for_timeout(1200); pg.evaluate('G.Svc.next(true)'); pg.wait_for_timeout(300); pg.evaluate('G.Svc.next(true)'); pg.wait_for_timeout(1500); pg.screenshot(path=f'shots/p2/{LBL}_service.png')
        pg.evaluate('G.Svc.stop()'); pg.evaluate('G.S.coins=5000; G.P2.openBoard()'); pg.wait_for_timeout(800); pg.screenshot(path=f'shots/p2/{LBL}_leaderboard.png')
        pg.evaluate('G.closeModal(); G.P2.give(3000)'); pg.wait_for_timeout(2500); pg.screenshot(path=f'shots/p2/{LBL}_upgrade.png')
        pg.evaluate('G.closeModal(); G.P2.groupPhoto()'); pg.wait_for_timeout(1000); pg.screenshot(path=f'shots/p2/{LBL}_photo.png')
        print('tier', pg.evaluate('G.P2.tier()'))
    print('errors', errs[:5])
    b.close()

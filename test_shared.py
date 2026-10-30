import sys, os, functools, threading, http.server, socketserver, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else None; ROOT = os.path.dirname(os.path.abspath(__file__)); L = 'live' if URL else 'local'
if not URL:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 18493), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start(); URL = 'http://127.0.0.1:18493'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pgs = []; errs = []
    for i, n in enumerate(['배치A', '관찰B']):
        c = b.new_context(viewport={'width': 1280, 'height': 760}, permissions=['clipboard-read', 'clipboard-write']); pg = c.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL + '/?room=1111051500-1'); pg.wait_for_function('window.__ready', timeout=60000)
        pg.evaluate(f"G.start('{n}','basic')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()'); pgs.append(pg)
    A, B = pgs
    for pg in pgs: pg.wait_for_function("G.net.status==='online'", timeout=20000)
    A.wait_for_timeout(1500)
    Y = A.evaluate('G.cfg().yard'); A.evaluate(f"G.tp({Y['x']},{Y['y']+Y['ry']*0.6})"); B.evaluate(f"G.tp({Y['x']},{Y['y']+Y['ry']*0.6})"); A.wait_for_timeout(1200)
    before = B.evaluate('G.SH.list.length')
    A.keyboard.press('KeyB'); A.wait_for_timeout(400); A.click('#decor-items button:not([disabled])')
    import random; dx = random.randint(-120, 120)
    pt = A.evaluate(f"(()=>{{const Y=G.cfg().yard, c=G.cam||null; return [Y.x+{dx}, Y.y]}})()")
    A.evaluate(f"G.placeAt({pt[0]},{pt[1]})"); A.wait_for_timeout(2500)
    a_n = A.evaluate('G.SH.list.length'); b_n = B.evaluate('G.SH.list.length')
    B.screenshot(path=f'shots/p2/{L}_shared_B_sees.png'); A.screenshot(path=f'shots/p2/{L}_shared_A.png')
    owner = B.evaluate("G.SH.list.at(-1)?.owner"); mine = B.evaluate("G.SH.list.at(-1)?.mine")
    # B tries to remove A's item -> should be denied
    A.keyboard.press('Escape'); sid = A.evaluate("G.SH.list.filter(p=>p.mine).at(-1)?.sid")
    den = B.evaluate(f"G.net.sb.rpc('place_remove',{{p_id:{sid},p_secret:G.net.secret()}}).then(r=>r.data)")
    # reload B: persists
    B.reload(); B.wait_for_function('window.__ready', timeout=60000); B.evaluate("G.start('관찰B','basic')"); B.wait_for_timeout(800); B.evaluate('G.closeModal()'); B.wait_for_function("G.net.status==='online'", timeout=20000); B.wait_for_timeout(2500)
    b_reload = B.evaluate('G.SH.list.length')
    # A removes -> B sees removal
    A.keyboard.press('KeyB'); A.wait_for_timeout(300); A.click('#dundo'); A.wait_for_timeout(2500); b_after = B.evaluate('G.SH.list.length')
    # share link
    A.keyboard.press('Escape'); A.evaluate("window.shareLink('https://maeul-chapel-25d.vercel.app/?room=x')"); A.wait_for_timeout(600); clip = A.evaluate('navigator.clipboard.readText()')
    print(json.dumps(dict(before=before, a=a_n, b=b_n, owner=owner, mine_for_B=mine, B_remove_denied=not den, b_after_reload=b_reload, b_after_A_remove=b_after, clip=clip), ensure_ascii=False))
    print('errors', errs[:5]); b.close()

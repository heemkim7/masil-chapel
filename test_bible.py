import sys, os, functools, threading, http.server, socketserver, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else None; ROOT = os.path.dirname(os.path.abspath(__file__)); L='live' if URL else 'local'
if not URL:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 18494), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start(); URL = 'http://127.0.0.1:18494'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']); errs=[]
    for dev, vp, mob in [('desk', {'width':1400,'height':860}, False), ('mob', {'width':390,'height':844}, True)]:
        c = b.new_context(viewport=vp, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1); pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL+'/'); pg.wait_for_function('window.__ready', timeout=60000); pg.evaluate("G.start('독자','basic')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(800)
        if mob: pg.evaluate("BR.open()")
        else: pg.keyboard.press('KeyV')
        pg.wait_for_selector('#rdT h3'); pg.evaluate("BR.go(43,3)"); pg.wait_for_timeout(600)
        pg.click('#rv16'); pg.click('#rdTool [data-k="hl"]'); pg.wait_for_timeout(400); pg.click('#rv16'); pg.click('#rdTool [data-k="bm"]'); pg.wait_for_timeout(400)
        pg.click('#rdD'); pg.wait_for_timeout(1000); pg.screenshot(path=f'shots/p2/{L}_bible_{dev}.png')
        pg.click('#rdQ'); pg.fill('#rdIn','독생자'); pg.select_option('#rdSc','all'); pg.click('#rdGo'); pg.wait_for_function("document.querySelector('#rdRes .mnote')", timeout=60000); pg.wait_for_timeout(500)
        n = pg.inner_text('#rdRes .mnote'); pg.screenshot(path=f'shots/p2/{L}_bible_search_{dev}.png')
        sync = pg.evaluate("G.net.sb.rpc('marks_get',{p_secret:G.net.secret()}).then(r=>r.data)")
        print(dev, 'search', n, 'synced', sync, 'read', pg.evaluate('BR.readToday()'))
        c.close()
    print('errors', errs[:5]); b.close()

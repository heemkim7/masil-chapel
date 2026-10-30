import os, sys, functools, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.abspath(__file__)); TAG=sys.argv[1]; URL=sys.argv[2] if len(sys.argv)>2 else None
if not URL:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*a): pass
    socketserver.TCPServer.allow_reuse_address=True
    srv=socketserver.ThreadingTCPServer(('127.0.0.1',18497),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start(); URL='http://127.0.0.1:18497'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for name,opts in [('desktop',dict(viewport={'width':1366,'height':820})),('mobile',p.devices['iPhone 14'])]:
        ctx=b.new_context(**opts); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.goto(URL+'/?qa=1'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready',timeout=60000); pg.wait_for_timeout(4000)
        pg.screenshot(path=f'shots/fb5/{TAG}_{name}_title.png')
        print(name,'live:',pg.evaluate("document.querySelector('#tlive')?.innerText||'(none)'"))
        pg.evaluate("G.start('테스트','basic')"); pg.wait_for_timeout(900); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(600)
        pg.evaluate("G.openGacha()"); pg.wait_for_timeout(500); pg.screenshot(path=f'shots/fb5/{TAG}_{name}_gacha.png'); pg.evaluate('G.closeModal()')
        pg.evaluate("G.openInv()"); pg.wait_for_timeout(500); pg.screenshot(path=f'shots/fb5/{TAG}_{name}_inv.png')
        print(name,'inv:',pg.evaluate("document.querySelector('#inv .panel').innerText.replace(/\\n+/g,' | ').slice(0,400)"))
        print(name,'errs',errs[:3]); ctx.close()

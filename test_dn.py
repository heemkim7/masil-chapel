import os, functools, threading, http.server, socketserver, json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.abspath(__file__))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.ThreadingTCPServer(('127.0.0.1',18494),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start(); URL='http://127.0.0.1:18494'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']); pg=b.new_page(viewport={'width':1400,'height':860}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(URL+'/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready',timeout=60000)
    pg.evaluate("G.start('스샷','basic')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(2500)
    snap=lambda: pg.evaluate("[G.wanderers.map(w=>w.name+'|'+(w.av||'')), G.cfg().shops.map(s=>s.keeper), G.cfg().npcs.map(n=>n.name)]")
    out={'start':snap()}
    for cd,nm in [('1111061500','삼청동'),('2611053000','남포동'),('1111061500','삼청동')]:
        pg.evaluate(f"G.S.dong={{cd:'{cd}',name:'{nm}'}}; G.S.visit=null; G.S.solo=false"); pg.wait_for_timeout(2500); out[nm+str(len(out))]=snap()
    w=pg.evaluate("(()=>{const w=G.wanderers[0]; G.tp(w.x+60,w.y); return w.name})()"); pg.wait_for_timeout(1500); pg.screenshot(path='shots/av/dong_npcs.png')
    pg.evaluate("P2.openShop(G.cfg().shops[2])"); pg.wait_for_timeout(500); pg.screenshot(path='shots/av/dong_shop.png')
    print(json.dumps(out,ensure_ascii=False,indent=0)); print('errs',errs)

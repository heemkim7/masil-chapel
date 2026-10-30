import os, functools, threading, http.server, socketserver, json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.abspath(__file__))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.ThreadingTCPServer(('127.0.0.1',18495),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start(); URL='http://127.0.0.1:18495'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']); pg=b.new_page(viewport={'width':1400,'height':860}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(URL+'/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready',timeout=60000)
    pg.evaluate("G.start('배치','basic')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(1500)
    pg.evaluate("G.S.solo=true; for (const d of G.cfg().decor) G.S.decorInv[d.id]=20; G.openDecor()"); pg.wait_for_timeout(300)
    pg.click('#decor-items .ditem:not([disabled])'); pg.click('#dgrid'); pg.wait_for_timeout(200); pg.evaluate('(()=>{const p=G.player;G.tp(p.x,p.y)})()'); 
    r=pg.evaluate("""() => { const w=G.world(), out=[]; let ok=0, tried=0; for (let i=0;i<40;i++){ const p=w.randomPoint(); tried++; const x=p.x+13, y=p.y+7; const before=JSON.stringify(G.S).length; G.placeAt(x,y); if (JSON.stringify(G.S).length!==before) ok++; }
      const d=G.cfg().chapel.door; G.placeAt(d.x,d.y+10); return {tried, ok}; }""")
    L=pg.evaluate("(()=>{const s=G.S; const arr=Object.values(s).find(v=>Array.isArray(v)&&v.length&&v[0]&&v[0].flip!==undefined); return arr})()")
    print(r, 'snapped', all(q['x']%40==0 and q['y']%40==0 for q in (L or [])), len(L or []), (L or [])[:3])
    pg.screenshot(path='shots/av/place.png'); print('errs',errs)

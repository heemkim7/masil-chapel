import os, sys, functools, threading, http.server, socketserver, json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.abspath(__file__)); URL=sys.argv[1] if len(sys.argv)>1 else None
if not URL:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*a): pass
    socketserver.TCPServer.allow_reuse_address=True
    srv=socketserver.ThreadingTCPServer(('127.0.0.1',18496),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start(); URL='http://127.0.0.1:18496'
DEV=['iPhone SE','iPhone 14','iPhone 14 Pro Max','Pixel 7','Galaxy S9+','iPad Mini','iPhone 14 landscape']
OV="""() => { const els=[...document.querySelectorAll('#hud button, #hud .pill, #hud [class*=btn], #joy, #chatform, #actbtn, .hudr > *')].filter(e=>{const r=e.getBoundingClientRect(), s=getComputedStyle(e); return r.width>4&&r.height>4&&s.visibility!=='hidden'&&s.display!=='none'&&e.offsetParent});
  const R=els.map(e=>[e,e.getBoundingClientRect()]), bad=[]; for(let i=0;i<R.length;i++)for(let j=i+1;j<R.length;j++){const [a,ra]=R[i],[b,rb]=R[j]; if(a.contains(b)||b.contains(a))continue; const ix=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left), iy=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top); if(ix>4&&iy>4) bad.push((a.id||a.className||a.tagName).toString().slice(0,20)+' x '+(b.id||b.className||b.tagName).toString().slice(0,20));}
  const off=R.filter(([e,r])=>r.right>innerWidth+1||r.bottom>innerHeight+1||r.left<-1||r.top<-1).map(([e])=>(e.id||e.className).toString().slice(0,20)); return {n:R.length,bad:bad.slice(0,8),off:off.slice(0,8)}; }"""
res={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for dn in DEV:
        ctx=b.new_context(**p.devices[dn]); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        t=dn.replace(' ','_'); pg.goto(URL+'/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready',timeout=60000); pg.wait_for_timeout(700)
        pg.screenshot(path=f'shots/mob/{t}_1title.png'); ng=pg.evaluate("(()=>{const r=document.querySelector('#newgame').getBoundingClientRect();return r.bottom<=innerHeight})()")
        pg.evaluate("G.start('모바일','basic')"); pg.wait_for_timeout(900); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(1500)
        pg.screenshot(path=f'shots/mob/{t}_2field.png'); ov=pg.evaluate(OV)
        pg.evaluate('Cust.open()'); pg.wait_for_timeout(700); sv=pg.evaluate("(()=>{const r=document.querySelector('#czsave').getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0})()"); pg.screenshot(path=f'shots/mob/{t}_3cust.png'); pg.evaluate('G.closeModal()')
        pg.evaluate("P2.openShop(G.cfg().shops[0])"); pg.wait_for_timeout(600); pg.screenshot(path=f'shots/mob/{t}_4shop.png'); pg.evaluate('G.closeModal()')
        res[dn]={'newgame_visible':ng,'cust_save_visible':sv,**ov,'errs':errs}; ctx.close()
print(json.dumps(res,ensure_ascii=False,indent=1))

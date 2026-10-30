import sys, os, functools, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__)); U=sys.argv[1] if len(sys.argv)>1 else None
if not U:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*a): pass
    socketserver.TCPServer.allow_reuse_address=True
    s=socketserver.ThreadingTCPServer(('127.0.0.1',18511),functools.partial(Q,directory=D)); threading.Thread(target=s.serve_forever,daemon=True).start(); U='http://127.0.0.1:18511'
DS=['1168064000','1111053000','2611051000','1168064000','1111053000']
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']); pg=b.new_page(viewport={'width':1280,'height':800}); E=[]
    pg.on('pageerror',lambda e:E.append(str(e)))
    pg.goto(U+'/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready',timeout=60000)
    pg.evaluate("G.start('측정','basic')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()')
    pg.evaluate(f"G.V.setDong('{DS[0]}')"); pg.wait_for_function('G.net.ch && G.net.status==="online"',timeout=30000)
    print('channel', pg.evaluate('G.net.ch.topic'))
    pg.evaluate("""(()=>{const P=Object.getPrototypeOf(G.net.ch);window.__n={};const o=P.send;P.send=function(m){const k=m.event||m.type;__n[k]=(__n[k]||0)+1;return o.apply(this,arguments)};const t=P.track;P.track=function(){__n.track=(__n.track||0)+1;(window.__st||=[]).push(JSON.stringify([G.net.lastPresK,G.net.lastPresSt&&[G.net.lastPresSt.x,G.net.lastPresSt.y,G.net.lastPresSt.face,G.net.lastPresSt.name],arguments[0]]).slice(0,400));(window.__st||=[]).push(this.topic+' '+new Error().stack.split(String.fromCharCode(10)).slice(1,4).join('|'));return t.apply(this,arguments)}})()""")
    pg.wait_for_timeout(1000); pg.evaluate('__n={};__st=[]'); pg.wait_for_timeout(10000); idle=pg.evaluate('__n'); print('IDLE', pg.evaluate('__st'))
    pg.evaluate('__n={}'); pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(2500); pg.keyboard.up('ArrowRight'); pg.keyboard.down('ArrowLeft'); pg.wait_for_timeout(2500); pg.keyboard.up('ArrowLeft'); mv=pg.evaluate('__n'); pg.evaluate('__n={}'); pg.wait_for_timeout(3000); after=pg.evaluate('__n')
    print(pg.evaluate('(window.__st||[]).slice(-3)'));print('idle 10s', idle, '| moving 5s', mv, '| 3s after stop', after)
    for d in DS[1:]+[DS[0]]:
        pg.evaluate(f"G.V.setDong('{d}')"); pg.wait_for_timeout(3500)
    print('after 5 switches topics', pg.evaluate('G.net.sb.getChannels().map(c=>c.topic+":"+c.state)'))
    print('errors', E[:3])

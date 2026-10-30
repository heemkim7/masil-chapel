# Render 8-direction walking strip (with name label) for each player outfit -> shots/<name>.png ; optional URL arg
import sys, os, base64, http.server, threading, functools, socketserver
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); out = sys.argv[1]; url = sys.argv[2] if len(sys.argv) > 2 else None
if not url:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', 18461), functools.partial(Q, directory=D)); threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = 'http://127.0.0.1:18461/index.html'
JS = r'''()=>{const P=G.player,F=['E','SE','S','SW','W','NW','N','NE'],W=170,H=260;const c=document.createElement('canvas');c.width=W*8;c.height=H*6;const g=c.getContext('2d');g.fillStyle='#eaf4e4';g.fillRect(0,0,c.width,c.height);
 P.equip=null;P.bubble=null;P.emote=null;[['player','basic'],['player','choir'],['player','mint'],['pastor','robe'],['choirgirl','dress'],['lamb','raincoat']].forEach(([ch,o],r)=>{P.char=ch;P.outfit=o;F.forEach((f,i)=>{P.face=f;P._lf=f;P.blendT=1;P.speedNow=1;P.dist=2*G.cfg().player.stepLen+1;P.x=i*W+W/2;P.y=r*H+H-20;P.lean=0;P.jumpT=null;P.draw(g);P.drawLabel(g);g.fillStyle='#345';g.font='bold 14px sans-serif';g.textAlign='left';g.fillText(f,i*W+6,r*H+16)})});P.char='player';P.outfit='basic';return c.toDataURL()}'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']); pg = b.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto(url); pg.wait_for_function('window.__ready', timeout=60000); pg.evaluate('localStorage.clear()'); pg.click('#newgame'); pg.wait_for_timeout(800)
    d = pg.evaluate(JS); open(f'{D}/shots/{out}.png', 'wb').write(base64.b64decode(d.split(',')[1])); print('ok'); b.close()

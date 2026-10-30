import sys, os, functools, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
from PIL import Image
LBL = sys.argv[1]; ROOT = os.path.dirname(os.path.abspath(__file__)); PORT = 18473 if LBL == 'before' else 18474
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for (W, H) in [(1920, 1080), (2560, 1440)]:
        for d in [1, 2]:
            ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=d); pg = ctx.new_page()
            if LBL == 'before': pg.route('**/js/main.js', lambda r: r.fulfill(path=ROOT + '/backup_v6_1054/main_pre_hd.js', content_type='application/javascript'))
            pg.goto(f'http://127.0.0.1:{PORT}/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000)
            pg.evaluate("G.start('스샷','basic')"); pg.wait_for_timeout(600); pg.evaluate('G.closeModal()'); pg.evaluate("G.V.setDong('1168064000')"); pg.wait_for_timeout(600); pg.evaluate('G.closeModal()')
            dr = pg.evaluate('G.cfg().chapel.door'); pg.evaluate(f"G.tp({dr['x']+700},{dr['y']+250})"); pg.wait_for_timeout(4000)
            info = pg.evaluate("(()=>{const c=document.querySelector('canvas');return [c.width,c.height,devicePixelRatio,G.cam?G.cam.z:null]})()")
            f = f'shots/pc_hd/{LBL}_{W}x{H}_dpr{d}.png'; pg.screenshot(path=f)
            im = Image.open(f); cw, ch = 360 * d, 220 * d; x0, y0 = im.width // 2 - cw // 2 + 150 * d, im.height // 2 - ch // 2 + 60 * d
            im.crop((x0, y0, x0 + cw, y0 + ch)).resize((cw * 3 // d, ch * 3 // d), Image.NEAREST).save(f.replace('.png', '_crop.png'))
            print(LBL, W, H, d, 'canvas', info); ctx.close()
    b.close()
srv.shutdown()

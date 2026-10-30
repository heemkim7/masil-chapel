# two real browsers: same 행정동 room presence + shared prayer wall + reload without ghost. URL arg = live site (default local)
import sys, os, time, functools, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__)); U = sys.argv[1] if len(sys.argv) > 1 else None
if not U:
    socketserver.TCPServer.allow_reuse_address = True
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 18455), functools.partial(Q, directory=D)); threading.Thread(target=srv.serve_forever, daemon=True).start(); U = 'http://127.0.0.1:18455/index.html'
CD = '1168064000'; tag = time.strftime('%H%M%S'); P = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pgs = []
    for i, (w, h, mob) in enumerate([(1280, 800, False), (390, 844, True)]):
        c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1); pg = c.new_page()
        pg.on('pageerror', lambda e: P.append('pageerror ' + str(e)))
        pg.goto(U); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000)
        pg.evaluate(f"G.start('{['은혜','소망'][i]}','{['basic','mint'][i]}')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()')
        pg.evaluate(f"G.V.setDong('{CD}')"); pgs.append(pg)
    A, B = pgs
    for pg in pgs: pg.wait_for_function('G.net.status==="online" && G.remotes.size>=1', timeout=30000)
    A.evaluate('G.tp(G.player.x+0,G.player.y)'); B.evaluate('G.tp(G.player.x+120,G.player.y)')
    print('presence A sees', A.evaluate('[...G.remotes.values()].map(c=>c.name)'), 'B sees', B.evaluate('[...G.remotes.values()].map(c=>c.name)'))
    A.evaluate('G.openMap("dong")'); A.wait_for_timeout(1500); cnt = A.evaluate(f'(G.net.counts||{{}})["{CD}"]'); print('lobby count', cnt)
    if cnt != 2: P.append(f'lobby count {cnt}')
    A.screenshot(path=f'{D}/shots/v6_map_dong.png'); A.evaluate('G.closeModal()')
    txt = f'[MP {tag}] 우리 동네 이웃들의 평안을 위해'
    A.evaluate('G.openBoard()'); A.wait_for_timeout(1200); A.fill('#btext', txt); A.click('#bpost'); A.wait_for_timeout(2500)
    B.evaluate('G.openBoard()'); B.wait_for_function(f'document.querySelector("#blist").textContent.includes("{tag}")', timeout=15000)
    B.locator('#blist .post', has_text=tag).locator('button').tap(); B.wait_for_timeout(1500)
    A.wait_for_timeout(1500); n = A.evaluate(f'[...document.querySelectorAll("#blist .post")].find(e=>e.textContent.includes("{tag}"))?.querySelector("button b")?.textContent')
    print('A sees amen count', n);  (n != '1') and P.append(f'amen count on A = {n}')
    A.screenshot(path=f'{D}/shots/v6_prayer_wall.png'); B.screenshot(path=f'{D}/shots/v6_mobile_prayer_wall.png')
    # private prayer must not appear to B
    A.fill('#btext', f'[MP {tag}] 비밀 기도'); A.uncheck('#bpub'); A.click('#bpost'); A.wait_for_timeout(2000)
    B.evaluate('G.V.renderPrayers()'); B.wait_for_timeout(2000)
    if B.evaluate(f'document.querySelector("#blist").textContent.includes("{tag}] 비밀")'): P.append('private prayer leaked')
    if not A.evaluate(f'document.querySelector("#blist").textContent.includes("{tag}] 비밀")'): P.append('private prayer not shown to owner')
    for pg in pgs: pg.evaluate('G.closeModal()')
    # B reloads: must resume same id, A must still see exactly one B
    bid = B.evaluate('G.net.id'); B.reload(); B.wait_for_function('window.__ready && G.net.status==="online"', timeout=60000); B.wait_for_timeout(4000)
    print('ids A-remotes', A.evaluate('[...G.remotes.keys()]'), 'B', B.evaluate('G.net.id'), 'counts', A.evaluate('G.net.counts'));print('B resumed', B.evaluate('!!window.__resumed'), 'same id', B.evaluate('G.net.id') == bid, 'A remotes', A.evaluate('G.remotes.size'))
    if B.evaluate('G.net.id') != bid or A.evaluate('G.remotes.size') != 1: P.append('ghost/duplicate after reload')
    A.screenshot(path=f'{D}/shots/v6_mp_desktop.png'); B.screenshot(path=f'{D}/shots/v6_mp_mobile.png')
    b.close()
print('PROBLEMS', P); sys.exit(1 if P else 0)

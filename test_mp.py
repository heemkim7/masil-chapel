# v6 multiplayer + movement test: two headless pages see each other move/chat/jump. URL env = live site, else local server.
import http.server, threading, functools, socketserver, sys, os
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__)); U = os.environ.get('URL'); TAG = os.environ.get('TAG', 'local')
if not U:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', 18441), functools.partial(Q, directory=D)); threading.Thread(target=srv.serve_forever, daemon=True).start()
    U = 'http://127.0.0.1:18441/index.html'
errs = []; ok = []
def check(c, m): ok.append(('PASS ' if c else 'FAIL ') + m)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pages = []
    for i, (n, o, vp, mob) in enumerate([('은혜', 'choir', (1280, 800), False), ('소망', 'mint', (390, 844), True)]):
        ctx = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        pg.goto(U); pg.wait_for_function('window.__ready', timeout=60000); pg.evaluate(f"G.start('{n}','{o}')"); pages.append(pg)
    A, B = pages
    door = A.evaluate('G.cfg().chapel.door'); x, y = door['x'], door['y'] + 160
    A.evaluate(f'G.tp({x - 90},{y})'); B.evaluate(f'G.tp({x + 90},{y})')
    for pg in pages: pg.wait_for_function("G.net.status==='online' && G.remotes.size>=1", timeout=30000)
    check(True, 'both online and see 1 remote')
    print('HUD A:', A.inner_text('#online'), '| HUD B:', B.inner_text('#online'))
    # A walks right; B should see A's x increase smoothly
    bx0 = B.evaluate('[...G.remotes.values()][0].x'); A.evaluate('G.moveDir(0,900)'); xs = []
    for _ in range(12): B.wait_for_timeout(100); xs.append(round(B.evaluate('[...G.remotes.values()][0].x')))
    print('B sees A x:', bx0, xs); check(xs[-1] - bx0 > 100, 'remote movement visible'); check(len(set(xs)) >= 6, 'interpolated (many distinct positions)')
    A.wait_for_timeout(600)
    A.fill('#chatin', '안녕하세요 같이 걸어요!'); A.press('#chatin', 'Enter')
    B.wait_for_timeout(800); bub = B.evaluate('[...G.remotes.values()][0].bubble'); check(bub == '안녕하세요 같이 걸어요!', f'B got chat bubble: {bub}')
    B.fill('#chatin', '반가워요 🙌'); B.press('#chatin', 'Enter'); B.tap('#btn-jump')
    A.wait_for_timeout(150); jt = A.evaluate('[...G.remotes.values()][0].jumpT'); check(jt is not None, f'A saw B jump (jumpT={jt})')
    A.screenshot(path=f'{D}/shots/v6_{TAG}_mp_A_desktop.png'); B.screenshot(path=f'{D}/shots/v6_{TAG}_mp_B_mobile.png')
    B.evaluate("G.emote('wave')"); A.keyboard.press('Space'); A.wait_for_timeout(250); A.screenshot(path=f'{D}/shots/v6_{TAG}_mp_A_jump_wave.png')
    # room separation: A enters the chapel -> B loses A
    A.evaluate('G.enterChapel()'); B.wait_for_function('G.remotes.size===0', timeout=15000); check(True, 'room split: B no longer sees A after A entered chapel')
    B.evaluate('G.enterChapel()'); A.wait_for_function('G.remotes.size>=1', timeout=20000); check(True, 'both inside chapel see each other')
    A.wait_for_timeout(800); A.screenshot(path=f'{D}/shots/v6_{TAG}_mp_inside.png')
    if TAG == 'local':
        # facing smoothness: diagonal-ish input near a sector edge should not flicker
        r = A.evaluate('''async()=>{G.exitChapel();const P=G.player;const seq=[];for(let i=0;i<40;i++){G.moveDir(22.5+(i%2?3:-3),60);await new Promise(r=>setTimeout(r,50));seq.push(P.face)}let ch=0;for(let i=1;i<seq.length;i++)ch+=seq[i]!==seq[i-1];return ch}''')
        check(r <= 1, f'no facing flicker near sector edge (changes={r})')
    b.close()
print('\n'.join(ok)); print('errors:', errs[:5]); sys.exit(1 if any(x.startswith('FAIL') for x in ok) or errs else 0)

# v6b: key remap (E/F interact, Space jump, Enter chat, Esc), prompt bubble, collectibles, brand. desktop + mobile
import sys, os, functools, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__)); socketserver.TCPServer.allow_reuse_address = True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 18461), functools.partial(Q, directory=D)); threading.Thread(target=srv.serve_forever, daemon=True).start()
P = []; U = 'http://127.0.0.1:18461/index.html'
def ov(pg, tag):
    r = pg.evaluate('''()=>{const v=[...document.querySelectorAll('#btn-act,#btn-jump,#emotes,#minimap,#chat,#dongbtn,#mbadge')].filter(e=>e.offsetParent&&getComputedStyle(e).display!='none').map(e=>[e.id,e.getBoundingClientRect()]);const o=[];
      for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++){const a=v[i][1],b=v[j][1];if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)o.push(v[i][0]+'/'+v[j][0])}return o}''')
    r and P.append(f'[{tag}] overlap {r}')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for tag, w, h, mob in [('desk', 1280, 800, False), ('p390', 390, 844, True)]:
        c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1); pg = c.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and 'favicon' not in m.text and errs.append(m.text))
        pg.goto(U); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000); pg.wait_for_timeout(1200)
        pg.screenshot(path=f'{D}/shots/v6b_{tag}_title_brand.png')
        if 'ㅇㅇ동' in pg.content() or '마실채플' not in pg.title(): P.append(f'[{tag}] brand not applied')
        pg.evaluate("G.start('테스트','basic')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()'); pg.evaluate("G.V.setDong('1168064000')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()')
        if '마실채플' not in pg.inner_text('#dongbtn'): P.append(f'[{tag}] HUD name missing: ' + pg.inner_text('#dongbtn'))
        d = pg.evaluate('G.cfg().chapel.door'); pg.evaluate(f"G.tp({d['x']},{d['y']+60})"); pg.wait_for_timeout(500)
        pg.screenshot(path=f'{D}/shots/v6b_{tag}_door_prompt.png')
        lab = pg.inner_text('#btn-act'); lab != '들어가기' and P.append(f'[{tag}] act label {lab}')
        if mob: pg.tap('#btn-act', force=True)
        else: pg.keyboard.press('KeyE')
        pg.wait_for_timeout(1500); pg.evaluate('G.closeModal()')
        sc = pg.evaluate('G.scene'); sc != 'inside' and P.append(f'[{tag}] E did not enter ({sc})')
        for where in ['inside', 'field']:
            if mob: pg.tap('#btn-jump', force=True)
            else: pg.keyboard.press('Space')
            pg.wait_for_timeout(120); j = pg.evaluate('G.player.jumpT'); (j is None) and P.append(f'[{tag}] Space no jump in {where}')
            pg.wait_for_timeout(900)
            if where == 'inside':
                ov(pg, tag + ' inside'); dd = pg.evaluate('G.cfg().interior.door'); pg.evaluate(f"G.tp({dd['x']},{dd['y']-40})"); pg.wait_for_timeout(500)
                pg.screenshot(path=f'{D}/shots/v6b_{tag}_exit_prompt.png')
                if mob: pg.tap('#btn-act', force=True)
                else: pg.keyboard.press('KeyF')
                pg.wait_for_timeout(1500); sc = pg.evaluate('G.scene'); sc != 'field' and P.append(f'[{tag}] F did not exit ({sc}, label {pg.inner_text("#btn-act")})')
        if not mob:  # focused button + Space must not also click it
            pg.focus('#btn-menu'); pg.keyboard.press('Space'); pg.wait_for_timeout(300)
            pg.evaluate('!!document.querySelector("#dialog").offsetParent') and P.append('[desk] Space on focused button triggered it')
            pg.keyboard.press('Enter'); pg.wait_for_timeout(200); pg.evaluate('document.activeElement.id') != 'chatin' and P.append('[desk] Enter did not focus chat')
            pg.keyboard.type('안녕 e f'); pg.keyboard.press('Space'); pg.wait_for_timeout(200)
            (pg.evaluate('G.scene') != 'field' or pg.evaluate('G.player.jumpT') is not None) and P.append('[desk] keys leaked while typing')
            pg.keyboard.press('Escape')
        # collectibles: walk onto one
        pg.wait_for_timeout(300); n0 = pg.evaluate('G.C.items.length'); c0 = pg.evaluate('G.S.coins')
        it = pg.evaluate('(()=>{const p=G.player;return [...G.C.items].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]})()')
        print(tag, 'items', n0, 'nearest', it and it['kd']['name'])
        if not n0: P.append(f'[{tag}] no collectibles')
        else:
            pg.evaluate(f"G.tp({it['x']},{it['y']+150})"); pg.wait_for_timeout(400); pg.screenshot(path=f'{D}/shots/v6b_{tag}_collectibles.png')
            pg.evaluate(f"G.tp({it['x']},{it['y']})"); pg.wait_for_timeout(250); pg.screenshot(path=f'{D}/shots/v6b_{tag}_collect_pop.png')
            c1 = pg.evaluate('G.S.coins'); c1 - c0 != it['kd']['gold'] and P.append(f'[{tag}] gold {c0}->{c1}')
            pg.evaluate('G.S.col.gold=299'); it2 = pg.evaluate('G.C.items[0]'); pg.evaluate(f"G.tp({it2['x']},{it2['y']})"); pg.wait_for_timeout(250)
            pg.evaluate('G.S.col.gold') != 300 and P.append(f'[{tag}] daily cap broken {pg.evaluate("G.S.col.gold")}')
            pg.wait_for_timeout(3300); saved = pg.evaluate('JSON.stringify(JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>localStorage.getItem(k).includes(\'"col"\')))).col.gold)')
            saved != '300' and P.append(f'[{tag}] col not persisted {saved}')
        ov(pg, tag + ' field'); errs and P.append(f'[{tag}] errors {errs[:3]}')
        c.close()
    b.close()
print('PROBLEMS', P); sys.exit(1 if P else 0)

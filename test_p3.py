import sys, os, functools, threading, http.server, socketserver, json
from playwright.sync_api import sync_playwright
LBL = sys.argv[1]; URL = sys.argv[2] if len(sys.argv) > 2 else None; ROOT = os.path.dirname(os.path.abspath(__file__))
if not URL:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 18493), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start(); URL = 'http://127.0.0.1:18493'
O = f'shots/p3/{LBL}_'; R = {}
def run(p, mob):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(**(p.devices['iPhone 13'] if mob else {'viewport': {'width': 1600, 'height': 900}})) if not mob else b.new_context(viewport={'width': 844, 'height': 390}, is_mobile=True, has_touch=True, device_scale_factor=2)
    pg = ctx.new_page(); errs = []; t = 'm_' if mob else 'd_'
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(URL + '/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000)
    pg.evaluate("G.start('스샷','basic')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(2000)
    pg.screenshot(path=O+t+'village.png')
    # map via Tab
    pg.keyboard.press('Tab'); pg.wait_for_timeout(700); R[t+'tab_open'] = pg.evaluate('G.modal'); R[t+'focus'] = pg.evaluate('document.activeElement.tagName'); pg.screenshot(path=O+t+'map.png')
    pg.keyboard.press('Tab'); pg.wait_for_timeout(300); R[t+'tab_close'] = pg.evaluate('G.modal')
    pg.keyboard.press('KeyJ'); pg.wait_for_timeout(400); pg.keyboard.press('Tab'); pg.wait_for_timeout(500); R[t+'map_from_missions'] = pg.evaluate('G.modal'); pg.screenshot(path=O+t+'map_over_missions.png'); pg.keyboard.press('Escape')
    # chapel exterior
    d = pg.evaluate('G.cfg().chapel.door')
    # collision: walk into chapel from the side + debug footprints
    pg.evaluate("window.DEBUG_COL=true"); bx = pg.evaluate('G.world().chapelBox'); R[t+'chapel_box'] = {k: round(v) for k, v in bx.items()}
    pg.evaluate(f"G.tp({bx['x']+bx['w']*0.8},{bx['y']+bx['h']+60})"); pg.wait_for_timeout(300); pg.keyboard.down('ArrowUp'); pg.wait_for_timeout(1500); pg.keyboard.up('ArrowUp')
    py = pg.evaluate('G.player.y'); R[t+'blocked_by_chapel'] = py > bx['y']+bx['h']-2; pg.screenshot(path=O+t+'collision_debug.png')
    s0 = pg.evaluate('G.cfg().props.find(p=>p.r>=100)'); pg.evaluate(f"G.tp({s0['x']},{s0['y']+50})"); pg.wait_for_timeout(200); pg.keyboard.down('ArrowUp'); pg.wait_for_timeout(1200); pg.keyboard.up('ArrowUp')
    R[t+'blocked_by_building'] = pg.evaluate('G.player.y') > s0['y']-10; pg.screenshot(path=O+t+'collision_building.png'); pg.evaluate("window.DEBUG_COL=false")
    for tr in (1,2,3,4):
        pg.evaluate(f"P2.setTier&&P2.setTier({tr})"); pg.evaluate(f"G.tp({d['x']},{d['y']+160})"); pg.wait_for_timeout(700); pg.screenshot(path=O+t+f'chapel_tier{tr}.png')
    pg.evaluate(f"G.tp({d['x']},{d['y']+120})"); pg.wait_for_timeout(1500); pg.screenshot(path=O+t+'chapel_ext.png')
    pg.evaluate(f"G.tp({d['x']},{d['y']+40})"); pg.wait_for_timeout(400)
    x0 = pg.evaluate('G.player.y'); pg.keyboard.press('ShiftLeft'); pg.wait_for_timeout(100); R[t+'shift_jump'] = pg.evaluate('G.player.jumpT!=null')
    pg.wait_for_timeout(600); pg.keyboard.press('Space'); pg.wait_for_timeout(1200); R[t+'space_enter'] = pg.evaluate('G.scene')
    pg.evaluate('G.closeModal()'); pg.screenshot(path=O+t+'interior.png')
    o = pg.evaluate('G.cfg().interior.offering'); pg.evaluate(f"G.tp({o['x']},{o['y']+50})"); pg.wait_for_timeout(800); pg.screenshot(path=O+t+'offering.png')
    pg.evaluate('G.enterChapel(true)'); pg.wait_for_timeout(300)
    # pastor dialog via Space
    pg.evaluate("(()=>{const n=G.inNpcs().find(n=>n.id==='pastor'); if(n) G.tp(n.x+40,n.y+20)})()"); pg.wait_for_timeout(500)
    pg.keyboard.press('Space');
    try: pg.wait_for_function('!!G.modal', timeout=3000)
    except Exception: pass
    pg.wait_for_timeout(120); R[t+'dlg_open'] = pg.evaluate('G.modal'); pg.screenshot(path=O+t+'dialog_typing.png')
    pg.keyboard.press('Space'); pg.wait_for_timeout(150); R[t+'dlg_after1'] = pg.evaluate('G.modal'); pg.screenshot(path=O+t+'dialog_full.png')
    pg.keyboard.press('KeyE'); pg.wait_for_timeout(300); R[t+'dlg_after2'] = pg.evaluate('G.modal')
    pg.evaluate('G.closeModal()'); pg.focus('#chatin'); pg.keyboard.press('Space'); pg.keyboard.press('Tab'); R[t+'chat_keys_modal'] = pg.evaluate('G.modal'); pg.evaluate('document.activeElement.blur()')
    pg.evaluate("G.player.say('안녕하세요! 오늘 날씨가 정말 좋네요. 예배당에서 같이 찬양하고 기도해요 우리 모두 함께해요~')"); pg.wait_for_timeout(400); pg.screenshot(path=O+t+'bubble.png')
    pg.keyboard.press('KeyH'); pg.wait_for_timeout(400); pg.screenshot(path=O+t+'help.png'); pg.keyboard.press('Escape')
    pg.evaluate("G.exitChapel()"); pg.wait_for_timeout(300)
    R[t+'errors'] = errs[:6]; b.close()
with sync_playwright() as p:
    run(p, False); run(p, True)
print(json.dumps(R, ensure_ascii=False, indent=0))

import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'https://maeul-chapel-25d.vercel.app'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    errs = []; pgs = []
    for nm in ['층A', '층B']:
        c = b.new_context(viewport={'width': 900, 'height': 640}); pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL + '/?t=fl'); pg.wait_for_function('window.__ready', timeout=60000); pg.evaluate(f"G.start('{nm}','basic')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()'); pgs.append(pg)
    for pg in pgs: pg.evaluate('G.enterChapel(true)')
    pgs[0].wait_for_timeout(6000)
    seen = lambda pg: pg.evaluate("[...G.remotes.values()].map(c=>[c.name,c.fl])")
    r = {'floors': pgs[0].evaluate("(G.inside.I.floors||[]).map(f=>f.id)"), 'A_1F': seen(pgs[0]), 'B_1F': seen(pgs[1])}
    up = next((f for f in r['floors'] if f != '1F'), None)
    if up:
        pgs[1].evaluate(f"G.goFloor('{up}')"); pgs[1].wait_for_timeout(4000)
        r['A_sees_B_fl'] = seen(pgs[0]); r['A_draws_B'] = pgs[0].evaluate("[...G.remotes.values()].filter(c=>!c.fl||c.fl===G.inside.floor).length")
        pgs[0].evaluate(f"G.goFloor('{up}')"); pgs[0].wait_for_timeout(3000)
        r['A_on_up_draws_B'] = pgs[0].evaluate("[...G.remotes.values()].filter(c=>!c.fl||c.fl===G.inside.floor).length")
        pgs[0].screenshot(path='/workspace/shot_floor.png')
    r['errs'] = errs; print(json.dumps(r, ensure_ascii=False)); b.close()

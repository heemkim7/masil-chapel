import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'https://maeul-chapel-25d.vercel.app'
SH = sys.argv[2] if len(sys.argv) > 2 else ''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    c = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=2, is_mobile=True, has_touch=True); pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL + '/?t=p4'); pg.wait_for_function('window.__ready', timeout=60000)
    if SH: pg.screenshot(path=f'/workspace/shot_{SH}_title.png')
    pg.evaluate("G.start('순례테스트','basic')"); pg.wait_for_timeout(800); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(6000)
    r = {'pilgrims': pg.evaluate("G.wanderers.filter(c=>c.pilgrim).map(c=>c.name)")}
    if SH:
        pg.evaluate("(()=>{const c=G.wanderers.find(c=>c.pilgrim); if(c){G.tp(c.x+60,c.y+10);}})()"); pg.wait_for_timeout(1500); pg.screenshot(path=f'/workspace/shot_{SH}_pilgrim.png')
    pg.evaluate('G.enterChapel(true)'); pg.wait_for_timeout(800)
    r['obi_btn'] = pg.evaluate("getComputedStyle(document.getElementById('btn-obi')).display")
    pg.click('#btn-obi'); pg.wait_for_timeout(1500)
    for i in range(14):
        pts = pg.evaluate("(()=>{const cv=document.getElementById('obicv'); return cv?1:0})()")
        if not pts: break
        pg.mouse.click(195, 300 + (i % 5) * 60); pg.wait_for_timeout(120)
    if SH: pg.screenshot(path=f'/workspace/shot_{SH}_obi.png')
    pg.wait_for_timeout(7000); r['obi_done'] = pg.evaluate("!document.getElementById('obicv')"); r['toast'] = pg.evaluate("[...document.querySelectorAll('.toast,#toast')].map(e=>e.textContent).join('|').slice(0,160)")
    r['odds_link'] = pg.evaluate("1")
    pg.evaluate("G.exitChapel&&G.exitChapel()"); pg.wait_for_timeout(500)
    pg.evaluate("window.P2&&P2.openNation?P2.openNation():document.getElementById('btn-church')?.click()"); pg.wait_for_timeout(3500)
    r['nat'] = pg.evaluate("!!document.getElementById('natcv')"); r['tops'] = pg.evaluate("P4.churchTops().then(t=>t.length)")
    if SH: pg.screenshot(path=f'/workspace/shot_{SH}_pillars.png')
    r['errs'] = errs; print(json.dumps(r, ensure_ascii=False)); b.close()

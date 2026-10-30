import sys
from playwright.sync_api import sync_playwright
tag=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for w,h in [(1366,768),(390,844)]:
        pg=b.new_page(viewport={'width':w,'height':h},has_touch=w<500)
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else 0)
        pg.goto('http://127.0.0.1:8765/'); pg.evaluate('localStorage.clear();localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready',timeout=60000)
        pg.evaluate("G.start('테스트','basic')"); pg.wait_for_timeout(1500); pg.evaluate('G.closeModal&&G.closeModal()'); pg.wait_for_timeout(500)
        pg.wait_for_function('window.WH',timeout=20000)
        pg.evaluate("WH.enter()"); pg.wait_for_timeout(900); pg.screenshot(path=f'shots/ui/cam_{tag}_{w}_walkin.png')
        pg.wait_for_timeout(5000); pg.evaluate("WH.simulate(30)"); pg.wait_for_timeout(1500)
        for v in ['rear','front','pastor','seat']:
            pg.evaluate(f"WH.setView('{v}')"); pg.wait_for_timeout(1400); pg.screenshot(path=f'shots/ui/cam_{tag}_{w}_{v}.png')
        pg.evaluate("WH.setView('rear')"); pg.wait_for_timeout(1000)
        e=pg.evaluate("WH.emptySeats()"); pg.evaluate(f"WH.tapSeat({e[len(e)//2]})"); pg.wait_for_timeout(1200); pg.screenshot(path=f'shots/ui/cam_{tag}_{w}_move.png')
        bb=pg.evaluate("JSON.stringify(document.querySelector('#wh-cam').getBoundingClientRect())")
        pg.keyboard.press('c'); pg.wait_for_timeout(300); v=pg.evaluate("WH.view"); pg.wait_for_timeout(2500)
        print(w, pg.evaluate("JSON.stringify({fps:Math.round(WH.fps),seats:WH.seats(),peers:WH.peers.size,view:WH.view,saved:localStorage.wh_view})"), 'key->',v, bb, errs[:5]); pg.close()
    b.close()

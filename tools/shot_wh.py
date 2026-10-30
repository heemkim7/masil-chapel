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
        pg.evaluate("WH.enter()"); pg.wait_for_timeout(1500); pg.evaluate("WH.simulate(30)"); pg.wait_for_timeout(4000)
        pg.screenshot(path=f'shots/ui/wh_{tag}_{w}.png')
        pg.evaluate("WH.act('amen')"); pg.wait_for_timeout(700); pg.screenshot(path=f'shots/ui/wh_{tag}_{w}_amen.png')
        pg.evaluate("WH.setWeather('rainnight')"); pg.wait_for_timeout(1500); pg.screenshot(path=f'shots/ui/wh_{tag}_{w}_rain.png')
        pg.evaluate("WH.sheet('time')"); pg.wait_for_timeout(600); pg.screenshot(path=f'shots/ui/wh_{tag}_{w}_sheet.png')
        print(w, pg.evaluate("JSON.stringify({fps:WH.fps,seats:WH.seats(),peers:WH.peers.size})"), errs[:5]); pg.close()
    b.close()

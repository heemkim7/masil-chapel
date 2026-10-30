import sys
from playwright.sync_api import sync_playwright
tag=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for w,h in [(1366,768),(390,844)]:
        pg=b.new_page(viewport={'width':w,'height':h},has_touch=w<500)
        pg.goto('http://127.0.0.1:8765/'); pg.evaluate('localStorage.clear();localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready',timeout=60000)
        pg.evaluate("G.start('테스트','basic')"); pg.wait_for_timeout(1500); pg.evaluate('G.closeModal&&G.closeModal()'); pg.wait_for_timeout(500)
        pg.evaluate("G.enterChapel ? G.enterChapel() : 0"); pg.wait_for_timeout(2500)
        pg.evaluate("window.P4&&P4.start&&P4.start(true)"); pg.wait_for_timeout(1200)
        pg.screenshot(path=f'shots/ui/in_{tag}_{w}.png'); pg.close()
    b.close()

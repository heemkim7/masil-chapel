from playwright.sync_api import sync_playwright
def boot(pg,name):
    pg.goto('http://127.0.0.1:8765/'); pg.evaluate('localStorage.clear();localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready',timeout=60000)
    pg.evaluate(f"G.start('{name}','basic')"); pg.wait_for_timeout(1500); pg.evaluate('G.closeModal&&G.closeModal()'); pg.wait_for_function('window.WH',timeout=20000)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    # dawn + spot + throttled mobile fps
    pg=b.new_page(viewport={'width':390,'height':844},has_touch=True,device_scale_factor=3); boot(pg,'모바일')
    cdp=pg.context.new_cdp_session(pg); cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
    pg.evaluate("WH.enter({mode:'dawn'})"); pg.wait_for_timeout(1500); pg.evaluate("WH.simulate(30)"); pg.wait_for_timeout(10000)
    print('mobile x4 dawn fps', pg.evaluate("WH.fps")); pg.screenshot(path='shots/ui/wh_c_dawn390.png')
    pg.evaluate("WH.enter({mode:'service'})"); pg.wait_for_timeout(6000); print('mobile x4 service fps', pg.evaluate("WH.fps"))
    pg.evaluate("WH.close();WH.spot('roof')"); pg.wait_for_timeout(2500); pg.screenshot(path='shots/ui/wh_c_roof390.png'); pg.close()
    # realtime two contexts
    c1=b.new_context(viewport={'width':1366,'height':768}); c2=b.new_context(viewport={'width':1366,'height':768})
    a=c1.new_page(); boot(a,'가나'); z=c2.new_page(); boot(z,'다라')
    a.evaluate("WH.enter()"); z.evaluate("WH.enter()"); a.wait_for_timeout(9000)
    print('peers a,z', a.evaluate("WH.peers.size"), z.evaluate("WH.peers.size"))
    z.evaluate("WH.act('amen')"); a.wait_for_timeout(2000); print('a log', a.evaluate("JSON.stringify([...WH.peers.values()].map(q=>[q.name,q.st]))"))
    a.screenshot(path='shots/ui/wh_c_rt.png'); b.close()

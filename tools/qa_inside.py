import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765'; TAG = sys.argv[2] if len(sys.argv) > 2 else 'a'
out = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for vw, vh, t in [(1280, 800, 'pc'), (390, 844, 'mo')]:
        ctx = b.new_context(viewport={'width': vw, 'height': vh}, is_mobile=t == 'mo', has_touch=t == 'mo'); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL + '/'); pg.evaluate('localStorage.clear(); localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000)
        pg.evaluate("G.start('큐에이','basic')"); pg.wait_for_timeout(900); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(800)
        pg.evaluate("G.enterChapel(true)"); pg.wait_for_timeout(1200)
        for fl in ['1F', '2F', 'B1']:
            pg.evaluate(f"G.goFloor('{fl}')"); pg.wait_for_timeout(1500)
            out[f'{t}/{fl}'] = pg.evaluate("({z:G.cam.z, ph:G.player.drawH, W:G.inside.W})")
            pg.screenshot(path=f'shots/q11/{TAG}_{t}_{fl}.png')
        pg.evaluate("G.exitChapel&&G.exitChapel(true)"); pg.wait_for_timeout(800)
        pg.evaluate("P2.openLevels()"); pg.wait_for_timeout(900); out[f'{t}/lv'] = pg.evaluate("(()=>{const m=[...document.querySelectorAll('.modal')].find(e=>getComputedStyle(e).display!='none'&&e.getBoundingClientRect().width>2);const p=m&&(m.querySelector('.panel')||m);const r=p&&p.getBoundingClientRect();return m&&[m.id,r.width|0,r.height|0]})()")
        pg.screenshot(path=f'shots/q11/{TAG}_{t}_lv.png'); pg.evaluate('G.closeModal()'); pg.wait_for_timeout(300)
        pg.evaluate("document.querySelector('#btn-inv').click()"); pg.wait_for_timeout(600); pg.evaluate("[...document.querySelectorAll('button')].find(b=>/캐릭터 꾸미기/.test(b.textContent))?.click()"); pg.wait_for_timeout(1500)
        pg.screenshot(path=f'shots/q11/{TAG}_{t}_cz.png'); pg.evaluate('G.closeModal()')
        pg.evaluate("G.openGacha(); setTimeout(()=>G.doRoll&&G.doRoll(),200)"); pg.wait_for_timeout(2200); pg.screenshot(path=f'shots/q11/{TAG}_{t}_gacha.png')
        out[f'{t}/err'] = errs[:5]; ctx.close()
print(json.dumps(out, ensure_ascii=False))

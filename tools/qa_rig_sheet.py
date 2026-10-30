import sys, base64
from playwright.sync_api import sync_playwright
URL = sys.argv[1]; TAG = sys.argv[2]
CODES = sys.argv[4].split(',') if len(sys.argv) > 4 else ['f.1.5.2.0.basic.c06.c16.-.-', 'f.1.3.4.0.mint.c09.-.-.-', 'm.1.5.3.0.basic.c03.-.-.-', 'm.1.2.5.0.mint.c00.-.-.-']
JS = r"""async (codes) => { const AV = window.AV, A = await (await fetch('assets/characters/atlas.json')).json();
 const keys = c => { const a = AV.parse(c), sh = AV.GENDER[a.g].char + '/' + AV.OUTFITS[a.g].find(x => x[0] === a.o)[2]; return Object.keys(A.sheets[sh].cells).filter(f => f.startsWith('walk')).map(f => sh + '/' + f); };
 for (const c of codes) for (const k of keys(c)) { const t0 = Date.now(); while (!AV.frame({ av: c }, k) && Date.now() - t0 < 5000) await new Promise(r => setTimeout(r, 50)); }
 const s = .5, W = A.frameW * s, H = A.frameH * s, cols = 22, cv = document.createElement('canvas'); cv.width = cols * W; cv.height = codes.length * H; const g = cv.getContext('2d'); g.fillStyle = '#eef3ea'; g.fillRect(0, 0, cv.width, cv.height);
 codes.forEach((c, r) => { keys(c).forEach((k, i) => { const im = AV.frame({ av: c }, k), R = AV.rig()[k]; g.drawImage(im, i * W, r * H, W, H); g.strokeStyle = 'rgba(255,0,0,.6)'; g.beginPath(); g.moveTo(i * W, r * H + R[2] * s); g.lineTo(i * W + W, r * H + R[2] * s); g.stroke(); }); });
 return cv.toDataURL(); }"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']); pg = b.new_page(); pg.goto(URL + '/?qa=1'); NR = len(sys.argv) > 3 and sys.argv[3] == '1'
    if NR: pg.evaluate('window.__noRig = 1')
    pg.wait_for_function('window.AV && window.AV.rig && window.AV.rig()', timeout=30000)
    d = pg.evaluate(JS, CODES); open(f'shots/rig_{TAG}.png', 'wb').write(base64.b64decode(d.split(',')[1])); b.close()

# Real in-game render: hold arrow keys, screenshot frames around the camera-followed player, build contact sheets.
import sys, os, io
from playwright.sync_api import sync_playwright
from PIL import Image
URL = sys.argv[1]; OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
CODE = sys.argv[3] if len(sys.argv) > 3 else 'm.1.0.3.3.basic.-.-.-.-'
def run(b, w, h, tag, inside=False):
    c = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if w < 800 else 1, has_touch=w < 800); pg = c.new_page(); pg.goto(URL, timeout=90000)
    pg.evaluate('localStorage.clear();localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready', timeout=90000)
    pg.evaluate("G.start('힘킴','basic')"); pg.wait_for_timeout(1500); pg.evaluate('G.closeModal&&G.closeModal()')
    pg.evaluate(f"G.AV.apply(G.player,'{CODE}');G.AV.preload(G.player._avp)")
    if inside: pg.evaluate("G.enterChapel()"); pg.wait_for_timeout(1500)
    pg.wait_for_timeout(800); rows = []
    for key in ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']:
        pg.keyboard.down(key); pg.wait_for_timeout(350); fr = []
        for i in range(8):
            pg.wait_for_timeout(70); s = Image.open(io.BytesIO(pg.screenshot())); W, H = s.size; z = W / w
            fr.append(s.crop((int(W/2 - 70*z), int(H/2 - 150*z), int(W/2 + 70*z), int(H/2 + 40*z))).resize((210, 285)))
        pg.keyboard.up(key); rows.append(fr)
    sh = Image.new('RGB', (210 * 8, 285 * 4), 'white')
    for r, fr in enumerate(rows):
        for i, f in enumerate(fr): sh.paste(f, (i * 210, r * 285))
    sh.save(f'{OUT}/live_{tag}.png'); c.close()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    run(b, 1280, 800, 'village_desktop'); run(b, 390, 844, 'village_mobile'); run(b, 1280, 800, 'chapel_desktop', inside=True)

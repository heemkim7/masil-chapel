# Measures the ACTUAL drawn bbox per walk frame via Char._layer (same code path as the live render).
import json, sys, os
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/workspace/qa_walk/out'
os.makedirs(OUT, exist_ok=True)
JS = r"""async ({codes}) => {
 const G = window.G, P = G.player, Ch = P.constructor, SP = P.sprites; const DIRS = ['E','SE','S','SW','W','NW','N','NE'];
 const cv = document.createElement('canvas'); cv.width = 260; cv.height = 300; const g = cv.getContext('2d', {willReadFrequently:true});
 const res = []; const sheets = {};
 for (const code of codes) { const c = new Ch(SP, 'player', 'basic', 130, 270, {cfg: P.cfg, drawH: 150}); G.AV.apply(c, code); G.AV.preload(c._avp);
   for (let w = 0; w < 60 && !G.AV.frame(c, SP.get(c.char, c.outfit, 'walk', 'N').frames[0]); w++) await new Promise(r => setTimeout(r, 50));
   const sh = document.createElement('canvas'); sh.width = 8 * 130; sh.height = 6 * 150; const sg = sh.getContext('2d'); sg.fillStyle = '#9c6'; sg.fillRect(0, 0, sh.width, sh.height);
   for (let di = 0; di < 8; di++) { const d = DIRS[di]; const sel = SP.get(c.char, c.outfit, 'walk', d);
     for (let fi = 0; fi < sel.frames.length; fi++) { const key = sel.frames[fi]; window.__rigLog = []; window.__hairN = 0; G.AV._cc && G.AV._cc(); window.AV.frame(c, key); const hn = window.__hairN; // compose fresh with log
       g.clearRect(0, 0, 260, 300); const pz = {key, flip: sel.flip, sx: 1, sy: 1, lift: 0, dir: sel.dir}; c._layer(g, pz, 1);
       const D = g.getImageData(0, 0, 260, 300).data; let t = 1e9, b = -1, l = 1e9, r = -1; for (let y = 0; y < 300; y++) for (let x = 0; x < 260; x++) if (D[(y*260+x)*4+3] > 40) { if (y<t)t=y; if(y>b)b=y; if(x<l)l=x; if(x>r)r=x; }
       // body-only (no hair pieces / cosmetics): base sprite through same transform
       const bc = document.createElement('canvas'); bc.width = 260; bc.height = 300; const bg = bc.getContext('2d', {willReadFrequently:true}); const av = c.av; c.av = null; c._layer(bg, pz, 1); c.av = av;
       const E = bg.getImageData(0, 0, 260, 300).data; let bt = 1e9, bb = -1; for (let y = 0; y < 300; y++) for (let x = 0; x < 260; x++) if (E[(y*260+x)*4+3] > 40) { if (y<bt)bt=y; if(y>bb)bb=y; }
       res.push({code, d, fi, key, h: b - t + 1, bodyH: bb - bt + 1, top: t, bot: b, hair: G.AV._cc ? hn : null});
       if (fi < 6) sg.drawImage(cv, 0, 0, 260, 300, di * 130, fi * 150, 130, 150); } }
   sheets[code] = sh.toDataURL(); }
 window.__rigLog = null; return {res, sheets}; }"""
CODES = [f'{g}.{a}.{s}.{hs}.{hc}.{o}.-.-.-.-' for g, hss, os_ in [('f', range(8), ['basic','choir','mint','sky']), ('m', range(7), ['basic','mint','navy'])] for hs in hss for (a, s, hc, o) in [(1, hs % 6, (hs * 3) % 9, os_[hs % len(os_)])]]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1280, 'height': 800}); pg.goto(URL, timeout=90000)
    pg.evaluate('localStorage.clear();localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready', timeout=90000)
    pg.evaluate("G.start('힘킴','basic')"); pg.wait_for_timeout(2500)
    R = pg.evaluate(JS, {'codes': CODES})
    import base64
    for i, (k, v) in enumerate(R['sheets'].items()):
        if i < 6 or k.startswith('f.1.3.3') : open(f'{OUT}/rig_{k}.png', 'wb').write(base64.b64decode(v.split(',')[1]))
    res = R['res']; json.dump(res, open(f'{OUT}/walk.json', 'w'))
    bad = []; spreads = {}
    for code in CODES:
        rs = [r for r in res if r['code'] == code]; bh = [r['bodyH'] for r in rs]; fh = [r['h'] for r in rs]; spreads[code] = (min(bh), max(bh), min(fh), max(fh))
        if max(bh) - min(bh) > 1: bad.append((code, 'body', min(bh), max(bh)))
        if max(fh) - min(fh) > 1: bad.append((code, 'full', min(fh), max(fh)))
        hz = [r for r in rs if r['hair'] is not None and r['hair'] != (0 if code.split('.')[3] == '0' else 1)]
        if hz: bad.append((code, 'hairN', [(r['d'], r['fi'], r['hair']) for r in hz][:3]))
        hb = [r for r in rs if r['hair'] is not None and r['hair'] > 1]
        if hb: bad.append((code, 'hair layers', [(r['d'], r['fi'], r['hair']) for r in hb][:4]))
    allh = [r['bodyH'] for r in res]
    print('bodyH range all', min(allh), max(allh)); print('per-combo worst', sorted(spreads.items(), key=lambda kv: kv[1][2]-kv[1][3])[:5])
    print('FAIL' if bad else 'PASS', len(bad), bad[:10]); b.close(); sys.exit(1 if bad else 0)

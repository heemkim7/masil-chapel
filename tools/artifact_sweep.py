# v14 automated avatar artifact detector: EVERY gender × age × skin × hairstyle × hair colour × outfit × walk frame
# (5 native directions; E/SE/NE are pixel mirrors of W/SW/NW so they share the result).  Each composed frame is compared to an
# untinted reference of the same body/hair/age (window.__noTint) and flagged for:
#   speck  – recolour inconsistency: 4-neighbours with near-identical base colour (Δ<14) that end up far apart (Δ>48), clusters ≥3px
#   hole   – interior alpha holes: alpha<200 inside the filled silhouette (2px inset), clusters ≥3px
#   halo   – luminance ridge (bright/dark 1–2px line) present in the output but not in the reference, clusters ≥4px
# usage: python3 tools/artifact_sweep.py URL [workers] [out.json]
import json, sys, time, itertools
from multiprocessing import Process, Queue
from playwright.sync_api import sync_playwright
URL = sys.argv[1]; NW = int(sys.argv[2]) if len(sys.argv) > 2 else 6; OUT = sys.argv[3] if len(sys.argv) > 3 else '/workspace/qa_walk/sweep.json'
JS = r"""async ({codes}) => {
 const AV = window.G.AV, AT = window.__atlas || null; const W = 200, H = 284;
 const sheet = k => AV.OUTFITS[k.g].find(x => x[0] === k.o)[2];
 const SP = window.G.player.sprites; const keys = (ch, of) => ['N','NW','S','SW','W'].flatMap(d => SP.get(ch, of, 'walk', d).frames);
 const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d', {willReadFrequently: true});
 const px = c => { g.clearRect(0, 0, W, H); g.drawImage(c, 0, 0); return g.getImageData(0, 0, W, H).data; };
 window.__refc = window.__refc || new Map();
 const clusters = (F, minN) => { const seen = new Uint8Array(W * H), out = []; for (let j = 0; j < W * H; j++) { if (!F[j] || seen[j]) continue; const st = [j]; seen[j] = 1; let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
   while (st.length) { const k = st.pop(); n++; const x = k % W, y = (k / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
     for (const d of [1, -1, W, -W, W + 1, W - 1, -W + 1, -W - 1]) { const q = k + d; if (q >= 0 && q < W * H && F[q] && !seen[q] && Math.abs((q % W) - x) <= 1) { seen[q] = 1; st.push(q); } } }
   if (n >= minN) out.push([n, x0, y0, x1, y1]); } return out; };
 const NB = [1, -1, W, -W, W + 1, W - 1, -W + 1, -W - 1];
 const iso = (D, j) => { const i = j * 4; let far = 0, mr = 0, mg = 0, mb = 0; const fs = [];
   for (const d of NB) { const q = (j + d) * 4; if (D[q + 3] < 200) return false; if (Math.max(Math.abs(D[i] - D[q]), Math.abs(D[i + 1] - D[q + 1]), Math.abs(D[i + 2] - D[q + 2])) > 48) { far++; fs.push(q); mr += D[q]; mg += D[q + 1]; mb += D[q + 2]; } }
   if (far < 6) return false; mr /= far; mg /= far; mb /= far; for (const q of fs) if (Math.max(Math.abs(D[q] - mr), Math.abs(D[q + 1] - mg), Math.abs(D[q + 2] - mb)) > 26) return false; return true; };
 const lum = (D, j) => D[j * 4] * .3 + D[j * 4 + 1] * .59 + D[j * 4 + 2] * .11;
 const res = [];
 for (const code of codes) { const a = AV.parse(code); const ch = AV.GENDER[a.g].char, of = sheet(a); if (!window.__dbg) { window.__dbg = 1; console.log('K', ch, of, keys(ch, of).length); }
   const me = {av: code, _avp: a}; AV.preload(a);
   for (const key of keys(ch, of)) {
     let c = null; for (let w = 0; w < 80 && !(c = AV.frame(me, key)); w++) await new Promise(r => setTimeout(r, 25)); if (!c) { res.push([code, key, 'nofr', 1, []]); continue; }
     const rk = [a.g, a.a, a.hs, of, key].join('|'); let R = window.__refc.get(rk);
     if (!R) { window.__noTint = 1; const rc = AV.frame({av: 'REF.' + rk, _avp: a}, key); window.__noTint = 0; R = px(rc); window.__refc.set(rk, R); }
     const O = px(c); const F1 = new Uint8Array(W * H), F2 = new Uint8Array(W * H), F3 = new Uint8Array(W * H);
     const bgm = new Uint8Array(W * H); const st = []; for (let x = 0; x < W; x++) { st.push(x, (H - 1) * W + x); } for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
     while (st.length) { const k = st.pop(); if (bgm[k] || O[k * 4 + 3] > 25) continue; bgm[k] = 1; const x = k % W; if (x > 0) st.push(k - 1); if (x < W - 1) st.push(k + 1); if (k >= W) st.push(k - W); if (k < W * (H - 1)) st.push(k + W); }
     // enclosed fully transparent pockets: only small ones (<30px) count — bigger ones are deliberate gaps (arm/hair loops)
     const encl = new Uint8Array(W * H); { const sn = new Uint8Array(W * H); for (let j = 0; j < W * H; j++) { if (bgm[j] || sn[j] || O[j * 4 + 3] > 25) continue; const st2 = [j], comp = []; sn[j] = 1;
       while (st2.length) { const k = st2.pop(); comp.push(k); const x = k % W; for (const q of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, k - W, k + W]) if (q >= 0 && q < W * H && !sn[q] && !bgm[q] && O[q * 4 + 3] <= 25) { sn[q] = 1; st2.push(q); } }
       if (comp.length < 30) for (const k of comp) encl[k] = 1; else for (const k of comp) bgm[k] = 1; } }
     // silhouette edge band (≤4px from the outside, outline included): halo rings live here
     const edge3 = new Uint8Array(W * H); for (let j = 0; j < W * H; j++) if (bgm[j]) { const x = j % W, y = (j / W) | 0; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) edge3[yy * W + xx] = 1; } }
     for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const j = y * W + x, i = j * 4;
       // hole
       if (!bgm[j] && O[i + 3] < 200 && (O[i + 3] > 25 || encl[j])) { let inner = 1; for (let dy = -2; dy <= 2 && inner; dy++) for (let dx = -2; dx <= 2; dx++) if (bgm[j + dy * W + dx]) { inner = 0; break; } if (inner) F2[j] = 1; }
       if (O[i + 3] < 200 || R[i + 3] < 200) continue;
       // speck: pixel isolated in a FLAT area (≥6 of 8 neighbours differ by >48 and those neighbours agree with each other within 26)
       // in the output but not in the reference → off-palette island (eye catchlights are isolated in the reference too, so excluded)
       if (iso(O, j) && !iso(R, j)) F1[j] = 1;
       // halo ridge
       if (!edge3[j]) continue; const lo = lum(O, j), lr = lum(R, j); for (const d of [2, 2 * W]) { const a1 = j - d, b1 = j + d; if (O[a1 * 4 + 3] < 200 || O[b1 * 4 + 3] < 200) continue;
         const ro = Math.min(lo - Math.max(lum(O, a1), lum(O, b1)), 255), rd = Math.min(Math.min(lum(O, a1), lum(O, b1)) - lo, 255);
         const rr = lr - Math.max(lum(R, a1), lum(R, b1)), rrd = Math.min(lum(R, a1), lum(R, b1)) - lr;
         if ((ro > 38 && rr < 14) || (rd > 38 && rrd < 14)) F3[j] = 1; } }
     const s = clusters(F1, 1), h = clusters(F2, 3), r = clusters(F3, 4);
     if (s.length || h.length || r.length) res.push([code, key, s.length, h.length, r.length, s.slice(0, 3), h.slice(0, 3), r.slice(0, 3)]);
   }
   if (AV._cc) AV._cc(); }
 return res; }"""
def combos():
    out = []
    for g, nh in (('f', 8), ('m', 7)):
        outs = ['basic', 'choir', 'mint', 'sky', 'lav', 'peach'] if g == 'f' else ['basic', 'mint', 'sky', 'lav', 'peach', 'navy']
        for a, s, hs, hc, o in itertools.product(range(4), range(6), range(nh), range(9), outs): out.append(f'{g}.{a}.{s}.{hs}.{hc}.{o}.-.-.-.-')
    return out
def worker(wi, codes, q):
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']); pg = b.new_page(viewport={'width': 900, 'height': 700})
        pg.goto(URL, timeout=120000); pg.evaluate('localStorage.clear();localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready', timeout=120000)
        pg.evaluate("G.start('스윕','basic')"); pg.wait_for_timeout(2500)
        for i in range(0, len(codes), 24):
            r = pg.evaluate(JS, {'codes': codes[i:i + 24]}); q.put(('r', wi, len(codes[i:i + 24]), r))
        b.close(); q.put(('done', wi, 0, None))
if __name__ == '__main__':
    C = combos(); lim = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    if lim: C = C[::max(1, len(C) // lim)]
    q = Queue(); P = [Process(target=worker, args=(i, C[i::NW], q)) for i in range(NW)]; [p.start() for p in P]
    done = 0; n = 0; flags = []; t0 = time.time()
    while done < NW:
        k, wi, m, r = q.get()
        if k == 'done': done += 1; continue
        n += m; flags += r
        if n % 480 < m: print(f'{n}/{len(C)} combos  flagged frames {len(flags)}  {time.time()-t0:.0f}s', flush=True)
    tot = {'speck': sum(f[2] for f in flags if f[2] != 'nofr'), 'hole': sum(f[3] for f in flags if f[2] != 'nofr'), 'halo': sum(f[4] for f in flags if f[2] != 'nofr'), 'nofr': sum(1 for f in flags if f[2] == 'nofr')}
    json.dump({'combos': len(C), 'frames_per_combo': 24, 'totals': tot, 'flags': flags}, open(OUT, 'w'))
    print('COMBOS', len(C), 'TOTALS', tot, 'flagged frames', len(flags))

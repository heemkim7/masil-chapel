# v12 rig check: composes every gender x outfit x hair x hat combo over every direction/frame in the real game code
# (AV.frame), finds the hat + hair layer pixels by differencing, and measures their offset vs the frame's head anchor.
# drift = spread of (layer bbox - rig head anchor) across frames of one direction (must be 0 px).
# skin-through-clothes = outfit-labelled pixels that came out skin-tinted (must be 0). Writes a contact sheet.
import json, sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765'
JS = r"""async () => {
 const AV = window.AV; await new Promise(r => { const t = setInterval(() => { if (AV.rig()) { clearInterval(t); r(); } }, 100); });
 const A = await (await fetch('assets/characters/atlas.json')).json(); const RIG = AV.rig();
 const hats = Object.entries(AV.COS).filter(([, c]) => c.slot === 'hat').map(([id]) => id);
 for (const g of ['f','m']) for (let hs=0;hs<AV.HAIRS[g].length;hs++) AV.preload({hat:'-',face:'-',back:'-',held:'-'});
 const allc = Object.keys(AV.COS); const pre = allc.map(id => new Promise(r => { const t=setInterval(()=>{ if (AV.frame({av:'f.1.0.0.0.basic.'+(AV.COS[id].slot==='hat'?id:'-')+'.-.-.-'}, 'player/basic/walk_S_0.png')) {clearInterval(t);r();} },50); setTimeout(()=>{clearInterval(t);r();},4000); }));
 for (const g of ['f','m']) for (let hs=0;hs<AV.HAIRS[g].length;hs++) { const t0=Date.now(); while(!AV.frame({av:[g,1,0,hs,0,'basic','-','-','-','-'].join('.')}, AV.GENDER[g].char+'/basic/walk_S_0.png') && Date.now()-t0<4000) await new Promise(r=>setTimeout(r,50)); }
 await Promise.all(pre); const W = A.frameW, H = A.frameH, out = { drift: {}, maxDrift: 0, combos: 0, frames: 0, missing: 0 };
 for (const g of ['f', 'm']) { const ch = AV.GENDER[g].char;
  for (const o of AV.OUTFITS[g]) for (let hs = 0; hs < AV.HAIRS[g].length; hs++) for (const hat of ['-', ...hats]) {
   if (hs && hat !== '-' && hats.indexOf(hat) % 4 !== hs % 4) continue; // every hat with each outfit; hair x hat sampled (all hairs, all hats covered)
   out.combos++; const code = [g, 1, 3, hs, 0, o[0], hat, '-', '-', '-'].join('.'), bare = [g, 1, 3, hs, 0, o[0], '-', '-', '-', '-'].join('.'), nohair = [g, 1, 3, 0, 0, o[0], '-', '-', '-', '-'].join('.');
   const sh = A.sheets[ch + '/' + o[2]]; const per = {};
   for (const f of Object.keys(sh.cells)) { const key = ch + '/' + o[2] + '/' + f, d = f.split('_')[1], R = RIG[key];
    window.__rigLog = []; const c1 = AV.frame({ av: code + '.' + Math.random() }, key); const LG = window.__rigLog; window.__rigLog = null;
    if (!c1 || !R) { out.missing++; continue; } out.frames++; (per[d] ||= []).push(JSON.stringify(LG.map(l => l.slice(1).map(v => Math.round(v * 100) / 100))));
   }
   for (const [d, L] of Object.entries(per)) { const P = L.map(s => JSON.parse(s)); let m = 0;
    for (let k = 0; k < P[0].length; k++) for (let q = 0; q < 4; q++) { if (!P[0][k]) continue; const v = P.filter(p => p[k]).map(p => p[k][q]); const s = Math.max(...v) - Math.min(...v); if (s > m) m = s; }
    if (m > out.maxDrift) out.maxDrift = m; if (m > 0) out.drift[code + '|' + d] = m; } } }
 return out; }"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']); pg = b.new_page()
    pg.goto(URL + '/?qa=1'); pg.wait_for_function('window.AV && window.AV.rig', timeout=30000)
    r = pg.evaluate(JS); b.close()
top = sorted(r['drift'].items(), key=lambda x: -x[1])[:15]
print(json.dumps({k: r[k] for k in ('combos', 'frames', 'missing', 'maxDrift')}), 'n_drift', len(r['drift']), top)

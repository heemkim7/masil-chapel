# Opens every menu/panel/modal/tab at 1280x800 and 390x844, screenshots each, and checks:
# horizontal page scroll, panel outside viewport, clipped text (overflowing box w/o ellipsis), overlapping interactive
# HUD controls, raw emoji left in UI text. Writes shots/ui/report.json; exit 1 on any failure.
import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765'
CHECK = r"""(name) => { const W = innerWidth, H = innerHeight, f = [];
 if (document.documentElement.scrollWidth > W + 1 || document.body.scrollWidth > W + 1) f.push('hscroll ' + document.documentElement.scrollWidth);
 const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.width > 1 && r.height > 1; };
 const open = [...document.querySelectorAll('.modal')].filter(vis);
 for (const m of open) { const p = m.querySelector('.panel') || m, r = p.getBoundingClientRect(); if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) f.push(`panel-out #${m.id} ${r.left|0},${r.top|0},${r.right|0},${r.bottom|0}`);
   const ps = getComputedStyle(p); if (p.scrollWidth > p.clientWidth + 2 && ps.overflowX !== 'auto' && ps.overflowX !== 'scroll') f.push(`panel-hoverflow #${m.id} ${p.scrollWidth}>${p.clientWidth}`); }
 const scope = open.length ? open : [document.querySelector('#hud'), document.querySelector('#title')].filter(e => e && vis(e));
 const emo = /(?![©®™])\p{Extended_Pictographic}/u;
 for (const root of scope) for (const e of root.querySelectorAll('button,h2,h3,h4,label,small,b,span,p,li')) { if (!vis(e) || e.closest('#chatlog,.ugc,#blist,#lblist .lbn,canvas')) continue; const s = getComputedStyle(e);
   const scroller = e.closest('[style*="overflow"], .scroller') ; 
   if (e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && s.textOverflow !== 'ellipsis' && (s.overflow === 'hidden' || s.overflowX === 'hidden')) f.push(`clip ${e.tagName}#${e.id}.${e.className} "${e.textContent.trim().slice(0, 20)}"`);
   const r = e.getBoundingClientRect(); if (e.tagName === 'BUTTON' && !e.closest('.mtabs,.tabs,.scr,[class*=car],#outfits,.items,.slot,#dplist,#natres,#decor-items,#mapspots,#dmspots,#emoposes,#emophr') && (r.right > W + 1 || r.left < -1)) f.push(`btn-out "${e.textContent.trim().slice(0, 16)}"`);
   for (const n of e.childNodes) if (n.nodeType === 3 && emo.test(n.nodeValue)) { f.push(`emoji "${n.nodeValue.trim().slice(0, 12)}" in ${e.tagName}#${e.id}`); break; } }
 if (!open.length) { const bs = [...document.querySelectorAll('#hud > *:not(#chat):not(#joyzone):not(#emopanel):not(#praise):not(#decorbar), #top > *, #side > button, #emotes > button')].filter(vis).filter(e => !e.contains(document.activeElement) || 1);
   const R = bs.map(e => [e, e.getBoundingClientRect()]);
   for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const [a, ra] = R[i], [b, rb] = R[j]; if (a.contains(b) || b.contains(a)) continue; const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top); if (ox > 2 && oy > 2) f.push(`overlap #${a.id||a.className} × #${b.id||b.className}`); } }
 return [...new Set(f)]; }"""
SCREENS = [
 ('title', None), ('hud', 'START'),
 ('gacha', "document.querySelector('#btn-gacha').click()"), ('inv', "document.querySelector('#btn-inv').click()"),
 ('board', "document.querySelector('#btn-board').click()"), ('verse', "document.querySelector('#btn-verse').click()"),
 ('candle', "document.querySelector('#btn-candle').click()"), ('shot', "document.querySelector('#btn-shot').click()"),
 ('missions', "document.querySelector('#mbadge').click()"), ('dongpick', "document.querySelector('#dongbtn').click()"),
 ('map_isle', "document.querySelector('#minimap').click()"), ('map_dong', "document.querySelector('#minimap').click(); setTimeout(()=>document.querySelector('.mtab[data-tab=dong]').click(),300)"),
 ('lead_dong', "document.querySelector('#btn-church').click()"), ('lead_all', "document.querySelector('#btn-church').click(); setTimeout(()=>document.querySelector('.lbt[data-s=all]').click(),300)"),
 ('lead_church', "document.querySelector('#btn-church').click(); setTimeout(()=>document.querySelector('.lbt[data-s=church]').click(),300)"),
 ('levels', "P2.openLevels()"), ('settings', "P2.openSet()"), ('account', "P2.openSet(); setTimeout(()=>document.querySelector('#p2acctbtn').click(),200)"),
 ('logout_warn', "P2.openSet(); setTimeout(()=>document.querySelector('#p2logout').click(),200)"),
 ('key_I_bag', "KEY:KeyI"), ('key_K_collection', "KEY:KeyK"), ('key_H_help', "KEY:KeyH"), ('key_N_nation', "KEY:KeyN"), ('key_G_offer', "KEY:KeyG"), ('key_V_bible', "KEY:KeyV"),
 ('emotes', "document.querySelector('#btn-emo').click()"), ('decor', "document.querySelector('#btn-decor').click()"),
]
rep = {}; bad = 0; name_ref = ['boot']
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for vw, vh, tag in [(1280, 800, 'pc'), (390, 844, 'mo')]:
        ctx = b.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=1, is_mobile=tag == 'mo', has_touch=tag == 'mo')
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e) + ' @' + name_ref[0] + ' ' + (e.stack or '')[:300]))
        pg.goto(URL + '/'); pg.evaluate('localStorage.clear(); localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000); pg.wait_for_timeout(600)
        for name, act in SCREENS:
            name_ref[0] = name
            if act == 'START': pg.evaluate("G.start('스샷','basic')"); pg.wait_for_timeout(900); pg.evaluate('G.closeModal&&G.closeModal()'); pg.wait_for_timeout(1800)
            elif act:
                pg.evaluate("document.activeElement&&document.activeElement.blur(); G.modal&&G.closeModal(); G.S.mode==='decor'&&document.querySelector('#ddone')?.click(); document.querySelector('#emopanel')?.classList.remove('on')"); pg.wait_for_timeout(250)
                if act.startswith('KEY:'): pg.keyboard.press(act[4:])
                else: pg.evaluate(act)
                pg.wait_for_timeout(1300)
            f = pg.evaluate(CHECK, name); pg.screenshot(path=f'shots/ui/{tag}_{name}.png')
            rep[f'{tag}/{name}'] = f; bad += bool(f); print(('PASS ' if not f else 'FAIL ') + f'{tag}/{name}', '' if not f else f[:6], flush=True)
        rep[f'{tag}/_errors'] = errs[:10]; print(tag, 'pageerrors', errs[:5])
        ctx.close()
    b.close()
json.dump(rep, open('shots/ui/report.json', 'w'), ensure_ascii=False, indent=1); print('FAILS', bad); sys.exit(1 if bad else 0)

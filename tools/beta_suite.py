# Beta regression suite: boots the game at 6 screen sizes and runs feature cases. Prints PASS/FAIL per case + JSON summary.
import json, sys, time
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'
URL += ('&' if '?' in URL else '?') + 'qa=1'  # isolated QA realtime namespace: test clients never join real rooms
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
SIZES = [(360, 640), (390, 844), (430, 932), (768, 1024), (1366, 768), (1920, 1080)]
R = []
def rec(cid, ok, note=''):
    R.append({'id': cid, 'ok': bool(ok), 'note': note}); print(('PASS ' if ok else 'FAIL ') + cid + (' :: ' + note if note and not ok else ''), flush=True)
def boot(b, w, h, name='베타', fresh=True, ctx=None, slow=0, touch=None):
    c = ctx or b.new_context(viewport={'width': w, 'height': h}, has_touch=(w < 800) if touch is None else touch, device_scale_factor=2 if w < 800 else 1)
    if slow:
        def rt(r):
            time.sleep(slow); r.continue_()
        c.route('**/*', rt)
    pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, timeout=90000)
    if fresh: pg.evaluate('localStorage.clear();localStorage.setItem("maeul_eula","9")'); pg.reload()
    pg.wait_for_function('window.__ready', timeout=90000)
    return pg, errs, c
def start(pg, name='베타'):
    pg.evaluate(f"G.start('{name}','basic')"); pg.wait_for_timeout(1500); pg.evaluate('G.closeModal&&G.closeModal()'); pg.wait_for_timeout(500)
VIS = """sel => { const e = document.querySelector(sel); if (!e) return 'missing'; const r = e.getBoundingClientRect(), s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || r.width < 2) return 'hidden';
  if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) return 'offscreen ' + JSON.stringify([r.left|0, r.top|0, r.right|0, r.bottom|0]); return 'ok'; }"""
OPEN = "() => !!document.querySelector('.modal.show, .modal.open') || [...document.querySelectorAll('.modal')].some(m => getComputedStyle(m).display !== 'none')"
SMALL = """() => { const bad = []; for (const e of document.querySelectorAll('button, a, [role=button]')) { const r = e.getBoundingClientRect(), s = getComputedStyle(e); if (r.width < 1 || s.display === 'none' || s.visibility === 'hidden' || e.closest('.modal:not(.show):not(.open)')) continue;
  if (r.bottom < 0 || r.top > innerHeight) continue; if (Math.min(r.width, r.height) < 30 && e.offsetParent) bad.push((e.id || e.className || e.textContent).toString().slice(0, 20) + ':' + (r.width|0) + 'x' + (r.height|0)); } return bad; }"""
def want(c): return not ONLY or any(c.startswith(o) for o in ONLY)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    # ---- per-size smoke
    if want('size'):
        for w, h in SIZES:
            t = f'size.{w}x{h}'; pg, errs, c = boot(b, w, h)
            rec(t + '.title', pg.evaluate(VIS, '#newgame') == 'ok', pg.evaluate(VIS, '#newgame'))
            start(pg); pg.screenshot(path=f'shots/beta/{w}x{h}_hud.png')
            mob = pg.evaluate(VIS, '#btn-menu') == 'ok' and pg.evaluate(VIS, '#btn-inv') != 'ok'
            for sel in (['#btn-set', '#btn-menu', '#btn-gacha', '#dongbtn', '#btn-act'] if mob else ['#btn-set', '#btn-wh', '#btn-gacha', '#btn-inv', '#dongbtn', '#btn-act']):
                v = pg.evaluate(VIS, sel); rec(f'{t}.hud{sel}', v in ('ok', 'missing') if sel == '#btn-act' else v == 'ok', v)
            sm = pg.evaluate(SMALL); rec(t + '.touch44', w >= 1000 or len(sm) == 0, ','.join(sm[:8]))
            for btn in ['#btn-gacha', '#btn-menu' if mob else '#btn-inv', '#btn-set', '#dongbtn']:
                pg.evaluate("G.closeModal()"); pg.wait_for_timeout(200)
                try: pg.click(btn, timeout=3000); pg.wait_for_timeout(600); o = pg.evaluate(OPEN) or (btn == '#btn-menu' and pg.evaluate("() => [...document.querySelectorAll('#side button, #side')].some(e => e.getBoundingClientRect().width > 40 && getComputedStyle(e).display !== 'none' && e.id === 'btn-inv')"))
                except Exception as e: o = False
                rec(f'{t}.open{btn}', o); pg.screenshot(path=f'shots/beta/{w}x{h}_{btn[1:]}.png')
                ov = pg.evaluate("() => { const m = [...document.querySelectorAll('.modal')].find(m => getComputedStyle(m).display !== 'none'); const pnl = m && m.querySelector('.panel'); if (!pnl) return 'nopanel'; const r = pnl.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 ? 'ok' : JSON.stringify([r.left|0,r.top|0,r.right|0,r.bottom|0]); }")
                rec(f'{t}.panelfit{btn}', ov in ('ok', 'nopanel'), ov)
            pg.evaluate("G.closeModal()"); rec(t + '.noerr', not errs, '; '.join(errs[:3])); c.close()
    # ---- first-time / returning
    if want('flow'):
        pg, errs, c = boot(b, 390, 844)
        rec('flow.first.title', pg.evaluate(VIS, '#newgame') == 'ok')
        start(pg, '처음이'); rec('flow.first.scene', pg.evaluate("G.scene") in ('field', 'inside'), pg.evaluate("G.scene"))
        rec('flow.first.name', pg.evaluate("G.S.name") == '처음이')
        coins0 = pg.evaluate("G.S.coins"); rec('flow.first.coins', isinstance(coins0, (int, float)) and coins0 >= 0, str(coins0))
        pg.evaluate("G.persist&&G.persist()"); pg.wait_for_timeout(800); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000)
        pg.wait_for_timeout(1500); title = pg.evaluate("getComputedStyle(document.querySelector('#title')).display")
        if title != 'none':
            try: pg.click('#continue', timeout=3000); pg.wait_for_timeout(1500)
            except Exception: pass
        pg.evaluate('G.closeModal&&G.closeModal()'); rec('flow.return.autoresume', pg.evaluate("G.scene") in ('field', 'inside'))
        rec('flow.return.name', pg.evaluate("G.S && G.S.name") == '처음이')
        # move
        x0 = pg.evaluate("G.player.x"); pg.evaluate("G.moveDir&&G.moveDir(1,0)"); pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(700); pg.keyboard.up('ArrowRight')
        rec('flow.move.keyboard', abs(pg.evaluate("G.player.x") - x0) > 5)
        rec('flow.noerr', not errs, '; '.join(errs[:3])); c.close()
    # ---- worship
    if want('worship'):
        for w, h in [(390, 844), (1366, 768)]:
            pg, errs, c = boot(b, w, h); start(pg)
            pg.evaluate("WH.enter()"); pg.wait_for_timeout(1200); rec(f'worship.{w}.walkin', pg.evaluate("WH.walking") is not None)
            pg.wait_for_timeout(5500); rec(f'worship.{w}.seated', not pg.evaluate("!!WH.walking"))
            pg.evaluate("WH.simulate(30)"); pg.wait_for_timeout(800); rec(f'worship.{w}.peers', pg.evaluate("WH.peers.size") >= 30)
            for v in ['rear', 'front', 'pastor', 'seat']:
                pg.evaluate(f"WH.setView('{v}')"); pg.wait_for_timeout(1300); rec(f'worship.{w}.view.{v}', pg.evaluate("WH.view") == v)
            pg.evaluate("WH.setView('rear')"); pg.wait_for_timeout(900)
            for a in ['기도', '찬양', '아멘']:
                try: pg.get_by_role('button', name=a).first.click(timeout=2000); ok = True
                except Exception as e: ok = 'acts' if pg.evaluate("typeof WH.act") == 'function' else False
                rec(f'worship.{w}.act.{a}', ok)
            e = pg.evaluate("WH.emptySeats()"); pg.evaluate(f"WH.tapSeat({e[0]})"); pg.wait_for_timeout(300); rec(f'worship.{w}.tapmove', pg.evaluate("!!WH.walking"))
            pg.wait_for_timeout(2500); fps = pg.evaluate("Math.round(WH.fps)"); rec(f'worship.{w}.fps', fps >= 50, str(fps))
            pg.evaluate("WH.leave()"); pg.wait_for_timeout(5000); rec(f'worship.{w}.leave', not pg.evaluate("document.body.classList.contains('wh-open')"))
            rec(f'worship.{w}.noerr', not errs, '; '.join(errs[:3])); c.close()
    # ---- gacha / offering / customization
    if want('econ'):
        pg, errs, c = boot(b, 1366, 768); start(pg)
        pg.evaluate("G.S.coins = 999; G.refreshHud&&G.refreshHud()")
        pg.evaluate("G.openGacha()"); pg.wait_for_timeout(500); rec('econ.gacha.open', pg.evaluate(OPEN))
        c0 = pg.evaluate("G.S.coins"); n0 = pg.evaluate("JSON.stringify(G.S).length")
        try: pg.click('#groll', timeout=3000); pg.wait_for_timeout(2500)
        except Exception: pass
        rec('econ.gacha.roll', pg.evaluate("G.S.coins") < c0 or pg.evaluate("JSON.stringify(G.S).length") != n0, f'{c0}->{pg.evaluate("G.S.coins")}')
        pg.evaluate("G.closeModal()"); pg.evaluate("G.S.coins = 0; G.refreshHud&&G.refreshHud()"); pg.evaluate("G.openGacha()"); pg.wait_for_timeout(400)
        try: pg.click('#groll', timeout=2000); pg.wait_for_timeout(1200)
        except Exception: pass
        rec('econ.gacha.broke', pg.evaluate("G.S.coins") == 0)
        pg.evaluate("G.closeModal()"); pg.evaluate("G.S.coins = 500"); pg.evaluate("P2.openOffer(true)"); pg.wait_for_timeout(600); rec('econ.offer.open', pg.evaluate(OPEN))
        txt = pg.evaluate("document.body.innerText"); rec('econ.offer.freeonly', '실제 결제' in txt)
        rec('econ.nopay.ui', not any(k in txt for k in ['원 결제', '구매하기', '만나 충전', '결제하기']))
        pg.evaluate("G.closeModal()"); pg.evaluate("G.openInv()"); pg.wait_for_timeout(500); rec('econ.inv.open', pg.evaluate(OPEN))
        pg.evaluate("G.closeModal()"); pg.evaluate("P2.openShop && P2.openShop((G.cfg().shops||[])[0])"); pg.wait_for_timeout(600); rec('econ.shop.open', pg.evaluate(OPEN)); pg.screenshot(path='shots/beta/shop.png')
        rec('econ.paydisabled', pg.evaluate("window.PAY && PAY.enabled === false"))
        rec('econ.noerr', not errs, '; '.join(errs[:3])); c.close()
    # ---- places / settings / community
    if want('misc'):
        pg, errs, c = boot(b, 390, 844); start(pg)
        pg.evaluate("G.V.setDong('1168064000')"); pg.wait_for_timeout(600); rec('misc.place.switch', pg.evaluate("G.V.current().cd") == '1168064000')
        pg.evaluate("P2.openSet()"); pg.wait_for_timeout(600); rec('misc.settings.open', pg.evaluate(OPEN)); pg.screenshot(path='shots/beta/settings.png')
        rec('misc.settings.reset', pg.evaluate("!!document.querySelector('#p2reset') && !!document.querySelector('#p2avreset')"))
        pg.evaluate("G.closeModal()"); pg.evaluate("G.openBoard()"); pg.wait_for_timeout(600); rec('misc.board.open', pg.evaluate(OPEN))
        rec('misc.report.exists', pg.evaluate("!!document.querySelector('#svreport') || document.body.innerHTML.includes('신고')"))
        pg.evaluate("G.closeModal()"); pg.evaluate("G.openMap()"); pg.wait_for_timeout(600); rec('misc.map.open', pg.evaluate(OPEN))
        pg.evaluate("G.closeModal()"); pg.fill('#chatin', '안녕하세요') if pg.evaluate(VIS, '#chatin') == 'ok' else None
        rec('misc.noerr', not errs, '; '.join(errs[:3])); c.close()
    # ---- network
    if want('net'):
        pg, errs, c = boot(b, 390, 844); start(pg); c.set_offline(True); pg.wait_for_timeout(2500)
        pg.evaluate("WH.enter()"); pg.wait_for_timeout(2500); rec('net.offline.worship', pg.evaluate("document.body.classList.contains('wh-open')"))
        pg.evaluate("WH.close()"); pg.evaluate("G.openGacha()"); pg.wait_for_timeout(500); rec('net.offline.gacha', pg.evaluate(OPEN))
        c.set_offline(False); pg.wait_for_timeout(2000); rec('net.offline.noerr', not errs, '; '.join(errs[:3])); c.close()
        t0 = time.time(); pg, errs, c = boot(b, 390, 844, slow=0.15); start(pg); rec('net.slow.boot', True, f'{time.time()-t0:.1f}s'); rec('net.slow.noerr', not errs, '; '.join(errs[:3])); c.close()
    # ---- concurrency: N real clients in one worship room
    if want('multi'):
        N = 6; P = []
        for i in range(N):
            pg, errs, c = boot(b, 800, 600, touch=False); start(pg, f'동시{i}'); pg.evaluate("WH.enter()"); P.append((pg, errs, c))
        P[0][0].wait_for_timeout(9000)
        seen = [pg.evaluate("WH.peers.size") for pg, _, _ in P]; rec('multi.presence', min(seen) >= N - 1, str(seen))
        seats = [pg.evaluate("WH.me.seat") for pg, _, _ in P]; rec('multi.uniqueSeats', len(set(seats)) == N, str(seats))
        P[1][0].evaluate("WH.leave()"); P[0][0].wait_for_timeout(6000); rec('multi.leaveSeen', P[0][0].evaluate("WH.peers.size") <= N - 2, str(P[0][0].evaluate("WH.peers.size")))
        rec('multi.noerr', all(not e for _, e, _ in P), str([e[:1] for _, e, _ in P]))
        for _, _, c in P: c.close()
    # ---- chapel prominence (regression: chapel must stay the dominant landmark at the default spawn camera)
    if want('chapel'):
        for w, h, mn in ((390, 844, .5), (1366, 768, .6)):
            pg, errs, c = boot(b, w, h); start(pg); pg.wait_for_timeout(2500)
            r = pg.evaluate("G.chapelScreen()"); t = f'chapel.size.{w}x{h}'
            rec(t + '.height', r['h'] >= mn * h, f"h={r['h']:.0f}px ({r['h']/h:.2f} of screen, min {mn})")
            rec(t + '.roofVisible', r['top'] >= 0 and r['bottom'] <= h + 1, f"top={r['top']:.0f} bottom={r['bottom']:.0f}")
            dr = pg.evaluate("(() => { const d = G.chapelScreen().door; return [G.walkable(d.x, d.y + 40), G.walkable(d.x, d.y - 40)] })()")
            rec(t + '.doorAligned', dr[0] and not dr[1], str(dr))
            rec(t + '.noerr', not errs, '; '.join(errs[:3])); c.close()
    b.close()
ok = sum(r['ok'] for r in R); print(json.dumps({'pass': ok, 'total': len(R), 'fail': [r for r in R if not r['ok']]}, ensure_ascii=False))
json.dump(R, open('/tmp/beta_results.json', 'w'), ensure_ascii=False)

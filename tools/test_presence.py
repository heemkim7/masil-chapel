# Presence regression: 2 isolated QA clients (namespace chapelqa:, never real rooms). A toggles 혼자 모드 ↔ room 3x, then both idle.
# Asserts: no self join/leave, B sees exactly one A, ≤1 room channel per client, count stable at 2명, no join/leave flaps during idle.
import sys, json, time
from playwright.sync_api import sync_playwright
URL = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'); URL += ('&' if '?' in URL else '?') + 'qa=1'
IDLE = int(sys.argv[2]) if len(sys.argv) > 2 else 190
HOOK = "window.__ev=[];const n=G.net||window.__net;"
def boot(b, name):
    c = b.new_context(viewport={'width': 1024, 'height': 684}); pg = c.new_page(); pg.goto(URL, timeout=90000)
    pg.evaluate('localStorage.clear();localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready', timeout=90000)
    pg.evaluate(f"G.start('{name}','basic')"); pg.wait_for_timeout(1500); pg.evaluate('G.closeModal&&G.closeModal()')
    pg.evaluate("(async()=>{await G.V.setDong('1111053000');})()"); return c, pg
def ev(pg): return pg.evaluate("""(()=>{const n=G.net;if(!n.__h){n.__h=1;window.__ev=[];n.on('join',p=>__ev.push(['join',p.id,p.name]));n.on('leave',(k,l)=>__ev.push(['leave',k,!!l]));}
  return {id:n.id,ns:n.ch&&n.ch.topic,peers:[...n.peers.keys()],chans:(n.sb.getChannels().filter(c=>!/lobby/.test(c.topic))).length,online:document.querySelector('#online')?.textContent,ev:__ev.slice()};})()""")
ok = True; out = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ca, A = boot(b, 'QA_A'); cb, B = boot(b, 'QA_B'); time.sleep(8); ev(A); ev(B)
    for i in range(3):
        A.evaluate("G.V.goSolo()"); time.sleep(4); A.evaluate("G.V.setDong('1111053000')"); time.sleep(8)
    a, bb = ev(A), ev(B); out['after_toggle'] = {'A': a, 'B': bb}
    B.evaluate("__ev.length=0"); A.evaluate("__ev.length=0"); time.sleep(IDLE); a, bb = ev(A), ev(B); out['after_idle'] = {'A': a, 'B': bb}
    chk = {'ns_isolated': (a['ns'] or '').find('chapelqa:') >= 0, 'A_no_self': a['id'] not in a['peers'] and all(e[1] != a['id'] for e in a['ev']),
           'B_sees_one_A': bb['peers'].count(a['id']) == 1 and len(bb['peers']) == 1, 'one_channel': a['chans'] <= 1 and bb['chans'] <= 1,
           'count_2': '2명' in (a['online'] or '') and '2명' in (bb['online'] or ''), 'idle_no_flap': not a['ev'] and not bb['ev']}
    for k, v in chk.items(): print(('PASS ' if v else 'FAIL ') + k); ok &= v
    ca.close(); cb.close(); b.close()   # closing contexts = untrack/cleanup; QA namespace never persisted
print(json.dumps(out, ensure_ascii=False)[:3000]); sys.exit(0 if ok else 1)

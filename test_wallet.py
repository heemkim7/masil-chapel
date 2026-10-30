import functools,threading,http.server,socketserver,sys,json
from playwright.sync_api import sync_playwright
URL=sys.argv[1] if len(sys.argv)>1 else None
if not URL:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*a): pass
    socketserver.TCPServer.allow_reuse_address=True
    srv=socketserver.ThreadingTCPServer(('127.0.0.1',18496),functools.partial(Q,directory='.'));threading.Thread(target=srv.serve_forever,daemon=True).start(); URL='http://127.0.0.1:18496/'
R={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);pg=b.new_page(viewport={'width':1280,'height':800})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL);pg.wait_for_function('window.__ready',timeout=60000);pg.evaluate("G.start('지갑테스트','basic')");pg.wait_for_timeout(800);pg.evaluate('G.closeModal()')
    pg.wait_for_function('window.W && W.online',timeout=20000)
    R['start']=pg.evaluate('G.S.coins')
    pg.evaluate('G.S.coins=99999'); R['tampered_then_sync']=pg.evaluate('W.sync().then(d=>d.talent)')
    R['earn_quest']=pg.evaluate("W.earn('quest').then(d=>d)"); R['earn_quest2']=pg.evaluate("W.earn('quest').then(d=>d)")
    R['dong']=pg.evaluate('JSON.stringify(G.V.current())')[:80]
    pg.evaluate('P2.openOffer(true)');pg.wait_for_timeout(300)
    pg.click('#p2odds');pg.wait_for_timeout(1500); R['odds_rows']=pg.evaluate("document.querySelectorAll('#p2odds_m tr').length"); pg.screenshot(path='shots/v8/wallet_odds.png')
    pg.evaluate('G.closeModal()'); pg.evaluate('P2.openOffer(true)');pg.wait_for_timeout(300)
    pg.click('.am[data-a="10"]'); before=pg.evaluate('G.S.coins'); pg.click('#p2give'); pg.wait_for_timeout(6000)
    pg.mouse.click(640,400); pg.wait_for_timeout(2500)
    R['before_offer']=before; R['after_offer']=pg.evaluate('G.S.coins'); R['server_after']=pg.evaluate('W.sync().then(d=>d.talent)')
    R['direct']=pg.evaluate("G.net.sb.rpc('offer',{p_dong:'0',p_dong_name:'x',p_name:'t',p_amount:10,p_secret:G.net.secret()}).then(r=>JSON.stringify(r.error||r.data))")
    R['bless']=pg.evaluate("document.querySelector('#p2bless .gift b')?.textContent")
    pg.screenshot(path='shots/v8/wallet_bless.png'); R['errs']=errs
    pg.evaluate("G.net.sb.rpc('delete_account',{p_secret:G.net.secret()})")
print(json.dumps(R,ensure_ascii=False,indent=1))

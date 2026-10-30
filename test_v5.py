# v5 UI audit: every viewport, every menu; overlap/clipping/touch-target checks; sprite height check; screenshots shots/v5_*.png
import http.server, threading, functools, socketserver, sys, os, json
from playwright.sync_api import sync_playwright
PORT = int(os.environ.get('PORT', 18439)); D = os.path.dirname(os.path.abspath(__file__))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def handle(self):
        try: super().handle()
        except (BrokenPipeError, ConnectionResetError): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', PORT), functools.partial(Q, directory=D)); threading.Thread(target=srv.serve_forever, daemon=True).start()
U = f'http://127.0.0.1:{PORT}/index.html'; errs = []; problems = []
VP = [('desk', 1280, 800, False), ('p390', 390, 844, True), ('l844', 844, 390, True), ('p360', 360, 740, True)]
AUDIT = r'''(ctx)=>{const out=[];const vis=e=>{if(!e)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;let p=e;while(p){if(getComputedStyle(p).display==='none')return false;p=p.parentElement}const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
 const W=innerWidth,H=innerHeight;
 const hud=['#coinbox','#lvbox','#btn-menu','#minimap','#quest','#side','#chat','#emotes','#btn-act','#btn-jump','#online','#joyzone','#decorbar','#worship','#wtap'].map(s=>[s,document.querySelector(s)]).filter(([s,e])=>vis(e));
 for(const [s,e] of hud){const r=e.getBoundingClientRect();if(r.left<-1||r.top<-1||r.right>W+1||r.bottom>H+1)out.push(`offscreen ${s} ${JSON.stringify([r.left|0,r.top|0,r.right|0,r.bottom|0])}`)}
 const allow=new Set(['#worship|#wtap']);
 for(let i=0;i<hud.length;i++)for(let j=i+1;j<hud.length;j++){const a=hud[i][1].getBoundingClientRect(),b=hud[j][1].getBoundingClientRect();const ix=Math.min(a.right,b.right)-Math.max(a.left,b.left),iy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(ix>1&&iy>1&&!allow.has(hud[i][0]+'|'+hud[j][0]))out.push(`overlap ${hud[i][0]} x ${hud[j][0]} (${ix|0}x${iy|0})`)}
 // open modal panel must fit; its buttons >=44 and inside the panel horizontally
 document.querySelectorAll('.modal').forEach(m=>{if(!vis(m))return;const p=m.querySelector('.panel');const r=p.getBoundingClientRect();if(r.left<0||r.top<0||r.right>W+.5||r.bottom>H+.5)out.push(`modal ${m.id} panel out of viewport ${JSON.stringify([r.left|0,r.top|0,r.right|0,r.bottom|0])}`);
   p.querySelectorAll('button,input').forEach(b=>{if(!vis(b))return;const q=b.getBoundingClientRect();if(q.height<43.5||q.width<43.5)out.push(`small target in #${m.id}: ${b.id||b.className||b.textContent.trim().slice(0,12)} ${q.width|0}x${q.height|0}`);if(q.left<r.left-1||q.right>r.right+1)out.push(`clipped-x in #${m.id}: ${b.id||b.textContent.trim().slice(0,12)}`)})});
 // HUD buttons touch size
 document.querySelectorAll('#hud button,#hud input').forEach(b=>{if(!vis(b))return;const q=b.getBoundingClientRect();if(q.height<43.5||q.width<43.5)out.push(`small HUD target ${b.id||b.textContent.trim().slice(0,10)} ${q.width|0}x${q.height|0}`)});
 // text overflow inside buttons
 document.querySelectorAll('button').forEach(b=>{if(vis(b)&&(b.scrollWidth>b.clientWidth+2))out.push(`text overflow in button ${b.id||b.textContent.trim().slice(0,12)}`)});
 return out}'''
SPRITE = r'''()=>{const res={};const c=document.createElement('canvas');c.width=400;c.height=400;const g=c.getContext('2d');
 const P=G.player;const save={x:P.x,y:P.y,face:P.face,sp:P.speedNow,em:P.emote,dist:P.dist,eq:P.equip,o:P.outfit,name:P.name,bub:P.bubble};
 P.equip=null;P.bubble=null;P.emote=null;
 for(const o of ['basic','choir','mint']){P.outfit=o;const hs=[];for(const f of ['E','SE','S','SW','W','NW','N','NE'])for(let i=0;i<6;i++){P.face=f;P.speedNow=1;P.dist=i*G.cfg().player.stepLen+1;P.x=200;P.y=330;
   g.clearRect(0,0,400,400);P.draw(g);const d=g.getImageData(0,0,400,400).data;let top=400,bot=0;for(let y=0;y<400;y++)for(let x=0;x<400;x+=2){if(d[(y*400+x)*4+3]>60){if(y<top)top=y;if(y>bot)bot=y;break}}
   hs.push([f,i,bot-top])}res[o]=hs}
 Object.assign(P,{x:save.x,y:save.y,face:save.face,speedNow:save.sp,dist:save.dist,equip:save.eq,outfit:save.o,bubble:save.bub});return res}'''
def hook(pg):
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.on('pageerror', lambda e: errs.append(str(e)))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for tag, w, h, mob in VP:
        ctx = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1)
        pg = ctx.new_page(); hook(pg)
        def shot(n): pg.screenshot(path=f'{D}/shots/v5_{tag}_{n}.png')
        def audit(n):
            r = pg.evaluate(AUDIT, None)
            for x in r: problems.append(f'[{tag}:{n}] {x}')
        click = (lambda s: pg.tap(s, force=True)) if mob else (lambda s: pg.click(s, force=True))
        pg.goto(U, wait_until='domcontentloaded'); pg.evaluate('localStorage.clear()'); pg.reload(wait_until='commit', timeout=90000); pg.wait_for_function('window.__ready', timeout=60000)
        # title: preview canvases must never be blank through a full rotation
        blank = pg.evaluate('''async()=>{let bad=0,n=0;for(let i=0;i<50;i++){await new Promise(r=>setTimeout(r,200));for(const c of document.querySelectorAll('.ocard canvas')){const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let a=0;for(let k=3;k<d.length;k+=16)a+=d[k]>0;n++;if(a<200)bad++}}return [bad,n]}''')
        if blank[0]: problems.append(f'[{tag}] title preview blank frames {blank}')
        shot('01_title'); audit('title')
        click('.ocard[data-o=choir]'); pg.wait_for_timeout(1300); shot('01b_title_choir')
        pg.fill('#pname', '은혜'); click('#newgame'); pg.wait_for_timeout(900)
        shot('02_field'); audit('field')
        # map
        click('#minimap'); pg.wait_for_timeout(500); shot('03_map'); audit('map')
        click('.spot[data-spot=hill]'); pg.wait_for_timeout(700); shot('04_after_teleport_hill'); audit('hill')
        if pg.evaluate('!G.world().walkable(G.player.x,G.player.y)'): problems.append(f'[{tag}] teleport landed on non-walkable')
        # walk across the bridge back west
        pg.evaluate('G.teleport(G.cfg().spots.find(s=>s.id=="bridge"))'); pg.wait_for_timeout(300)
        x0 = pg.evaluate('G.player.x'); pg.evaluate('G.moveDir(180,1500)'); pg.wait_for_timeout(1700); x1 = pg.evaluate('G.player.x')
        if x0 - x1 < 200: problems.append(f'[{tag}] bridge not walkable {x0}->{x1}')
        shot('05_bridge')
        # menus
        for btn, mid, n in [('#btn-gacha', '#gacha', '06_gacha'), ('#btn-inv', '#inv', '07_inventory'), ('#btn-board', '#board', '08_board')]:
            click(btn); pg.wait_for_timeout(400)
            if btn == '#btn-gacha': click('#groll'); pg.wait_for_timeout(900)
            if btn == '#btn-inv': pg.evaluate("G.S.inv.push('wings','crown','dove')"); pg.evaluate('G.openInv()')
            if btn == '#btn-board': pg.fill('#btext', '할머니 건강을 위해 기도해 주세요'); click('#bpost'); pg.wait_for_timeout(300)
            shot(n); audit(n); click(f'{mid} .close'); pg.wait_for_timeout(200)
        # dialog with NPC
        n0 = pg.evaluate('G.cfg().npcs[0]'); pg.evaluate(f"G.tp({n0['x']},{n0['y']+70})"); pg.wait_for_timeout(300); click('#btn-act'); pg.wait_for_timeout(400); shot('09_dialog'); audit('dialog'); click('#dopts button')
        # chat + emotes
        pg.fill('#chatin', '안녕하세요 이웃님들!'); pg.press('#chatin', 'Enter'); pg.wait_for_timeout(300)
        for e in ['wave', 'jump', 'pray']: click(f'[data-emote={e}]'); pg.wait_for_timeout(350)
        pg.wait_for_timeout(900); shot('10_chat_emote'); audit('chat')
        # decorate
        click('#btn-decor'); pg.wait_for_timeout(400); pg.click('.ditem[data-d=pot]') if not mob else pg.tap('.ditem[data-d=pot]'); shot('11_decor'); audit('decor')
        for bt in ['#dflip', '#dpick', '#dundo']: click(bt); pg.wait_for_timeout(150)
        click('#ddone'); pg.wait_for_timeout(200)
        # chapel in / out via buttons
        c = pg.evaluate('G.cfg().chapel.door'); pg.evaluate(f"G.tp({c['x']},{c['y']+40})"); pg.wait_for_timeout(300); click('#btn-act'); pg.wait_for_timeout(600)
        if pg.evaluate('G.scene') != 'inside': problems.append(f'[{tag}] enter chapel failed')
        shot('12_inside'); audit('inside')
        click('#minimap'); pg.wait_for_timeout(400); shot('13_map_inside'); click('#map .close')
        pg.evaluate('G.tp(768,710)'); pg.wait_for_timeout(300); click('#btn-act'); pg.wait_for_timeout(400); click('#dopts button')
        pg.evaluate('G.startWorship()'); pg.wait_for_timeout(2500); shot('14_worship'); audit('worship')
        pg.wait_for_function('!G.worship', timeout=40000); pg.wait_for_timeout(300); shot('15_worship_result'); audit('worship_result'); click('#dopts button')
        I = pg.evaluate('G.cfg().interior.door'); pg.evaluate(f"G.tp({I['x']},{I['y']})"); pg.wait_for_timeout(300); click('#btn-act'); pg.wait_for_timeout(500)
        if pg.evaluate('G.scene') != 'field': problems.append(f'[{tag}] exit chapel failed')
        # walk 8 directions in the real loop, measure rendered sprite heights
        if tag == 'desk':
            hs = pg.evaluate(SPRITE)
            for o, L in hs.items():
                v = [x[2] for x in L]; spread = (max(v) - min(v)) / max(v)
                print(f'sprite {o}: min {min(v)} max {max(v)} spread {spread*100:.1f}%')
                if spread >= .05: problems.append(f'sprite {o} height spread {spread*100:.1f}% ' + str(sorted(L, key=lambda x: x[2])[:3]) + str(sorted(L, key=lambda x: x[2])[-3:]))
            for deg in [90, 45, 0, 315, 270, 225, 180, 135]:
                pg.evaluate(f'G.moveDir({deg}, 500)'); pg.wait_for_timeout(560)
            shot('16_walked')
        click('#btn-menu'); pg.wait_for_timeout(1200); pg.wait_for_function('window.__ready'); shot('17_back_title')
        ctx.close()
    b.close()
srv.shutdown()
print('PROBLEMS', len(problems)); print('\n'.join(problems)); print('console errors:', errs)
sys.exit(1 if errs else 0)

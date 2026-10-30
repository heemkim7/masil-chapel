# place switcher: label, list, switching changes room id (reconnect target)
from playwright.sync_api import sync_playwright
ok=0;bad=[]
def chk(c,m):
    global ok
    if c: ok+=1
    else: bad.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']); pg=b.new_page(viewport={'width':390,'height':844})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://127.0.0.1:8765/'); pg.evaluate('localStorage.clear();localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready',timeout=60000)
    pg.evaluate("G.start('테스트','basic')"); pg.wait_for_timeout(1500); pg.evaluate('G.closeModal&&G.closeModal()'); pg.wait_for_timeout(800)
    V="G.V"
    chk(pg.evaluate(f"{V}.current().cd")=='0','start plaza')
    chk('모두의 광장' in pg.inner_text('#dongbtn'),'label plaza')
    pg.click('#dongbtn'); pg.wait_for_timeout(600)
    chk('장소 이동' in pg.inner_text('#dname'),'dialog opens'); pg.screenshot(path='shots/ui/places_390.png')
    pg.evaluate('G.closeModal()')
    pg.evaluate(f"{V}.setDong('1168064000')"); pg.wait_for_timeout(500)
    home=pg.evaluate(f"{V}.current()"); chk(home and home['cd']!='0','set home')
    chk(pg.evaluate(f"{V}.room('in')").startswith('d'+home['cd']),'room home')
    pg.evaluate(f"{V}.goPlace('plaza')"); chk(pg.evaluate(f"{V}.room('in')")=='d0:in','room plaza after switch')
    chk('모두의 광장' in pg.inner_text('#dongbtn'),'label plaza 2')
    pg.evaluate(f"{V}.goPlace('home')"); chk(pg.evaluate(f"{V}.current().cd")==home['cd'],'back home')
    idx=pg.evaluate(f"{V}.index().then(I=>I.find(d=>d.cd!=='{home['cd']}').cd)")
    pg.evaluate(f"{V}.setDong('{idx}',{{visit:true}})"); pg.wait_for_timeout(300)
    chk(pg.evaluate(f"{V}.current().cd")==idx,'visit'); chk(pg.evaluate("G.S.recent.length")==1,'recent')
    pg.click('#dongbtn'); pg.wait_for_timeout(600); t=pg.inner_text('#dopts')
    chk('모두의 광장' in t and '우리 동네' in t and '🧳' not in t and '지금 여기' in t,'list items:'+t)
    pg.screenshot(path='shots/ui/places_list_390.png')
    chk(not errs,'errors:'+str(errs))
    b.close()
print(ok,'pass',bad)

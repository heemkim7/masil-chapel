import json,sys
from playwright.sync_api import sync_playwright
tag=sys.argv[1]
VP=[(1920,1080),(1366,768),(1280,800),(768,1024),(390,844),(360,740)]
JS=r"""() => { const out=[]; const vis=e=>{const r=e.getBoundingClientRect(); if(r.width<2||r.height<2) return null; const cs=getComputedStyle(e); if(cs.visibility==='hidden'||+cs.opacity<.05) return null; let p=e; while(p){ if(getComputedStyle(p).display==='none') return null; p=p.parentElement;} if(r.right<0||r.bottom<0||r.left>innerWidth||r.top>innerHeight) return null; const cx=Math.min(innerWidth-1,Math.max(0,r.left+r.width/2)), cy=Math.min(innerHeight-1,Math.max(0,r.top+r.height/2)); const top=document.elementFromPoint(cx,cy); const hit=top&&(e===top||e.contains(top)); return {r:[r.left,r.top,r.width,r.height].map(Math.round),hit}; };
 for (const e of document.querySelectorAll('button,a,[role=button],input,select,#minimap,.pill')) { const v=vis(e); if(!v) continue; const id=e.id||(e.className&&String(e.className).slice(0,30))||e.tagName; out.push({id, t:(e.innerText||'').trim().slice(0,14), ...v}); }
 const small=out.filter(o=>(o.r[2]<44||o.r[3]<44)&&o.hit); const ov=[]; const H=out.filter(o=>o.hit); for(let i=0;i<H.length;i++)for(let j=i+1;j<H.length;j++){const a=H[i].r,b=H[j].r; const x=Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]), y=Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]); if(x>2&&y>2){ ov.push([H[i].id+'/'+H[i].t,H[j].id+'/'+H[j].t,x,y]); }}
 const covered=out.filter(o=>!o.hit).map(o=>o.id+'/'+o.t);
 return {n:out.length,small:small.map(o=>o.id+'/'+o.t+' '+o.r[2]+'x'+o.r[3]),ov,covered}; }"""
res={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for w,h in VP:
        m=w<800; pg=b.new_page(viewport={'width':w,'height':h},has_touch=m,is_mobile=m)
        pg.goto('http://127.0.0.1:8765/'); pg.evaluate('localStorage.clear();localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready',timeout=60000)
        pg.wait_for_timeout(800); pg.screenshot(path=f'shots/ux/{tag}_{w}_title.png'); res[f'{w}_title']=pg.evaluate(JS)
        pg.evaluate("G.start('테스트','basic')"); pg.wait_for_timeout(1500); pg.screenshot(path=f'shots/ux/{tag}_{w}_onb.png'); res[f'{w}_onb']=pg.evaluate(JS)
        pg.evaluate('G.closeModal()'); pg.wait_for_timeout(5000); pg.screenshot(path=f'shots/ux/{tag}_{w}_world.png'); res[f'{w}_world']=pg.evaluate(JS)
        pg.evaluate("G.enterChapel()"); pg.wait_for_timeout(2500); pg.screenshot(path=f'shots/ux/{tag}_{w}_chapel.png'); res[f'{w}_chapel']=pg.evaluate(JS)
        pg.evaluate("WH.enter()"); pg.wait_for_timeout(2000); pg.screenshot(path=f'shots/ux/{tag}_{w}_wh.png'); res[f'{w}_wh']=pg.evaluate(JS)
        pg.evaluate("WH.sheet('comm')"); pg.wait_for_timeout(800); pg.screenshot(path=f'shots/ux/{tag}_{w}_whsheet.png'); res[f'{w}_whsheet']=pg.evaluate(JS)
        pg.close()
    b.close()
json.dump(res,open(f'shots/ux/{tag}.json','w'),ensure_ascii=False,indent=1)
for k,v in res.items(): print(k,'n',v['n'],'small',len(v['small']),'ov',len(v['ov']),'covered',len(v['covered']))

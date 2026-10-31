#!/usr/bin/env python3
"""Cost pass build step (run before every deploy; idempotent).
1) assets/**.png (no mask/bak/icon/og) -> lossy WebP sibling (q90, alpha 100, exact RGB under alpha)
2) asset-manifest.json: {path: sha1[:10]} for every file under assets/ -> SW serves /assets/X?v=hash (immutable, versioned)
3) stamps sw.js BUILD with a hash of the manifest so clients pick up new versions."""
import os,hashlib,json,re,sys
from PIL import Image
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));os.chdir(R)
SKIP=re.compile(r'(mask|bak|icon\d*|og)[^/]*\.png$|/diag_src/|_bak/')
n=0
for d,_,fs in os.walk('assets'):
  for f in fs:
    p=os.path.join(d,f)
    if not f.endswith('.png') or SKIP.search(p): continue
    w=p[:-4]+'.webp'
    if os.path.exists(w) and os.path.getmtime(w)>=os.path.getmtime(p): continue
    Image.open(p).save(w,'WEBP',quality=90,alpha_quality=100,method=6,exact=True);n+=1
man={}
for d,_,fs in os.walk('assets'):
  if 'bak' in d: continue
  for f in fs:
    p=os.path.join(d,f).replace(os.sep,'/');man[p]=hashlib.sha1(open(p,'rb').read()).hexdigest()[:10]
s=json.dumps(man,sort_keys=True,separators=(',',':'));open('asset-manifest.json','w').write(s)
b=hashlib.sha1(s.encode()+open('sw.js','rb').read().split(b'\n',1)[1]).hexdigest()[:10]
sw=open('sw.js').read().split('\n',1);open('sw.js','w').write(f"const BUILD = '{b}';\n"+sw[1])
print('webp new',n,'manifest',len(man),'build',b)

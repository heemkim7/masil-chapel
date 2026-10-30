# v7 village ground: procedural pastel painted ground for a 7200x4800 world. Writes low-res base, HD tiles, walk mask.
import numpy as np, cv2, json, os
from PIL import Image
W,H=7200,4800; S=2   # HD render = world/2 = 3600x2400
w,h=W//S,H//S; rng=np.random.default_rng(7)
def noise(sc,amp):
    n=rng.random((h//sc+2,w//sc+2)).astype(np.float32); return cv2.resize(n,(w,h),interpolation=cv2.INTER_CUBIC)*amp
yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
img=np.zeros((h,w,3),np.float32)
grass=np.array([150,205,128],np.float32); g2=np.array([176,222,140],np.float32)
t=np.clip(noise(120,1)*.6+noise(30,1)*.3+noise(6,1)*.1,0,1)[...,None]; img[:]=grass*(1-t)+g2*t
# blade speckle
sp=rng.random((h,w))>.985; img[sp]=img[sp]*.85
# helpers
def dist_poly(pts,width):
    m=np.zeros((h,w),np.uint8); cv2.polylines(m,[np.array(pts,np.int32)//S],False,255,int(width/S)); return m
def soft(m,b=9): return cv2.GaussianBlur(m.astype(np.float32)/255,(0,0),b)[...,None]
def paint(m,col,b=6,tex=True):
    a=soft(m,b); c=np.array(col,np.float32)
    if tex: c=c*(1+(noise(4,.12)-.06))[...,None]
    img[:]=img*(1-a)+c*a
L=json.load(open('tools/village_layout.json'))
# lake (sand rim, water)
lx,ly,rx,ry=L['lake']; m=np.zeros((h,w),np.uint8); cv2.ellipse(m,(lx//S,ly//S),((rx+90)//S,(ry+60)//S),0,0,360,255,-1); paint(m,[236,220,176],8)
m=np.zeros((h,w),np.uint8); cv2.ellipse(m,(lx//S,ly//S),(rx//S,ry//S),0,0,360,255,-1); a=soft(m,6)
d=np.sqrt(((xx-lx/S)/(rx/S))**2+((yy-ly/S)/(ry/S))**2); wc=np.stack([150+60*d,205+25*d,240+5*d],-1).clip(0,255)+noise(20,12)[...,None]
img[:]=img*(1-a)+wc*a
for k in range(40):  # sparkles / lily pads
    ang=rng.random()*6.28; r=rng.random()*.85; px=int((lx+np.cos(ang)*rx*r)/S); py=int((ly+np.sin(ang)*ry*r)/S)
    if k%3==0: cv2.ellipse(img,(px,py),(14,8),0,20,340,(110,180,110),-1); cv2.circle(img,(px+4,py-3),4,(245,180,210),-1)
    else: cv2.ellipse(img,(px,py),(18,3),0,0,360,(235,248,255),-1)
# paths
for p in L['paths']: paint(dist_poly(p['pts'],p['w']+26),[205,180,140],5,False); paint(dist_poly(p['pts'],p['w']),p.get('c',[238,222,190]),4)
# plaza
for c in L['plazas']:
    m=np.zeros((h,w),np.uint8); cv2.circle(m,(c[0]//S,c[1]//S),c[2]//S+14,255,-1); paint(m,[205,180,140],4,False)
    m=np.zeros((h,w),np.uint8); cv2.circle(m,(c[0]//S,c[1]//S),c[2]//S,255,-1); paint(m,[240,226,200],3)
    for r in range(40,c[2]//S,46): cv2.circle(img,(c[0]//S,c[1]//S),r,(220,200,170),2)
# park sand
for c in L['sand']:
    m=np.zeros((h,w),np.uint8); cv2.ellipse(m,(c[0]//S,c[1]//S),(c[2]//S,c[3]//S),0,0,360,255,-1); paint(m,[240,222,170],8)
# cobble dots on paths
pm=np.zeros((h,w),np.uint8)
for p in L['paths']: cv2.polylines(pm,[np.array(p['pts'],np.int32)//S],False,255,int(p['w']/S)-10)
ys,xs=np.nonzero(pm[::9,::9]); 
for y0,x0 in zip(ys*9,xs*9):
    if rng.random()<.5: cv2.ellipse(img,(int(x0+rng.integers(-3,3)),int(y0)),(7,4),0,0,360,(222,204,172),1)
# flowers on grass
cols=[(255,170,200),(255,240,150),(200,170,255),(255,255,255),(255,190,150)]
for _ in range(5000):
    x0=int(rng.random()*w); y0=int(rng.random()*h)
    if pm[y0,x0] or abs(img[y0,x0,2]-img[y0,x0,1])>60: continue
    c=cols[rng.integers(5)]; cv2.circle(img,(x0,y0),3,c,-1); cv2.circle(img,(x0,y0),1,(255,230,120),-1)
# edge vignette: hedges border
m=np.zeros((h,w),np.uint8); cv2.rectangle(m,(0,0),(w-1,h-1),255,int(220/S)); paint(m,[104,168,104],18)
img=cv2.GaussianBlur(img,(0,0),.7).clip(0,255).astype(np.uint8)
im=Image.fromarray(img); os.makedirs('assets/village_hd',exist_ok=True)
im.resize((1800,1200),Image.LANCZOS).save('assets/village_lo.jpg',quality=86)
T=1024; cols_=-(-w//T); rows=-(-h//T)
for r in range(rows):
    for c in range(cols_): im.crop((c*T,r*T,min(w,(c+1)*T),min(h,(r+1)*T))).save(f'assets/village_hd/t_{r}_{c}.webp','WEBP',quality=84)
json.dump({'tile':T,'W':w,'H':h,'cols':cols_,'rows':rows},open('assets/village_hd/meta.json','w'))
# walk mask 720x480 (1 px = 10 world)
mk=np.full((480,720),255,np.uint8); cv2.rectangle(mk,(0,0),(719,479),0,14)
cv2.ellipse(mk,(lx//10,ly//10),(rx//10-4,ry//10-4),0,0,360,0,-1)
Image.fromarray(mk).save('assets/village_mask.png')
im.resize((900,600)).save('/tmp/village_prev.jpg')

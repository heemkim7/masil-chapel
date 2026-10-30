"""v2 hair repair: restore pre-scalp hair, fill scalp by per-column vertical STRETCH of the hair's own
lower half (continuous strands, no tiling bands), close tiny holes / ear peek-throughs, drop shirt flecks,
then anti-alias the silhouette (supersampled gaussian smoothing; stronger on hair edges over face skin)."""
import sys, glob, numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, __file__.rsplit('/',1)[0]); from scalp_fill import zone, N
PRE='/workspace/mk/bak/norm_pre_scalp_2205'
def nearest_fill(hr, a, m):
    _,(iy,ix)=nd.distance_transform_edt(~a,return_indices=True)
    hr[m,:3]=hr[iy[m],ix[m],:3]; hr[m,3]=255
def stretch_fill(hr, a, z):
    src=hr.copy()
    for x in np.where(z.any(0))[0]:
        ys=np.where(z[:,x])[0]; col=np.where(a[:,x])[0]
        if not len(col): continue
        # contiguous hair run that ends just above the fill
        yb=col[col<ys.max()].max() if (col<ys.max()).any() else None
        if yb is None: continue
        y0=yb
        while y0-1>=0 and a[y0-1,x]: y0-=1
        ye=ys.max(); L=yb-y0+1
        if L<4: continue
        ym=y0+L//3                      # keep the top third, stretch the rest down to ye
        for y in range(ym,ye+1):
            sy=ym+(y-ym)*(yb-ym)/max(ye-ym,1)
            s0=int(sy); f=sy-s0; s1=min(s0+1,yb)
            hr[y,x,:3]=((1-f)*src[s0,x,:3]+f*src[s1,x,:3]).astype(np.uint8); hr[y,x,3]=255
def run(ch,h,d):
    p=f'{N}/{ch}_hair_{h}_{d}.png'
    hr=np.array(Image.open(f'{PRE}/{ch}_hair_{h}_{d}.png').convert('RGBA'))
    b=np.array(Image.open(f'{N}/{ch}_base_{d}.png').convert('RGBA')).astype(int)
    ba=b[...,3]>128; r,g,bl=b[...,0],b[...,1],b[...,2]
    skin=ba&(r>150)&(r>g+10)&(g>bl)
    t=np.where(ba.any(1))[0][0]
    a=hr[...,3]>128; hr[~a]=0
    z=zone(ch,d)
    if (z&~a).any():
        a0=a.copy(); stretch_fill(hr,a,z&~a|(z&a)); a=hr[...,3]>128
        fz=nd.binary_dilation(a&~a0,iterations=1)&a
        bl=hr[...,:3].astype(float)
        for c in range(3): bl[...,c]=nd.gaussian_filter1d(bl[...,c],1.2,axis=1)
        hr[fz,:3]=bl[fz].astype(np.uint8)
        rest=z&~a
        if rest.any(): nearest_fill(hr,a,rest); a=hr[...,3]>128
    # shirt flecks: whitish hair pixels sitting over the base's white shirt, plus tiny islands
    lum=hr[...,:3].astype(int)
    shirt=ba&(b[...,:3].min(-1)>200)
    yy=np.arange(a.shape[0])[:,None]
    wh=a&(lum.min(-1)>200)&(shirt|(yy>=140))
    wh=nd.binary_dilation(wh,iterations=1)&a&(yy>=140)&(lum.min(-1)>120)
    hr[wh]=0; a=hr[...,3]>128
    lab,n=nd.label(a); sz=nd.sum(a,lab,range(1,n+1))
    for i,s in enumerate(sz):
        if s<25: hr[lab==i+1]=0
    a=hr[...,3]>128
    # tiny enclosed holes (green holes) and ear/skin peek-throughs in the head region
    head=np.zeros_like(a); w=ba.sum(1); mx=w[:t+120].argmax(); nk=mx+np.argmax(w[mx:]<0.55*w[mx]); head[:nk+4]=True
    holes=nd.binary_fill_holes(a)&~a
    cl=nd.binary_closing(a,iterations=3)&~a&head
    cand=holes|cl
    lab,n=nd.label(cand)
    m=np.zeros_like(a)
    for i in range(1,n+1):
        c=lab==i
        if c.sum()<=60: m|=c
    if m.any(): nearest_fill(hr,a,m); a=hr[...,3]>128
    # hair-to-head contact: background gaps squeezed between hair and head -> hair
    gap=nd.binary_closing(a|ba,iterations=4)&~a&~ba&head
    gap&=nd.binary_dilation(a,iterations=4)&nd.binary_dilation(ba,iterations=4)
    if gap.any(): nearest_fill(hr,a,gap); a=hr[...,3]>128
    # stray visible skin slivers (ear fragments) mostly wrapped by hair
    vis=skin&~a&head; lab,n=nd.label(vis); m=np.zeros_like(a)
    for i in range(1,n+1):
        c=lab==i
        if c.sum()<=120:
            ring=nd.binary_dilation(c,iterations=2)&~c
            if (a[ring]).mean()>0.45: m|=c
    if m.any(): nearest_fill(hr,a,m); a=hr[...,3]>128
    # anti-alias: supersample x4, gaussian, threshold -> box-downsample to fractional alpha
    S=4
    up=np.kron(a.astype(float),np.ones((S,S)))
    edge_face=nd.binary_dilation(a,iterations=2)&nd.binary_dilation(skin&~a,iterations=2)&head
    sm_mild=nd.gaussian_filter(up,1.6)>0.5
    sm_str=nd.gaussian_filter(up,5.0)>0.5
    ef=np.kron(edge_face.astype(float),np.ones((S,S)))>0
    ef=nd.gaussian_filter(ef.astype(float),3)>0.3
    sm=np.where(ef,sm_str,sm_mild)
    sm=nd.gaussian_filter(sm.astype(float),1.2)     # soft 1px ramp
    al=sm.reshape(200 if False else a.shape[0],S,a.shape[1],S).mean((1,3))
    # zone must stay opaque (bald check)
    al=np.where(z,np.maximum(al,1.0),al)
    new=(al>0.02)&~a
    if new.any(): nearest_fill(hr,a,new)
    hr[...,3]=(np.clip(al,0,1)*255).astype(np.uint8)
    hr[hr[...,3]==0,:3]=0
    for _ in range(3):
        a2=hr[...,3]>128
        g2=nd.binary_closing(a2|ba,iterations=4)&~a2&~ba&head&nd.binary_dilation(a2,iterations=4)&nd.binary_dilation(ba,iterations=4)
        if not g2.any(): break
        hr[g2,3]=255; aa=hr[...,3]>200; _,(iy,ix)=nd.distance_transform_edt(~aa,return_indices=True)
        hr[g2,:3]=hr[iy[g2],ix[g2],:3]
    Image.fromarray(hr).save(p)
if __name__=='__main__':
    for ch in('player','boy'):
        for f in sorted(glob.glob(f'{N}/{ch}_hair_*_S.png')):
            h=f.split('_hair_')[1][:-6]
            for d in('S','SW','W','NW','N'): run(ch,h,d)
    print('done')

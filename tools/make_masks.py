# per base sheet -> mask sheet (R=hair, G=skin, B=outfit), same layout; cell = 200x284
import sys, numpy as np, colorsys
from PIL import Image
from scipy import ndimage
def hsv(a):
    r,g,b=[a[...,i]/255. for i in range(3)]; mx=np.max(a[...,:3],2)/255.; mn=np.min(a[...,:3],2)/255.; d=mx-mn+1e-6
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60; s=np.where(mx>0,d/(mx+1e-6),0); return h,s,mx
def run(src,out,kind):
    A=np.asarray(Image.open(src).convert('RGBA')).astype(int); H,W,_=A.shape; M=np.zeros((H,W,4),np.uint8)
    h,s,v=hsv(A); op=A[...,3]>30; R,G,B=A[...,0],A[...,1],A[...,2]
    # global skin reference: face pixels of the first (front idle) cell
    bc=max(((cy,cx) for cy in range(0,H,284) for cx in range(0,W,200)),key=lambda t:((A[t[0]:t[0]+140,t[1]:t[1]+200,0]-A[t[0]:t[0]+140,t[1]:t[1]+200,2]>38)&(A[t[0]:t[0]+140,t[1]:t[1]+200,3]>30)&(A[t[0]:t[0]+140,t[1]:t[1]+200,0]>200)).sum()); f=(slice(bc[0],bc[0]+140),slice(bc[1],bc[1]+200)); c0=op[f]&(R[f]-B[f]>38)&(R[f]-G[f]>14)&(v[f]>.6)&(h[f]<40)&~(((h[f]>300)|(h[f]<12))&(s[f]>.22))&(v[f]<.99)
    px=A[f][...,:3][c0].astype(float); REF=(np.median(px/px.sum(1,keepdims=True),0),np.median(s[f][c0]))
    for cy in range(0,H,284):
      for cx in range(0,W,200):
        sl=(slice(cy,cy+284),slice(cx,cx+200)); o=op[sl]
        if o.sum()<50: continue
        ys=np.where(o.any(1))[0]; top,bot=ys.min(),ys.max(); fh=bot-top; yy=np.arange(284)[:,None]+0*np.arange(200)[None]
        upper=yy<top+fh*0.58
        if kind=='girl': hair=o&upper&(((h[sl]>300)|(h[sl]<12))&(s[sl]>.22))
        else:
            dk=o&upper&(v[sl]<.5); lb,k=ndimage.label(dk); hair=np.zeros_like(dk)
            if k:
                sz=ndimage.sum(dk,lb,range(1,k+1));
                for i,z in enumerate(sz):
                    if z>500: hair|=lb==i+1
            hair=ndimage.binary_closing(hair,iterations=1)&o&(v[sl]<.62)
        cand=o&~hair&(R[sl]-B[sl]>38)&(R[sl]-G[sl]>14)&(v[sl]>.55)&(h[sl]<40)&(s[sl]<.55)
        cc=A[sl][...,:3]/(A[sl][...,:3].sum(2,keepdims=True)+1e-6); dist=np.abs(cc-REF[0]).sum(2)
        skin=cand&(dist<.04)&(np.abs(s[sl]-REF[1])<.1)
        skin=ndimage.binary_opening(skin,iterations=1)|(cand&(yy<top+fh*0.5)&(dist<.06))
        hd=yy<top+fh*0.52; sk2=ndimage.binary_fill_holes(ndimage.binary_closing(skin&hd,iterations=4))
        lowsat=(s[sl]<.62)&(v[sl]>.42)&~(((h[sl]>40)&(h[sl]<300))&(s[sl]>.25))
        bs=ndimage.binary_closing(skin&~hd,iterations=2)&o&~hair&~hd; lb,k=ndimage.label(bs); keepb=np.zeros_like(bs)
        for i,sl2 in enumerate(ndimage.find_objects(lb)):
            hh=sl2[0].stop-sl2[0].start; ww=sl2[1].stop-sl2[1].start; ar=max(hh,ww)/max(1,min(hh,ww)); area=(lb[sl2]==i+1).sum()
            if (ar<2.6 and area<700) or sl2[0].start>top+fh*.78: keepb|=lb==i+1
        skin=(sk2&o&~hair&lowsat&hd)|keepb
        # face/hand skin only; outfit = body region below neck that isn't skin
        outfit=o&~hair&~skin&(yy>top+fh*0.47)
        m=M[sl]; m[...,0]=hair*255; m[...,1]=skin*255; m[...,2]=outfit*255; m[...,3]=255
    Image.fromarray(M).save(out)
for f,k in [('player_basic','girl'),('player_choir','girl'),('player_mint','girl'),('boy_basic','boy'),('boy_mint','boy')]:
    run(f'assets/characters/sheets/{f}.png',f'assets/characters/sheets/{f}_mask.png',k)
print('ok')

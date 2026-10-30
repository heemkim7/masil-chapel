"""Fill bald scalp: base-head skin pixels inside the reference bob mask (scalp zone) that a hair layer
leaves uncovered get the colour of the nearest hair pixel."""
import sys, glob, numpy as np
from PIL import Image
from scipy import ndimage as nd
N='/workspace/mk/norm'
def zone(ch,d):
    b=np.array(Image.open(f'{N}/{ch}_base_{d}.png').convert('RGBA')).astype(int)
    ref=np.array(Image.open(f'/workspace/mk/norm_ref/{ch}_hair_base_{d}.png'))[...,3]>128
    ba=b[...,3]>128; t=np.where(ba.any(1))[0][0]
    r,g,bl=b[...,0],b[...,1],b[...,2]
    skin=ba&(r>150)&(r>g+10)&(g>bl)
    z=np.zeros_like(ba)
    if d in('S','SW'): z[t:t+18]=True
    elif d=='W':
        z[t:t+22]=True
        cols=np.where(ba.any(0))[0]; cx=(cols[0]+cols[-1])//2
        z[:t+70,cx+6:]=True          # back half of the side head (behind ear)
    else:
        w=ba.sum(1); mx=w[:t+120].argmax(); nk=mx+np.argmax(w[mx:]<0.55*w[mx])
        z[:nk]=True                  # back views: whole head down to where neck starts
    if d in('NW','N'): ref=nd.binary_dilation(ref,iterations=6)&ba
    return skin&ref&z
def fill(ch,h,d):
    p=f'{N}/{ch}_hair_{h}_{d}.png'; hr=np.array(Image.open(p).convert('RGBA'))
    a=hr[...,3]>128; z=zone(ch,d)&~a
    if not z.any(): return 0
    # extend this hair's own strands downward (column-wise, mirrored tiling of the last 10 rows above)
    ys,xs=np.where(z); src=hr.copy()
    _,(iy,ix)=nd.distance_transform_edt(~a,return_indices=True)
    for y,x in zip(ys,xs):
        col=np.where(a[:y,x])[0]
        if len(col):
            yb=col.max(); top=col[col>=yb-14]
            k=(y-yb)%20; sy=yb-3-(k if k<10 else 19-k)
            sy=max(sy,top.min()); hr[y,x,:3]=src[sy,x,:3]
        else: hr[y,x,:3]=src[iy[y,x],ix[y,x],:3]
        hr[y,x,3]=255
    Image.fromarray(hr).save(p); return int(z.sum())
if __name__=='__main__' and '--smooth' not in sys.argv:
    for ch in('player','boy'):
        for f in sorted(glob.glob(f'{N}/{ch}_hair_*_S.png')):
            h=f.split('_hair_')[1][:-6]
            for d in('S','SW','W','NW','N'):
                n=fill(ch,h,d)
                if n: print(ch,h,d,n)

def smooth_hairline(ch,h,d):
    """Back/side views: replace stair-stepped hair bottom over skin by a smooth envelope."""
    p=f'{N}/{ch}_hair_{h}_{d}.png'; hr=np.array(Image.open(p).convert('RGBA'))
    b=np.array(Image.open(f'{N}/{ch}_base_{d}.png').convert('RGBA')).astype(int)
    ba=b[...,3]>128; t=np.where(ba.any(1))[0][0]
    r,g,bl=b[...,0],b[...,1],b[...,2]; skin=ba&(r>150)&(r>g+10)&(g>bl)
    w=ba.sum(1); mx=w[:t+120].argmax(); lim=mx+np.argmax(w[mx:]<0.55*w[mx]) if d!='W' else t+(80 if ch=='player' else 58)
    a=hr[...,3]>128
    ov=a&skin; ov[lim:]=False
    if d=='W':
        cols=np.where(ba.any(0))[0]; ov[:,:(cols[0]+cols[-1])//2+6]=False
    cs=np.where(ov.any(0))[0]
    if len(cs)<5: return 0
    bot=np.full(200,-1.0)
    for c in cs: bot[c]=np.where(ov[:,c])[0].max()
    v=bot[cs]; env=nd.uniform_filter1d(nd.maximum_filter1d(v,15),11)
    z=np.zeros_like(a)
    for c,e in zip(cs,env):
        z[:int(round(e))+1,c]=True
    z&=skin&~a
    if not z.any(): return 0
    don=np.array(Image.open(f'{N}/{ch}_hair_base_{d}.png').convert('RGBA')).astype(float)
    core=a&(hr[...,:3].max(-1)>90); dm=don[...,3]>128
    k=np.median(hr[core][:,:3],0)/np.median(don[dm&(don[...,:3].max(-1)>90)][:,:3],0)
    col=np.clip(don[...,:3]*k,0,255)
    hr[z,:3]=col[z].astype(np.uint8); hr[z,3]=255
    # chocolate rim on the new lower edge (over skin) to match the drawn outline
    a2=hr[...,3]>128; edge=a2&~nd.binary_erosion(a2)&nd.binary_dilation(z,iterations=1)
    below=np.zeros_like(a2); below[:-1]=~a2[1:]&skin[1:]
    e=edge&below; hr[e,:3]=(0.6*np.array([58,35,20])+0.4*hr[e,:3]).astype(np.uint8)
    Image.fromarray(hr).save(p); return int(z.sum())
if __name__=='__main__' and '--smooth' in sys.argv:
    for ch in('player','boy'):
        for f in sorted(glob.glob(f'{N}/{ch}_hair_*_S.png')):
            h=f.split('_hair_')[1][:-6]
            if h=='base': continue
            for d in('W','NW','N'):
                n=smooth_hairline(ch,h,d)
                if n: print(ch,h,d,n,end='; ')

import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
src, R, C, prefix, tol = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], int(sys.argv[5])
G = np.asarray(Image.open(src).convert('RGB')).astype(int); H, W, _ = G.shape
bgc = np.median(np.r_[G[:4].reshape(-1,3), G[-4:].reshape(-1,3)], 0)
d = np.abs(G - bgc).max(2); fgm = d > tol
fgm = ndimage.binary_fill_holes(ndimage.binary_closing(fgm, iterations=2))
A = (np.asarray(Image.fromarray((fgm*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)))).astype(np.uint8)
ch, cw = H / R, W / C; n = 0
for r in range(R):
  for c in range(C):
    y0,y1,x0,x1=int(r*ch),int((r+1)*ch),int(c*cw),int((c+1)*cw)
    m=fgm[y0:y1,x0:x1]; lb,k=ndimage.label(m)
    if not k: print('empty',r,c); continue
    s=ndimage.sum(m,lb,range(1,k+1)); keep=np.isin(lb,[i+1 for i,v in enumerate(s) if v>s.max()*.03])
    ys,xs=np.where(keep); a=np.where(ndimage.binary_dilation(keep,iterations=2),A[y0:y1,x0:x1],0)
    t=np.dstack([G[y0:y1,x0:x1].astype(np.uint8),a])[ys.min():ys.max()+1,xs.min():xs.max()+1]
    im=Image.fromarray(t); im.thumbnail((128,128),Image.LANCZOS); im.save(f'{prefix}{n:02d}.png'); n+=1
print(n)

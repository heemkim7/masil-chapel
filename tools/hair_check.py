"""Automated hair gate. For every hair x direction: composite over base, count bald skin pixels in the
scalp zone (crown band on S/SW, crown+behind-ear on W, whole head above the neck on NW/N), and check the
hair top vs base head top (hair must start at/above the head top, and not float > 70px above)."""
import sys, glob, numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0]); from scalp_fill import zone, N
def check(ch, h, d):
    b = np.array(Image.open(f'{N}/{ch}_base_{d}.png'))[..., 3] > 128; t = np.where(b.any(1))[0][0]
    a = np.array(Image.open(f'{N}/{ch}_hair_{h}_{d}.png'))[..., 3] > 128
    bald = int((zone(ch, d) & ~a).sum())
    ht = np.where(a.any(1))[0][0]; off = int(ht - t)
    cols = np.where(b[t + 3])[0]; cov = a[t + 3, cols].mean()   # hair must sit on the crown
    from scipy import ndimage as nd
    w=b.sum(1); mx=w[:t+120].argmax(); nk=mx+np.argmax(w[mx:]<0.55*w[mx]); head=np.zeros_like(b); head[:nk+4]=True
    gap=nd.binary_closing(a|b,iterations=4)&~a&~b&head&nd.binary_dilation(a,iterations=4)&nd.binary_dilation(b,iterations=4)
    return bald, off, cov, int(gap.sum())
if __name__ == '__main__':
    bad = 0; n = 0
    print('char hair dir bald_px top_offset crown_cov result')
    for ch in ('player', 'boy'):
        for f in sorted(glob.glob(f'{N}/{ch}_hair_*_S.png')):
            h = f.split('_hair_')[1][:-6]
            for d in ('S', 'SW', 'W', 'NW', 'N'):
                bald, off, cov, gap = check(ch, h, d); ok = bald == 0 and gap == 0 and -70 <= off <= 0 and cov >= .95
                bad += not ok; n += 1
                print(ch, h, d, bald, off, f'{cov:.2f}', 'gap', gap, 'OK' if ok else 'FAIL')
    print('FAILS', bad, 'of', n); sys.exit(1 if bad else 0)

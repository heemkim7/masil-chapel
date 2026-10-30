# Region masks for the canonical bald base: R=eyes/brows/mouth (face detail), G=skin, B=underwear cloth (tee+shorts), A=shoes/socks
import glob, numpy as np
from PIL import Image
for p in sorted(glob.glob('/workspace/mk/base/*_walk_*_?.png')):
    a = np.array(Image.open(p)).astype(int); S = a[..., 3] > 0; r, g, b = a[..., 0], a[..., 1], a[..., 2]
    ys = np.where(S.any(1))[0]; bot = ys.max(); Y = np.arange(a.shape[0])[:, None]
    skin = S & (r - b > 35) & (r > 150); white = S & (a[..., :3].min(2) > 185) & (np.ptp(a[..., :3], 2) < 45)
    shoes = white & (Y > bot - 22); cloth = white & ~shoes; face = S & ~skin & ~white & (a[..., :3].max(2) < 170) & (Y < ys.min() + (bot - ys.min()) * .5)
    m = np.zeros(a.shape, np.uint8); m[..., 0] = face * 255; m[..., 1] = skin * 255; m[..., 2] = cloth * 255; m[..., 3] = shoes * 255
    Image.fromarray(m, 'RGBA').save(p.replace('.png', '_mask.png'))
print('ok')

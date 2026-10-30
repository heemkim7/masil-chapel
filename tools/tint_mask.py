"""Tint mask for a garment layer: pixels whose chroma is near the garment's dominant colour.
python3 tools/tint_mask.py boy mint  -> /workspace/mk/norm/<ch>_outfit_<name>_tint_<D>.png (alpha = mask, soft edge)
Preview: python3 tools/tint_mask.py --preview out.png"""
import sys; sys.path.insert(0, 'tools'); from normalize import PY; from layer_extract import chin_row
import numpy as np, scipy.ndimage as nd
from PIL import Image
N = '/workspace/mk/norm'; DIRS = ['S', 'SW', 'W', 'NW', 'N']
def chroma(c):
    v = np.maximum(c.max(2), 1)[..., None].astype(float); return np.stack([c[..., 0] - c[..., 1], c[..., 1] - c[..., 2], c[..., 0] - c[..., 2]], 2) / v
def mask(ch, name):
    for d in DIRS:
        a = np.array(Image.open(f'{N}/{ch}_outfit_{name}_{d}.png').convert('RGBA')); c = a[..., :3].astype(int); L = a[..., 3] > 127
        k = chroma(c); m = np.median(k[L & (c.max(2) > 90)], 0)
        base = np.array(Image.open(f'{N}/{ch}_base_{d}.png').convert('RGBA')); chin = chin_row(base)
        yy = np.arange(a.shape[0])[:, None]
        cut = chin + int((PY - chin) * (.5 if name == 'basic' else .8))   # hoodie stops at the waist, dress above the shoes
        tol = .2 if ch == 'player' else .12
        M = L & (np.abs(k - m).max(2) < tol) & (c.max(2) > 60) & (yy < cut)
        if ch == 'player': M = L & (yy < cut) & (c.max(2) > 60)   # one-piece dress: whole garment (back view goes near-white)
        M = nd.binary_closing(M, np.ones((5, 5))) & L & (yy < cut); M = nd.binary_opening(M, np.ones((2, 2)))
        lb, n = nd.label(M)
        if n > 1: sz = nd.sum(M, lb, range(1, n + 1)); M = np.isin(lb, 1 + np.where(sz >= 40)[0])
        al = nd.gaussian_filter(M.astype(float), .6) * L
        out = np.zeros_like(a); out[..., :3] = 255; out[..., 3] = (al * 255).astype(np.uint8)
        Image.fromarray(out).save(f'{N}/{ch}_outfit_{name}_tint_{d}.png'); print(ch, name, d, 'mask px', int(M.sum()), 'of', int(L.sum()))
def tint(layer, msk, rgb):
    c = layer[..., :3].astype(float); lum = c.mean(2, keepdims=True) / 255; base = np.array(rgb, float)
    t = np.clip(base * (0.62 + 0.42 * lum), 0, 255); w = msk[..., 3:4] / 255.
    o = layer.copy(); o[..., :3] = (c * (1 - w) + t * w).astype(np.uint8); return o
if __name__ == '__main__':
    if sys.argv[1] != '--preview': mask(sys.argv[1], sys.argv[2]); sys.exit()
    T = {'sky': (150, 200, 240), 'lav': (190, 170, 230), 'peach': (250, 190, 160), 'navy': (70, 90, 150)}
    rows = [('boy', 'mint', k) for k in ('sky', 'lav', 'peach')] + [('player', 'mint', k) for k in ('sky', 'lav', 'peach')] + [('boy', 'basic', 'navy')]
    W, H = 200, 284; sheet = Image.new('RGBA', (W * 5, H * len(rows)), (140, 195, 120, 255))
    for r, (ch, nm, tn) in enumerate(rows):
        for i, d in enumerate(DIRS):
            im = Image.open(f'{N}/{ch}_base_{d}.png').convert('RGBA')
            lay = np.array(Image.open(f'{N}/{ch}_outfit_{nm}_{d}.png').convert('RGBA')); mk = np.array(Image.open(f'{N}/{ch}_outfit_{nm}_tint_{d}.png'))
            im.alpha_composite(Image.fromarray(tint(lay, mk, T[tn])))
            hp = f'{N}/{ch}_hair_base_{d}.png'; im.alpha_composite(Image.open(hp).convert('RGBA'))
            sheet.alpha_composite(im, (i * W, r * H))
    sheet.save(sys.argv[2])

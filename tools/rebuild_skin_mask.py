# v10 skin masks = v9 masks (smooth, good on face/arms/legs) minus the khaki shorts, which v9 labelled as skin.
# Per frame: connected components of the skin label; a wide component sitting in the hip band is the shorts → moved to outfit (B).
# Pixel-colour tests can't separate the shorts from skin (same palette in the art), so this is purely geometric. v9 kept as *_v9bak.png
import os, shutil, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
A = json.load(open('assets/characters/atlas.json')); FW, FH = A['frameW'], A['frameH']
HOOD = 0
def cell(B, M):
    global HOOD
    a = B[..., 3]; rows = np.where((a > 40).any(1))[0]; G = M[..., 1].copy(); Bo = M[..., 2].copy()
    if not len(rows): return G, Bo, 0
    top, bot = rows[0], rows[-1]; fh = bot - top; cols = np.where((a > 40).any(0))[0]; cw = cols[-1] - cols[0]
    lab, n = nd.label(G > 8); moved = 0
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < 40: continue
        cy = ys.mean()
        if not HOOD and top + .55 * fh < cy < bot - .06 * fh and (xs.max() - xs.min()) > .30 * cw and ys.min() > top + .5 * fh:
            sel = lab == i
            # keep the lower legs: only rows above the narrowest-run point of this component (the hem → thigh split)
            Bo[sel] = 255; G[sel] = 0; moved += sel.sum()
    if HOOD:  # girls' hoodie: the shaded hood/collar under the chin was labelled skin → outfit
        r, g, b = [B[..., i].astype(float) for i in range(3)]; mx = np.maximum(np.maximum(r, g), b); sat = (mx - np.minimum(np.minimum(r, g), b)) / np.maximum(mx, 1)
        Y = np.arange(a.shape[0])[:, None]; X = np.arange(a.shape[1])[None, :]; cxm = (cols[0] + cols[-1]) / 2
        hood = (G > 8) & (Y > top + HOOD * fh) & (Y < top + .72 * fh) & (np.abs(X - cxm) < .32 * cw) & (sat < .30)
        Bo[hood] = 255; G[hood] = 0; moved += hood.sum()
    return G, Bo, moved
if __name__ == '__main__':
    for co, sh in A['sheets'].items():
        if co not in ('boy/basic', 'boy/mint', 'player/basic'):
            f = 'assets/characters/' + sh['img'].replace('.png', '_mask.png'); bak = f.replace('.png', '_v9bak.png')
            if os.path.exists(bak): shutil.copy(bak, f)
            continue
        HOOD = .44 if co == 'player/basic' else 0
        f = 'assets/characters/' + sh['img'].replace('.png', '_mask.png'); bak = f.replace('.png', '_v9bak.png')
        if not os.path.exists(bak): shutil.copy(f, bak)
        B = np.asarray(Image.open(f.replace('_mask', '')).convert('RGBA')); M = np.asarray(Image.open(bak).convert('RGBA')).copy(); tot = 0
        for x, y in {tuple(v[:2]) for v in sh['cells'].values()}:
            G, Bo, k = cell(B[y:y + FH, x:x + FW], M[y:y + FH, x:x + FW]); M[y:y + FH, x:x + FW, 1] = G; M[y:y + FH, x:x + FW, 2] = Bo; tot += k
        Image.fromarray(M).save(f); print(f, 'shorts px moved to outfit:', int(tot))

# v14 ROOT mask rebuild: per-pixel colour classification (Lab prototypes learned from the eroded cores of the v10 masks)
# + spatial priors + component cleanup + SOFT antialias weights.  R=hair w, G=skin w, B=outfit w, remainder = keep base colour
# (eyes, brows, mouth lines, shoes, flower clip).  Also repairs interior alpha holes in the base sheets.
# usage: python3 tools/clean_masks.py  (originals in /workspace/mk/bak)
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
from skimage.color import rgb2lab
from sklearn.cluster import KMeans
ROOT = 'assets/characters/'; A = json.load(open(ROOT + 'atlas.json')); FW, FH = A['frameW'], A['frameH']
BAK = '/workspace/mk/bak/'
SHEETS = {'player/basic': 'girl', 'player/choir': 'girl', 'player/mint': 'girl', 'boy/basic': 'boy', 'boy/mint': 'boy'}
HAIR, SKIN, OUT, KEEP = 0, 1, 2, 3
def protos(B, M, cells):
    pts = {0: [], 1: [], 2: []}
    for f, (x, y) in cells.items():
        b = B[y:y+FH, x:x+FW]; m = M[y:y+FH, x:x+FW]; op = b[..., 3] > 220; lab = rgb2lab(b[..., :3] / 255.)
        rg = b[..., 0].astype(int) - b[..., 1]
        for c in range(3):
            core = nd.binary_erosion((m[..., c] > 128) & op, iterations=3)
            if c == SKIN: core &= rg > 45
            if c == OUT: core &= ~((rg > 45) & (lab[..., 1] > 12))
            pts[c].append(lab[core])
    P = {}
    for c in range(3):
        X = np.concatenate(pts[c]); X = X[np.random.default_rng(0).choice(len(X), min(len(X), 40000), replace=False)]
        P[c] = KMeans(8, n_init=3, random_state=0).fit(X).cluster_centers_
    return P
def fix_alpha(b):
    a = b[..., 3]; sil = nd.binary_fill_holes(a > 25); inner = nd.binary_erosion(sil, iterations=2)
    hole = inner & (a < 255); b[..., 3][hole] = 255
    # de-fringe: antialias rim pixels carry the light matte of the old background -> light halo ring. Give every
    # semi-transparent pixel the RGB of the nearest solid pixel (alpha kept), i.e. clean straight alpha = correct premultiplied edge
    solid = b[..., 3] >= 230; rim = (b[..., 3] > 0) & ~solid
    if solid.any() and rim.any():
        _, (iy, ix) = nd.distance_transform_edt(~solid, return_indices=True)
        for c in range(3): b[..., c][rim] = b[..., c][iy[rim], ix[rim]]
    return int(hole.sum())
def cell(b, P, kind, back):
    a = b[..., 3]; op = a > 30; H, W = a.shape; lab = rgb2lab(b[..., :3] / 255.)
    rows = np.where(op.any(1))[0]
    if not len(rows): return np.zeros((H, W, 3), np.uint8)
    top, bot = rows[0], rows[-1]; fh = bot - top; Y = np.arange(H)[:, None] + 0 * np.arange(W)[None]
    d = np.stack([np.min(((lab[..., None, :] - P[c][None, None]) ** 2).sum(-1), -1) for c in range(3)], -1)
    d[..., HAIR][Y > top + .62 * fh] = 1e9; d[..., OUT][Y < top + (.38 if not back else .22) * fh] = 1e9
    L = np.argmin(d, -1); best = np.min(d, -1)
    rg = b[..., 0].astype(int) - b[..., 1]
    L[(L == SKIN) & (rg < 30) & (Y > top + .42 * fh)] = OUT            # cream cuffs / lining / hood (not red-shifted) are fabric
    A_, B_ = lab[..., 1], lab[..., 2]; skinlike = (rg > 45) & (B_ > 15) & (A_ > 10) & (B_ > A_ * .75)
    L[(L == OUT) & skinlike & (lab[..., 0] > 35)] = SKIN                 # bare legs/arms: red-shifted, yellow-warm
    L[(L == SKIN) & ~skinlike & (B_ < A_ * .75)] = OUT                    # pink skirt / rosy fabric is not skin
    L[(best > 30 ** 2)] = KEEP                                          # far from every prototype: eyes, mouth line, clips
    L[(Y > top + .85 * fh) & ((L != SKIN) | (rg < 45))] = KEEP           # shoes/boots keep their own colour
    L[~op] = KEEP
    # hair: only the components attached to the main hair mass (cheek blush is never hair)
    lb, n = nd.label(L == HAIR)
    if n:
        sz = nd.sum(np.ones_like(lb), lb, range(1, n + 1)); keepi = [i + 1 for i, s in enumerate(sz) if s >= max(60, .08 * sz.max())]
        stray = (L == HAIR) & ~np.isin(lb, keepi); L[stray] = KEEP   # dark eyes / brows keep their colour
    # face: keep-pixels are only legal inside the face (filled skin of the head) or on shoes; small specks elsewhere join neighbours
    head = Y < top + .5 * fh; face = nd.binary_fill_holes(nd.binary_closing((L == SKIN) & head, iterations=3)) & head
    for c in (HAIR, SKIN, OUT, KEEP):
        lb, n = nd.label(L == c)
        for i, sl in enumerate(nd.find_objects(lb)):
            comp = lb[sl] == i + 1; s = comp.sum()
            if c == KEEP and (face[sl][comp].mean() > .5 or (Y[sl][comp].mean() > top + .85 * fh) or not op[sl][comp].any()): continue
            if s >= (40 if c != KEEP else 400): continue
            ring = nd.binary_dilation(comp, iterations=2) & ~comp; neigh = L[sl][ring] if ring.any() else np.array([])
            # expand window for the ring
            ys, xs = np.nonzero(lb == i + 1); y0, y1, x0, x1 = max(0, ys.min() - 3), ys.max() + 4, max(0, xs.min() - 3), xs.max() + 4
            cm = lb[y0:y1, x0:x1] == i + 1; rg2 = nd.binary_dilation(cm, iterations=2) & ~cm; nb = L[y0:y1, x0:x1][rg2]; nb = nb[nb != c]
            nb = nb[(nb != KEEP)] if (nb != KEEP).any() else nb
            if len(nb): L[y0:y1, x0:x1][cm] = np.bincount(nb, minlength=4).argmax()
    if not back: L[face & (L == OUT)] = KEEP
    # v15: skin-coloured keep pixels on the face (lower-lid highlight, blush edge) are skin, so they follow the skin tone
    L[(L == KEEP) & face & skinlike & (lab[..., 0] > 50)] = SKIN
    # v15: strip the base sheet's own AI outline (dark outer 3px band): colour AND label from the nearest deeper pixel.
    # The compositor draws one uniform outline around the finished character instead.
    dist = nd.distance_transform_edt(op); deep = dist > 3.5
    if deep.any():
        _, (jy, jx) = nd.distance_transform_edt(~deep, return_indices=True); lum = b[..., :3].astype(int).sum(-1)
        dark = op & ~deep & (lum < lum[jy, jx] * .8) & ~((Y > top + .85 * fh) & (L == KEEP))
        for c in range(3): b[..., c][dark] = b[..., c][jy[dark], jx[dark]]
        L[dark] = L[jy[dark], jx[dark]]
        rgb_changed = True
    # silhouette AA rim: semi-transparent edge pixels take the class of the opaque body next to them (else they keep base colour → halo)
    rim = op & ((a < 230) | (nd.minimum_filter(a, 3) <= 30)); core = op & ~rim
    if core.any():
        _, (iy, ix) = nd.distance_transform_edt(~core, return_indices=True); r = rim & (L != SKIN) | rim & (L == KEEP)
        L[rim] = L[iy[rim], ix[rim]]
    L[~op] = KEEP
    # soft AA weights at class boundaries: unmix pixel colour between own class mean and the neighbouring class mean (5x5 pure pixels)
    Wt = np.zeros((H, W, 4)); Wt[np.arange(H)[:, None], np.arange(W)[None], L] = 1
    rgb = b[..., :3].astype(float)
    pure = [nd.binary_erosion(L == c, iterations=1) for c in range(4)]
    means = []
    for c in range(4):
        m = pure[c].astype(float); k = np.ones((7, 7)); cnt = nd.convolve(m, k, mode='constant')
        mu = np.stack([nd.convolve(rgb[..., q] * m, k, mode='constant') for q in range(3)], -1) / np.maximum(cnt, 1)[..., None]
        means.append((mu, cnt))
    edge = op & (nd.maximum_filter(L, 3) != nd.minimum_filter(L, 3))
    ys, xs = np.nonzero(edge)
    for y, x in zip(ys, xs):
        c = L[y, x]; win = L[max(0, y-1):y+2, max(0, x-1):x+2].ravel(); others = [o for o in set(win.tolist()) if o != c]
        best = None
        for o in others:
            mc, nc = means[c][0][y, x], means[c][1][y, x]; mo, no = means[o][0][y, x], means[o][1][y, x]
            if nc < 3 or no < 3: continue
            v = mo - mc; dd = (v * v).sum()
            if dd < 100: continue
            t = float(np.clip(((rgb[y, x] - mc) * v).sum() / dd, 0, 1))
            if best is None or t > best[1]: best = (o, t)
        if best and best[1] > .08: Wt[y, x, c] = 1 - best[1]; Wt[y, x, best[0]] = best[1]
    return np.clip(Wt[..., :3] * 255 + .5, 0, 255).astype(np.uint8)
if __name__ == '__main__':
    only = sys.argv[1:] or list(SHEETS)
    for sh in only:
        s = A['sheets'][sh]; fn = s['img']; B = np.array(Image.open(BAK + fn.split('/')[-1]).convert('RGBA')); M = np.array(Image.open(BAK + fn.split('/')[-1].replace('.png', '_mask.png')).convert('RGBA'))
        holes = sum(fix_alpha(B[y:y+FH, x:x+FW]) for x, y in s['cells'].values())
        P = protos(B, M, s['cells']); out = np.zeros_like(M); out[..., 3] = 255
        for f, (x, y) in s['cells'].items():
            back = '_N_' in f or '_NW_' in f
            out[y:y+FH, x:x+FW, :3] = cell(B[y:y+FH, x:x+FW], P, SHEETS[sh], back)
        Image.fromarray(B).save(ROOT + fn); Image.fromarray(out).save(ROOT + fn.replace('.png', '_mask.png'))
        print(sh, 'alpha holes filled', holes, flush=True)

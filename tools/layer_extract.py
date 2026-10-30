"""Cut one layer (outfit | hair) out of an image-to-image draft made on the normalised base turnaround.
python3 tools/layer_extract.py outfit boy basic draft.jpg   -> /workspace/mk/norm/<ch>_outfit_<name>_<D>.png (+ _tint)
python3 tools/layer_extract.py hair   boy h06   draft.jpg   -> /workspace/mk/norm/<ch>_hair_<name>_<D>.png
Each draft figure is normalised like the base (fixed height, foot pivot), then registered to the base
silhouette (small shift/scale search, max IoU of the body below the chin), then the layer is the set of
pixels that are NOT the base: cloth over the base underwear/skin (outfit) or hair over/around the skull (hair).
Outfit layers are clipped to the base silhouette dilated by 2px (nothing can spill)."""
import sys, numpy as np, scipy.ndimage as nd
from PIL import Image
sys.path.insert(0, 'tools'); from normalize import HEIGHT, CW, CH, PX, PY, bbox, feet_cx, place
from fit_base import key_out
import numpy as _n; OUTL = _n.array([58, 35, 20])
def figures(fg):
    lab, n = nd.label(nd.binary_dilation(fg, iterations=3)); objs = nd.find_objects(lab)
    return [o for _, o in sorted([(o[1].start, o) for o in objs if (o[0].stop - o[0].start) > fg.shape[0] * .2])]
DIRS = ['S', 'SW', 'W', 'NW', 'N']; OUT = '/workspace/mk/norm'
def hsv(c):
    mx = c.max(2); mn = c.min(2); s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0); return s, mx
def skinlike(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]; s, v = hsv(c); return (r > g + 12) & (g > b) & (s > .16) & (s < .62) & (v > 120)
def chin_row(base):
    """narrowest silhouette row between 25% and 55% of the figure height = neck"""
    S = base[..., 3] > 40; ys = np.where(S.any(1))[0]; t, b = ys.min(), ys.max(); h = b - t
    rows = range(t + int(h * .25), t + int(h * .55)); w = [S[r].sum() for r in rows]; return list(rows)[int(np.argmin(w))]
def register(fig, base, H, body_from):
    """fig: RGBA figure (any size). returns normalised RGBA best aligned to base (rows >= body_from)."""
    a = np.array(fig); box = bbox(a); h = box[3] - box[1] + 1; cx = feet_cx(a, box[3]); B = base[..., 3] > 40
    best = None
    for ds in np.linspace(-.08, .08, 17):
        out = np.array(place(fig, H / h * (1 + ds), box, cx)); S = out[..., 3] > 40
        for dx in range(-5, 6):
            Sx = np.roll(S, dx, 1); u = (Sx | B)[body_from:].sum(); i = (Sx & B)[body_from:].sum(); sc = i / max(u, 1)
            if best is None or sc > best[0]: best = (sc, np.roll(out, dx, 1), ds, dx)
    return best
def run(kind, ch, name, path):
    a, fg = key_out(Image.open(path)); figs = figures(fg); assert len(figs) == 5, len(figs)
    H = HEIGHT[ch]
    for d, o in zip(DIRS, figs):
        base = np.array(Image.open(f'{OUT}/{ch}_base_{d}.png').convert('RGBA')); B = base[..., 3] > 40; chin = chin_row(base)
        rgba = np.zeros(a[o].shape[:2] + (4,), np.uint8); rgba[..., :3] = np.clip(a[o], 0, 255); rgba[..., 3] = fg[o] * 255
        fig = Image.fromarray(rgba)
        global CHN, DN; CHN, DN = ch, d
        if kind == 'hair':  # hair adds height on top: register on the body only, keep the fixed body scale from the base
            sc, out, ds, dx = register_hair(fig, base, chin)
        else: sc, out, ds, dx = register(fig, base, H, chin)
        c = out[..., :3].astype(int); S = out[..., 3] > 127; bc = base[..., :3].astype(int)
        bskin = B & skinlike(bc); diff = np.abs(c - bc).sum(2)
        yy = np.arange(CH)[:, None] * np.ones((1, CW), bool)
        ch_ = chroma(c); m = np.median(chroma(bc)[bskin & (yy < chin - 4)], 0) if kind == 'hair' else np.median(ch_[S & bskin & (yy < chin - 4)], 0)
        dskin = (np.abs(ch_ - m) < [.08, .07]).all(2) & (c.max(2) > 90)   # skin = the draft's own face tone
        if kind == 'outfit':
            allow = nd.binary_dilation(nd.binary_closing(B, structure=np.ones((1, 25))), iterations=4) & (yy > chin - 6)  # body envelope (+leg gap for skirts/robes, +4px)
            L = S & allow & ~dskin                       # cloth = the draft's non-skin pixels below the chin
            L = nd.binary_closing(L, structure=np.ones((3, 3))) & allow; L = nd.binary_opening(L, structure=np.ones((2, 2))); L = fill(L)
            under = B & ~bskin & (yy > chin + 2)              # base underwear that must end up covered
            L = fill(L | (S & nd.binary_erosion(under, iterations=1)))  # underwear never peeks: draft pixels always cover it
            print('  uncovered underwear px', int((under & ~L).sum()))
            # under-layer coverage: every base underwear pixel (non-skin, below chin, above shoes) must be covered
        else:
            # hair (drafted in neutral grey): low-saturation, not the draft's skin, not the base's own face features,
            # either outside the bald body or clearly different from the base underneath (grey vs white tee)
            sat_, v_ = hsv(c.astype(float)); grey = (sat_ < .22) & (v_ > 50) & ~dskin
            waist = chin + int((PY - chin) * .45); feat = B & ~bskin & (yy < chin)
            L = S & grey & (yy < waist) & (~B | (diff > 45)) & ~feat
            long_ = S & ~B & ~dskin & (yy < PY - 24) & (yy >= waist)          # long hair beyond the bald body
            L = L | (long_ & nd.binary_dilation(L, iterations=40))
            L = L | (S & ~B & ~dskin & (yy < waist) & nd.binary_dilation(L, iterations=3))  # green-spill fringe
            L = nd.binary_closing(L, structure=np.ones((3, 3))) & S & ~feat
            L = nd.binary_opening(L, structure=np.ones((2, 2))); L = fill(L)
            L = L | (nd.binary_fill_holes(L) & S & ~feat & ~(B & dskin))
        lab, n = nd.label(L)
        if n > 1: sz = nd.sum(L, lab, range(1, n + 1)); L = np.isin(lab, 1 + np.where(sz >= 30)[0])
        gr = (c[..., 1] > c[..., 0] + 6) & (c[..., 1] > c[..., 2] + 6)       # green-spill flecks
        L = L & ~(gr & ~nd.binary_erosion(L, iterations=3)); L = L & ~(gr & (c[..., 1] > c[..., 0] + 25))
        if kind == 'hair':
            L = L & ~(c.min(2) > 222) & ~(bskin & (c.max(2) < 120) & (DN in ('S', 'SW', 'W')) & (c.max(2) < 85))   # collar; dark eye/mouth bits over the face                                          # white tee collar
            L = nd.binary_opening(L, structure=np.ones((3, 3)))                # thin face-contour / eye-edge lines
            lb, nn = nd.label(L)
            if nn > 1:
                sz = nd.sum(L, lb, range(1, nn + 1)); L = np.isin(lb, 1 + np.where(sz >= max(300, sz.max() * .08))[0])
        L = fill(L)
        mrb = np.maximum(c[..., 0], c[..., 2]); c = c.copy(); c[..., 1] = np.minimum(c[..., 1], mrb + 6)  # despill chroma green
        lay = np.zeros((CH, CW, 4), np.uint8); lay[..., :3] = np.clip(c, 0, 255); lay[..., 3] = L * 255
        dk = L & (c.max(2) < 70); lay[dk, :3] = (lay[dk, :3] * .4 + OUTL * .6).astype(np.uint8)
        rim = L & ~nd.binary_erosion(L, structure=np.ones((3, 3))) & ~B  # soft 1px warm line only where the layer meets background
        lay[rim, :3] = (lay[rim, :3] * .6 + OUTL * .4).astype(np.uint8)
        Image.fromarray(lay).save(f'{OUT}/{ch}_{kind}_{name}_{d}.png')
        print(d, 'iou %.3f' % sc, 'ds', round(ds, 3), 'dx', dx, 'px', int(L.sum()))
def chroma(c):
    v = np.maximum(c.max(2), 1)[..., None].astype(float); return np.stack([(c[..., 0] - c[..., 1]), (c[..., 1] - c[..., 2])], 2) / v
def fill(L):
    from fit_base import fill_small; return fill_small(L, 40)
def register_hair(fig, base, chin):
    """scale from the body height below the chin (unchanged in hair drafts), feet on the pivot"""
    a = np.array(fig); box = bbox(a); cx = feet_cx(a, box[3]); B = base[..., 3] > 40
    bh = PY - chin  # base body height below chin
    S = a[..., 3] > 40; ys = np.where(S.any(1))[0]; t, b = ys.min(), ys.max(); h = b - t
    # the draft's chin: narrowest row 25-60% from its own top (hair moves the top up, so search wider)
    rows = range(t + int(h * .3), t + int(h * .62)); w = [S[r].sum() for r in rows]; dchin = list(rows)[int(np.argmin(w))]
    k0 = bh / (b - dchin)
    import json, os; kf = f'{OUT}/hairk_{CHN}_{DN}.json'
    best = None
    for ds in np.linspace(-.05, .05, 11):
        out = np.array(place(fig, k0 * (1 + ds), box, cx)); So = out[..., 3] > 40
        for dx in range(-5, 6):
            Sx = np.roll(So, dx, 1); u = (Sx | B)[chin:].sum(); i = (Sx & B)[chin:].sum(); sc = i / max(u, 1)
            if best is None or sc > best[0]: best = (sc, np.roll(out, dx, 1), ds, dx, k0 * (1 + ds))
    if not HAIRREF: json.dump({'k': best[4]}, open(kf, 'w'))
    elif best[0] < .75 and not NOFB and os.path.exists(kf):   # chin detection fooled (long hair over the shoulders): wide search, IoU on the legs only
        lo = PY - 22; hb = None
        kb = json.load(open(kf))['k'] * float(_o.environ.get('KM', '1')) if (_o := __import__('os')) else 0
        import os as _o; r_ = float(_o.environ.get('KR', '.1'))
        for kk in np.linspace(1 - r_, 1 + r_, 81):
            out = np.array(place(fig, kb * kk, box, cx)); So = out[..., 3] > 40
            for dx in range(-5, 6):
                Sx = np.roll(So, dx, 1); sc = (Sx & B)[lo:].sum() / max((Sx | B)[lo:].sum(), 1)
                if hb is None or sc > hb[0]: hb = (sc, np.roll(out, dx, 1), kk - 1, dx, 0)
        print('  wide search', round(best[0], 3), '->', round(hb[0], 3)); best = hb if (hb[0] > best[0] + .05 or _o.environ.get('FORCEFB') == DN) else best
    return best[:4]
CHN = DN = None; HAIRREF = False; NOFB = False
if __name__ == '__main__':
    HAIRREF = sys.argv[3] != 'base'; NOFB = sys.argv[3] in ('h01',); run(*sys.argv[1:5])

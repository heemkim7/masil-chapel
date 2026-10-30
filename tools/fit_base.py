# Pixel-edit AI base drafts onto the canonical template: key out bg, split figures, scale to the original frame's
# height, align feet/centre, pick mirror by silhouette IoU, binarise alpha, fill holes, uniform 2px outline (inside).
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
A = json.load(open('assets/characters/atlas.json')); FW, FH = A['frameW'], A['frameH']
OUTL = np.array([120, 82, 66])
def key_out(im):
    a = np.array(im.convert('RGB')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]; bgc = (g > r + 40) & (g > b + 40)
    sp = (g > np.maximum(r, b)); a[..., 1] = np.where(sp, np.maximum(r, b), g)  # despill green edges
    lab, _ = nd.label(bgc); edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
    bg = np.isin(lab, list(edge)); fg = ~bg; fg = nd.binary_opening(fg, iterations=1); fg = fill_small(fg, 60) & ~bgc  # enclosed green (gap between legs) is background too
    return a, fg
def figures(fg):
    lab, n = nd.label(nd.binary_dilation(fg, iterations=3)); objs = nd.find_objects(lab)
    big = sorted([(o[1].start, o) for o in objs if (o[0].stop - o[0].start) > fg.shape[0] * .4]); return [o for _, o in big]
def fill_small(S, mx=25):
    H = nd.binary_fill_holes(S) & ~S; lab, n = nd.label(H)
    if n: sz = nd.sum(H, lab, range(1, n + 1)); S = S | np.isin(lab, 1 + np.where(sz <= mx)[0])
    return S
def finish(rgb, al, outline=True, tight=True):
    S = fill_small(al > 127)
    if tight:  # underwear layer: white tee/shorts hug the body — trim 2px of cloth off the contour, drop bulges/strays
        c = np.asarray(rgb, float); cloth = (c.min(2) > 190) & (np.ptp(c, 2) < 40)
        ys_ = np.where(S.any(1))[0]; cloth[ys_.max() - 22:] = False  # shoes keep their shape (height fixed)
        edge = S & ~nd.binary_erosion(S, iterations=2); S = S & ~(edge & cloth)
        S = nd.binary_opening(S, structure=np.ones((3, 3))); S = fill_small(S)
    lab, n = nd.label(S)
    if n > 1: sz = nd.sum(S, lab, range(1, n + 1)); S = lab == (1 + int(np.argmax(sz)))
    out = np.zeros((FH, FW, 4), np.uint8); out[..., :3] = np.clip(rgb, 0, 255); out[..., 3] = S * 255
    dk = S & (out[..., :3].max(2) < 100)  # heavy dark line-art from drafts → soft warm tone
    out[dk, :3] = (out[dk, :3] * .3 + OUTL * .7).astype(np.uint8)
    if outline:  # thin soft warm line (1px), blended with the local colour like the original art
        rim = S & ~nd.binary_erosion(S, structure=np.ones((3, 3)))
        out[rim, :3] = (out[rim, :3] * .45 + OUTL * .55).astype(np.uint8)
    return out, S
FLIPS = {'player': {'S': 0, 'SW': 0, 'W': 0, 'NW': 1, 'N': 0}, 'boy': {'S': 0, 'SW': 0, 'W': 0, 'NW': 0, 'N': 0}}
def fit(ch, img, dirs=('S', 'SW', 'W', 'NW', 'N'), frames=None, tag='key', TH=None):
    sh = A['sheets'][ch + '/basic']; S0 = np.array(Image.open('assets/characters/' + sh['img']).convert('RGBA'))
    a, fg = key_out(img); figs = figures(fg); assert len(figs) == len(dirs), (len(figs), len(dirs)); res = {}
    # ONE scale per character: draft front head width (widest row of the top 40%) → original skull width (face ear-to-ear ×1.04)
    o = figs[0]; cm = fg[o]; ys, _ = np.where(cm); hh = ys.max() - ys.min(); hw = max(cm[r].sum() for r in range(ys.min(), ys.min() + int(hh * .4)))
    M = np.array(Image.open('assets/characters/' + sh['img'].replace('.png', '_mask.png'))); RIG = json.load(open('assets/characters/rig.json'))
    x, y = sh['cells']['walk_S_0.png']; sk = M[y:y + FH, x:x + FW, 1] > 128; R0 = RIG[f'{ch}/basic/walk_S_0.png']
    skull = max((np.ptp(np.where(sk[r])[0]) if sk[r].sum() > 3 else 0) for r in range(R0[2], R0[3])) * 1.04; KS = skull / hw; ms0 = A['meta'][f'{ch}/basic/walk_S_0.png'][0]
    FLIP = FLIPS.get(ch, {})
    for d, o, f in zip(dirs, figs, frames or [f'walk_{d}_0.png' for d in dirs]):
        x, y = sh['cells'][f]; ref = S0[y:y + FH, x:x + FW, 3] > 40; ry, rx = np.where(ref); rh = ry.max() - ry.min() + 1
        crop = a[o]; cm = fg[o]; ys, xs = np.where(cm); crop = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; cm = cm[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        k = KS * ms0 / A['meta'][f'{ch}/basic/{f}'][0]
        # chibi template: head and body scaled separately, split at the draft's neck (narrowest row between 30% and 50% height)
        Hc = cm.shape[0]; wid = cm.sum(1); r0, r1 = int(Hc * .28), int(Hc * .5); neck = r0 + int(np.argmin(wid[r0:r1]))
        Rf = RIG.get(f'{ch}/basic/{f}', R0); chin = Rf[3] + (ry.min() - Rf[2]); kb = (ry.max() + 1 - chin) / (Hc - neck)
        def rs(part, mk, kk, kx=None):
            rgba = np.dstack([part, mk * 255]).astype(float); rgba[..., :3] *= rgba[..., 3:] / 255
            P = np.array(Image.fromarray(rgba.astype(np.uint8), 'RGBA').resize((max(1, round(part.shape[1] * (kx or kk))), max(1, round(part.shape[0] * kk))), Image.LANCZOS)).astype(float)
            return P
        Ph = rs(crop[:neck + 3], cm[:neck + 3], k)
        if TH: kb = (TH - Ph.shape[0] + 3) / (Hc - neck)  # walk cycle: identical full height in every frame
        Pb = rs(crop[neck:], cm[neck:], kb, k * .5 + kb * .5)
        nw = max(Ph.shape[1], Pb.shape[1]); nh = Ph.shape[0] - 3 + Pb.shape[0]; P = np.zeros((nh, nw, 4))
        def pc(dst, src, y): x = (nw - src.shape[1]) // 2; a_ = src[..., 3:] / 255; dst[y:y + src.shape[0], x:x + src.shape[1]] = src + dst[y:y + src.shape[0], x:x + src.shape[1]] * (1 - a_)
        pc(P, Pb, Ph.shape[0] - 3); pc(P, Ph, 0)
        al = P[..., 3]; rgb = np.where(al[..., None] > 0, P[..., :3] * 255 / np.maximum(al[..., None], 1), 0).clip(0, 255)
        best = None
        for flip in ((FLIP[d],) if d in FLIP else (0, 1)):
            R_ = rgb[:, ::-1] if flip else rgb; Al = al[:, ::-1] if flip else al
            cx = int(round((rx.min() + rx.max()) / 2 - nw / 2)); top = ry.max() + 1 - nh  # feet on the original baseline
            C = np.zeros((FH, FW, 3)); CA = np.zeros((FH, FW)); x0 = max(0, cx); x1 = min(FW, cx + nw)
            C[top:top + nh, x0:x1] = R_[:, x0 - cx:x1 - cx]; CA[top:top + nh, x0:x1] = Al[:, x0 - cx:x1 - cx]
            iou = ((CA > 127) & ref).sum() / ((CA > 127) | ref).sum()
            if best is None or iou > best[0]: best = (iou, flip, C, CA)
        out, Sm = finish(best[2], best[3]); res[f] = out; res[f + ':raw'] = finish(best[2], best[3], False, False)[0]; print(ch, d, f, 'flip', best[1], 'IoU %.2f' % best[0], 'h', rh)
    return res
if __name__ == '__main__':
    ch, path = sys.argv[1], sys.argv[2]; R = fit(ch, Image.open(path))
    json.dump([f for f in R if ':raw' not in f], open(f'/workspace/mk/draft/{ch}_key.json', 'w'))
    for f, o in R.items(): Image.fromarray(o).save(f'/workspace/mk/draft/{ch}_' + (f.replace(':raw', '').replace('.png', '_raw.png') if ':raw' in f else f))

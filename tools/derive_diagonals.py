# v6: cut generated 3/4 diagonal walk frames (green-screen 2x4 sheet) into 200x284 frames, same sizing standard as walk_S
# (content height = median walk_S content height * its scale, bottom-centre at (100,273), >=24px empty top pad). Updates atlas chars+meta.
import json, os, statistics
import numpy as np
from PIL import Image
from scipy import ndimage
R = 'assets/characters/'; a = json.load(open(R + 'atlas.json')); FW, FH, BASE, PAD = 200, 284, 273, 24
PICK = {'SW': [(0, 0), (0, 1), (0, 2), (0, 3)], 'NW': [(1, 0), (1, 1)]}
def key(im):
    x = np.asarray(im.convert('RGB')).astype(np.float32); r, g, b = x[..., 0], x[..., 1], x[..., 2]
    gk = g - np.maximum(r, b)                       # greenness
    alpha = np.clip(1 - (gk - 25) / 60, 0, 1)       # soft matte
    g2 = np.minimum(g, np.maximum(r, b) + 8)        # despill
    out = np.dstack([r, g2, b, alpha * 255]).astype(np.uint8); return out
def bbox_h(c, o, f):
    sh = a['sheets'][f'{c}/{o}']; x, y = sh['cells'][f]; im = Image.open(R + sh['img']).getchannel('A').crop((x, y, x + FW, y + FH)); bb = im.getbbox(); return bb[3] - bb[1]
# (char, outfit, src jpg, rows, cols, [(dir, row, [cols])])
JOBS = [('player', 'basic', 'basic', 2, 4, [('SW', 0, [0, 1, 2, 3]), ('NW', 1, [0, 1])]),
        ('player', 'choir', 'choir', 2, 4, [('SW', 0, [0, 1, 2, 3]), ('NW', 1, [0, 1])]),
        ('player', 'mint', 'mint', 2, 4, [('SW', 0, [0, 1, 2, 3]), ('NW', 1, [0, 1])]),
        ('player', 'choir', 'back_choir', 2, 4, [('N', 0, [0, 1, 2, 3])]),
        ('pastor', 'robe', 'back_pastor', 2, 4, [('N', 0, [0, 1, 2, 3]), ('NW', 0, [0, 1, 2, 3])]),
        ('choirgirl', 'dress', 'back_choirgirl', 3, 4, [('N', 0, [0, 1, 2, 3]), ('NW', 0, [0, 1, 2, 3]), ('SW', 1, [0, 1])]),
        ('lamb', 'raincoat', 'back_lamb', 2, 4, [('N', 0, [0, 1, 2, 3])]),
        ('player', 'basic', 'pray_basic', 1, 4, [('pray_S', 0, [0, 1, 2, 3])])]
for c, o, src, NR, NC, picks in JOBS:
    S = [f for f in a['chars'][c][o]['walk_S']]; tgt = statistics.median(bbox_h(c, o, f) * a['meta'][f'{c}/{o}/{f}'][0] for f in S)
    sh = a['sheets'][f'{c}/{o}']; x0, y0 = sh['cells'][S[0]]; ref = np.asarray(Image.open(R + sh['img']).convert('RGBA').crop((x0, y0, x0 + FW, y0 + FH))).astype(np.float32)
    refm = ref[ref[..., 3] > 200][:, :3].mean(0)
    rgba = key(Image.open(f'{R}diag_src/{src}.jpg'))
    om = rgba[rgba[..., 3] > 200][:, :3].astype(np.float32).mean(0); gain = np.clip(refm / om, 0.85, 1.15)   # colour-match to the existing walk_S art (kills green-screen cast)
    rgba[..., :3] = np.clip(rgba[..., :3] * gain, 0, 255).astype(np.uint8); print(src, 'gain', gain.round(3))
    H, W = rgba.shape[:2]; ch, cw = H // NR, W // NC
    for d, rr, cols in picks:
        names = []
        band = rgba[rr * ch:(rr + 1) * ch]; m = ndimage.binary_closing(band[..., 3] > 128, iterations=2)
        lab, n = ndimage.label(m); sizes = ndimage.sum(m, lab, range(1, n + 1)); big = [i + 1 for i in range(n) if sizes[i] > 0.3 * sizes.max()]
        big.sort(key=lambda L: ndimage.center_of_mass(m, lab, L)[1]); assert len(big) == NC, (src, rr, len(big))
        for i, cc in enumerate(cols):
            cell = band.copy(); keep = ndimage.binary_dilation(lab == big[cc], iterations=3); cell[..., 3] = (cell[..., 3] * keep).astype(np.uint8)
            img = Image.fromarray(cell); bb = img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
            assert bb[1] > 2 and bb[3] < ch - 1, ('source sprite touches band edge', src, rr, cc, bb)
            img = img.crop(bb); s = tgt / img.height; nw, nh = round(img.width * s), round(img.height * s); assert nh <= BASE - PAD, (o, d, nh)
            img = img.resize((nw, nh), Image.LANCZOS); fr = Image.new('RGBA', (FW, FH)); fr.alpha_composite(img, (100 - nw // 2, BASE - nh))
            an = d if '_' in d else f'walk_{d}'; f = f'{an}_{i}.png'; fr.save(f'{R}{c}/{o}/{f}'); names.append(f); a['meta'][f'{c}/{o}/{f}'] = [1.0, 100.0, BASE]
        for k in [k for k in a['meta'] if k.startswith(f'{c}/{o}/{an}_') and k.rsplit('/', 1)[1] not in names]: del a['meta'][k]
        a['chars'][c][o][an] = names
    print(c, o, src, 'target h', tgt)
a['normalized'] += ' | v6: SW/NW 3/4 diagonals from generated art (tools/derive_diagonals.py)'
json.dump(a, open(R + 'atlas.json', 'w'), ensure_ascii=False, indent=1)

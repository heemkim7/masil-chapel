# v11: body-height constancy across walk frames: drawn height = (alpha bottom - alpha top) * meta scale, per sheet+direction
import json, numpy as np, sys
from PIL import Image
A = json.load(open('assets/characters/atlas.json')); FW, FH = A['frameW'], A['frameH']; worst = []
for co, sh in A['sheets'].items():
    im = np.asarray(Image.open('assets/characters/' + sh['img']).convert('RGBA'))[..., 3]; D = {}
    for k, (x, y, *_) in sh['cells'].items():
        if not k.startswith('walk_'): continue
        a = im[y:y + FH, x:x + FW] > 40; r = np.where(a.any(1))[0]
        if not len(r): continue
        sc = (A['meta'].get(f'{co}/{k}') or [1])[0]; d = k.split('_')[1]; D.setdefault(d, []).append((r[-1] - r[0]) * sc)
    M = [np.mean(v) for v in D.values()]
    if len(M) > 1: worst.append((round(float((max(M) - min(M)) / np.mean(M)) * 100, 2), co, 'across-dirs', len(M)))
    for d, hs in D.items():
        hs = np.array(hs); var = (hs.max() - hs.min()) / hs.mean(); worst.append((round(float(var) * 100, 2), co, d, len(hs)))
worst.sort(reverse=True); print('max walk height spread %:', worst[:8]); bad = [w for w in worst if w[0] > (4.0 if w[2] == 'across-dirs' else 3.0)]; print('over 3%:', len(bad)); sys.exit(1 if bad else 0)

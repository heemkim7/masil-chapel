# v10: one constant rendered body height for every walk/idle frame of a character sheet (all 8 directions),
# feet anchor unchanged. Fixes size popping between directions (e.g. boy W 199px vs S 216px) and within cycles.
import json, shutil, os, numpy as np
from PIL import Image
P = 'assets/characters/atlas.json'
if not os.path.exists(P.replace('.json', '_v9bak.json')): shutil.copy(P, P.replace('.json', '_v9bak.json'))
a = json.load(open(P.replace('.json', '_v9bak.json'))); W, H = a['frameW'], a['frameH']; meta = a.setdefault('meta', {})
for co, sh in a['sheets'].items():
    if not co.startswith(('player/', 'boy/')): continue
    im = np.asarray(Image.open('assets/characters/' + sh['img']).convert('RGBA'))
    hs = {}
    for f, cell in sh['cells'].items():
        if not f.startswith(('walk_', 'idle_')): continue
        x, y = cell[:2]; rows = np.where((im[y:y + H, x:x + W, 3] > 40).any(1))[0]; hs[f] = rows[-1] - rows[0]
    k0 = lambda f: (meta.get(f'{co}/{f}') or [1])[0]
    target = float(np.median([hs[f] * k0(f) for f in hs if f.startswith('walk_S_')]))
    for f, h in hs.items():
        M = meta.get(f'{co}/{f}') or [1, W / 2, a['baselineY']]
        meta[f'{co}/{f}'] = [round(target / h, 4), M[1], M[2]]
    print(co, 'target', target)
json.dump(a, open(P, 'w'), separators=(',', ':'))

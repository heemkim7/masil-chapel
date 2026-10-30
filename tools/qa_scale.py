# v10 QA: rendered body size per walk frame (content height & head width, after atlas meta scale). Variance should be ~0.
import json, sys, numpy as np
from PIL import Image
a = json.load(open('assets/characters/atlas.json')); W, H = a['frameW'], a['frameH']; meta = a.get('meta', {})
out = {}; worst = 0
for co, sh in a['sheets'].items():
    if not co.startswith(('player/', 'boy/')): continue
    im = np.asarray(Image.open('assets/characters/' + sh['img']).convert('RGBA'))
    groups = {}
    for f in sh['cells']:
        if f.startswith('walk_'): groups.setdefault(f.rsplit('_', 1)[0], []).append(f)
    for g, fs in sorted(groups.items()):
        hs, ws = [], []
        for f in sorted(fs):
            x, y = sh['cells'][f][:2]; A = im[y:y + H, x:x + W, 3] > 40; rows = np.where(A.any(1))[0]
            top, bot = rows[0], rows[-1]; hh = bot - top; widths = A[top:top + int(hh * .42)].sum(1)
            k = (meta.get(f'{co}/{f}') or [1])[0]; hs.append(float(hh * k)); ws.append(float(widths.max() * k))
        hs, ws = np.array(hs), np.array(ws); v = (hs.max() - hs.min()) / hs.mean() * 100; vw = (ws.max() - ws.min()) / ws.mean() * 100
        worst = max(worst, vw); out[f'{co}/{g}'] = dict(height=[round(x, 1) for x in hs], headW=[round(x, 1) for x in ws], heightRangePct=round(float(v), 2), headRangePct=round(float(vw), 2))
        print(f'{co}/{g:8s} height {hs.min():6.1f}-{hs.max():6.1f} ({v:4.1f}%)  headW {ws.min():6.1f}-{ws.max():6.1f} ({vw:4.1f}%)')
json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/qa_scale.json', 'w'), indent=1); print('worst head-width range %.2f%%' % worst)

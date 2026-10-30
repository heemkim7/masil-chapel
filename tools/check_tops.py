# Pixel audit: every frame of every sheet. Flags: touches frame edge, top pad < 24px, or FLAT head top
# (the first opaque rows are already wide = head sliced off in the source art).
import json, sys
import numpy as np
from PIL import Image
R = 'assets/characters/'; a = json.load(open(R + 'atlas.json')); bad = 0
for co, sh in a['sheets'].items():
    A = np.asarray(Image.open(R + sh['img']).getchannel('A'))
    for f, (x, y) in sorted(sh['cells'].items()):
        fr = A[y:y + 284, x:x + 200] > 40; rows = np.where(fr.any(1))[0]; cols = np.where(fr.any(0))[0]
        t = rows[0]; w0 = fr[t:t + 2].sum(1).max(); full = fr.sum(1).max(); issues = []
        if t < 24: issues.append(f'top={t}')
        if cols[0] == 0 or cols[-1] == 199 or rows[-1] == 283: issues.append('edge')
        if w0 > 0.45 * full: issues.append(f'FLAT top row width {w0}/{full}')
        if issues: bad += 1; print(co, f, *issues)
print('frames with issues:', bad); sys.exit(1 if bad else 0)

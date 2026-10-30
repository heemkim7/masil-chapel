# v12 rig: per-frame head anchor table shared by every head layer (hair/face/hat) + skin-under-clothes mask cleanup.
# Anchor = head box of the direction's reference frame, translated by the rigid head offset of each frame
# (template-matched on the body's own head pixels), so the head unit moves 1:1 with the body and keeps a constant size per direction.
import json, sys, numpy as np
from PIL import Image
A = json.load(open('assets/characters/atlas.json')); FW, FH = A['frameW'], A['frameH']
def headbox(a, top, bot):
    fh = bot - top; lim = top + round(fh * .55); best = 0; bestY = top; rows = []
    for y in range(top, lim + 1):
        xs = np.where(a[y] > 40)[0]; r = (xs[0], xs[-1]) if len(xs) else (-1, -1); rows.append(r)
        w = 0 if r[0] < 0 else r[1] - r[0]
        if w > best: best, bestY = w, y
    neck = lim
    for y in range(bestY, lim + 1):
        a0, b0 = rows[y - top]
        if a0 >= 0 and b0 - a0 < best * .62: neck = y; break
    x0 = min(r[0] for r in rows[:neck - top] if r[0] >= 0); x1 = max(r[1] for r in rows[:neck - top] if r[0] >= 0)
    return [int(x0), int(x1), int(top), int(neck), int(bot)]
def match(ref, cur, box, R=12):
    x0, x1, y0, y1 = box; T = ref[y0:y1, x0:x1]; best = (1e18, 0, 0)
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            if y0 + dy < 0 or x0 + dx < 0 or y1 + dy > FH or x1 + dx > FW: continue
            d = np.abs(cur[y0 + dy:y1 + dy, x0 + dx:x1 + dx] - T).sum()
            if d < best[0]: best = (d, dx, dy)
    return best[1], best[2]
RIG = {}; report = {}
for co, sh in A['sheets'].items():
    S = np.array(Image.open('assets/characters/' + sh['img']).convert('RGBA')).astype(np.float32)
    mp = 'assets/characters/' + sh['img'].replace('.png', '_mask.png'); hasM = co.split('/')[0] in ('player', 'boy')
    Mk = np.array(Image.open(mp).convert('RGBA')) if hasM else None; fixed = 0
    fr = lambda c: S[c[1]:c[1] + FH, c[0]:c[0] + FW]
    feat = lambda F: F[..., 3] / 255 * (F[..., 0] + F[..., 1] + F[..., 2]) / 3
    groups = {}
    for name, c in sh['cells'].items():
        an, d, i = name[:-4].split('_'); groups.setdefault(d, []).append((an, int(i), name, c))
    for d, L in groups.items():
        L.sort(key=lambda t: (t[0] != 'walk', t[0], t[1])); refc = L[0][3]; RF = fr(refc)
        a = RF[..., 3]; rows = np.where((a > 40).any(1))[0]; hb = headbox(a, rows[0], rows[-1]); ref = feat(RF)
        hair_top = hb[2]
        if hasM:
            Mr = Mk[refc[1]:refc[1] + FH, refc[0]:refc[0] + FW]; hy = np.where((Mr[..., 0] > 128).any(1))[0]
            if len(hy): hair_top = int(min(hy[0], hb[2] + 2))
        for an, i, name, c in L:
            dx, dy = match(ref, feat(fr(c)), hb[:4]) if c != refc else (0, 0)
            if an != 'walk' and (abs(dx) > 10 or abs(dy) > 10): dx, dy = 0, 0
            RIG[co + '/' + name] = [hb[0] + dx, hb[1] + dx, hb[2] + dy, hb[3] + dy, hair_top + dy, hb[4] - hb[2]]
            if hasM:  # skin under clothes: outfit label wins; skin label on non-skin colours -> outfit
                m = Mk[c[1]:c[1] + FH, c[0]:c[0] + FW]; F = fr(c); r, g, b = F[..., 0], F[..., 1], F[..., 2]
                mx = np.maximum(np.maximum(r, g), b); sat = (mx - np.minimum(np.minimum(r, g), b)) / np.maximum(mx, 1)
                Y = np.arange(FH)[:, None] + np.zeros((1, FW)); neckY = RIG[co + '/' + name][3]
                cloth = (sat < .16) & ((r + g + b) / 3 > 150)          # cream/white fabric (hoodie, socks, shoes); skin sits at sat .2-.45
                bad = (m[..., 1] > 8) & (m[..., 0] <= 128) & (F[..., 3] > 40) & (Y > neckY + 2) & ((m[..., 2] > 128) | cloth)
                fixed += int(bad.sum()); m[..., 1][bad] = 0; m[..., 2][bad] = 255
    if hasM and '--write' in sys.argv: Image.fromarray(Mk).save(mp)
    report[co] = fixed
json.dump(RIG, open('assets/characters/rig.json', 'w'), separators=(',', ':'))
print('frames', len(RIG), 'skin-on-clothes px fixed', report)

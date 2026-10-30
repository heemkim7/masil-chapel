# Root fix for hair-piece sources (assets/cos/hNN.png): (1) antialias rim pixels carry white background fringe, which the
# luminance tint turns into a bright halo -> replace rim RGB with the nearest solid hair pixel (keeps alpha); (2) translucent
# interior pixels (ponytail strands) -> alpha 255.  Reads pristine copies from /workspace/mk/bak/cos.
import numpy as np, sys
from PIL import Image
from scipy import ndimage as nd
SRC = '/workspace/mk/bak/cos'; DST = 'assets/cos'
for i in range(12):
    a = np.array(Image.open(f'{SRC}/h{i:02d}.png').convert('RGBA')).astype(np.int32); A = a[..., 3]
    solid = A >= 230
    _, (iy, ix) = nd.distance_transform_edt(~solid, return_indices=True)
    inner = nd.binary_erosion(nd.binary_fill_holes(A > 25), iterations=2); fix = inner & (A < 255)
    rim = ((A > 0) | fix) & ~solid
    for c in range(3): a[..., c][rim] = a[..., c][iy[rim], ix[rim]]
    a[..., 3][fix] = 255
    # strip the part's own AI outline: dark pixels in the outer 3px band take the colour of the nearest deeper interior pixel
    # (the compositor draws ONE uniform outline around the whole character afterwards)
    sil = a[..., 3] >= 96; dist = nd.distance_transform_edt(sil); deep = dist > 3.5
    if deep.any():
        _, (jy, jx) = nd.distance_transform_edt(~deep, return_indices=True); lum = a[..., :3].sum(-1)
        band = sil & (dist <= 3.5); src = lum[jy, jx]; dark = band & (lum < src * .8)
        for c in range(3): a[..., c][dark] = a[..., c][jy[dark], jx[dark]]
        print('  outline px stripped', int(dark.sum()))
    # white speck tips: opaque pixels much brighter than their 7x7 median -> median colour
    med = np.stack([nd.median_filter(a[..., c], 7) for c in range(3)], -1); lum = a[..., :3].sum(-1); spk = sil & (lum > med.sum(-1) * 1.22) & (lum > 450)
    for c in range(3): a[..., c][spk] = med[..., c][spk]
    a[..., 3] = np.where(a[..., 3] >= 96, 255, 0)            # binary alpha (smooth edge comes from the downscale + uniform outline)
    Image.fromarray(a.astype(np.uint8)).save(f'{DST}/h{i:02d}.png')
    # BACK-VIEW variant: the front piece has an open face window; seen from behind that window must be hair.
    # water-fill each column up to min(max bottom on the left, max bottom on the right) -> closes the opening, texture
    # copied from the mirror row above the opening's top edge.
    b = a.copy(); S = b[..., 3] > 0; Hh, Ww = S.shape
    bottom = np.array([np.nonzero(S[:, x])[0].max() if S[:, x].any() else -1 for x in range(Ww)])
    topr = np.array([np.nonzero(S[:, x])[0].min() if S[:, x].any() else Hh for x in range(Ww)])
    env = np.minimum(np.maximum.accumulate(bottom), np.maximum.accumulate(bottom[::-1])[::-1]); filled = 0
    for x in range(Ww):
        if env[x] < 0 or topr[x] >= Hh: continue
        for y in range(topr[x], env[x] + 1):
            if not S[y, x]:
                # nearest opaque pixel above in this column, then mirror upward for texture
                ya = y - 1
                while ya >= 0 and not S[ya, x]: ya -= 1
                src = max(topr[x], 2 * ya - y) if ya >= 0 else topr[x]
                b[y, x] = b[src, x] if b[src, x, 3] else b[max(ya, 0), x]; b[y, x, 3] = 255; filled += 1
    Image.fromarray(b.astype(np.uint8)).save(f'{DST}/h{i:02d}_b.png'); print('  back variant filled', filled, 'specks', int(spk.sum()))
    print(f'h{i:02d} rim recoloured {rim.sum()} interior alpha fixed {fix.sum()}')

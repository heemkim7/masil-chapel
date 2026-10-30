# Layered pipeline step 1: ONE canonical base per gender = bald (skin scalp on the head contour) + plain white tee & shorts.
# Writes sheets/<char>_base.png (same cells as <char>_basic) and <char>_hair0.png (the extracted default hair, its own asset).
import json, numpy as np
from PIL import Image
from scipy import ndimage as nd
A = json.load(open('assets/characters/atlas.json')); RIG = json.load(open('assets/characters/rig.json')); FW, FH = A['frameW'], A['frameH']
EX, EY, MS0 = {}, {}, {}
for ch in ('player', 'boy'):  # skull size from the front frame's FACE skin (ear to ear), not the hair bbox
    sh = A['sheets'][ch + '/basic']; S = np.array(Image.open('assets/characters/' + sh['img']).convert('RGBA')); M = np.array(Image.open('assets/characters/' + sh['img'].replace('.png', '_mask.png')))
    x, y = sh['cells']['walk_S_0.png']; m = M[y:y + FH, x:x + FW]; R = RIG[f'{ch}/basic/walk_S_0.png']; sk = m[..., 1] > 128
    wmax = max((np.ptp(np.where(sk[r])[0]) if sk[r].sum() > 3 else 0) for r in range(R[2], R[3])); EX[ch] = wmax / 2 * 1.04; EY[ch] = EX[ch] * .98
    MS0[ch] = A['meta'].get(f'{ch}/basic/walk_S_0.png', [1])[0]; print(ch, 'skull', EX[ch], EY[ch])
for ch in ('player', 'boy'):
    sh = A['sheets'][ch + '/basic']; S = np.array(Image.open('assets/characters/' + sh['img']).convert('RGBA')).astype(float)
    M = np.array(Image.open('assets/characters/' + sh['img'].replace('.png', '_mask.png')).convert('RGBA')).astype(float)
    O = S.copy(); HR = np.zeros_like(S)
    for f, (cx0, cy0) in sh['cells'].items():
        c = S[cy0:cy0 + FH, cx0:cx0 + FW]; m = M[cy0:cy0 + FH, cx0:cx0 + FW]; o = c.copy(); a = c[..., 3]
        if a.max() == 0: continue
        hair = m[..., 0] > 110; skin = (m[..., 1] > 200) & (a > 250); outf = m[..., 2] > 60
        ys = np.where(a.max(1) > 40)[0]; top = ys[0]
        R = RIG.get(f'{ch}/basic/{f}')
        if R: x0, x1, y1 = R[0], R[1], R[3] + (top - R[2])
        else:
            hy, hx = np.where(hair | ((m[..., 1] > 128) & (np.arange(FH)[:, None] < top + 110)))
            x0, x1, y1 = (hx.min(), hx.max(), min(hy.max(), top + 110)) if len(hx) else (60, 140, top + 90)
        k = MS0[ch] / A['meta'].get(f'{ch}/basic/{f}', [1])[0]; ex, ey = EX[ch] * k, EY[ch] * k
        ecx = (x0 + x1) / 2; ecy = y1 - ey * .92
        Y, X = np.mgrid[0:FH, 0:FW]; e = ((X - ecx) / ex) ** 2 + ((Y - ecy) / ey) ** 2
        sk = c[skin & (Y < y1)][:, :3]; sk = np.median(sk, 0) if len(sk) > 20 else np.array([240, 200, 175.])
        # extracted default hair = hair-labelled pixels (own asset)
        hr = c.copy(); hr[..., 3] = np.where(hair, a, 0); HR[cy0:cy0 + FH, cx0:cx0 + FW] = hr
        # bald scalp: hair inside the head ellipse → shaded skin; hair outside → removed
        ins = hair & (e <= 1); sh_ = (1 - .16 * np.clip(e, 0, 1)) * (1 + .06 * np.clip((ecy - Y) / ey, 0, 1))
        o[ins, :3] = np.clip(sk[None] * sh_[ins][:, None], 0, 255); o[ins, 3] = 255
        o[hair & (e > 1), 3] = 0
        # head contour: fill the ellipse so the scalp is a full round skull (no bite where hair used to stick out)
        fill = (e <= 1) & (a < 200) & (Y < ecy); o[fill, :3] = np.clip(sk[None] * sh_[fill][:, None], 0, 255); o[fill, 3] = 255
        # plain white cotton tee & shorts: outfit pixels → white, shaded by original luminance
        L = c[..., :3].mean(2); lm = np.median(L[outf & (a > 250)]) if (outf & (a > 250)).sum() > 20 else 200
        w = np.clip(L / lm, .55, 1.08)[..., None] * np.array([246, 244, 238.]); o[outf, :3] = np.clip(w[outf], 0, 255)
        O[cy0:cy0 + FH, cx0:cx0 + FW] = o
    Image.fromarray(O.astype(np.uint8)).save(f'assets/characters/sheets/{ch}_base.png')
    Image.fromarray(HR.astype(np.uint8)).save(f'assets/characters/sheets/{ch}_hair0.png'); print(ch, 'ok')

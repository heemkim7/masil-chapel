# Canonical bald base walk cycles. Head+torso = the key frame for that direction (identical face every frame).
# S/N: legs from the key, alternating foot lift (one foot always grounded → height constant).
# SW/W/NW: leg silhouette+pixels taken from the original frame below the key's shorts hem (shorts→white, skin→base tone).
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, 'tools'); import fit_base as F
A = F.A; FW, FH = F.FW, F.FH; RIG = json.load(open('assets/characters/rig.json'))
NF = {'S': 6, 'SW': 4, 'W': 6, 'NW': 2, 'N': 6}
LIFTS = {'SW': [(7, 0), (3, 0), (0, 7), (0, 3)], 'NW': [(6, 0), (0, 6)]}
LIFT = [(4, 0), (8, 0), (4, 0), (0, 4), (0, 8), (0, 4)]
def hem(K):
    S = K[..., 3] > 127; ys = np.where(S.any(1))[0]; t, b = ys.min(), ys.max(); wh = (K[..., :3].min(2) > 200) & S
    cnt = wh.sum(1); r0 = t + int((b - t) * .55); r1 = t + int((b - t) * .85); m = cnt[r0:r1].max()
    rows = [r for r in range(r0, r1) if cnt[r] >= .5 * m]; return max(rows)
def stretch(K, r0, r1, k, cx):
    if abs(k - 1) < .03: return K
    out = K.copy(); band = K[r0:r1].astype(float); band[..., :3] *= band[..., 3:] / 255
    nw = round(FW * k); P = np.array(Image.fromarray(band.astype(np.uint8), 'RGBA').resize((nw, r1 - r0), Image.LANCZOS)).astype(float)
    x0 = int(round(cx * k - cx)); P = P[:, x0:x0 + FW]; a = P[..., 3:]; P[..., :3] = np.where(a > 0, P[..., :3] * 255 / np.maximum(a, 1), 0)
    out[r0:r1] = P.clip(0, 255).astype(np.uint8); return out
def build(ch):
    sh = A['sheets'][ch + '/basic']; S0 = np.array(Image.open('assets/characters/' + sh['img']).convert('RGBA'))
    M0 = np.array(Image.open('assets/characters/' + sh['img'].replace('.png', '_mask.png')))
    cell = lambda arr, f: arr[sh['cells'][f][1]:sh['cells'][f][1] + FH, sh['cells'][f][0]:sh['cells'][f][0] + FW]
    res = {}
    for d, n in NF.items():
        K = np.array(Image.open(f'/workspace/mk/draft/{ch}_walk_{d}_0_raw.png').convert('RGBA')); hk = hem(K)
        O = cell(S0, f'walk_{d}_0.png'); R = RIG[f'{ch}/basic/walk_{d}_0.png']; chin = R[3]
        # body width matched to the original: torso width a third of the way chin→hem
        rr = chin + (hk - chin) // 3; wo = np.ptp(np.where(O[rr, :, 3] > 40)[0]); wk = np.ptp(np.where(K[rr, :, 3] > 127)[0])
        cx = (np.where(K[..., 3].any(0))[0].min() + np.where(K[..., 3].any(0))[0].max()) / 2
        kw = wo / wk if ch == "player" and d != "W" else 1.0
        K = stretch(K, chin + 4, FH if d != 'W' else hk + 1, min(kw, 1.25), cx)
        skinK = np.median(K[chin + 6:hk][(K[chin + 6:hk, :, 3] > 127) & (K[chin + 6:hk, :, 0].astype(int) > K[chin + 6:hk, :, 2].astype(int) + 40)][:, :3], 0)
        whK = np.array([246, 246, 244.])
        for i in range(n):
            f = f'walk_{d}_{i}.png'; C = np.zeros((FH, FW, 4), float)
            if d in ('S', 'N', 'SW', 'NW'):
                L = K.copy(); L[:hk + 1] = 0; up = K.copy(); up[hk + 1:] = 0
                xs = np.where(L[..., 3].any(0))[0]; mid = (xs.min() + xs.max()) // 2; lift = LIFTS.get(d, LIFT)[i]
                if d == 'N': lift = lift[::-1]
                legs = []
                for side in (0, 1):
                    leg = L.copy(); (leg[:, mid:] if side == 0 else leg[:, :mid])[:] = 0; legs.append(leg)
                bots = [np.where(lg[..., 3].any(1))[0].max() for lg in legs]; kbot = max(bots)
                nb = max(bots[0] - lift[0], bots[1] - lift[1]); g = 0 if lift[0] <= lift[1] else 1; dz = kbot - nb
                if dz > 0:  # grounded leg is the shorter one: stretch it so its foot still touches the baseline (height constant)
                    t0 = hk + 1; b0 = bots[g] + 1; seg = legs[g][t0:b0].astype(np.uint8)
                    legs[g] = legs[g].copy(); legs[g][t0:] = 0; legs[g][t0:b0 + dz] = np.array(Image.fromarray(seg, 'RGBA').resize((FW, b0 - t0 + dz), Image.NEAREST))
                for side, lv in ((0, lift[0]), (1, lift[1])):
                    leg = legs[side]
                    leg = np.roll(leg, -lv, 0); leg[:hk + 1 - 0] = np.where(np.arange(FH)[:hk + 1, None, None] >= hk + 1 - lv - 3, leg[:hk + 1], 0)
                    a = leg[..., 3:] / 255.; C = leg * a + C * (1 - a)
                a = up[..., 3:] / 255.; C = up * a + C * (1 - a)
            else:
                a_, fg_ = F.key_out(Image.open('/workspace/mk/draft/w_boy_W.jpg')); o = F.figures(fg_)[i]
                cm = fg_[o]; ys_, xs_ = np.where(cm); cr = a_[o][ys_.min():ys_.max() + 1, xs_.min():xs_.max() + 1]; cm = cm[ys_.min():ys_.max() + 1, xs_.min():xs_.max() + 1]
                ky = np.where(K[..., 3].any(1))[0]; kh = ky.max() - ky.min() + 1; k = kh / cm.shape[0]
                D = np.dstack([cr, cm * 255]).astype(np.uint8); D = np.array(Image.fromarray(D, 'RGBA').resize((round(cm.shape[1] * k), kh), Image.LANCZOS)).astype(float)
                DD = np.zeros((FH, FW, 4)); kx = np.where(K[hk - 10:hk, :, 3].any(0))[0]
                dh = hem(np.pad(D, ((0, 0), (0, 0), (0, 0))).astype(np.uint8)); dx_ = np.where(D[dh - 10:dh, :, 3].any(1 - 1) if False else D[dh - 10:dh, :, 3].any(0))[0]
                ox = int(round((kx.min() + kx.max()) / 2 - (dx_.min() + dx_.max()) / 2)); oy = ky.max() + 1 - kh
                x0, x1 = max(0, ox), min(FW, ox + D.shape[1]); DD[oy:oy + kh, x0:x1] = D[:, x0 - ox:x1 - ox]
                sh_ = hk - (oy + dh); DD = np.roll(DD, 0, 0); low = DD.copy(); low[:hk - 2] = 0
                skm = (low[..., 0] - low[..., 2] > 40) & (low[..., 3] > 0); low[skm, :3] = (skinK * (np.clip(low[skm, :3].mean(1, keepdims=True) / max(1, np.median(low[skm, :3].mean(1))), .75, 1.03))).clip(0, 255)
                up = K.astype(float).copy(); up[hk + 1:] = 0; a = up[..., 3:] / 255.; C = up * a + low * (1 - a)
            al = C[..., 3]; rgb = np.where(al[..., None] > 0, C[..., :3] * 255 / np.maximum(al[..., None], 1), 0).clip(0, 255) if False else C[..., :3]
            out, _ = F.finish(np.clip(rgb, 0, 255), al)
            kbt = np.where((K[..., 3] > 127).any(1))[0].max(); ob = np.where((out[..., 3] > 0).any(1))[0].max()
            if ob < kbt:  # feet must stay on the baseline: stretch the legs (below the hem) by the shortfall
                seg = out[hk + 1:ob + 1]; out = out.copy(); out[hk + 1:] = 0
                out[hk + 1:kbt + 1] = np.array(Image.fromarray(seg, 'RGBA').resize((FW, kbt - hk), Image.NEAREST))
            res[f] = out
    return res
if __name__ == '__main__':
    for ch in sys.argv[1:]:
        R = build(ch)
        for f, o in R.items(): Image.fromarray(o).save(f'/workspace/mk/base/{ch}_{f}')
        h = {f: int(np.ptp(np.where((o[..., 3] > 40).any(1))[0]) + 1) for f, o in R.items()}; print(ch, h)

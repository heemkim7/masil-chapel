# fit a generated (white-bg) sheet of R x C figures onto an existing 200x284 sheet layout:
# each figure is matted (edge flood-fill of near-white), then scaled/placed to match the reference cell's alpha bbox (height + baseline + center)
import sys, numpy as np
from PIL import Image
from scipy import ndimage
gen, ref, out, R, C = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
G = np.asarray(Image.open(gen).convert('RGB')).astype(int); H, W, _ = G.shape
white = (G.min(2) > 232) & (G.max(2) - G.min(2) < 18)
lab, n = ndimage.label(white); edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
bg = np.isin(lab, list(edge)); fg = ~bg
fg = ndimage.binary_opening(fg, iterations=1)
A = np.zeros((H, W), np.uint8); A[fg] = 255
A = np.asarray(Image.fromarray(A).filter(__import__('PIL.ImageFilter', fromlist=['x']).GaussianBlur(0.8)))
RGBA = np.dstack([G.astype(np.uint8), A])
Ref = Image.open(ref).convert('RGBA'); RA = np.asarray(Ref)[..., 3]
outim = Image.new('RGBA', Ref.size, (0, 0, 0, 0))
ch, cw = H / R, W / C
for r in range(R):
    for c in range(C):
        y0, y1, x0, x1 = int(r * ch), int((r + 1) * ch), int(c * cw), int((c + 1) * cw)
        m = fg[y0:y1, x0:x1]; lb, k = ndimage.label(m)
        if not k: continue
        sizes = ndimage.sum(m, lb, range(1, k + 1)); keep = np.isin(lb, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.04])
        ys, xs = np.where(keep); gy0, gy1, gx0, gx1 = ys.min(), ys.max(), xs.min(), xs.max()
        cell = RGBA[y0:y1, x0:x1].copy(); cell[..., 3] = np.where(ndimage.binary_dilation(keep, iterations=2), cell[..., 3], 0)
        fig = Image.fromarray(cell[gy0:gy1 + 1, gx0:gx1 + 1])
        ra = RA[r * 284:(r + 1) * 284, c * 200:(c + 1) * 200]; rys, rxs = np.where(ra > 40)
        if not len(rys): continue
        th = rys.max() - rys.min() + 1; s = th / fig.height; fig = fig.resize((max(1, round(fig.width * s)), th), Image.LANCZOS)
        cx = (rxs.min() + rxs.max()) / 2; px = int(round(c * 200 + cx - fig.width / 2)); py = r * 284 + rys.min()
        tile = Image.new('RGBA', (200, 284)); tile.alpha_composite(fig, (px - c * 200, py - r * 284)) if 0 <= px - c * 200 and px - c * 200 + fig.width <= 200 else tile.paste(fig, (px - c * 200, py - r * 284), fig)
        outim.alpha_composite(tile, (c * 200, r * 284))
outim.save(out); print('ok', out)

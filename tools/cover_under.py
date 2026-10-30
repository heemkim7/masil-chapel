"""Patch an outfit layer so it covers the base underwear: uncovered underwear px get the colour of the nearest
layer pixel (shading kept by base luminance). python3 tools/cover_under.py player mint NW N"""
import sys, numpy as np, scipy.ndimage as nd
from PIL import Image
sys.path.insert(0, 'tools'); from layer_extract import chin_row, skinlike
from normalize import PY
N = '/workspace/mk/norm'; ch, nm = sys.argv[1:3]
for d in sys.argv[3:]:
    p = f'{N}/{ch}_outfit_{nm}_{d}.png'; a = np.array(Image.open(p).convert('RGBA')); L = a[..., 3] > 127
    b = np.array(Image.open(f'{N}/{ch}_base_{d}.png').convert('RGBA')); B = b[..., 3] > 40; bc = b[..., :3].astype(int)
    chin = chin_row(b); yy = np.arange(a.shape[0])[:, None]
    under = B & ~skinlike(bc) & (yy > chin + 2) & (yy < chin + int((PY - chin) * .8))
    miss = nd.binary_dilation(under & ~L, iterations=1) & B & ~L & (yy > chin + 2)
    _, (iy, ix) = nd.distance_transform_edt(~L, return_indices=True)
    src = a[iy, ix, :3].astype(float); lum = bc.mean(2) / np.maximum(bc[under].mean(), 1)
    col = np.clip(src * (0.75 + 0.25 * lum[..., None]), 0, 255)
    a[miss, :3] = col[miss].astype(np.uint8); a[miss, 3] = 255
    Image.fromarray(a).save(p); print(d, 'patched px', int(miss.sum()), 'still uncovered', int((under & ~(a[..., 3] > 127)).sum()))

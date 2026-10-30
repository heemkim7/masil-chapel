"""Normalise a pose image: crop to the tight alpha bbox, scale so the figure's real height is a fixed px
(per gender/age), paste on a fixed canvas with the bottom-centre of the feet at a fixed pivot.
Usage: python3 tools/normalize.py <H> <in.png> <out.png> [--ref-bbox x0,y0,x1,y1]
Also importable: normalize(im, H) / place(im, s, bbox)"""
import sys
import numpy as np
from PIL import Image
CW, CH, PX, PY = 200, 284, 100, 272          # canvas + foot pivot (PY = last opaque row)
HEIGHT = {'boy': 220, 'player': 204}           # fixed figure height per gender (adult); ages scale at draw time
def bbox(a, th=40):
    m = a[..., 3] > th; ys, xs = np.nonzero(m); return xs.min(), ys.min(), xs.max(), ys.max()
def feet_cx(a, y1, th=40):
    """horizontal centre of the bottom 12 rows (the feet) -> pivot x"""
    m = a[max(0, y1 - 11):y1 + 1, :, 3] > th; xs = np.nonzero(m)[1]; return (xs.min() + xs.max()) / 2
def place(im, s, box, cx):
    """scale image by s about its own bbox and paste so (cx, box bottom) lands on the pivot"""
    x0, y0, x1, y1 = box; crop = im.crop((x0, y0, x1 + 1, y1 + 1))
    w, h = crop.size; nh = round(h * s); nw = max(1, round(w * s))
    crop = crop.resize((nw, nh), Image.LANCZOS)
    out = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    out.alpha_composite(crop, (round(PX - (cx - x0) * s), PY - nh + 1)); return out
def normalize(im, H):
    a = np.array(im.convert('RGBA')); box = bbox(a); h = box[3] - box[1] + 1; s = H / h
    out = place(im.convert('RGBA'), s, box, feet_cx(a, box[3]))
    # exact-height pass: LANCZOS can shave/add a faint row; re-solve once against the measured result
    b2 = bbox(np.array(out)); h2 = b2[3] - b2[1] + 1
    if h2 != H: out = place(im.convert('RGBA'), s * H / h2, box, feet_cx(a, box[3]))
    return out, s, box
if __name__ == '__main__':
    H = int(sys.argv[1]); out, s, box = normalize(Image.open(sys.argv[2]), H); out.save(sys.argv[3]); print(sys.argv[3], 'scale', round(s, 4), 'bbox', box)

# v6: pad every character frame with a transparent top margin (200x260 -> 200x284, +24px top),
# and repair frames whose hair was cropped at the top edge by synthesizing a rounded cap.
import glob, json, math
from PIL import Image
R = 'assets/characters/'; PAD = 24
def repair(im):
    A = im.getchannel('A'); W, H = im.size
    row = [x for x in range(W) if A.getpixel((x, 0)) > 20]
    if not row: return im, 0
    x0, x1 = min(row), max(row); hw = (x1 - x0) / 2; cx = (x0 + x1) / 2
    # slope of the silhouette just below the cut -> cap height (continue the curvature as an ellipse)
    def width(y): r = [x for x in range(W) if A.getpixel((x, y)) > 20]; return (max(r) - min(r)) / 2 if r else hw
    slope = max(.6, (width(3) - width(0)) / 3)  # px of half-width gained per row just below the cut
    k = int(round(min(14, max(6, hw / (2 * slope)))))  # parabolic dome whose edge slope matches the silhouette
    px = im.load(); out = Image.new('RGBA', (W, H + PAD)); out.paste(im, (0, PAD)); po = out.load()
    for i in range(1, k + 1):
        t = i / (k + 1); h = hw * math.sqrt(max(0, 1 - t)); yy = PAD - i
        for x in range(int(cx - h - 1), int(cx + h + 2)):
            if not (0 <= x < W): continue
            # sample the top row colour at the same relative position (keeps painted hair streaks)
            sx = int(round(cx + (x - cx) * hw / max(h, 1))); sx = min(x1, max(x0, sx))
            r, g, b, a = px[sx, 0]; shade = 1 - .05 * t
            edge = min(1, max(0, h + .5 - abs(x - cx)))
            po[x, yy] = (int(r * shade), int(g * shade), int(b * shade), int(a * edge))
    return out, k
rep = []
for f in sorted(glob.glob(R + '*/*/*.png')):
    im = Image.open(f).convert('RGBA')
    if im.size[1] != 260: continue
    out, k = repair(im)
    if not k: out = Image.new('RGBA', (im.size[0], im.size[1] + PAD)); out.paste(im, (0, PAD))
    else: rep.append((f, k))
    out.save(f, optimize=True)
for p in [R + 'atlas.json', R + 'atlas_bak.json']:
    a = json.load(open(p)); a['frameH'] = 260 + PAD; a['baselineY'] = a['baselineY'] + PAD
    if 'meta' in a and p.endswith('atlas.json'): pass
    json.dump(a, open(p, 'w'), ensure_ascii=False, indent=1)
print('repaired', len(rep)); [print(r) for r in rep]

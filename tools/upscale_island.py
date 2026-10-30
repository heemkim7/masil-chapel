# EDSR x3 super-resolution of the field background (world scale 3 => 1 src px : 1 world px), then 1024px WebP tiles
import cv2, numpy as np, os, json
sr = cv2.dnn_superres_DnnSuperResImpl.create(); sr.readModel('/tmp/EDSR_x3.pb'); sr.setModel('edsr', 3)
src = cv2.imread('assets/island_v5.jpg'); src = cv2.fastNlMeansDenoisingColored(src, None, 3, 3, 5, 15)  # soften JPEG blocks first
H, W = src.shape[:2]; T, P = 200, 12; out = np.zeros((H * 3, W * 3, 3), np.uint8)
for y in range(0, H, T):
    for x in range(0, W, T):
        y0, x0, y1, x1 = max(0, y - P), max(0, x - P), min(H, y + T + P), min(W, x + T + P)
        up = sr.upsample(src[y0:y1, x0:x1]); oy, ox = (y - y0) * 3, (x - x0) * 3; h, w = (min(H, y + T) - y) * 3, (min(W, x + T) - x) * 3
        out[y * 3:y * 3 + h, x * 3:x * 3 + w] = up[oy:oy + h, ox:ox + w]
    print('row', y, flush=True)
cv2.imwrite('/tmp/island_hd.png', out)
os.makedirs('assets/island_hd', exist_ok=True); TS = 1024; meta = {'tile': TS, 'W': out.shape[1], 'H': out.shape[0], 'cols': 0, 'rows': 0}
for r, y in enumerate(range(0, out.shape[0], TS)):
    for c, x in enumerate(range(0, out.shape[1], TS)):
        cv2.imwrite(f'assets/island_hd/t_{r}_{c}.webp', out[y:y + TS, x:x + TS], [cv2.IMWRITE_WEBP_QUALITY, 86]); meta['cols'] = c + 1
    meta['rows'] = r + 1
json.dump(meta, open('assets/island_hd/meta.json', 'w')); print('done', meta)

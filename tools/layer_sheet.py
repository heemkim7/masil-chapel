"""contact sheet: base + layers per direction (8 dirs, E/SE/NE mirrored). python3 tools/layer_sheet.py out.png ch layer1,layer2 [scale]"""
import sys, os
from PIL import Image, ImageOps
N = '/workspace/mk/norm'; D8 = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']; MIR = {'E': 'W', 'SE': 'SW', 'NE': 'NW'}
def comp(ch, layers, d):
    s = MIR.get(d, d); im = Image.open(f'{N}/{ch}_base_{s}.png').convert('RGBA')
    for l in layers:
        p = f'{N}/{ch}_{l}_{s}.png'
        if os.path.exists(p): im.alpha_composite(Image.open(p).convert('RGBA'))
    return ImageOps.mirror(im) if d in MIR else im
if __name__ == '__main__':
    out, rows = sys.argv[1], [r.split(':') for r in sys.argv[2:]]
    sh = Image.new('RGBA', (8 * 160, len(rows) * 250), (150, 200, 120, 255))
    for r, (ch, ls) in enumerate(rows):
        for i, d in enumerate(D8): sh.alpha_composite(comp(ch, [x for x in ls.split(',') if x], d).crop((20, 30, 180, 280)), (i * 160, r * 250))
    sh.convert('RGB').save(out)

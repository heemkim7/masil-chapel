# Computes per-frame alpha bbox metadata; drops broken (truncated/faded) walk frames.
# Writes atlas.json from atlas_bak.json (original). meta[key] = [scale, anchorX, footY]
import json, statistics as st
from PIL import Image
R = 'assets/characters/'
a = json.load(open(R + 'atlas_bak.json'))
meta = {}; report = []
def bb(p):
    im = Image.open(p); A = im.getchannel('A').point(lambda v: 255 if v > 60 else 0); return A.getbbox()
for c, outs in a['chars'].items():
    for o, anims in outs.items():
        boxes = {k: [(f, bb(f'{R}{c}/{o}/{f}')) for f in fr] for k, fr in anims.items()}
        # drop broken frames in walk anims: height well below anim max
        for k in list(anims):
            if not k.startswith('walk'): continue
            hs = [b[3] - b[1] for _, b in boxes[k]]; mx = max(hs)
            good = [(f, b) for f, b in boxes[k] if (b[3] - b[1]) >= .9 * mx]
            refS = st.median([b[3] - b[1] for _, b in boxes.get('walk_S', boxes[k])])
            if len(good) < 3 or mx < .8 * refS:
                report.append(f'{c}/{o} drop anim {k} (good={len(good)}, max={mx}, refS={refS})'); del anims[k]; del boxes[k]; continue
            if len(good) < len(hs): report.append(f'{c}/{o} {k}: drop {len(hs)-len(good)} frames')
            anims[k] = [f for f, _ in good]; boxes[k] = good
        H = st.median([b[3] - b[1] for _, b in boxes['walk_S']])
        refIdleBot = None
        for k, fb in boxes.items():
            cx = st.median([(b[0] + b[2]) / 2 for _, b in fb])
            if k.startswith('walk') or k.startswith('idle'):
                for f, b in fb: meta[f'{c}/{o}/{f}'] = [round(H / (b[3] - b[1]), 4), round(cx, 1), b[3]]
            else:  # emotes: keep pose shape (kneel/jump) — scale 1, keep painted baseline so jumps/kneels read right
                base = max(b[3] for _, b in fb)  # lowest point of the anim touches the ground
                for f, b in fb: meta[f'{c}/{o}/{f}'] = [1, round(cx, 1), base]
        report.append(f'{c}/{o} bodyH={H}')
a['meta'] = meta; a['normalized'] = 'v5: per-frame alpha bbox; scale=walk_S median body height; anchor=bbox bottom-center'
json.dump(a, open(R + 'atlas.json', 'w'), ensure_ascii=False, indent=1)
print('\n'.join(report))

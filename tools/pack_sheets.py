# v6: pack each char/outfit's frames into one sprite sheet (dedup identical frames) -> fewer requests/uploads.
import json, hashlib, os
from PIL import Image
R = 'assets/characters/'; a = json.load(open(R + 'atlas.json')); W, H = a['frameW'], a['frameH']; os.makedirs(R + 'sheets', exist_ok=True); sheets = {}
for c, outs in a['chars'].items():
    for o, anims in outs.items():
        files = sorted({f for fr in anims.values() for f in fr}); uniq = {}; cells = {}
        for f in files:
            h = hashlib.sha1(open(f'{R}{c}/{o}/{f}', 'rb').read()).hexdigest()
            if h not in uniq: uniq[h] = len(uniq)
            cells[f] = uniq[h]
        n = len(uniq); cols = min(8, n); rows = -(-n // cols); sh = Image.new('RGBA', (cols * W, rows * H)); done = set()
        for f, i in cells.items():
            if i in done: continue
            done.add(i); sh.paste(Image.open(f'{R}{c}/{o}/{f}').convert('RGBA'), ((i % cols) * W, (i // cols) * H))
        name = f'sheets/{c}_{o}.png'; sh.save(R + name, optimize=True)
        sheets[f'{c}/{o}'] = {'img': name, 'cells': {f: [(i % cols) * W, (i // cols) * H] for f, i in cells.items()}}
        print(name, n, 'unique of', len(files), os.path.getsize(R + name) // 1024, 'KB')
a['sheets'] = sheets; json.dump(a, open(R + 'atlas.json', 'w'), ensure_ascii=False, indent=1)

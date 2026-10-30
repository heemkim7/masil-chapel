# Generates pastor/staff voice lines for worship phases (edge-tts, Microsoft neural voices). Run: python3 tools/gen_voice.py
import json, re, subprocess, pathlib
src = open('js/worship.js', encoding='utf-8').read()
body = src[src.index('const PH = ['):src.index('const CYC')]
V = {'senior': 'ko-KR-InJoonNeural', 'assoc': 'ko-KR-HyunsuMultilingualNeural', 'evang': 'ko-KR-SunHiNeural'}
out = pathlib.Path('assets/audio/voice'); man = {}
for i, ln in enumerate([l for l in body.splitlines() if l.strip().startswith('{ k:')]):
    who = re.search(r"who: '(\w+)'", ln).group(1)
    if who not in V: continue
    items = []
    m = re.search(r"verse: '([^']+)'", ln)
    if m: items.append(('v', m.group(1).split(' (')[0]))
    m = re.search(r"lines: \[(.*?)\]", ln)
    for j, t in enumerate(re.findall(r"'([^']+)'", m.group(1))): items.append((str(j), t))
    for k, t in items:
        f = out / f'p{i}_{k}.mp3'
        subprocess.run(['edge-tts', '--voice', V[who], '--rate=-8%', '--text', t, '--write-media', str(f)], check=True, capture_output=True)
        d = float(subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)], capture_output=True, text=True).stdout)
        man[f'{i}_{k}'] = round(d, 2)
json.dump(man, open(out / 'manifest.json', 'w'), indent=0); print(man)

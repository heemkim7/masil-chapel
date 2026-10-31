# Typecast voice lines for worship phases (replaces edge-tts). Key from env TYPECAST_API_KEY (never logged).
# Usage: python3 tools/gen_voice_typecast.py audition <outdir>   |   python3 tools/gen_voice_typecast.py build [only_keys,comma]
import json, re, subprocess, pathlib, os, sys, base64, time, httpx
URL = 'https://api.typecast.ai/v1/text-to-speech'
CAND = {'senior': {'Myungjoo': 'tc_656059fc4db338e38f77d0bc', 'StorytellerJinsub': 'tc_65571d1aa52fc0f2872045fa', 'Daejin': 'tc_6a0e85a97f7750959b970d5d', 'Sungho': 'tc_5fe06471a9f79e8f959be96f', 'SeokChoi': 'tc_62ce545fb130717df10ea37a'},
        'assoc': {'Hosun': 'tc_65a0e1eb23a607b9906c0154', 'Wonho': 'tc_66bf0dadd3f21fab24da6708', 'Jungmin': 'tc_658d1bc867f8ac8fa3cbbeec', 'Hyunmin': 'tc_627ae61ffdf53ef0bb6902cd'},
        'evang': {'Seohyeon': 'tc_69f2e455ea79fd197aa0476f', 'Eunkyung': 'tc_6a7446c19f2d7dfed990a900', 'Jain': 'tc_6809c111e5e8c73f8a0237b2', 'Gowoon': 'tc_68785db8ba9cd7503f27d921'}}
PICK = json.load(open('tools/voice_pick.json')) if os.path.exists('tools/voice_pick.json') else {}
def tts(vid, text, f, tempo=.95, seed=None):
    body = {'voice_id': vid, 'text': text, 'model': 'ssfm-v30', 'language': 'kor', 'prompt': {'emotion_type': 'preset', 'emotion_preset': 'normal', 'emotion_intensity': 1.0}, 'output': {'audio_format': 'mp3', 'audio_tempo': tempo, 'target_lufs': -16}}
    if seed is not None: body['seed'] = seed
    for a in range(4):
        r = httpx.post(URL, headers={'X-API-KEY': os.environ['TYPECAST_API_KEY']}, json=body, timeout=120)
        if r.status_code == 200: pathlib.Path(f).write_bytes(r.content if not r.headers.get('content-type', '').startswith('application/json') else base64.b64decode(r.json()['audio'])); return
        if r.status_code not in (429, 500, 502, 503, 504): raise SystemExit(f'HTTP {r.status_code} {r.text[:200]}')
        time.sleep(2 * (a + 1))
    raise SystemExit('typecast failed')
def lines():
    src = open('js/worship.js', encoding='utf-8').read(); body = src[src.index('const PH = ['):src.index('const CYC')]; out = []
    for i, ln in enumerate([l for l in body.splitlines() if l.strip().startswith('{ k:')]):
        who = re.search(r"who: '(\w+)'", ln).group(1)
        if who not in CAND: continue
        m = re.search(r"verse: '([^']+)'", ln)
        if m: out.append((who, f'{i}_v', m.group(1).split(' (')[0]))
        m = re.search(r"lines: \[(.*?)\]", ln)
        for j, t in enumerate(re.findall(r"'([^']+)'", m.group(1))): out.append((who, f'{i}_{j}', t))
    return out
dur = lambda f: float(subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)], capture_output=True, text=True).stdout)
if __name__ == '__main__':
    L = lines()
    if sys.argv[1] == 'audition':
        od = pathlib.Path(sys.argv[2]); od.mkdir(parents=True, exist_ok=True)
        for who, C in CAND.items():
            t = next(x[2] for x in L if x[0] == who)
            for n, vid in C.items(): tts(vid, t, od / f'{who}_{n}.mp3'); print(who, n, round(dur(od / f'{who}_{n}.mp3'), 2), flush=True)
    else:
        only = sys.argv[2].split(',') if len(sys.argv) > 2 else None; out = pathlib.Path('assets/audio/voice'); mf = out / 'manifest.json'; man = json.load(open(mf)) if mf.exists() else {}
        for who, k, t in L:
            if only and k not in only: continue
            p = PICK[who]; f = out / f'p{k}.mp3'; tts(p['id'], t, f, p.get('tempo', .95), p.get('seed')); man[k] = round(dur(f), 2); print(k, who, man[k], flush=True)
        json.dump(man, open(mf, 'w'), indent=0)

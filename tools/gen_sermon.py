# Sermon voice (Typecast, pastor 김은성 = Myungjoo). Key from env TYPECAST_API_KEY (never logged). Writes assets/audio/voice/ps1_N.mp3 + manifest durations.
import json, subprocess, sys, os, importlib.util
spec = importlib.util.spec_from_file_location('tc', 'tools/gen_voice_typecast.py'); tc = importlib.util.module_from_spec(spec); sys.argv = [sys.argv[0]]; spec.loader.exec_module(tc)
V = 'tc_656059fc4db338e38f77d0bc'; D = 'assets/audio/voice/'; S = json.load(open(D + 'sermon1.json')); M = json.load(open(D + 'manifest.json'))
for i, t in enumerate(S['lines']):
    f = f'{D}ps1_{i}.mp3'
    if not os.path.exists(f): tc.tts(V, t, f, tempo=.95, seed=7)
    M[f's1_{i}'] = round(float(subprocess.check_output(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', f])), 2)
json.dump(M, open(D + 'manifest.json', 'w'), ensure_ascii=False); print('total', round(sum(M[f's1_{i}'] for i in range(len(S['lines']))), 1), 's')

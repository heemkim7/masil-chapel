# pre-generates Typecast voice mp3s server-side (key from env only, never shipped)
import sys,json,os,time
sys.path.insert(0,'/workspace/grok_bot/tools/typecast'); from tts_client import TypecastAPI
from pathlib import Path
V=json.load(open('tools/voice_ids.json')); d=json.load(open('data/dialogue.json')); out=Path('assets/voice'); out.mkdir(exist_ok=True)
emo={'pastor':'normal','gwon':'happy','yuna':'happy','haeun':'happy','lamb':'happy'}
ok=0
for ln in d['lines']:
  p=out/f"{ln['id']}.mp3"
  if p.exists(): ok+=1; continue
  for k in range(3):
    try:
      TypecastAPI(voice_id=V[ln['who']],model='ssfm-v30',language='kor',emotion='preset',emotion_preset=emo[ln['who']],emotion_intensity=1.0).synthesize(ln['text'],p); ok+=1; break
    except Exception as e: print('FAIL',ln['id'],str(e)[:200],flush=True); time.sleep(3)
print('DONE',ok,len(d['lines']))

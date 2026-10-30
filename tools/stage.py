# Sync deploy list -> /workspace/stage_p3b (adds new runtime files; never touches .env.local)
import json,os,hashlib,shutil,sys
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
p='/workspace/dep_p3b_files.json'; d=json.load(open(p)); files=[x['file'] for x in d if os.path.exists(x['file'])]
for f in sys.argv[1:]:
    if f not in files: files.append(f)
out=[]
for f in files:
    b=open(f,'rb').read(); out.append({'file':f,'sha':hashlib.sha1(b).hexdigest(),'size':len(b)})
    dst='/workspace/stage_p3b/'+f; os.makedirs(os.path.dirname(dst),exist_ok=True); shutil.copyfile(f,dst)
json.dump(out,open(p,'w'),indent=1); print(len(out),'files staged')

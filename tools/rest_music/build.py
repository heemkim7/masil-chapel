from render import *
import math
SPEC={ # id: (source, stretch, palette)
 'bethany':('mid/bethany.mid',1.25,'piano'),
 'stille':('mid/stille.mid',1.0,'piano_strings'),
 'toplady':('mid/toplady.mid',1.35,'organ_strings'),
 'itiswell':('mid/itiswell.mid',1.2,'piano_strings'),
 'garden':('mid/garden.mid',1.3,'piano'),
 'largo':('mid/largo.mid',1.1,'strings'),
 'wachet':('mid/wachet.mid',1.15,'organ'),
 'nundanket':('mid/nundanket.mid',1.2,'organ_strings'),
 'festeburg':('mid/festeburg.mid',1.2,'organ'),
 'gordon':('mid/gordon.mid',1.2,'piano_strings'),
 'passion':('bach/bwv244.62',1.25,'strings'),
}
def go(key):
    src,st,pal=SPEC[key]
    if src.startswith('bach/'): notes=notes_from_m21(src); notes=[[s*60/52,d*60/52,p,v,c] for s,d,p,v,c in notes]
    else: notes=notes_from_midi(src)
    notes=[[s*st,d*st,p,v,c] for s,d,p,v,c in notes]
    notes.sort(); t0=notes[0][0]; shift=0; cover=t0; out=[]
    for n in notes:
        gap=n[0]-cover
        if gap>0.8: shift+=gap-0.8
        out.append([n[0]-t0-shift if False else n[0]-shift-t0+0.0]+n[1:]); cover=max(cover,n[0]+n[1])
    notes=out
    ln=max(s+d for s,d,*_ in notes)+1.2
    parts=sorted({n[4] for n in notes}); avg={c:np.mean([n[2] for n in notes if n[4]==c]) for c in parts}
    mel=max(parts,key=lambda c:avg[c])
    reps=max(1,math.ceil(150/ln));
    while reps>1 and reps*ln>235: reps-=1
    allnotes=[]
    for r in range(reps):
        for s,d,p,v,c in notes:
            s2=s+r*ln; vv=62 if c!=mel else 78
            if pal=='piano': allnotes.append([s2,d,p,vv,('piano',c)]); 
            if pal=='piano' and r%2==1 and c!=mel: allnotes.append([s2,d,p,40,('strings',c)])
            if pal=='piano_strings':
                if c==mel: allnotes.append([s2,d,p,80,('piano',c)])
                else: allnotes.append([s2,d,p,58 if r%2==0 else 66,('strings',c)])
            if pal=='organ': allnotes.append([s2,d,p,60,('organ',c)])
            if pal=='organ_strings': allnotes.append([s2,d,p,55,('organ' if r%2==0 or c==mel else 'strings',c)])
            if pal=='strings': allnotes.append([s2,d,p,70 if c==mel else 58,('strings',c)])
            if pal=='strings' and r%2==1 and c==mel: allnotes.append([s2,d,p,45,('piano',c)])
    if len(parts)>1: panmap={c:0.3+0.4*i/(len(parts)-1) for i,c in enumerate(parts)}
    else: panmap={parts[0]:0.5}
    nn=[[s,d,p,v,ic] for s,d,p,v,ic in allnotes]
    x=render([[s,d,p,v,ic] for s,d,p,v,ic in nn], lambda part,p: part[0], lambda part: panmap[part[1]] if part[0]!='strings' else 1-panmap[part[1]]*0.8, reps*ln)
    finish(x,key)
for k in (sys.argv[1:] or SPEC): go(k)

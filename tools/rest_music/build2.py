from render import *
import sys
def canon():
    Q=60/50; H=2*Q; N=[]
    bass=[50,45,47,42,43,38,43,45]
    chords=[[62,66,69],[61,64,69],[62,66,71],[61,66,69],[62,67,71],[62,66,69],[62,67,71],[61,64,69]]
    L1=[78,76,74,73,71,69,71,73]; L2=[74,73,71,69,67,66,67,64]
    def arp(ch,cyc_t,i): # original gentle broken-chord variation
        return [[cyc_t+i*H+k*Q/2, Q/2*1.6, ch[k%3]+12*(k//3), 60, 'p'] for k in range(4)]
    cycles=10
    for c in range(cycles):
        T=c*8*H
        for i,b in enumerate(bass):
            N.append([T+i*H,H,b,72,'sb']); N.append([T+i*H,H,b-12,50,'sb'])
            if c>=1:
                for p in chords[i]: N.append([T+i*H,H,p-12,42,'sp'])
        for v,start in ((0,1),(1,2),(2,3)):
            k=c-start
            if k<0 or c==cycles-1 and v>0: continue
            line = L1 if k%3==0 else L2 if k%3==1 else None
            pan='p%d'%v
            for i in range(8):
                if line: N.append([T+i*H,H,line[i]-(12 if v==2 else 0),70 if v==0 else 60,pan])
                else:
                    for n in arp(chords[i],T,i): n[2]-= (12 if v>=1 else 0); n[4]=pan; N.append(n)
    tot=cycles*8*H
    N.append([tot,4*Q,38,70,'sb']); N.append([tot,4*Q,50,70,'sb'])
    for p in (62,66,69,74): N.append([tot,4*Q,p,55,'p0'])
    pans={'sb':.5,'sp':.6,'p':.5,'p0':.35,'p1':.65,'p2':.5}
    x=render(N, lambda part,p: 'strings' if part[0]=='s' else 'piano', lambda part: pans[part], tot+6)
    finish(x,'canon')
def pad(name,chords,secs,seed,lead):
    r=np.random.default_rng(seed); N=[]; t=0
    scale=sorted({p%12 for ch in chords for p in ch})
    for rep in range(int(200/(len(chords)*secs))+1):
        for ch in chords:
            for p in ch: N.append([t,secs+0.6,p,55,'s'])
            N.append([t,secs+0.6,ch[0]-12,50,'s'])
            for k in range(3):
                if r.random()<0.75:
                    pc=r.choice([p for p in ch])+12
                    N.append([t+k*secs/3+r.uniform(0,0.6),secs/3*1.3,int(pc),52,lead])
            t+=secs
    x=render(N, lambda part,p: 'strings' if part=='s' else part, lambda part: .5 if part=='s' else float(r.uniform(.3,.7)), t)
    finish(x,name)
if 'canon' in sys.argv: canon()
if 'pad1' in sys.argv: pad('pad_stillwater',[[53,60,64,67,69],[50,57,60,64,65],[46,53,57,62,65],[48,55,60,62,65]],8.0,3,'piano')
if 'pad2' in sys.argv: pad('pad_morninglight',[[51,58,62,67],[56,60,63,67],[48,55,58,63],[46,53,58,60]],9.0,5,'organ')

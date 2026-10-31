# 마실채플 rest-mode library renderer. Original arrangements + original additive synthesis (no samples).
import numpy as np, mido, sys, json, subprocess
from scipy.signal import fftconvolve, butter, sosfilt
import pyloudnorm as pyln
SR=44100
def hz(m): return 440*2**((m-69)/12)
def notes_from_midi(path):
    m=mido.MidiFile(path); t=0; on={}; out=[]
    for msg in m:
        t+=msg.time
        if msg.type=='note_on' and msg.velocity>0: on[(msg.channel,msg.note)]=(t,msg.velocity)
        elif msg.type in('note_off','note_on'):
            k=(msg.channel,msg.note)
            if k in on: s,v=on.pop(k); out.append([s,t-s,msg.note,v,msg.channel])
    return out
def notes_from_m21(name):
    from music21 import corpus
    s=corpus.parse(name); out=[]
    for i,p in enumerate(s.parts):
        for n in p.flatten().notes:
            for pp in n.pitches: out.append([float(n.offset),float(n.quarterLength),pp.midi,80,i])
    return out  # in quarters
rng=np.random.default_rng(1)
def piano(f,dur,vel):
    rel=0.35; n=int((dur+rel+0.05)*SR); t=np.arange(n)/SR; s=np.zeros(n)
    for k in range(1,9):
        fk=f*k*np.sqrt(1+0.00015*k*k)
        if fk>9000: break
        dec=0.6+0.35*k+f/400
        s+=np.sin(2*np.pi*fk*t+rng.uniform(0,6))*np.exp(-t*dec*0.5)/k**1.4
    env=np.minimum(t/0.006,1)*np.where(t<dur,1,np.exp(-(t-dur)/rel*4))
    return s*env*(vel/127)**1.5
def strings(f,dur,vel):
    a,rel=0.45,0.9; n=int((dur+rel)*SR); t=np.arange(n)/SR; s=np.zeros(n)
    vib=1+0.0025*np.sin(2*np.pi*5.1*t)*np.minimum(t/0.8,1)
    for det in(0.997,1.0,1.003):
        ph=2*np.pi*f*det*np.cumsum(vib)/SR
        for k in range(1,10):
            if f*k>7000: break
            s+=np.sin(k*ph+rng.uniform(0,6))/k**1.2
    env=np.minimum(t/a,1)*np.where(t<dur,1,np.exp(-(t-dur)/rel*4))
    return s*env*(vel/127)/3
def organ(f,dur,vel):
    rel=0.25; n=int((dur+rel)*SR); t=np.arange(n)/SR
    s=sum(a*np.sin(2*np.pi*f*k*t) for k,a in((1,1),(2,.45),(3,.12),(4,.18),(0.5,.3)) if f*k<8000)
    env=np.minimum(t/0.06,1)*np.where(t<dur,1,np.exp(-(t-dur)/rel*4))
    return s*env*(vel/127)
INST={'piano':piano,'strings':strings,'organ':organ}
def reverb(x,rt=2.8,wet=.28):
    n=int(rt*SR); t=np.arange(n)/SR; sos=butter(2,3500,fs=SR,output='sos')
    y=np.zeros((2,x.shape[1]+n-1))
    for c in range(2):
        ir=sosfilt(sos,rng.standard_normal(n))*np.exp(-6.9*t/rt); ir/=np.sqrt((ir**2).sum())
        y[c]=fftconvolve(x[c],ir)
    out=np.zeros_like(y); out[:,:x.shape[1]]=x*(1-wet); out+=y*wet*1.2
    return out
def render(notes, inst_of_part, pan_of_part, total):
    L=int((total+6)*SR); out=np.zeros((2,L))
    for s,d,p,v,part in notes:
        if s>=total: continue
        w=INST[inst_of_part(part,p)](hz(p),d,v); i=int(s*SR); w=w[:L-i]
        pan=pan_of_part(part); out[0,i:i+len(w)]+=w*np.cos(pan*np.pi/2); out[1,i:i+len(w)]+=w*np.sin(pan*np.pi/2)
    return out
def finish(x, name, tail_fade=5.0, head_fade=1.5):
    x=reverb(x)
    # trim trailing near-silence beyond reverb tail
    e=np.abs(x).max(0); last=np.nonzero(e>e.max()*1e-3)[0][-1]; x=x[:,:last+int(0.5*SR)]
    n=x.shape[1]; fi=int(head_fade*SR); fo=int(tail_fade*SR)
    x[:,:fi]*=np.linspace(0,1,fi)**2; x[:,-fo:]*=np.linspace(1,0,fo)**2
    sos=butter(2,40,'hp',fs=SR,output='sos'); x=sosfilt(sos,x)
    meter=pyln.Meter(SR); lu=meter.integrated_loudness(x.T); x=x*10**((-18-lu)/20)
    pk=np.abs(x).max()
    if pk>0.84: x*=0.84/pk   # keep sample peak <= -1.5 dBFS
    import soundfile as sf; sf.write(f'out/{name}.wav',x.T,SR,subtype='PCM_16')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f'out/{name}.wav','-ar','44100','-c:a','libmp3lame','-b:a','128k',f'out/{name}.mp3'],check=True)
    print(name, round(n/SR,1),'s', 'LUFS', round(meter.integrated_loudness(x.T),1),'peak dBFS',round(20*np.log10(np.abs(x).max()),1))

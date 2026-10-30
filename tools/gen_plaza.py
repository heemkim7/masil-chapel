# Original composition "Plaza Morning" (마실 광장의 아침) — generated from code, dedicated CC0 1.0.
import numpy as np, subprocess, wave
SR=44100; BAR=7.5; N=8; LEN=int(SR*BAR*N); TAIL=int(SR*6)
rng=np.random.default_rng(7); out=np.zeros((2,LEN+TAIL))
def hz(m): return 440*2**((m-69)/12)
chords=[[48,55,64,71],[45,52,60,67],[41,48,57,64],[43,50,59,62]]*2   # Cmaj7 Am7 Fmaj7 Gsus
def pad(m,t0,dur,amp):
  n=int(dur*SR)+int(3*SR); t=np.arange(n)/SR; f=hz(m)
  env=np.clip(t/2.5,0,1)*np.where(t<dur,1,np.exp(-(t-dur)/1.2))
  s=sum(a*np.sin(2*np.pi*f*k*t+ph) for k,a,ph in ((1,1,0),(2,.18,1),(3,.06,2)))
  for ch,det in ((0,.998),(1,1.002)):
    v=amp*env*(s+.5*np.sin(2*np.pi*f*det*t))
    i=int(t0*SR); seg=out[ch,i:i+n]; seg+=v[:len(seg)]
def bell(m,t0,amp):
  n=int(4*SR); t=np.arange(n)/SR; f=hz(m)
  s=(np.sin(2*np.pi*f*t)+.3*np.sin(2*np.pi*f*2.0*t)*np.exp(-t*3)+.12*np.sin(2*np.pi*f*3.01*t)*np.exp(-t*5))*np.exp(-t*1.1)*np.clip(t/.01,0,1)
  pan=rng.uniform(.3,.7); i=int(t0*SR)
  for ch,g in ((0,1-pan),(1,pan)): seg=out[ch,i:i+n]; seg+=amp*g*s[:len(seg)]
for b,c in enumerate(chords):
  for m in c: pad(m,b*BAR,BAR,.05)
  pad(c[0]-12,b*BAR,BAR,.05)
penta=[72,74,76,79,81,84]
for b in range(N):
  for k in range(3):
    if rng.random()<.8: bell(int(rng.choice(penta)),b*BAR+k*2.5+rng.uniform(0,.4),.05)
loop=out[:,:LEN].copy(); loop[:,:TAIL]+=out[:,LEN:LEN+TAIL]   # wrap tail -> seamless
# smooth lowpass for softness
k=np.ones(6)/6; loop=np.array([np.convolve(c,k,'same') for c in loop])
loop/=np.abs(loop).max(); loop*=10**(-3/20)
pcm=(loop.T*32767).astype('<i2')
with wave.open('plaza.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('len s',LEN/SR,'rms dB',20*np.log10(np.sqrt((loop**2).mean())), 'edge jump', np.abs(loop[:,0]-loop[:,-1]).max())

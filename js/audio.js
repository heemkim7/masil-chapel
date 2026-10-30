// 마실채플 audio: every sound is synthesized live with WebAudio (no third-party audio files => no licensing risk).
// Hymn tunes are public-domain melodies (pre-1900) arranged/rendered by our own code. No lyrics are bundled.
const NOTE = n => { const m = /^([A-G])(#|b)?(\d)$/.exec(n); const k = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * 2 ** ((k + (+m[3] + 1) * 12 - 69) / 12); };
const P = s => s.trim().split(/\s+/).map(t => { const [n, d] = t.split(':'); return [n, +(d || 1)]; });
// melody tokens "NOTE:beats", R = rest. bass = chord roots per bar-ish group (beats)
export const HYMNS = [
  { id: 'old100', t: 'Old Hundredth (만복의 근원 선율)', by: 'Louis Bourgeois, 1551 · 공유 저작물', bpm: 92, key: 'G',
    m: P('G4:2 G4 F#4 E4 D4 G4 A4 B4:2 R:2 B4:2 B4 B4 A4 G4 C5 B4 A4:2 R:2 G4:2 A4 B4 A4 G4 E4 F#4 G4:2 R:2 D5:2 B4 G4 A4 C5 B4 A4 G4:3 R:1'),
    b: P('G2:4 C3:2 D3:2 G2:2 R:2 G2:4 C3:2 D3:2 R:2 E2:4 C3:2 D3:2 G2:2 R:2 G2:4 D3:2 D3:2 G2:4') },
  { id: 'newbrit', t: 'New Britain (Amazing Grace 선율)', by: '미국 민요 선율, 1829/1835 · 공유 저작물', bpm: 84, key: 'G',
    m: P('D4 G4:2 B4:0.5 G4:0.5 B4:2 A4 G4:2 E4 D4:2 D4 G4:2 B4:0.5 G4:0.5 B4:2 A4 D5:3 R:1 B4 D5:1.5 B4:0.5 D5:0.5 B4:0.5 G4:2 D4 E4:1.5 G4:0.5 G4:0.5 E4:0.5 D4:2 D4 G4:2 B4:0.5 G4:0.5 B4:2 A4 G4:3 R:2'),
    b: P('R:1 G2:3 G2:3 C3:3 G2:3 G2:3 G2:3 D3:3 D3:3 G2:3 G2:3 C3:3 G2:3 G2:3 D3:3 G2:3 R:2') },
  { id: 'ode', t: 'Ode to Joy (기쁘다 환희의 선율)', by: 'L. v. Beethoven, 1824 · 공유 저작물', bpm: 100, key: 'D',
    m: P('F#4 F#4 G4 A4 A4 G4 F#4 E4 D4 D4 E4 F#4 F#4:1.5 E4:0.5 E4:2 F#4 F#4 G4 A4 A4 G4 F#4 E4 D4 D4 E4 F#4 E4:1.5 D4:0.5 D4:2 E4 E4 F#4 D4 E4 F#4:0.5 G4:0.5 F#4 D4 E4 F#4:0.5 G4:0.5 F#4 E4 D4 E4 A3:2 F#4 F#4 G4 A4 A4 G4 F#4 E4 D4 D4 E4 F#4 E4:1.5 D4:0.5 D4:3 R:1'),
    b: P('D3:4 D3:4 D3:4 A2:4 D3:4 D3:4 D3:4 A2:2 D3:2 A2:4 A2:4 A2:4 A2:4 D3:4 D3:4 D3:4 A2:2 D3:2 R:1') },
  { id: 'nicaea', t: 'Nicaea (거룩 거룩 거룩 선율)', by: 'John B. Dykes, 1861 · 공유 저작물', bpm: 76, key: 'D',
    m: P('D4 D4 F#4 F#4 A4:2 A4:2 B4:2 B4 B4 A4:2 F#4:2 A4 A4 A4 A4 D5:1.5 C#5:0.5 B4 A4 G4:3 R:1 D4 D4 F#4 F#4 A4:2 A4:2 B4:2 B4 B4 A4:2 F#4:2 D5 B4 A4 G4 F#4:1.5 E4:0.5 D4:3 R:1'),
    b: P('D3:4 D3:4 G2:4 D3:4 D3:4 G2:2 D3:2 G2:4 R:0 D3:4 D3:4 G2:4 D3:4 G2:2 A2:2 D3:4') },
];
export const Aud = {
  ctx: null, out: null, sfx: null, mus: null, muted: true, vol: .7, armed: false, hym: null, last: {},
  init() {
    const s = JSON.parse(localStorage.getItem('maeul_audio') || '{}'); this.vol = s.vol ?? .7; this.want = s.on ?? true; // user pref; still silent until a gesture
    const go = () => { this.unlock(); };
    for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, go, { once: false, passive: true });
    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; document.hidden ? this.ctx.suspend() : (!this.muted && this.ctx.resume()); });
  },
  unlock() {
    if (this.armed) return; this.armed = true;
    try { const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC(); } catch { return; }
    const c = this.ctx; this.out = c.createGain(); this.out.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = .9; this.sfx.connect(this.out); this.mus = c.createGain(); this.mus.gain.value = .45; this.mus.connect(this.out);
    // tiny reverb (synthetic impulse) for a chapel feel
    const L = c.sampleRate * 1.8, ir = c.createBuffer(2, L, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / L) ** 2.6; }
    this.rev = c.createConvolver(); this.rev.buffer = ir; const rg = c.createGain(); rg.gain.value = .28; this.rev.connect(rg); rg.connect(this.out);
    this.setMuted(!this.want); c.resume?.();
    this.onchange?.();
  },
  save() { localStorage.setItem('maeul_audio', JSON.stringify({ vol: this.vol, on: !this.muted })); },
  setMuted(m) { this.muted = m; this.want = !m; if (this.out) this.out.gain.setTargetAtTime(m ? 0 : this.vol, this.ctx.currentTime, .03); this.save(); this.onchange?.(); },
  setVol(v) { this.vol = v; if (this.out && !this.muted) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, .03); this.save(); },
  ok(name, gap = 0) { if (!this.ctx || this.muted || this.ctx.state !== 'running') return false; const n = performance.now(); if (gap && n - (this.last[name] || 0) < gap) return false; this.last[name] = n; return true; },
  tone(f, t0, dur, { type = 'sine', vol = .2, a = .005, rel = null, dest, f2, wet = 0 } = {}) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + a); g.gain.exponentialRampToValueAtTime(.0001, t0 + (rel ?? dur)); o.connect(g); g.connect(dest || this.sfx); if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(this.rev); }
    o.start(t0); o.stop(t0 + (rel ?? dur) + .05);
  },
  noise(t0, dur, { vol = .1, f = 1200, q = .8, type = 'bandpass' } = {}) {
    const c = this.ctx, b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); s.connect(fl); fl.connect(g); g.connect(this.sfx); s.start(t0);
  },
  bell(f, t, vol = .16) { for (const [r, v, d] of [[1, 1, 3.2], [2.0, .5, 2.2], [2.76, .35, 1.6], [5.4, .18, .9], [.5, .3, 3.6]]) this.tone(f * r, t, d, { vol: vol * v, a: .003, wet: .7 }); },
  play(name) {
    const gaps = { step: 260, pick: 60, click: 40, alert: 800, amen: 300, coin: 80 }; if (!this.ok(name, gaps[name] || 120)) return; const t = this.ctx.currentTime + .01;
    switch (name) {
      case 'step': this.noise(t, .07, { vol: .05, f: 420 + Math.random() * 180, q: 1.2, type: 'lowpass' }); break;
      case 'jump': this.tone(300, t, .22, { type: 'triangle', vol: .14, f2: 720 }); break;
      case 'land': this.noise(t, .09, { vol: .06, f: 260, type: 'lowpass' }); break;
      case 'pick': [1318, 1760, 2637].forEach((f, i) => this.tone(f, t + i * .05, .35, { type: 'sine', vol: .07, wet: .4 })); break;
      case 'rare': [1046, 1318, 1568, 2093, 2637].forEach((f, i) => this.tone(f, t + i * .06, .6, { vol: .07, wet: .6 })); break;
      case 'coin': this.tone(1976, t, .09, { type: 'square', vol: .045 }); this.tone(2637, t + .07, .5, { type: 'square', vol: .04, wet: .3 }); break;
      case 'bell': this.bell(392, t, .14); this.bell(392, t + 1.1, .1); break;
      case 'door': this.noise(t, .25, { vol: .05, f: 700, q: 3 }); this.tone(120, t + .18, .25, { type: 'triangle', vol: .12, f2: 70 }); break;
      case 'amen': [523.25, 659.25, 783.99].forEach(f => this.tone(f, t, 1.6, { type: 'sine', vol: .06, a: .02, wet: .8 })); break;
      case 'levelup': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * .11, .5, { type: 'triangle', vol: .1, wet: .5 })); this.tone(1046.5, t + .48, 1.2, { type: 'sine', vol: .07, wet: .8 }); break;
      case 'fanfare': { const s = [[392, 0], [523, .12], [659, .24], [784, .36], [659, .52], [784, .64]]; for (const [f, d] of s) { this.tone(f, t + d, .35, { type: 'sawtooth', vol: .045, wet: .4 }); this.tone(f / 2, t + d, .35, { type: 'triangle', vol: .05 }); } this.bell(784, t + .8, .1); break; }
      case 'alert': this.tone(880, t, .15, { type: 'triangle', vol: .08 }); this.tone(1175, t + .14, .35, { type: 'triangle', vol: .08, wet: .3 }); break;
      case 'click': this.tone(1400, t, .04, { type: 'square', vol: .025 }); break;
      case 'page': this.noise(t, .18, { vol: .04, f: 3000, q: .5, type: 'highpass' }); break;
      case 'stamp': this.noise(t, .12, { vol: .12, f: 180, type: 'lowpass' }); this.tone(660, t + .1, .6, { vol: .06, wet: .6 }); break;
    }
  },
  // hymn player: soft organ-ish pad (melody + bass), loops until stopped
  hymn(id) {
    this.stopHymn(); if (!this.ctx) return null; const h = HYMNS.find(x => x.id === id) || HYMNS[0]; const c = this.ctx, sp = 60 / h.bpm; let t = c.currentTime + .15; const start = t;
    const voice = (f, t0, d, vol) => { for (const [r, v, ty] of [[1, 1, 'sine'], [2, .35, 'sine'], [3, .12, 'triangle']]) this.tone(f * r, t0, d, { type: ty, vol: vol * v, a: .06, rel: d + .25, dest: this.mus, wet: .9 }); };
    for (const [n, d] of h.m) { if (n !== 'R') voice(NOTE(n), t, d * sp * .95, .08); t += d * sp; }
    let tb = start; for (const [n, d] of h.b) { if (n !== 'R' && d) { voice(NOTE(n), tb, d * sp * .98, .06); voice(NOTE(n) * 1.5, tb, d * sp * .98, .03); } tb += d * sp; }
    const len = (t - start) * 1000; this.hym = { id, h, to: setTimeout(() => this.hym?.id === id && this.hymn(id), len + 1200) }; return h;
  },
  stopHymn() { if (this.hym) { clearTimeout(this.hym.to); this.hym = null; } if (this.mus && this.ctx) { const g = this.mus; g.gain.setTargetAtTime(0, this.ctx.currentTime, .15); const m = this.mus; this.mus = this.ctx.createGain(); this.mus.gain.value = .45; this.mus.connect(this.out); setTimeout(() => m.disconnect(), 1500); } },
};

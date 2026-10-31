// h29: shared overlay particle FX that follow a character (field/inside) or a fixed screen point (hall). Used by 오병이어 eating + 박수/아멘/찬양.
const G = () => window.G; let cv = null, cx = null, P = [], raf = 0;
function ensure() { if (cv) return; cv = document.createElement('canvas'); cv.id = 'fxcv'; Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 58 }); document.body.appendChild(cv); cx = cv.getContext('2d'); }
export function headOf(ch) { const g = G(), c = g?.cam; if (!ch || !c) return null; return { x: (ch.x - c.x) * c.z + innerWidth / 2, y: (ch.y - c.y) * c.z + innerHeight / 2 - (ch.drawH || 150) * c.z * .9, z: c.z }; }
// burst: items = emoji list; at = {x,y} or a character; kind: 'float' (rise+fade), 'crumb' (fall with gravity), 'ring' (expanding glow)
export function burst(at, items, o = {}) { ensure(); const n = o.n || 8, now = performance.now();
  for (let i = 0; i < n; i++) { const a = o.kind === 'crumb' ? -Math.PI / 2 + (Math.random() - .5) * 2.4 : -Math.PI / 2 + (Math.random() - .5) * 1.3, sp = (o.sp || 70) * (.6 + Math.random() * .8);
    P.push({ at, ox: (Math.random() - .5) * (o.spread || 30), oy: (Math.random() - .5) * 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, e: items[i % items.length], t0: now + i * (o.stagger || 40), life: o.life || 1.4, kind: o.kind || 'float', size: o.size || 26, g: o.kind === 'crumb' ? 260 : -10 }); }
  if (o.ring) P.push({ at, ox: 0, oy: 0, vx: 0, vy: 0, t0: now, life: .7, kind: 'ring', col: o.ring, size: 30 });
  if (o.label) P.push({ at, ox: 0, oy: -18, vx: 0, vy: -38, t0: now, life: 1.5, kind: 'label', e: o.label, size: 17, g: 0 });
  if (!raf) raf = requestAnimationFrame(tick); }
function pos(p) { if (p.at && typeof p.at.x === 'number' && p.at.drawH === undefined) return p.at; const h = headOf(p.at); return h || { x: -999, y: -999 }; }
function tick(now) { raf = 0; const pr = Math.min(2, devicePixelRatio || 1); if (cv.width !== innerWidth * pr) { cv.width = innerWidth * pr; cv.height = innerHeight * pr; }
  cx.setTransform(pr, 0, 0, pr, 0, 0); cx.clearRect(0, 0, innerWidth, innerHeight); cx.textAlign = 'center'; cx.textBaseline = 'middle';
  P = P.filter(p => (now - p.t0) / 1000 < p.life);
  for (const p of P) { const t = (now - p.t0) / 1000; if (t < 0) continue; const b = pos(p), k = t / p.life, x = b.x + p.ox + p.vx * t, y = b.y + p.oy + p.vy * t + .5 * (p.g || 0) * t * t;
    cx.save(); cx.globalAlpha = k < .15 ? k / .15 : 1 - Math.max(0, (k - .55) / .45);
    if (p.kind === 'ring') { cx.globalAlpha = 1 - k; cx.strokeStyle = p.col; cx.lineWidth = 4 * (1 - k) + 1; cx.beginPath(); cx.arc(b.x, b.y + 20, 14 + k * 60, 0, 7); cx.stroke(); }
    else if (p.kind === 'label') { cx.font = `800 ${p.size}px Pretendard,sans-serif`; cx.lineWidth = 5; cx.strokeStyle = '#fff'; cx.fillStyle = '#8a4b00'; cx.strokeText(p.e, x, y); cx.fillText(p.e, x, y); }
    else { const s = p.size * (p.kind === 'float' ? .7 + .5 * Math.min(1, t * 4) : .6) ; cx.font = `${s}px serif`; cx.translate(x, y); cx.rotate(Math.sin(t * 6 + p.ox) * .25); cx.shadowColor = 'rgba(0,0,0,.18)'; cx.shadowBlur = 4; cx.shadowOffsetY = 2; cx.fillText(p.e, 0, 0); }
    cx.restore(); }
  if (P.length) raf = requestAnimationFrame(tick); else cx.clearRect(0, 0, innerWidth, innerHeight); }
// tiny WebAudio cues (no assets): chew, clap, amen chime, sing sparkle
let ac = null; export function cue(kind) { try { const P0 = window.Aud?.P?.(); if (P0 && P0.sfx === false) return; ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime, o = ac.createGain(); o.connect(ac.destination);
  const tone = (f, s, d, v = .12, type = 'sine', f2) => { const os = ac.createOscillator(), g = ac.createGain(); os.type = type; os.frequency.setValueAtTime(f, t + s); if (f2) os.frequency.exponentialRampToValueAtTime(f2, t + s + d); g.gain.setValueAtTime(0, t + s); g.gain.linearRampToValueAtTime(v, t + s + .01); g.gain.exponentialRampToValueAtTime(.0001, t + s + d); os.connect(g); g.connect(o); os.start(t + s); os.stop(t + s + d + .02); };
  const noise = (s, d, v = .25, hp = 900) => { const b = ac.createBuffer(1, ac.sampleRate * d, ac.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / a.length, 4); const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'highpass'; f.frequency.value = hp; g.gain.value = v; n.buffer = b; n.connect(f); f.connect(g); g.connect(o); n.start(t + s); };
  if (kind === 'chew') { noise(0, .07, .18, 600); noise(.16, .07, .16, 700); tone(520, .3, .12, .08, 'triangle', 780); }
  else if (kind === 'clap') { for (let i = 0; i < 4; i++) noise(i * .16, .09, .45, 1400); }
  else if (kind === 'amen') { tone(523, 0, .9, .1); tone(659, .08, .9, .08); tone(784, .16, 1.1, .07); }
  else if (kind === 'sing') { [659, 784, 880, 1047].forEach((f, i) => tone(f, i * .12, .35, .07, 'triangle')); }
  else if (kind === 'sit') { tone(330, 0, .18, .08, 'triangle', 260); } } catch { } }
window.FX = { burst, cue, headOf };

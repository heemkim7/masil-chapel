// 2F 예배당 (HYBRID v3): rear elevated 3/4 camera toward the cross, symmetric centre aisle, 4 sections × 11 rows = 88 seats,
// per-row pew layers (row = z-order), seated back poses from the layered avatar renderer, hand-held candles at chest height,
// 6 step cards with one button, Typecast pastor voice, hold-to-amen (all candles brighten), quiet presence ("지금 N명", real people only),
// quiet NPC fill below MIN_FILL, seat claim via security-definer RPC (chapel_seats, TTL 60 s).
import { VO, sprite, pilgrimAv, rnd, hash, SONGS, PH } from './worship.js';
import { NS } from './net.js';
const G = () => window.G, $ = s => document.querySelector(s);
const BW = 720, BH = 1280, CX = 356, MIN_FILL = 24, ROWS = 11, ROOM = '2f-1';
const hwAt = y => 46 + (y - 418) / 862 * 62;            // carpet half-width in the background art (perspective reference)
const K = y => hwAt(y) / 108;                            // depth scale (1 at the bottom edge)
// ---- seat grid: WL / CL / CR / WR × 11 rows; centre sections 3 seats, wall sections 1 seat per row → 88
const SEATS = []; const ROWY = [];
for (let r = 0; r < ROWS; r++) { const t = r / (ROWS - 1), y = 474 + 440 * Math.pow(t, 1.12), k = K(y) * 1.32, hw = hwAt(y) * 1.06, sp = 52 * k; ROWY.push({ y, k, hw, sp });
  const rr = String(r + 1).padStart(2, '0');
  for (const side of [-1, 1]) { const C = side < 0 ? 'CL' : 'CR', W = side < 0 ? 'WL' : 'WR';
    for (let j = 0; j < 3; j++) SEATS.push({ id: `${C}${rr}-${j + 1}`, r, x: CX + side * (hw + sp * (j + .62)), y, k });
    SEATS.push({ id: `${W}${rr}-1`, r, x: CX + side * (hw + sp * 3.93 + 21 * k), y, k }); } }
SEATS.forEach((s, i) => s.i = i);
const STEPS = [
  { k: 'calm', n: '묵상', line: '숨을 천천히 들이쉬고… 내쉬어요', btn: '다음' },
  { k: 'song', n: '찬양', line: '', btn: '다음' },
  { k: 'word', n: '말씀', line: '', btn: '다음' },
  { k: 'pray', n: '기도', line: '버튼을 누르고 있는 동안 함께 기도해요', btn: '누르고 기도하기', hold: 1 },
  { k: 'amen', n: '아멘', line: '길게 눌러 함께 아멘해요', btn: '길게 눌러 아멘', hold: 1 },
  { k: 'thanks', n: '감사', line: '오늘 함께 예배해 주셔서 고마워요', btn: '예배 마치기' }];
const WORD = (() => { const p = PH[2]; return [['2_v', p.verse.split(' (')[0], p.verse.match(/\(([^)]+)\)/)?.[1] || ''], ...p.lines.map((t, j) => ['2_' + j, t, ''])]; })();
const BLESS = PH[5].lines.map((t, j) => ['5_' + j, t]);
let el, cv, ctx, bg, open = false, raf = 0, dpr = 1, vw = 0, vh = 0, T = { s: 1, x: 0, y: 0 }, lastT = 0;
let step = 0, me = { seat: -1, st: 'sit' }, peers = new Map(), npcs = [], fx = [], amenT = -9, holdT = 0, holding = false, prayGlow = 0, ch = null, hb = 0, lyricI = 0, lyricT = 0, wordI = -1, dimA = 0;
const secret = () => G()?.net?.secret?.() || 'local-' + Math.random();
const sb = () => G()?.net?.sb;
// ---------------- DOM
function ensureDom() { if (el) return; el = document.createElement('div'); el.id = 'hall2';
  el.innerHTML = `<canvas id="h2cv"></canvas><div class="h2top"><button id="h2exit" aria-label="나가기">⟵ 나가기</button><span id="h2n" class="h2pill">지금 1명이 함께 예배 중</span><button id="h2snd" aria-label="소리">🔊</button></div>
  <div id="h2msg" class="h2msg"></div><div class="h2card"><small id="h2st">1/6 묵상</small><p id="h2line"></p><small id="h2ref"></small><button id="h2btn"><i id="h2prog"></i><span id="h2bt">다음</span></button></div>`;
  document.body.append(el); cv = el.querySelector('#h2cv'); ctx = cv.getContext('2d');
  bg = new Image(); bg.src = 'assets/hall2f_bg.jpg?v=1';
  $('#h2exit').onclick = () => leave(); addEventListener('keydown', e => { if (open && e.key === 'Escape') leave(); }); $('#h2snd').onclick = () => { const A = window.Aud; if (!A) return; A.setMuted(!A.muted); if (A.muted) VO.stop(); else bgm(); sndIcon(); };
  const b = $('#h2btn'); b.onpointerdown = e => { e.preventDefault(); if (STEPS[step].hold) { holding = true; b.classList.add('on'); } };
  const up = () => { if (!holding) return; holding = false; b.classList.remove('on'); }; b.onpointerup = b.onpointerleave = b.onpointercancel = up;
  b.onclick = () => { if (!STEPS[step].hold) next(); };
  cv.addEventListener('click', e => tapSeat(e.clientX, e.clientY)); addEventListener('resize', () => open && resize()); }
function sndIcon() { $('#h2snd').textContent = window.Aud?.muted ? '🔇' : '🔊'; }
function resize() { vw = innerWidth; vh = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2); cv.width = vw * dpr; cv.height = vh * dpr; cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  // fit so the front wall + all 11 rows show above the bottom card (card ≈ 25% of a phone screen)
  const cardH = Math.min(230, vh * .26), s = Math.min(vw / BW, (vh) / (BH * .98)) ; const s2 = vw < vh ? Math.max(s, Math.min(vw / (BW * .985), (vh - cardH * .35) / (BH * .86))) : s;
  T.s = s2; T.x = (vw - BW * s2) / 2; T.y = vw < vh ? Math.min(0, (vh - cardH * .35) - 1130 * s2) : (vh - BH * s2) / 2; }
// ---------------- enter / leave
export function enter() { const g = G(); if (!g || !g.S || open) return; ensureDom(); VO.prime(); open = true; window.__h2Open = true; el.style.display = 'block'; document.body.classList.add('h2-open');
  try { g.closeModal?.(); } catch { } step = 0; amenT = -9; fx = []; wordI = -1; resize(); sndIcon(); bgm(); pickSeat(); buildNpcs(); setStep(0); presence(); lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
export function leave() { if (!open) return; open = false; window.__h2Open = false; VO.stop(); cancelAnimationFrame(raf); el.style.display = 'none'; document.body.classList.remove('h2-open'); clearInterval(hb);
  try { sb()?.rpc('release_seat', { p_room: ROOM, p_secret: secret() }); } catch { } if (ch) { const c = ch; ch = null; c.untrack().catch(() => { }).finally(() => sb()?.removeChannel(c)); } peers.clear();
  try { window.Aud?.music?.('old100'); } catch { } }
function bgm() { try { window.Aud?.music?.('old100'); } catch { } }
// ---------------- seats, NPC fill, presence
function takenByOthers() { const t = new Set(); for (const p of peers.values()) if (p.seat != null) t.add(p.seat); return t; }
function freeSeats() { const t = takenByOthers(); return SEATS.filter(s => !t.has(s.i) && s.i !== me.seat); }
function pickSeat(avoid) { const t = takenByOthers(); const saved = SEATS.findIndex(s => s.id === localStorage.getItem('h2_seat'));
  // default: centre sections, middle rows first (good view of the cross); remembered seat if still free
  const order = SEATS.filter(s => !t.has(s.i) && !(avoid && avoid.has(s.i))).sort((a, b) => score(a) - score(b));
  me.seat = saved >= 0 && !t.has(saved) && !(avoid && avoid.has(saved)) ? saved : (order[0]?.i ?? 0); localStorage.setItem('h2_seat', SEATS[me.seat].id); claim(); }
const score = s => Math.abs(s.r - 6) * 2 + (s.id[0] === 'W' ? 9 : 0) + (s.id.endsWith('-1') ? 0 : s.id.endsWith('-2') ? .5 : 1) + (s.id[1] === 'R' ? .2 : 0);
async function claim() { const c = sb(); if (!c) return; try { const st = SEATS[me.seat]; const { data, error } = await c.rpc('claim_seat', { p_room: ROOM, p_seat: st.id, p_secret: secret() });
    if (!error && data === false) { const av = new Set([me.seat]); (me.tried ||= new Set()).add(me.seat); if (me.tried.size < 12) { pickSeat(me.tried); } } else { me.tried = null; track(); } } catch { } }
function buildNpcs() { const r = rnd(hash('h2npc')); const want = Math.max(0, MIN_FILL - realN()); const t = takenByOthers(); t.add(me.seat);
  const keep = npcs.filter(n => !t.has(n.seat) && !n.out); for (const n of npcs) if (t.has(n.seat)) n.out = n.out || performance.now(); // fade out NPCs whose seat a real person took
  const live = npcs.filter(n => !n.out).length; if (live > want) { let k = live - want; for (const n of npcs.slice().reverse()) if (!n.out && k-- > 0) n.out = performance.now(); }
  const used = new Set([...t, ...npcs.filter(n => !n.out).map(n => n.seat)]); const pool = SEATS.filter(s => !used.has(s.i)).sort((a, b) => hash('s' + a.id) - hash('s' + b.id)).map((s, i, A) => [s, A.slice(0, i).filter(q => q.r === s.r).length * ROWS + ((s.r * 7) % ROWS)]).sort((a, b) => a[1] - b[1]).map(q => q[0]); // round-robin rows so the hall fills evenly
  for (let k = npcs.filter(n => !n.out).length; k < want && pool.length; k++) { const s = pool.shift(); npcs.push({ seat: s.i, av: pilgrimAv(rnd(hash('npc' + s.id))), ph: r() * 6.28, in: performance.now() }); }
  npcs = npcs.filter(n => !n.out || performance.now() - n.out < 1500); }
const realN = () => 1 + peers.size;
function presence() { const c = sb(), g = G(); if (!c) return; ch = c.channel(NS + 'hall:' + ROOM, { config: { presence: { key: g.net.id }, broadcast: { self: false } } });
  const myCh = ch; ch.on('presence', { event: 'sync' }, () => { if (!open || ch !== myCh || !myCh) return; const stt = myCh.presenceState(); peers.clear(); for (const [k, arr] of Object.entries(stt)) { if (k === g.net.id) continue; const m = arr[arr.length - 1]; const si = SEATS.findIndex(s => s.id === m.seat_id); peers.set(k, { seat: si >= 0 ? si : null, av: m.look, st: m.state }); }
    if (takenByOthers().has(me.seat)) pickSeat(); buildNpcs(); pill(); });
  ch.on('broadcast', { event: 'amen_pulse' }, () => { amenT = performance.now() / 1000; sparkles(); });
  ch.subscribe(s => { if (s === 'SUBSCRIBED') track(); });
  clearInterval(hb); hb = setInterval(() => { if (open) claim(); }, 25000); }
function track() { if (!ch) return; const g = G(); try { ch.track({ seat_id: SEATS[me.seat]?.id, look: g.player.av, state: me.st, step: STEPS[step].k, mode: 'personal', joined_at: Date.now() }); } catch { } }
function pill() { const n = realN(); $('#h2n').textContent = `지금 ${n}명이 함께 예배 중`; }
function tapSeat(cx, cy) { const x = (cx - T.x) / T.s, y = (cy - T.y) / T.s; let best = null, bd = 30; const used = new Set([...takenByOthers()]);
  for (const s of SEATS) { const d = Math.hypot(s.x - x, (s.y - 40 * s.k) - y) / s.k; if (d < bd && !used.has(s.i)) { bd = d; best = s; } }
  if (!best || best.i === me.seat) return; const n = npcs.find(q => q.seat === best.i && !q.out); if (n) n.out = performance.now();
  me.seat = best.i; localStorage.setItem('h2_seat', best.id); claim(); msg('자리를 옮겼어요'); }
// ---------------- steps
function setStep(i) { step = i; const S = STEPS[i]; $('#h2st').textContent = `${i + 1}/6 ${S.n}`; $('#h2bt').textContent = S.btn; $('#h2line').textContent = S.line; $('#h2ref').textContent = ''; holdT = 0; $('#h2prog').style.width = '0';
  me.st = S.k === 'pray' ? 'pray' : 'sit'; track(); VO.stop(); lyricI = 0; lyricT = 0; wordI = -1;
  if (S.k === 'word') sayWord(0); if (S.k === 'pray') VO.say('3_0', PH[3].lines[0], 99); if (S.k === 'thanks') sayBless(0); }
function next() { if (step >= 5) return leave(); setStep(step + 1); }
function sayWord(j) { if (!open || STEPS[step].k !== 'word' || j >= WORD.length) return; wordI = j; const [id, t, ref] = WORD[j]; $('#h2line').textContent = t; $('#h2ref').textContent = ref;
  VO.say(id, t, 99); afterVoice(() => sayWord(j + 1), t.length * 230 + 1200); }
function sayBless(j) { if (!open || STEPS[step].k !== 'thanks' || j >= BLESS.length) return; const [id, t] = BLESS[j]; $('#h2ref').textContent = t; VO.say(id, t, 99); afterVoice(() => sayBless(j + 1), t.length * 230 + 1200); }
function afterVoice(fn, fallbackMs) { const a = VO.a, id = VO.id, st = step; let done = false; const go = () => { if (done) return; done = true; a && a.removeEventListener('ended', go); if (open && step === st && VO.id === id) setTimeout(fn, 650); };
  if (a && VO.mode === 'mp3') a.addEventListener('ended', go); setTimeout(() => { if (VO.mode !== 'mp3' || !VO.on()) go(); }, fallbackMs); setTimeout(go, 15000); }
function amen() { amenT = performance.now() / 1000; sparkles(); try { ch?.send({ type: 'broadcast', event: 'amen_pulse', payload: {} }); } catch { } chord();
  const n = 1 + peers.size + npcs.filter(q => !q.out).length; msg(`${n}개의 촛불이 함께 밝아졌어요`); me.st = 'amen'; track(); setTimeout(() => open && step === 4 && setStep(5), 2600); }
function chord() { const A = window.Aud; if (!A?.ctx || A.muted) return; const c = A.ctx, t = c.currentTime; for (const f of [261.6, 329.6, 392, 523.3]) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + .25); g.gain.exponentialRampToValueAtTime(.001, t + 2.6); o.connect(g); g.connect(A.out || c.destination); o.start(t); o.stop(t + 2.7); } }
function msg(t) { const m = $('#h2msg'); m.textContent = t; m.classList.add('on'); clearTimeout(msg._t); msg._t = setTimeout(() => m.classList.remove('on'), 2600); }
function sparkles() { for (const s of seated()) for (let k = 0; k < 2; k++) fx.push({ x: s.hx, y: s.hy, t0: performance.now() / 1000 + Math.random() * .5, d: 1.6 + Math.random() }); }
// ---------------- render
function seated() { const out = [], g = G(), t = takenByOthers();
  for (const n of npcs) { const s = SEATS[n.seat]; if (s && !t.has(s.i) && s.i !== me.seat) out.push({ s, av: n.av, a: n.out ? Math.max(0, 1 - (performance.now() - n.out) / 1200) : Math.min(1, (performance.now() - n.in) / 900), ph: n.ph }); }
  for (const p of peers.values()) { const s = SEATS[p.seat]; if (s && p.av) out.push({ s, av: p.av, a: 1, ph: s.i, st: p.st }); }
  const ms = SEATS[me.seat]; if (ms) out.push({ s: ms, av: g.player.av, a: 1, ph: 0, me: 1, st: me.st });
  for (const o of out) { o.hx = o.s.x + 15 * o.s.k; o.hy = o.s.y - 34 * o.s.k; } return out; }
function frame(now) { if (window.Aud?.muted && (window.WH?.vo?.paused === false || window.WH?.vo?.duck < 1)) VO.stop(); if (!open) return; raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - lastT) / 1000); lastT = now; const t = now / 1000;
  const S = STEPS[step]; if (holding && S.hold) { holdT += dt; const need = S.k === 'amen' ? 1.4 : 3; $('#h2prog').style.width = Math.min(100, holdT / need * 100) + '%'; if (holdT >= need) { holding = false; $('#h2btn').classList.remove('on'); if (S.k === 'amen') amen(); else { msg('기도가 촛불처럼 올라가요'); setTimeout(() => open && step === 3 && setStep(4), 900); holdT = -99; } } }
  prayGlow += ((holding && S.k === 'pray') || me.st === 'pray' && holding ? 1 : 0 - prayGlow) * Math.min(1, dt * 3) * (holding ? 1 : 1); if (!holding) prayGlow = Math.max(0, prayGlow - dt * 1.5); else prayGlow = Math.min(1, prayGlow + dt * 1.5);
  dimA += ((S.k === 'calm' ? .32 : 0) - dimA) * Math.min(1, dt * 2);
  if (S.k === 'song') { lyricT -= dt; if (lyricT <= 0) { const L = SONGS[0].l; $('#h2line').textContent = L[lyricI % L.length]; $('#h2ref').textContent = SONGS[0].t; lyricI++; lyricT = 5; } }
  if (S.k === 'calm') { const b = (Math.sin(t * Math.PI / 4) + 1) / 2; $('#h2line').textContent = b > .5 ? '숨을 천천히 들이쉬고…' : '…천천히 내쉬어요'; }
  if ((t | 0) % 2 === 0 && !frame._b) { frame._b = 1; buildNpcs(); pill(); } else if ((t | 0) % 2) frame._b = 0;
  const c = ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#3a2a2e'; c.fillRect(0, 0, vw, vh);
  if (bg.complete && bg.naturalWidth) { if (T.x > 0) { c.save(); c.filter = 'blur(18px) brightness(.55)'; c.drawImage(bg, -40, -40, vw + 80, vh + 80); c.restore(); } c.setTransform(dpr * T.s, 0, 0, dpr * T.s, dpr * T.x, dpr * T.y); c.drawImage(bg, 0, 0, BW, BH); }
  else c.setTransform(dpr * T.s, 0, 0, dpr * T.s, dpr * T.x, dpr * T.y);
  const am = Math.max(0, 1 - (t - amenT) / 3.2), amU = t - amenT < .5 ? (t - amenT) / .5 : 1;
  // cross glow during amen / word
  { const gl = .25 + am * .75 * amU + (S.k === 'word' ? .2 : 0); const gr = c.createRadialGradient(CX, 190, 10, CX, 190, 200); gr.addColorStop(0, `rgba(255,226,160,${.35 * gl})`); gr.addColorStop(1, 'rgba(255,226,160,0)'); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.fillRect(CX - 200, 0, 400, 400); c.globalCompositeOperation = 'source-over'; }
  FIGS.length = 0; const ppl = seated(); const byRow = Array.from({ length: ROWS }, () => []); for (const p of ppl) byRow[p.s.r].push(p);
  const glows = [];
  for (let r = 0; r < ROWS; r++) { const R = ROWY[r]; byRow[r].sort((a, b) => Math.abs(b.s.x - CX) - Math.abs(a.s.x - CX));
    for (const p of byRow[r]) { const fc = hash('f' + p.s.id) % 3 ? 'N' : (p.s.x < CX ? 'NE' : 'NW'); const e = sprite(p.av, fc, null, null, true); if (!e || !e.cv || !e.ok) continue; // back views only; never draw a not-yet-settled (default front) frame
      const k = p.s.k * .78, bow = (p.st === 'pray' && (p.me ? holding : 1) ? 2.5 : 0) * k, sink = (e.ay - e.top) * k * .3; // sink into the pew so its backrest covers the lower body
      const pb = R.y + 27.5 * R.k * .45; c.save(); c.beginPath(); c.rect(p.s.x - 200, 0, 400, pb); c.clip();
      c.globalAlpha = p.a; c.drawImage(e.cv, p.s.x - e.ax * k, p.s.y + sink - e.ay * k + bow + Math.sin(t * .8 + p.ph) * .5 * k, e.cv.width * k, e.cv.height * k); c.globalAlpha = 1; c.restore();
      // chest-height hand candle beside the near shoulder; never above the head
      const hy = p.s.y + sink - e.ay * k + (e.top + (e.ay - e.top) * .4) * k; p.hy = Math.max(hy, p.s.y + sink - e.ay * k + (e.top + 22) * k); p.hx = p.s.x + 20 * p.s.k;
      const lv = .55 + (p.me ? prayGlow * .45 : (p.st === 'pray' ? .2 : 0)) + am * .6 * amU; candle(c, p.hx, p.hy, p.s.k, lv, t + p.ph, p.a); glows.push([p.hx, p.hy, p.s.k, lv, p.a]);
      FIGS.push({ id: p.s.id, me: !!p.me, face: fc, x: (p.s.x - e.ax * k) * T.s + T.x, y: (p.s.y + sink - e.ay * k + e.top * k) * T.s + T.y, w: e.cv.width * k * T.s, h: (pb - (p.s.y + sink - e.ay * k + e.top * k)) * T.s, cy: p.hy * T.s + T.y, headY: (p.s.y + sink - e.ay * k + e.top * k) * T.s + T.y });
      if (p.me) meMark(c, p.s.x, p.s.y + sink - e.ay * k + e.top * k - 6, p.s.k); }
    pew(c, R, r); }
  c.globalCompositeOperation = 'lighter'; for (const [x, y, k, lv, a] of glows) { const rad = Math.max((22 + 26 * lv) * k, 15 + 6 * lv), boost = 1 + Math.max(0, .75 - k) * 1.4; const gr = c.createRadialGradient(x, y - 3 * k, 1, x, y - 3 * k, rad); gr.addColorStop(0, `rgba(255,200,110,${Math.min(.5, .26 * lv * a * boost)})`); gr.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); } c.globalCompositeOperation = 'source-over';
  // amen sparkles rise toward the cross
  c.globalCompositeOperation = 'lighter'; fx = fx.filter(f => t - f.t0 < f.d); for (const f of fx) { const u = (t - f.t0) / f.d; if (u < 0) continue; const x = f.x + (CX - f.x) * u * u, y = f.y + (200 - f.y) * u; c.fillStyle = `rgba(255,230,150,${(1 - u) * .9})`; c.beginPath(); c.arc(x, y, 2.2 * (1 - u * .5), 0, 7); c.fill(); } c.globalCompositeOperation = 'source-over';
  if (dimA > .01) { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = `rgba(20,12,30,${dimA})`; c.fillRect(0, 0, vw, vh); } }
function candle(c, x, y, k, lv, t, a) { const h = 9 * k, w = 3.4 * k; c.globalAlpha = a; c.fillStyle = '#fff6e6'; c.strokeStyle = 'rgba(62,42,38,.7)'; c.lineWidth = .8 * k; c.fillRect(x - w / 2, y - h * .2, w, h); c.strokeRect(x - w / 2, y - h * .2, w, h);
  const fl = 1 + Math.sin(t * 9) * .08 + Math.sin(t * 5.3) * .05, fh = (5 + lv * 2.2) * k * fl; c.fillStyle = `rgba(255,${190 + lv * 30 | 0},90,.95)`; c.beginPath(); c.ellipse(x, y - h * .2 - fh * .5, 1.7 * k, fh * .5, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,230,.9)'; c.beginPath(); c.ellipse(x, y - h * .2 - fh * .38, .8 * k, fh * .26, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
function meMark(c, x, y, k) { const f = Math.max(9, 11 * k); c.font = `700 ${f}px Pretendard, sans-serif`; c.textAlign = 'center'; const w = f * 1.9; c.fillStyle = 'rgba(255,248,240,.92)'; c.strokeStyle = 'rgba(62,42,38,.55)'; c.lineWidth = 1; c.beginPath(); c.roundRect(x - w / 2, y - f * 1.25, w, f * 1.3, f * .6); c.fill(); c.stroke(); c.fillStyle = '#6a4a8a'; c.fillText('나', x, y - f * .25); }
// pew: wooden backrest per section, soft chocolate outline; drawn after that row's people so it occludes their lower body
function pew(c, R, r) { const { y, k, hw, sp } = R, h = 22 * k * 1.25, d = 7 * k; const segs = [[hw - sp * .05, hw + sp * 3.25], [hw + sp * 3.25 + 30 * k * .4, hw + sp * 4.6 + 30 * k]];
  for (const side of [-1, 1]) for (const [a, b] of segs) { const x0 = side < 0 ? CX - b : CX + a, x1 = side < 0 ? CX - a : CX + b, top = y - h * .55;
    c.fillStyle = '#9a6440'; c.fillRect(x0, top, x1 - x0, h); c.fillStyle = '#c0855a'; c.fillRect(x0, top, x1 - x0, h * .26); c.fillStyle = '#7a4a30'; c.fillRect(x0, top + h * .82, x1 - x0, h * .18);
    c.fillStyle = 'rgba(255,230,190,.25)'; for (let q = 1; q < 3; q++) c.fillRect(x0 + (x1 - x0) * q / 3 - .6 * k, top + h * .3, 1.2 * k, h * .5);
    c.fillStyle = '#8a5636'; c.fillRect(x0 - d * .2, top - d * .4, d * .7, h + d * .4); c.fillRect(x1 - d * .5, top - d * .4, d * .7, h + d * .4);
    c.strokeStyle = 'rgba(62,42,38,.78)'; c.lineWidth = 1.2 * k; c.strokeRect(x0, top, x1 - x0, h); } }
const FIGS = [];
export const HALL = { figs: () => FIGS.slice(), enter, leave, get open() { return open; }, get step() { return step; }, setStep, next, amen, get seat() { return SEATS[me.seat]?.id; }, seats: SEATS, get real() { return realN(); }, get npc() { return npcs.filter(n => !n.out).length; }, get T() { return T; }, peersN: () => peers.size };
window.HALL = HALL;

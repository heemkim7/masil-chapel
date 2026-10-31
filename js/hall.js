// 2F 예배당 (HYBRID v3): rear elevated 3/4 camera toward the cross, symmetric centre aisle, 4 sections × 11 rows = 110 seats,
// per-row pew layers (row = z-order), seated back poses from the layered avatar renderer, hand-held candles at chest height,
// 6 step cards with one button, Typecast pastor voice, hold-to-amen (all candles brighten), quiet presence ("지금 N명", real people only),
// quiet NPC fill below MIN_FILL, seat claim via security-definer RPC (chapel_seats, TTL 60 s).
import { VO, sprite, pilgrimAv, rnd, hash, SONGS, PH } from './worship.js';
import { NS } from './net.js';
const G = () => window.G, $ = s => document.querySelector(s);
const BW = 720, BH = 1280, CX = 356, MIN_FILL = 40, ROWS = 11, ROOM = '2f-1';
const hwAt = y => 46 + (y - 418) / 862 * 62;            // carpet half-width in the background art (perspective reference)
const K = y => hwAt(y) / 108;                            // depth scale (1 at the bottom edge)
// ---- seat grid: WL / CL / CR / WR × 11 rows; centre sections 3 seats, wall sections 2 seats per row → 110
const SEATS = []; const ROWY = [];
for (let r = 0; r < ROWS; r++) { const t = r / (ROWS - 1), y = 476 + 540 * Math.pow(t, 1.18), k = K(y) * 1.32, hw = hwAt(y) * 1.06, sp = 52 * k; ROWY.push({ y, k, hw, sp });
  const rr = String(r + 1).padStart(2, '0');
  for (const side of [-1, 1]) { const C = side < 0 ? 'CL' : 'CR', W = side < 0 ? 'WL' : 'WR';
    for (let j = 0; j < 3; j++) SEATS.push({ id: `${C}${rr}-${j + 1}`, r, x: CX + side * (hw + sp * (j + .62)), y, k });
    for (let j = 0; j < 2; j++) SEATS.push({ id: `${W}${rr}-${j + 1}`, r, x: CX + side * (hw + sp * 3.25 + 14 * k + sp * (j + .55)), y, k }); } }
SEATS.forEach((s, i) => s.i = i);
const STEPS = [
  { k: 'calm', n: '묵상', line: '숨을 천천히 들이쉬고… 내쉬어요', btn: '다음' },
  { k: 'song', n: '찬양', line: '', btn: '다음' },
  { k: 'word', n: '말씀', line: '', btn: '다음' },
  { k: 'pray', n: '기도', line: '버튼을 누르고 있는 동안 함께 기도해요', btn: '누르고 기도하기', hold: 1 },
  { k: 'amen', n: '아멘', line: '길게 눌러 함께 아멘해요', btn: '길게 눌러 아멘', hold: 1 },
  { k: 'thanks', n: '감사', line: '오늘 함께 예배해 주셔서 고마워요', btn: '예배 마치기' }];
const WORD = (() => { const p = PH[2]; return [['2_v', p.verse.split(' (')[0], p.verse.match(/\(([^)]+)\)/)?.[1] || ''], ...p.lines.map((t, j) => ['2_' + j, t, ''])]; })();
// 김은성 목사 설교 (마 11:28–30, Typecast Myungjoo, tools/gen_sermon.py): replaces the short word lines once loaded
fetch('assets/audio/voice/sermon1.json').then(r => r.json()).then(S => { WORD.length = 0; S.lines.forEach((t, j) => WORD.push(['s1_' + j, t, j < 3 ? S.ref : `${S.title} · ${S.ref}`])); }).catch(() => { });
// song list: assets/audio/rest/manifest.json (14 CC0 renders), fallback to the 4 organ hymns
const UNSURE = new Set(['wachet', 'gordon']); let TR = [['assets/audio/old100.mp3', '만복의 근원 하나님'], ['assets/audio/stanne.mp3', '오 신실하신 주'], ['assets/audio/newbrit.mp3', '나 같은 죄인 살리신'], ['assets/audio/nicaea.mp3', '거룩 거룩 거룩']];
fetch('assets/audio/rest/manifest.json').then(r => r.json()).then(m => { const t = (m.tracks || []).filter(x => x.file).map(x => [x.file, UNSURE.has(x.id) ? x.title_original : x.title_ko || x.title_original]); if (t.length) { TR = t; fillSongs(); } }).catch(() => { });
function fillSongs() { const sel = $('#h2song'); if (!sel) return; const v = restI % TR.length; sel.innerHTML = TR.map(([, n], i) => `<option value="${i}">${n}</option>`).join(''); sel.value = v; }
const BLESS = PH[5].lines.map((t, j) => ['5_' + j, t]);
let el, cv, ctx, bg, open = false, raf = 0, dpr = 1, vw = 0, vh = 0, T = { s: 1, x: 0, y: 0 }, lastT = 0;
let step = 0, me = { seat: -1, st: 'sit' }, peers = new Map(), npcs = [], fx = [], amenT = -9, holdT = 0, holding = false, prayGlow = 0, ch = null, hb = 0, lyricI = 0, lyricT = 0, wordI = -1, dimA = 0;
const secret = () => G()?.net?.secret?.() || 'local-' + Math.random();
const sb = () => G()?.net?.sb;
// ---------------- DOM
function ensureDom() { if (el) return; el = document.createElement('div'); el.id = 'hall2';
  el.innerHTML = `<canvas id="h2cv"></canvas><div class="h2top"><button id="h2exit" aria-label="나가기">⟵ 나가기</button><span id="h2n" class="h2pill">지금 1명이 함께 예배 중</span><button id="h2snd" aria-label="소리">🔊</button></div>
  <div id="h2msg" class="h2msg"></div><div class="h2card"><small id="h2st">1/6 묵상</small><p id="h2line"></p><small id="h2ref"></small><button id="h2btn"><i id="h2prog"></i><span id="h2bt">다음</span></button><button id="h2rest" type="button">🎵 그냥 앉아 있기</button></div><div class="h2restbar"><small>🎵 그냥 앉아 있어요</small><p id="h2tune">찬송</p><button id="h2back" type="button">예배 순서로</button></div>
  <div id="h2fp" role="status"></div><div class="h2pick"><label>🎵 <select id="h2song" aria-label="찬양 고르기"></select></label></div><div class="h2act"><button data-a="clap" aria-label="박수">👏</button><button data-a="amen" aria-label="아멘">🙏 아멘</button><button data-a="sing" aria-label="찬양 따라 부르기">♪ 따라 부르기</button></div>`;
  document.body.append(el); cv = el.querySelector('#h2cv'); ctx = cv.getContext('2d');
  bg = new Image(); bg.src = 'assets/hall2f_bg.jpg?v=1';
  $('#h2rest').onclick = () => rest(true); $('#h2back').onclick = () => rest(false); $('#h2exit').onclick = () => leave(); addEventListener('keydown', e => { if (open && e.key === 'Escape') leave(); }); $('#h2snd').onclick = () => { const A = window.Aud; if (!A) return; A.setMuted(!A.muted); if (A.muted) VO.stop(); else if (!resting) bgm(); if (restEl) restEl.muted = A.muted; sndIcon(); };
  fillSongs(); $('#h2song').onchange = e => { restI = +e.target.value; songPlay(); }; el.querySelectorAll('.h2act button').forEach(x => x.onclick = () => act(x.dataset.a));
  $('#h2line').onclick = () => { if (STEPS[step].k === 'word' && wordI >= 0) { VO.stop(); sayWord(wordI + 1); } };
  if (!document.getElementById('h2css2')) { const st = document.createElement('style'); st.id = 'h2css2'; st.textContent = `#h2fp{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 50px);max-width:88vw;padding:8px 14px;border-radius:14px;background:rgba(20,16,32,.82);color:#fff;font-size:14px;line-height:1.4;text-align:center;z-index:4;opacity:0;transition:opacity .5s;pointer-events:none}#h2fp.on{opacity:1}@media (min-width:800px){#h2fp{left:16px;transform:none;top:64px;max-width:300px;text-align:left}}.h2pick{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 52px);display:none;z-index:3}#hall2.song .h2pick,#hall2.rest .h2pick{display:block}.h2pick select{font:600 13px Pretendard,sans-serif;max-width:min(300px,80vw);padding:5px 8px;border-radius:14px;border:1px solid rgba(120,90,80,.35);background:rgba(255,250,243,.92);color:#5a4048}
.h2act{position:absolute;right:10px;top:calc(env(safe-area-inset-top,0px) + 92px);display:flex;flex-direction:column;align-items:flex-end;gap:5px;z-index:3;opacity:.72}.h2act button{font:600 11px Pretendard,sans-serif;padding:4px 8px;border-radius:14px;border:1px solid rgba(120,90,80,.3);background:rgba(255,250,243,.85);color:#5a4048}.h2act button:disabled{opacity:.45}`; document.head.append(st); }
  const b = $('#h2btn'); b.onpointerdown = e => { e.preventDefault(); if (STEPS[step].hold) { holding = true; b.classList.add('on'); } };
  const up = () => { if (!holding) return; holding = false; b.classList.remove('on'); }; b.onpointerup = b.onpointerleave = b.onpointercancel = up;
  b.onclick = () => { if (!STEPS[step].hold) next(); };
  cv.addEventListener('click', e => tapSeat(e.clientX, e.clientY)); addEventListener('resize', () => open && resize()); }
function sndIcon() { $('#h2snd').textContent = window.Aud?.muted ? '🔇' : '🔊'; }
function resize() { vw = innerWidth; vh = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2); cv.width = vw * dpr; cv.height = vh * dpr; cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  // fit so the front wall + all 11 rows show above the bottom card (card ≈ 25% of a phone screen)
  const cardH = Math.min(230, vh * .26), s = Math.min(vw / BW, (vh) / (BH * .98)) ; const s2 = vw < vh ? Math.max(s, Math.min(vw / (BW * .985), (vh - cardH * .35) / (BH * .86))) : s;
  let s3 = s2; if (vw < vh) { const cr = el.querySelector(resting ? '.h2restbar' : '.h2card')?.getBoundingClientRect(); const ct = cr && cr.height ? cr.top : vh - cardH; s3 = Math.min(vw / (BW * .64), Math.max(s2, (ct - 6) / 1040)); }
  T.s = s3; T.x = (vw - BW * s3) / 2; T.y = vw < vh ? 0 : (vh - BH * s3) / 2; }
// ---------------- enter / leave
export function enter() { const g = G(); if (!g || !g.S || open) return; ensureDom(); VO.prime(); open = true; window.__h2Open = true; el.style.display = 'block'; { const fp = $('#h2fp'); if (fp) { fp.textContent = '⛪ 본당 · 함께 예배 · 말씀과 찬양, 박수·아멘·함께 부르기 (채팅 없음)'; fp.classList.add('on'); clearTimeout(fp._t); fp._t = setTimeout(() => fp.classList.remove('on'), 4500); } } document.body.classList.add('h2-open');
  try { g.closeModal?.(); } catch { } step = 0; amenT = -9; fx = []; wordI = -1; resize(); sndIcon(); bgm(); pickSeat(); buildNpcs(); setStep(0); presence(); lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
export function leave() { if (!open) return; rest(false, 1); open = false; window.__h2Open = false; VO.stop(); cancelAnimationFrame(raf); el.style.display = 'none'; document.body.classList.remove('h2-open'); clearInterval(hb);
  try { sb()?.rpc('release_seat', { p_room: ROOM, p_secret: secret() }); } catch { } if (ch) { const c = ch; ch = null; c.untrack().catch(() => { }).finally(() => sb()?.removeChannel(c)); } peers.clear();
  try { window.Aud?.music?.('old100'); } catch { } }
// ---------------- '그냥 앉아 있기': no steps, a continuous loop of public-domain/CC0 organ hymns (assets/audio/LICENSES.md).
// Uses its own <audio> element (not WebAudio) so it keeps playing when the screen idles or the tab is backgrounded; Media Session gives lock-screen controls.
const REST = [['old100', '만복의 근원 하나님 (Old Hundredth)'], ['stanne', '오 신실하신 주 (St. Anne)'], ['newbrit', '나 같은 죄인 살리신 (Amazing Grace)'], ['nicaea', '거룩 거룩 거룩 (Nicaea)']];
let resting = false, restEl = null, restI = 0;
function songEl() { if (!restEl) { restEl = new Audio(); restEl.preload = 'none'; restEl.setAttribute('playsinline', ''); restEl.onended = () => { restI++; restPlay(); };
    const ms = navigator.mediaSession; if (ms) { try { ms.setActionHandler('play', () => { restEl.play().catch(() => { }); ms.playbackState = 'playing'; }); ms.setActionHandler('pause', () => { restEl.pause(); ms.playbackState = 'paused'; }); ms.setActionHandler('nexttrack', () => { restI++; restPlay(); }); } catch { } } } return restEl; }
function songPlay() { const A = window.Aud; try { A?.stopMusic?.(); A?.el?.pause(); } catch { } songEl(); restPlay(); }
let fadeT = 0; function restPlay() { const [f, n] = TR[restI % TR.length], a = restEl, vol = Math.min(1, (window.Aud?.P?.().bgmVol ?? .5) * 1.1); const sel = $('#h2song'); if (sel) sel.value = restI % TR.length;
  const start = () => { a.src = f; a.muted = !!window.Aud?.muted; a.volume = 0; a.play().catch(() => { }); let v = 0; clearInterval(fadeT); fadeT = setInterval(() => { v = Math.min(vol, v + vol / 12); a.volume = v; if (v >= vol) clearInterval(fadeT); }, 60); }; // short crossfade
  if (!a.paused && a.src) { clearInterval(fadeT); let v = a.volume; fadeT = setInterval(() => { v -= .08; if (v <= 0) { clearInterval(fadeT); start(); } else a.volume = v; }, 50); } else start();
  if (STEPS[step]?.k === 'song' && !resting) { $('#h2ref').textContent = n; }
  $('#h2tune').textContent = n; const ms = navigator.mediaSession; if (ms) { try { ms.metadata = new MediaMetadata({ title: n, artist: '마실채플', album: '그냥 앉아 있기', artwork: [{ src: 'assets/icon512.png', sizes: '512x512', type: 'image/png' }] }); ms.playbackState = 'playing'; } catch { } } }
function rest(on, quiet) { if (on === resting) return; resting = on; window.__h2Rest = on; el?.classList.toggle('rest', on); if (cv) resize();
  if (on) { VO.stop(); holding = false; const A = window.Aud; try { A?.stopMusic?.(); A?.el?.pause(); } catch { }
    songEl(); restPlay(); me.st = 'pray'; track(); }
  else { if (restEl) { restEl.pause(); try { navigator.mediaSession.playbackState = 'none'; navigator.mediaSession.metadata = null; } catch { } } me.st = 'sit'; track(); if (!quiet) { bgm(); setStep(step); } } }
function bgm() { try { window.Aud?.music?.('old100'); } catch { } }
// ---------------- seats, NPC fill, presence
const vis = s => { const m = 34 * s.k; return (s.x - m) * T.s + T.x >= 2 && (s.x + m) * T.s + T.x <= vw - 2; };
function takenByOthers() { const t = new Set(); for (const p of peers.values()) if (p.seat != null) t.add(p.seat); return t; }
function freeSeats() { const t = takenByOthers(); return SEATS.filter(s => !t.has(s.i) && s.i !== me.seat); }
function pickSeat(avoid) { const t = takenByOthers(); const saved = SEATS.findIndex(s => s.id === localStorage.getItem('h2_seat2'));
  // default: centre sections, middle rows first (good view of the cross); remembered seat if still free
  const order = SEATS.filter(s => vis(s) && !t.has(s.i) && !(avoid && avoid.has(s.i))).sort((a, b) => score(a) - score(b));
  me.seat = saved >= 0 && vis(SEATS[saved]) && !t.has(saved) && !(avoid && avoid.has(saved)) ? saved : (order[0]?.i ?? 0); localStorage.setItem('h2_seat2', SEATS[me.seat].id); claim(); }
const score = s => Math.abs(s.r - 9) * 2 + (s.id[0] === 'W' ? 9 : 0) + (s.id.endsWith('-1') ? 0 : s.id.endsWith('-2') ? .5 : 1) + (s.id[1] === 'R' ? .2 : 0);
async function claim() { const c = sb(); if (!c) return; try { const st = SEATS[me.seat]; const { data, error } = await c.rpc('claim_seat', { p_room: ROOM, p_seat: st.id, p_secret: secret() });
    if (!error && data === false) { const av = new Set([me.seat]); (me.tried ||= new Set()).add(me.seat); if (me.tried.size < 12) { pickSeat(me.tried); } } else { me.tried = null; track(); } } catch { } }
function buildNpcs() { const r = rnd(hash('h2npc')); const vs = SEATS.filter(vis); const want = Math.max(0, Math.max(MIN_FILL, Math.round(vs.length * .76)) - realN()); const t = takenByOthers(); t.add(me.seat);
  const keep = npcs.filter(n => !t.has(n.seat) && !n.out); for (const n of npcs) if (t.has(n.seat)) n.out = n.out || performance.now(); // fade out NPCs whose seat a real person took
  const live = npcs.filter(n => !n.out).length; if (live > want) { let k = live - want; for (const n of npcs.slice().reverse()) if (!n.out && k-- > 0) n.out = performance.now(); }
  const used = new Set([...t, ...npcs.filter(n => !n.out).map(n => n.seat)]); const rk = {}; for (let q = 0; q < ROWS; q++) { const rs = vs.filter(s => s.r === q).sort((a, b) => hash('s' + a.id) % 997 - hash('s' + b.id) % 997); rs.forEach((s, i) => rk[s.i] = (i + .5) / rs.length + (q % 3) * .003); }
  const pool = vs.filter(s => !used.has(s.i)).sort((a, b) => rk[a.i] - rk[b.i]); // even fill: every row gets the same share of its visible seats
  for (let k = npcs.filter(n => !n.out).length; k < want && pool.length; k++) { const s = pool.shift(); npcs.push({ seat: s.i, av: pilgrimAv(rnd(hash('npc' + s.id))), ph: r() * 6.28, in: performance.now() }); }
  npcs = npcs.filter(n => !n.out || performance.now() - n.out < 1500); }
const realN = () => 1 + peers.size;
function presence() { const c = sb(), g = G(); if (!c) return; ch = c.channel(NS + 'hall:' + ROOM, { config: { presence: { key: g.net.id }, broadcast: { self: false } } });
  const myCh = ch; ch.on('presence', { event: 'sync' }, () => { if (!open || ch !== myCh || !myCh) return; const stt = myCh.presenceState(); peers.clear(); for (const [k, arr] of Object.entries(stt)) { if (k === g.net.id) continue; const m = arr[arr.length - 1]; const si = SEATS.findIndex(s => s.id === m.seat_id); peers.set(k, { seat: si >= 0 ? si : null, av: m.look, st: m.state, name: String(m.name || '').slice(0, 12) }); if (si >= 0 && m.act && m.at && m.at > (seenAt.get(k) || 0) && Date.now() - m.at < 8000) { seenAt.set(k, m.at); ACT.set(si, { k: m.act, t0: performance.now() / 1000 }); } }
    if (takenByOthers().has(me.seat)) pickSeat(); buildNpcs(); pill(); });
  ch.on('broadcast', { event: 'amen_pulse' }, () => { amenT = performance.now() / 1000; sparkles(); });
  ch.subscribe(s => { if (s === 'SUBSCRIBED') track(); });
  clearInterval(hb); hb = setInterval(() => { if (open) claim(); }, 25000); }
// participation: 박수 / 아멘 / 찬양 따라 부르기 — my figure animates, others see it via presence; soft WebAudio cue; 1 per 2.5 s
const ACT = new Map(), seenAt = new Map(); let lastAct = 0, ac = null;
function cue(k) { const A = window.Aud; if (A?.muted) return; try { ac = ac || new AudioContext(); const t = ac.currentTime, g = ac.createGain(); g.connect(ac.destination); const v = .05 * Math.min(1, (A?.vol ?? .7) * 1.4);
  if (k === 'clap') { for (let i = 0; i < 3; i++) { const b = ac.createBuffer(1, 2200, ac.sampleRate), d = b.getChannelData(0); for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / 300); const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; s.connect(f); f.connect(g); s.start(t + i * .2); } g.gain.value = v * 2.2; }
  else { const fr = k === 'amen' ? [392, 523.3] : [523.3, 659.3, 784]; fr.forEach((f, i) => { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(t + (k === 'sing' ? i * .22 : 0)); o.stop(t + 1.3); }); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .08); g.gain.exponentialRampToValueAtTime(.0005, t + 1.25); } } catch { } }
function act(k) { const n = performance.now(); if (n - lastAct < 2500 || me.seat < 0) return; lastAct = n; me.act = k; me.at = Date.now(); ACT.set(me.seat, { k, t0: n / 1000 }); cue(k); track();
  el.querySelectorAll('.h2act button').forEach(b => { b.disabled = true; setTimeout(() => b.disabled = false, 2500); }); window.__h2Act = (window.__h2Act || 0) + 1; }
function track() { if (!ch) return; const g = G(); try { ch.track({ act: me.act, at: me.at, seat_id: SEATS[me.seat]?.id, look: g.player.av, name: g.S?.name, state: me.st, step: STEPS[step].k, mode: 'personal', joined_at: Date.now() }); } catch { } }
function pill() { const n = realN(); $('#h2n').textContent = `지금 ${n}명이 함께 예배 중`; }
// tap: an EMPTY seat moves me there; an occupied seat (NPC, real person, me) only shows that person's small name tag
function tapSeat(cx, cy) { // a drawn person wins (front rows first): show their name tag only, never move
  for (let i = FIGS.length - 1; i >= 0; i--) { const f = FIGS[i]; if (Math.abs(cx - (f.x + f.w / 2)) < f.w * .3 && cy > f.y - 4 && cy < f.y + f.h) { const si = SEATS.findIndex(s => s.id === f.id), nm = whoAt(si); if (nm) { tag = { seat: si, text: nm, t: performance.now() }; window.__h2Tag = nm; return; } } }
  const x = (cx - T.x) / T.s, y = (cy - T.y) / T.s; let best = null, bd = 34;
  for (const s of SEATS) { if (!vis(s)) continue; const d = Math.hypot(s.x - x, (pewTop(ROWY[s.r]) - 18 * s.k) - y) / s.k; if (d < bd) { bd = d; best = s; } }
  if (!best) return; const nm = whoAt(best.i); if (nm) { tag = { seat: best.i, text: nm, t: performance.now() }; return; }
  me.seat = best.i; localStorage.setItem('h2_seat2', best.id); claim(); buildNpcs(); msg('빈자리로 옮겼어요'); }
let tag = null;
function whoAt(i) { const g = G(); if (i === me.seat) return (g.S?.name || '나') + ' (나)'; for (const p of peers.values()) if (p.seat === i) return p.name || '성도';
  const n = npcs.find(q => q.seat === i && !q.out); return n ? '성도 ' + (1000 + hash('nick' + SEATS[i].id) % 9000) : null; }
function drawTag(c) { if (!tag) return; const a = 1 - Math.max(0, (performance.now() - tag.t - 2200) / 400); if (a <= 0) { tag = null; return; } const f = FIGS.find(q => q.id === SEATS[tag.seat].id); if (!f) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = a; c.font = '700 13px Pretendard, sans-serif'; c.textAlign = 'center'; const w = c.measureText(tag.text).width + 18, x = f.x + f.w / 2, y = Math.max(16, f.headY - 10);
  c.fillStyle = 'rgba(255,250,243,.95)'; c.strokeStyle = 'rgba(62,42,38,.55)'; c.lineWidth = 1; c.beginPath(); c.roundRect(x - w / 2, y - 22, w, 22, 11); c.fill(); c.stroke(); c.fillStyle = '#4a3440'; c.fillText(tag.text, x, y - 7); c.globalAlpha = 1; }
// ---------------- steps
function setStep(i) { step = i; const S = STEPS[i]; $('#h2st').textContent = `${i + 1}/6 ${S.n}`; $('#h2bt').textContent = S.btn; $('#h2line').textContent = S.line; $('#h2ref').textContent = ''; holdT = 0; $('#h2prog').style.width = '0';
  me.st = S.k === 'pray' ? 'pray' : 'sit'; track(); VO.stop(); lyricI = 0; lyricT = 0; wordI = -1;
  el.classList.toggle('song', S.k === 'song'); if (S.k === 'song') songPlay(); else if (restEl && !restEl.paused && !resting) { restEl.pause(); bgm(); }
  if (S.k === 'word') { sayWord(0); $('#h2bt').textContent = '말씀 마치기 ›'; } if (S.k === 'pray') VO.say('3_0', PH[3].lines[0], 99); if (S.k === 'thanks') sayBless(0); }
function next() { if (step >= 5) return leave(); setStep(step + 1); }
function sayWord(j) { if (!open || STEPS[step].k !== 'word' || j >= WORD.length) return; wordI = j; const [id, t, ref] = WORD[j]; $('#h2line').textContent = t; $('#h2ref').textContent = ref;
  VO.say(id, t, 99); afterVoice(() => sayWord(j + 1), t.length * 230 + 1200); }
function sayBless(j) { if (!open || STEPS[step].k !== 'thanks' || j >= BLESS.length) return; const [id, t] = BLESS[j]; $('#h2ref').textContent = t; VO.say(id, t, 99); afterVoice(() => sayBless(j + 1), t.length * 230 + 1200); }
function afterVoice(fn, fallbackMs) { const a = VO.a, id = VO.id, st = step; let done = false; const go = () => { if (done) return; done = true; a && a.removeEventListener('ended', go); if (open && step === st && VO.id === id) setTimeout(fn, 650); };
  if (a && VO.mode === 'mp3') a.addEventListener('ended', go); setTimeout(() => { if (VO.mode !== 'mp3' || !VO.on()) go(); }, fallbackMs); setTimeout(go, 15000); }
function amen() { amenT = performance.now() / 1000; sparkles(); try { ch?.send({ type: 'broadcast', event: 'amen_pulse', payload: {} }); } catch { } chord();
  const n = 1 + peers.size + npcs.filter(q => !q.out).length; msg(`${n}개의 촛불이 함께 밝아졌어요`); try { ch?.raw?.({ t: 'tap', k: 'candle', r: ROOM }); } catch { } me.st = 'amen'; track(); setTimeout(() => open && step === 4 && setStep(5), 2600); }
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
  if (S.k === 'song') { lyricT -= dt; if (lyricT <= 0) { $('#h2line').textContent = ['마음으로 함께 불러요 ♪', '위에서 다른 찬양도 고를 수 있어요', '♪ 따라 부르기를 눌러 함께해요'][lyricI % 3]; $('#h2ref').textContent = TR[restI % TR.length][1]; lyricI++; lyricT = 6; } }
  if (S.k === 'calm') { const b = (Math.sin(t * Math.PI / 4) + 1) / 2; $('#h2line').textContent = b > .5 ? '숨을 천천히 들이쉬고…' : '…천천히 내쉬어요'; }
  if ((t | 0) % 2 === 0 && !frame._b) { frame._b = 1; buildNpcs(); pill(); } else if ((t | 0) % 2) frame._b = 0;
  const c = ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#3a2a2e'; c.fillRect(0, 0, vw, vh);
  if (bg.complete && bg.naturalWidth) { if (T.x > 0) { c.save(); c.filter = 'blur(18px) brightness(.55)'; c.drawImage(bg, -40, -40, vw + 80, vh + 80); c.restore(); } c.setTransform(dpr * T.s, 0, 0, dpr * T.s, dpr * T.x, dpr * T.y); c.drawImage(bg, 0, 0, BW, BH); c.drawImage(bg, 0, BH - 4, BW, 4, 0, BH - 4, BW, 600); }
  else c.setTransform(dpr * T.s, 0, 0, dpr * T.s, dpr * T.x, dpr * T.y);
  // 담임목사 김은성: stands front-facing behind the pulpit; subtle speaking motion while the sermon voice plays
  { const e = sprite(null, 'S', ['pastor', 'robe']); if (e && e.ok) { const spk = VO.id && /^s1_|^2_/.test(VO.id) && VO.a && !VO.a.paused, H = 150, k = H / (e.ay - headTop(e)); window.__h2Spk = !!spk;
      const bob = spk ? Math.sin(t * 7.5) * .9 + Math.sin(t * 2.1) * .6 : Math.sin(t * 1.2) * .4, sw = spk ? 1 + Math.sin(t * 5.3) * .012 : 1; c.save(); c.translate(PUL.x, PUL.y); c.scale(sw, 1); c.drawImage(e.cv, -e.ax * k, -e.ay * k + bob, e.cv.width * k, e.cv.height * k); c.restore();
      if (bg.complete) c.drawImage(bg, 318, 286, 84, 96, 318, 286, 84, 96); } }
  const am = Math.max(0, 1 - (t - amenT) / 3.2), amU = t - amenT < .5 ? (t - amenT) / .5 : 1;
  // cross glow during amen / word
  { const gl = .25 + am * .75 * amU + (S.k === 'word' ? .2 : 0); const gr = c.createRadialGradient(CX, 190, 10, CX, 190, 200); gr.addColorStop(0, `rgba(255,226,160,${.35 * gl})`); gr.addColorStop(1, 'rgba(255,226,160,0)'); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.fillRect(CX - 200, 0, 400, 400); c.globalCompositeOperation = 'source-over'; }
  actFx.length = 0; FIGS.length = 0; const ppl = seated(); const byRow = Array.from({ length: ROWS }, () => []); for (const p of ppl) byRow[p.s.r].push(p);
  const glows = [], cands = []; for (let r = 0; r < ROWS; r++) pewSeat(c, ROWY[r]);
  for (let r = 0; r < ROWS; r++) { const R = ROWY[r]; byRow[r].sort((a, b) => Math.abs(b.s.x - CX) - Math.abs(a.s.x - CX));
    for (const p of byRow[r]) { const fc = hash('f' + p.s.id) % 3 ? 'N' : (p.s.x < CX ? 'NE' : 'NW'); const e = sprite(p.av, fc, null, null, true); if (!e || !e.cv || !e.ok) continue; // back views only; never draw a not-yet-settled (default front) frame
      const k = p.s.k * .7, bow = (p.st === 'pray' && (p.me ? holding : 1) ? 2.5 : 0) * k, ht = headTop(e), sh = ht + (e.ay - ht) * .74, PT = pewTop(R); // sprite shoulder line sits on the backrest rail
      const oy = PT + 2 * R.k - sh * k, sink = oy - (p.s.y - e.ay * k); const pb = PT + 36 * R.k; c.save(); c.beginPath(); c.rect(p.s.x - 200, 0, 400, pb); c.clip();
      c.globalAlpha = p.a; const A = ACT.get(p.s.i), au = A ? t - A.t0 : 9, ad = au < 2 ? (A.k === 'clap' ? -Math.abs(Math.sin(au * 14)) * 2 : A.k === 'amen' ? Math.sin(au / 2 * Math.PI) * 3 : -Math.abs(Math.sin(au * 5)) * 1.6) * k : 0; if (au < 2) cands.length >= 0 && actFx.push({ x: p.s.x, y: oy + ht * k - 6 * k, k, A, au });
      c.drawImage(e.cv, p.s.x - e.ax * k, oy + bow + ad + Math.sin(t * .8 + p.ph) * .5 * k, e.cv.width * k, e.cv.height * k); c.globalAlpha = 1; c.restore();
      e.top = ht;
      // chest-height hand candle beside the near shoulder; never above the head
      p.hy = PT - 1.5 * R.k; p.hx = p.s.x + R.sp * .4; const lv = .55 + (p.me ? prayGlow * .45 : (p.st === 'pray' ? .2 : 0)) + am * .6 * amU; cands.push([p.hx, p.hy, p.s.k * 1.35, lv, t + p.ph, p.a]); glows.push([p.hx, p.hy, p.s.k, lv, p.a]);
      FIGS.push({ id: p.s.id, me: !!p.me, face: fc, x: (p.s.x - e.ax * k) * T.s + T.x, y: (p.s.y + sink - e.ay * k + e.top * k) * T.s + T.y, w: e.cv.width * k * T.s, h: (pb - (p.s.y + sink - e.ay * k + e.top * k)) * T.s, cy: p.hy * T.s + T.y, headY: (p.s.y + sink - e.ay * k + e.top * k) * T.s + T.y });
      if (p.me) meMark(c, p.s.x, p.s.y + sink - e.ay * k + e.top * k - 6, p.s.k); }
    pew(c, R, r); for (const q of cands) candle(c, q[0], q[1], q[2], q[3], q[4], q[5]); cands.length = 0; }
  c.globalCompositeOperation = 'lighter'; for (const [x, y, k, lv, a] of glows) { const rad = Math.max((22 + 26 * lv) * k, 15 + 6 * lv), boost = 1 + Math.max(0, .75 - k) * 1.4; const gr = c.createRadialGradient(x, y - 3 * k, 1, x, y - 3 * k, rad); gr.addColorStop(0, `rgba(255,200,110,${Math.min(.5, .26 * lv * a * boost)})`); gr.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); } c.globalCompositeOperation = 'source-over';
  for (const q of actFx) { const u = q.au / 2, g = q.A.k === 'clap' ? '👏' : q.A.k === 'amen' ? '🙏' : '♪'; c.globalAlpha = Math.max(0, Math.sin(Math.min(1, u * 1.4) * Math.PI)) * .9; c.font = `${Math.round(15 * q.k / .7)}px sans-serif`; c.textAlign = 'center'; c.fillStyle = '#b5739a';
    c.fillText(g, q.x + (q.A.k === 'sing' ? Math.sin(q.au * 4) * 6 * q.k : 0), q.y - u * 26 * q.k); if (q.A.k === 'sing') c.fillText('♫', q.x + 12 * q.k, q.y - 8 * q.k - u * 20 * q.k); c.globalAlpha = 1; }
  // amen sparkles rise toward the cross
  c.globalCompositeOperation = 'lighter'; fx = fx.filter(f => t - f.t0 < f.d); for (const f of fx) { const u = (t - f.t0) / f.d; if (u < 0) continue; const x = f.x + (CX - f.x) * u * u, y = f.y + (200 - f.y) * u; c.fillStyle = `rgba(255,230,150,${(1 - u) * .9})`; c.beginPath(); c.arc(x, y, 2.2 * (1 - u * .5), 0, 7); c.fill(); } c.globalCompositeOperation = 'source-over';
  drawTag(c);
  if (dimA > .01) { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = `rgba(20,12,30,${dimA})`; c.fillRect(0, 0, vw, vh); } }
function candle(c, x, y, k, lv, t, a) { const h = 9 * k, w = 3.4 * k; c.globalAlpha = a; c.fillStyle = '#fff6e6'; c.strokeStyle = 'rgba(62,42,38,.7)'; c.lineWidth = .8 * k; c.fillRect(x - w / 2, y - h * .2, w, h); c.strokeRect(x - w / 2, y - h * .2, w, h);
  const fl = 1 + Math.sin(t * 9) * .08 + Math.sin(t * 5.3) * .05, fh = (5 + lv * 2.2) * k * fl; c.fillStyle = `rgba(255,${190 + lv * 30 | 0},90,.95)`; c.beginPath(); c.ellipse(x, y - h * .2 - fh * .5, 1.7 * k, fh * .5, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,230,.9)'; c.beginPath(); c.ellipse(x, y - h * .2 - fh * .38, .8 * k, fh * .26, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
function meMark(c, x, y, k) { const f = Math.max(9, 11 * k); c.font = `700 ${f}px Pretendard, sans-serif`; c.textAlign = 'center'; const w = f * 1.9; c.fillStyle = 'rgba(255,248,240,.92)'; c.strokeStyle = 'rgba(62,42,38,.55)'; c.lineWidth = 1; c.beginPath(); c.roundRect(x - w / 2, y - f * 1.25, w, f * 1.3, f * .6); c.fill(); c.stroke(); c.fillStyle = '#6a4a8a'; c.fillText('나', x, y - f * .25); }
// pews: real wooden pews seen from behind-above — seat strip (behind people), backrest with top rail, panel insets, shaded back face, end panels with
// rounded caps; soft chocolate outline. Seat strip is drawn first; the backrest after that row's people so it occludes their lower body.
const OUT = 'rgba(62,42,38,.82)';
const pewTop = R => R.y - 9 * R.k;
const HT = new WeakMap(); function headTop(e) { let v = HT.get(e.cv); if (v != null) return v; const g = e.cv.getContext('2d'), W = e.cv.width, H = e.cv.height, d = g.getImageData(0, 0, W, H).data; v = H;
  outer: for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 60) { v = y; break outer; } HT.set(e.cv, v); return v; }
function segsOf(R) { const { k, hw, sp } = R; return [[hw + sp * .06, hw + sp * 3.18], [hw + sp * 3.25 + 14 * k + sp * .02, hw + sp * 5.35 + 14 * k]]; }
function eachSeg(R, f) { const L = (6 - T.x) / T.s, Rr = (vw - 6 - T.x) / T.s; for (const side of [-1, 1]) for (const [a, b] of segsOf(R)) { const xa = side < 0 ? CX - b : CX + a, xb = side < 0 ? CX - a : CX + b;
  const x0 = Math.max(xa, L), x1 = Math.min(xb, Rr); if (x1 - x0 < 24 * R.k) continue; f(x0, x1, xa >= L, xb <= Rr, side); } }
function pewSeat(c, R) { const k = R.k, T0 = pewTop(R); eachSeg(R, (x0, x1) => { c.fillStyle = '#b77a50'; c.strokeStyle = OUT; c.lineWidth = 1.1 * k;
  c.beginPath(); c.roundRect(x0 + 2 * k, T0 - 9 * k, x1 - x0 - 4 * k, 9 * k, 2 * k); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,225,185,.35)'; c.fillRect(x0 + 3 * k, T0 - 8 * k, x1 - x0 - 6 * k, 2 * k); }); }
function pew(c, R) { const k = R.k, T0 = pewTop(R), H = 32 * k, rail = 5.5 * k;
  eachSeg(R, (x0, x1, capL, capR) => { const w = x1 - x0;
    // back face (wood gradient) with framed panel insets
    const gr = c.createLinearGradient(0, T0, 0, T0 + H); gr.addColorStop(0, '#a56c45'); gr.addColorStop(1, '#7d4c30'); c.fillStyle = gr; c.fillRect(x0, T0, w, H);
    const n = Math.max(1, Math.round(w / (34 * k))), pw = w / n; c.strokeStyle = 'rgba(62,38,26,.45)'; c.lineWidth = 1 * k;
    for (let q = 0; q < n; q++) { c.beginPath(); c.roundRect(x0 + q * pw + 4 * k, T0 + rail + 3 * k, pw - 8 * k, H - rail - 9 * k, 2 * k); c.stroke(); c.fillStyle = 'rgba(255,220,180,.12)'; c.fillRect(x0 + q * pw + 4.5 * k, T0 + rail + 3.5 * k, pw - 9 * k, 1.4 * k); }
    // shadowed underside strip + floor shadow
    c.fillStyle = '#5e3824'; c.fillRect(x0, T0 + H - 4 * k, w, 4 * k); c.fillStyle = 'rgba(40,20,14,.22)'; c.fillRect(x0 + 2 * k, T0 + H, w - 4 * k, 3 * k);
    // top rail with lit top face
    c.fillStyle = '#c98f62'; c.beginPath(); c.roundRect(x0 - 1 * k, T0 - 1.5 * k, w + 2 * k, rail + 1.5 * k, 2.2 * k); c.fill(); c.fillStyle = 'rgba(255,236,205,.55)'; c.fillRect(x0 + 1 * k, T0 - .8 * k, w - 2 * k, 1.5 * k);
    c.strokeStyle = OUT; c.lineWidth = 1.3 * k; c.lineJoin = 'round'; c.beginPath(); c.roundRect(x0 - 1 * k, T0 - 1.5 * k, w + 2 * k, H + 1.5 * k, 2.2 * k); c.stroke();
    c.beginPath(); c.moveTo(x0, T0 + rail); c.lineTo(x1, T0 + rail); c.lineWidth = .9 * k; c.stroke();
    // end panels with rounded caps (only where the pew really ends on screen)
    for (const [ex, on] of [[x0, capL], [x1, capR]]) { if (!on) continue; const ew = 6.5 * k, xx = ex - ew / 2; c.fillStyle = '#8f5a38'; c.beginPath(); c.roundRect(xx, T0 - 7 * k, ew, H + 7 * k, [3.2 * k, 3.2 * k, 1 * k, 1 * k]); c.fill();
      c.fillStyle = 'rgba(255,225,185,.4)'; c.fillRect(xx + 1.2 * k, T0 - 5.5 * k, 1.4 * k, H + 3 * k); c.strokeStyle = OUT; c.lineWidth = 1.3 * k; c.stroke(); } }); }
const FIGS = [], actFx = [], PUL = { x: 360, y: 345 };
export const HALL = { rest, get resting() { return resting; }, get restAudio() { return restEl && { paused: restEl.paused, src: restEl.src, t: restEl.currentTime, muted: restEl.muted }; }, figs: () => FIGS.slice(), enter, leave, get open() { return open; }, get step() { return step; }, setStep, next, amen, get seat() { return SEATS[me.seat]?.id; }, seats: SEATS, get real() { return realN(); }, get npc() { return npcs.filter(n => !n.out).length; }, get T() { return T; }, peersN: () => peers.size, peers: () => [...peers.values()].map(p => ({ seat: p.seat, name: p.name })), acts: () => [...ACT.entries()].map(([i, a]) => ({ seat: i, k: a.k })), get mySeat() { return me.seat; }, get tag() { return tag && tag.text; }, act, get voice() { return VO.a ? { src: VO.a.src, paused: VO.a.paused, t: VO.a.currentTime, id: VO.id } : null; } };
window.HALL = HALL;

// v13 본당 예배 (worship hall): elevated 3/4 rear-diagonal hall, ~100 seated chibis, clock-synced host-led service,
// realtime shared actions, KST timetable + reminders, staff roles, programs, community and healing spots.
// Perf: pre-rendered sprite cache per (avatar, facing) on offscreen canvases, per-row pew paths, LOD for far rows,
// quarter-res masked window/weather layer, presence throttled to 1 msg / 5 s.
const G = () => window.G;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BW = 1600, BH = 900, PUL = { x: 808, y: 436 }, PULCROP = [748, 350, 120, 110];
const rnd = s => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const hash = t => { let h = 2166136261; for (const c of String(t)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

// ---------------- timetable (KST) — common values from CHURCH_RESEARCH.md
export const TT = [
  { id: 'dawn', name: '새벽기도', days: [1, 2, 3, 4, 5, 6], h: 5, m: 0, dur: 40, dawn: 1 },
  { id: 'sun1', name: '주일 1부 예배', days: [0], h: 9, m: 0, dur: 70 },
  { id: 'kids', name: '주일학교', days: [0], h: 9, m: 30, dur: 60 },
  { id: 'sun2', name: '주일 2부 예배', days: [0], h: 11, m: 0, dur: 80 },
  { id: 'youth', name: '청년부 예배', days: [0], h: 13, m: 30, dur: 90 },
  { id: 'wed', name: '수요예배', days: [3], h: 19, m: 30, dur: 70 },
  { id: 'fri', name: '금요철야 기도회', days: [5], h: 20, m: 30, dur: 120 }];
const KST = 9 * 3600e3;
const kstNow = (t = Date.now()) => new Date(t + KST); // read with getUTC*
export function occurrences(now = Date.now()) { // next start (or current) per event, epoch ms
  const k = kstNow(now), out = [];
  for (const e of TT) { let best = null;
    for (let d = -1; d <= 7; d++) { const day = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() + d, e.h, e.m)); if (!e.days.includes(day.getUTCDay())) continue;
      const st = day.getTime() - KST, en = st + e.dur * 60e3; if (en <= now) continue; if (!best || st < best.st) best = { e, st, en, live: st <= now }; }
    best && out.push(best); }
  return out.sort((a, b) => (b.live - a.live) || a.st - b.st);
}
const fmtLeft = ms => { const m = Math.max(0, Math.round(ms / 60e3)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60; return d ? `${d}일 ${h}시간` : h ? `${h}시간 ${mm}분` : `${mm}분`; };
const fmtWhen = st => { const k = kstNow(st); return `${'일월화수목금토'[k.getUTCDay()]} ${String(k.getUTCHours()).padStart(2, '0')}:${String(k.getUTCMinutes()).padStart(2, '0')}`; };

// ---------------- staff roles (holder: 'npc' now; designed for real users later via a server role table + moderation)
export const STAFF = [
  { id: 'senior', role: '담임목사', name: '김은혜 목사', char: ['pastor', 'robe'], duty: '말씀 · 축도 · 예배 인도(호스트)', holder: 'npc' },
  { id: 'assoc', role: '부목사', name: '이소망 목사', char: ['boy', 'basic'], av: 'm.2.1.2.1.navy.-.-.-.-', duty: '대표기도 · 새가족 심방', holder: 'npc' },
  { id: 'evang', role: '전도사', name: '박기쁨 전도사', char: ['player', 'basic'], av: 'f.1.0.3.2.lav.-.-.-.-', duty: '광고 · 청년부 · 주일학교 담당', holder: 'npc' },
  { id: 'praise', role: '찬양팀 인도자', name: '최하늘', char: ['choirgirl', 'dress'], duty: '입례·결단 찬양 인도', holder: 'npc' },
  { id: 'choir', role: '성가대 지휘자', name: '정화음', char: ['boy', 'mint'], av: 'm.2.0.1.3.mint.-.-.-.-', duty: '성가대 지휘', holder: 'npc' },
  { id: 'usher', role: '안내위원', name: '한미소', char: ['player', 'mint'], av: 'f.2.2.4.1.peach.-.-.-.-', duty: '입구 안내 · 자리 안내', holder: 'npc' },
  { id: 'teacher', role: '교사', name: '윤새싹 선생님', char: ['player', 'basic'], av: 'f.1.1.5.3.sky.-.-.-.-', duty: '주일학교 반 담당', holder: 'npc' },
  { id: 'cell', role: '셀리더', name: '서나눔', char: ['boy', 'basic'], av: 'm.1.2.4.2.peach.-.-.-.-', duty: '셀모임 인도 · 중보기도', holder: 'npc' }];

// ---------------- service order (host = 담임목사 NPC; deterministic from the shared clock so every client is in sync)
const SONGS = [
  { t: '함께 걷는 길', l: ['오늘도 이 길 위에 함께 걷게 하시니', '작은 발걸음마다 주의 사랑 넘쳐요', '지친 마음 내려놓고 주님만 바라봐요', '우리 함께 노래해요 주의 은혜를'] },
  { t: '빛으로 오신 주', l: ['어두운 밤 지나 새벽이 밝아오듯', '빛으로 오신 주님 내 맘을 비추네', '두 손 들어 고백해요 나의 주 나의 왕', '영원히 찬양하리 주의 이름을'] }];
const PH = [
  { k: 'song', n: '입례찬양', dur: 48, who: 'praise', song: 0 },
  { k: 'pray', n: '대표기도', dur: 30, who: 'assoc', lines: ['사랑의 하나님, 오늘도 이 자리에 모이게 하심을 감사드립니다.', '아픈 이웃에게 회복을, 지친 마음에 쉼을 주옵소서.', '이 예배를 기쁘게 받아 주시고 말씀으로 새롭게 하옵소서.', '예수님의 이름으로 기도합니다.'] },
  { k: 'word', n: '말씀', dur: 72, who: 'senior', verse: '수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라 (마태복음 11:28)', lines: ['오늘 말씀은 우리에게 쉼을 약속합니다.', '바쁜 도시 한가운데서도 주님은 우리를 부르십니다.', '무거운 짐을 혼자 지지 마세요. 함께 나누면 가벼워집니다.', '이번 한 주, 옆자리 이웃에게 먼저 인사를 건네 봅시다.', '주님이 주시는 쉼이 여러분의 하루를 지켜 주실 거예요.'] },
  { k: 'cry', n: '통성기도', dur: 36, who: 'senior', lines: ['이제 각자의 자리에서 마음을 다해 함께 기도하겠습니다.', '가정과 일터, 우리 동네를 위해 소리 내어 기도합니다.', '중보기도 제목들을 기억하며 서로를 위해 기도해요.'] },
  { k: 'song', n: '결단찬양', dur: 44, who: 'praise', song: 1, hands: 1 },
  { k: 'bless', n: '축도', dur: 20, who: 'senior', lines: ['이제는 우리 주 예수 그리스도의 은혜와', '하나님의 사랑과 성령의 교통하심이', '이 자리의 모든 이웃과 함께 영원히 있을지어다.'] },
  { k: 'news', n: '광고 · 새가족 환영', dur: 22, who: 'evang', lines: ['처음 오신 새가족 여러분 환영합니다!', '수요예배는 수요일 저녁 7시 30분, 금요기도회는 8시 30분이에요.', '셀모임과 성경공부는 안내 메뉴에서 신청할 수 있어요.'] }];
const CYC = PH.reduce((a, p) => a + p.dur, 0), EPOCH = Date.UTC(2026, 0, 1);
function phaseAt(now = Date.now()) { const s = ((now - EPOCH) / 1000) % CYC; let acc = 0; for (let i = 0; i < PH.length; i++) { if (s < acc + PH[i].dur) return { i, p: PH[i], t: s - acc, left: acc + PH[i].dur - s }; acc += PH[i].dur; } return { i: 0, p: PH[0], t: 0, left: PH[0].dur }; }

// ---------------- pilgrims (NPC fillers for empty seats)
const PN = ['하늘', '소망', '은별', '다온', '새봄', '나래', '이슬', '한결', '여름', '가람', '보람', '단비', '해솔', '라온', '미리', '온유', '사랑', '주안', '예찬', '시온', '빛나', '겨레', '노을', '마루'];
function pilgrimAv(r) { const A = window.AV, g = r() < .52 ? 'f' : 'm', o = A.OUTFITS[g][Math.floor(r() * A.OUTFITS[g].length)][0];
  return [g, Math.floor(r() * 3.6), Math.floor(r() * 4), Math.floor(r() * A.HAIRS[g].length), Math.floor(r() * A.HAIRC.length), o, '-', '-', '-', '-'].join('.'); }

// ---------------- seat layout: fanned elliptical pews around the pulpit with a centre aisle
function layout() { const seats = [], rows = []; const cx = PUL.x, cy = 300;
  for (let r = 0; r < 6; r++) { const rx = 520 + r * 118, ry = rx * .5, row = { r, pts: [] };
    const yb = cy + ry, h = drawHAt(yb), sp = h * .5; let th = Math.PI / 2, list = [];
    for (const dir of [-1, 1]) { let a = Math.PI / 2 + dir * (h * .33) / rx;
      while (true) { const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; if (y < 520 || x < 26 || x > BW - 26) break; list.push({ x, y, a }); a += dir * sp / Math.hypot(rx * Math.sin(a), ry * Math.cos(a)); } }
    list.sort((p, q) => p.x - q.x); for (const p of list) { const s = { i: seats.length, r, x: p.x, y: p.y, h: drawHAt(p.y) }; const ang = Math.atan2(PUL.y - 60 - s.y, PUL.x - s.x);
      s.face = facing(ang); seats.push(s); row.pts.push(s); }
    for (let a = 0.2; a <= Math.PI - 0.2; a += 0.02) { const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; if (y >= 505) row.arc = row.arc || [], row.arc.push([x, y, drawHAt(y)]); }
    rows.push(row); }
  return { seats, rows }; }
function drawHAt(y) { return 82 + Math.max(0, y - 540) / 300 * 70; }
function facing(a) { const d = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; return d === 'S' || d === 'SE' || d === 'SW' ? 'N' : d; }

// ---------------- sprite cache (offscreen pre-render per avatar+facing; 200px tall source, scaled per seat)
const SC = new Map(), SRC_H = 150;
let tmpChar = null;
function makeChar(av, char) { const g = G(), C = g.player.constructor, c = new C(g.player.sprites, char ? char[0] : 'player', char ? char[1] : 'basic', 0, 0, { name: '', cfg: g.cfg(), drawH: SRC_H });
  if (av) window.AV.apply(c, av); c.drawH = SRC_H; return c; }
function sprite(av, face, char, emote) { const key = (av || char.join('/')) + '|' + face + '|' + (emote || ''); let e = SC.get(key); if (e && e.ok) return e;
  if (e && performance.now() - e.t < 400) return e.ok ? e : null; // retry not-yet-loaded avatars at most ~2.5×/s
  const c = makeChar(av, char); c.face = c.dface = c._lf = face; c.blendT = 1; c.speedNow = 0; c.t = 0; if (emote) { c.emote = emote; c.emoteT = .35; }
  const p = c.pose(face); const ready = !av || !!window.AV.frame(c, p.key); const W = 130, H = 200, cv = e?.cv || document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); x.clearRect(0, 0, W, H); c.x = W / 2; c.y = H - 8; c.puffs = []; try { c._draw(x); } catch { }
  e = { cv, ax: W / 2, ay: H - 8, top: c.headY != null ? (H - 8 - c.headY) : SRC_H * .95, ok: ready, t: performance.now() }; if (ready) spriteN++; SC.set(key, e); return e; }

// ---------------- state
let lowQ = false, el, cv, ctx, wl, wctx, bg, mask, pulImg, bgT, dpr = 1, vw = 0, vh = 0, s = 1, ox = 0, oy = 0, panX = null, raf = 0, lastT = 0, open = false;
let L, pil = [], me = { seat: -1, st: 'sit', act: null, actT: 0, hands: false }, peers = new Map(), staffC = {}, fx = [], ripple = null, react = null, tagShow = null;
let mode = 'service', weather = 'auto', subsOn = true, fps = 60, fpsN = 0, lastSend = 0, lastPres = 0, lastAct = 0, enterT = 0, amenLog = [], audio = null, lastPh = -1, simN = 0;
const ACT_DUR = { amen: 1.3, wave: 1.6 };

function weatherNow() { if (weather !== 'auto') return weather; const k = kstNow(), h = k.getUTCHours() + k.getUTCMinutes() / 60;
  const day = Math.floor((Date.now() + KST) / 864e5), r = rnd(day * 7 + 3)(), mo = k.getUTCMonth();
  const wet = r < .22 ? 'rain' : (r < .34 && (mo >= 10 || mo <= 2)) ? 'snow' : null;
  if (mode === 'dawn' || (h >= 4 && h < 6.5)) return 'dawn'; if (h >= 16.5 && h < 19) return wet || 'sunset'; if (h >= 19 || h < 4) return wet === 'rain' ? 'rainnight' : wet || 'night'; return wet || 'day'; }
const TINT = { day: null, dawn: ['#2c4a9a', .55, '#9fb8ff', .3], sunset: ['#ff9a6a', .32, '#ffb68a', .14], night: ['#141a46', .72, '#ffd88a', .2], rainnight: ['#1d2a4a', .7, '#9fb0d0', .2], rain: ['#6a7a96', .45, '#c8d4e6', .06], snow: ['#c8d4f0', .28, '#ffffff', .08] };

function ensureDom() { if (el) return;
  el = document.createElement('div'); el.id = 'wh'; el.innerHTML = `
  <canvas id="whc"></canvas>
  <div class="wh-top"><div class="wh-title"><b id="wh-name">본당</b><span id="wh-ph"></span><small id="wh-next"></small></div>
    <div class="wh-tbtns"><button id="wh-info" aria-label="교회 안내">안내</button><button id="wh-subs" aria-pressed="true" aria-label="자막 켜기/끄기">자막</button><button id="wh-exit" aria-label="예배당 나가기">나가기</button></div></div>
  <div class="wh-sub" id="wh-sub"><small id="wh-who"></small><p id="wh-line"></p></div>
  <div class="wh-bar"><button id="wh-pray" data-a="pray"><i></i><span>기도</span></button><button id="wh-sing" data-a="sing"><i></i><span>찬양</span></button><button id="wh-amen" data-a="amen"><i></i><span>아멘</span></button></div>
  <div class="wh-sheet" id="wh-sheet" role="dialog" aria-modal="true"><div class="wh-panel"><div class="wh-tabs" id="wh-tabs"></div><div class="wh-body" id="wh-body"></div><button class="wh-x" id="wh-x" aria-label="닫기">닫기</button></div></div>`;
  document.body.append(el); cv = $('#whc'); ctx = cv.getContext('2d');
  wl = document.createElement('canvas'); wl.width = 400; wl.height = 225; wctx = wl.getContext('2d');
  bg = new Image(); bg.src = 'assets/worship/hall.webp'; mask = new Image(); mask.src = 'assets/worship/winmask.png';
  bg.onload = () => { bgT = null; }; mask.onload = () => { bgT = null; };
  $('#wh-exit').onclick = () => close(); $('#wh-subs').onclick = e => { subsOn = !subsOn; e.currentTarget.setAttribute('aria-pressed', subsOn); $('#wh-sub').classList.toggle('off', !subsOn); };
  $('#wh-info').onclick = () => sheet('time'); $('#wh-x').onclick = () => sheet(null); $('#wh-sheet').onclick = e => { if (e.target.id === 'wh-sheet') sheet(null); };
  el.querySelectorAll('.wh-bar button').forEach(b => b.onclick = () => act(b.dataset.a));
  let drag = null; cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, px: ox, moved: 0 }; });
  addEventListener('pointermove', e => { if (!drag || !open) return; const dx = e.clientX - drag.x; drag.moved = Math.max(drag.moved, Math.abs(dx)); if (BW * s > vw + 2 && drag.moved > 6) { panX = drag.px + dx; } });
  addEventListener('pointerup', e => { if (!drag || !open) return; const d = drag; drag = null; if (d.moved < 8 && e.target === cv) tap(e.clientX, e.clientY); });
  addEventListener('keydown', e => { if (!open) return; if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return; e.stopImmediatePropagation();
    if (e.key === 'Escape') { $('#wh-sheet').classList.contains('show') ? sheet(null) : close(); } else if (e.key === '1') act('pray'); else if (e.key === '2') act('sing'); else if (e.key === '3' || e.key === ' ') { e.preventDefault(); act('amen'); } }, true);
  addEventListener('resize', () => open && resize());
}
function resize() { vw = innerWidth; vh = innerHeight; const coarse = matchMedia('(pointer:coarse)').matches; dpr = lowQ ? 1 : Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  s = vh > vw * 1.2 ? Math.max(vw / BW, (vh - 190) / BH) : Math.max(vw / BW, Math.min(vh / BH, vw / 760)); const hh = BH * s; oy = hh >= vh ? (vh - hh) / 2 : Math.min(54, (vh - hh) / 2) + (vw < 560 ? 0 : 0);
  el.classList.toggle('wh-portrait', hh < vh - 120); panX = null; }

// ---------------- open / close
export function enter(opt = {}) { const g = G(); if (!g || !g.S) return; ensureDom(); mode = opt.mode || (kstNow().getUTCHours() >= 4 && kstNow().getUTCHours() < 6 ? 'dawn' : 'service'); weather = opt.weather || 'auto';
  if (!L) L = layout(); buildPilgrims(); pickMySeat(); buildStaff(); open = true; window.__whOpen = true; el.style.display = 'block'; document.body.classList.add('wh-open'); resize(); bgT = null; enterT = performance.now(); lastPh = -1;
  ripple = null; react = null; fx = []; me.st = 'sit'; me.act = null; me.hands = false; startAmbience(); sendPres(true); lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  $('#wh-name').textContent = mode === 'dawn' ? '새벽기도 · 본당' : '본당 예배'; if (!localStorage.getItem('wh_seen')) { localStorage.setItem('wh_seen', '1'); setTimeout(() => g.toast('안내위원: 환영해요! 아래 기도 · 찬양 · 아멘으로 함께 예배해요'), 600); }
  try { window.Aud?.stopHymn?.(); } catch { } }
export function close() { if (!open) return; open = false; window.__whOpen = false; el.style.display = 'none'; document.body.classList.remove('wh-open'); cancelAnimationFrame(raf); stopAmbience(); G()?.net?.send('wh', { k: 'bye' }); sheet(null); }

function buildPilgrims() { const r = rnd(hash('pilgrims' + (mode === 'dawn' ? 'd' : ''))); const n = L.seats.length; pil = [];
  const dens = mode === 'dawn' ? .38 : 1; for (let i = 0; i < n; i++) { const on = r() < dens; pil.push(on ? { av: pilgrimAv(r), name: '순례자 ' + PN[Math.floor(r() * PN.length)], ph: r() * 6.28, sing: r(), pray: r(), echo: r() } : null); } }
function pickMySeat() { const saved = +localStorage.getItem('wh_seat'); const taken = new Set([...peers.values()].map(p => p.seat));
  if (L.seats[saved] && !taken.has(saved)) { me.seat = saved; return; }
  const c = L.seats.filter(x => x.r === 3 && !taken.has(x.i)).sort((a, b) => Math.abs(a.x - PUL.x) - Math.abs(b.x - PUL.x)); me.seat = (c[1] || c[0] || L.seats[0]).i; localStorage.setItem('wh_seat', me.seat); }
function buildStaff() { const pos = { senior: [PUL.x, 436, 'S', 168], assoc: [640, 470, 'SE', 112], evang: [1180, 470, 'SW', 108], praise: [1010, 430, 'S', 112], choir: [712, 452, 'W', 104], usher: [130, 800, 'NE', 150] };
  for (const st of STAFF) { const P = pos[st.id]; if (!P) continue; const c = makeChar(st.av, st.char); c.x = P[0]; c.y = P[1]; c.drawH = P[3]; c.face = c.dface = c._lf = P[2]; c.blendT = 1; c.speedNow = 0; staffC[st.id] = { c, st, base: P }; }
  staffC.choirs = [0, 1, 2, 3, 4].map(i => ({ x: 498 + i * 40, y: 432, av: pilgrimAv(rnd(900 + i)) })); }

// ---------------- network (throttled presence + one-shot actions)
function sendPres(force) { const g = G(), now = performance.now(); if (!force && now - lastPres < 5000) return; lastPres = now; g.net?.send('wh', { k: 'p', s: me.seat, n: g.S.name, av: g.player.av, st: me.st, hd: me.hands ? 1 : 0, md: mode }); }
function onNet(p) { if (!p || !p.id) return; const Sf = window.Safe; if (p.k === 'bye') { peers.delete(p.id); return; }
  if (Sf?.isBlocked?.(p.id, p.n)) return; let q = peers.get(p.id);
  if (p.k === 'p') { const seat = Math.max(0, Math.min((L?.seats.length || 1) - 1, p.s | 0)); q = q || { id: p.id }; Object.assign(q, { seat, name: Sf ? Sf.clean(String(p.n || '이웃').slice(0, 12)) : String(p.n || '이웃').slice(0, 12), av: String(p.av || ''), st: p.st === 'pray' || p.st === 'sing' ? p.st : 'sit', hands: !!p.hd, seen: performance.now() }); peers.set(p.id, q);
    if (open && seat === me.seat && p.id < G().net.id) { pickMySeatAvoid(); } return; }
  if (!q) return; q.seen = performance.now();
  if (p.k === 'a' && ['amen', 'wave', 'cry'].includes(p.a)) { q.act = p.a; q.actT = 0; if (p.a === 'amen') { amenLog.push(performance.now()); echoAmen(L.seats[q.seat]); } }
  if (p.k === 'st') { q.st = p.st === 'pray' || p.st === 'sing' ? p.st : 'sit'; q.hands = !!p.hd; }
  if (p.k === 'g' && p.to === G().net.id && open) { G().toast(`${q.name}님이 반갑게 인사했어요`); q.act = 'wave'; q.actT = 0; } }
function pickMySeatAvoid() { localStorage.removeItem('wh_seat'); pickMySeat(); sendPres(true); }

// ---------------- actions (기도 / 찬양 / 아멘)
function act(a) { const g = G(), now = performance.now(), ph = phaseAt().p;
  if (a === 'amen') { if (now - lastAct < 450) return; lastAct = now; me.act = 'amen'; me.actT = 0; amenLog.push(now); g.net?.send('wh', { k: 'a', a: 'amen' }); window.Aud?.sfx?.('amen'); echoAmen(L.seats[me.seat], true); reaction('아멘'); return; }
  if (a === 'pray') { me.st = me.st === 'pray' ? 'sit' : 'pray'; if (me.st === 'pray' && ph.k === 'cry') { me.act = 'cry'; me.actT = 0; g.net?.send('wh', { k: 'a', a: 'cry' }); } }
  if (a === 'sing') { if (me.st === 'sing' && ph.hands) me.hands = !me.hands; else { me.st = me.st === 'sing' ? 'sit' : 'sing'; me.hands = false; } if (me.st === 'sing' && ph.k === 'song') reaction('찬양'); }
  if (now - lastSend > 500) { lastSend = now; g.net?.send('wh', { k: 'st', st: me.st, hd: me.hands ? 1 : 0 }); }
  syncBar(); }
function echoAmen(seat, mine) { if (!seat) return; const r = Math.random; for (let i = 0; i < pil.length; i++) { const p = pil[i]; if (!p || peers.size && seatPeer(i)) continue; if (p.echo < (mine ? .34 : .2)) { const d = Math.hypot(L.seats[i].x - seat.x, L.seats[i].y - seat.y); p.amenAt = performance.now() + 180 + d * 1.4 + r() * 260; } } }
function seatPeer(i) { for (const q of peers.values()) if (q.seat === i) return q; return null; }
function reaction(kind) { const s0 = L.seats[me.seat], near = L.seats.filter(x => x.i !== me.seat).sort((a, b) => Math.hypot(a.x - s0.x, a.y - s0.y) - Math.hypot(b.x - s0.x, b.y - s0.y)).slice(0, 4);
  react = { t: 0, kind, list: [{ av: G().player.av, me: 1 }, ...near.map(x => { const q = seatPeer(x.i) || pil[x.i]; return q ? { av: q.av } : null; }).filter(Boolean)].slice(0, 5) }; }
function syncBar() { const ph = phaseAt().p; const P = $('#wh-pray'), Sg = $('#wh-sing');
  P.classList.toggle('on', me.st === 'pray'); Sg.classList.toggle('on', me.st === 'sing'); P.querySelector('span').textContent = ph.k === 'cry' ? '통성기도' : '기도';
  Sg.querySelector('span').textContent = me.st === 'sing' && ph.hands ? (me.hands ? '손 내리기' : '손 들기') : '찬양';
  P.classList.toggle('hint', (ph.k === 'pray' || ph.k === 'cry' || ph.k === 'bless') && me.st !== 'pray'); Sg.classList.toggle('hint', ph.k === 'song' && me.st !== 'sing'); }

// ---------------- tap → name tag (+ greet / report for real users)
function tap(cx, cy) { const x = (cx - ox) / s, y = (cy - oy) / s; let best = null, bd = 1e9;
  for (const st of L.seats) { const top = st.y - st.h * .95, d = Math.hypot(st.x - x, (st.y - st.h * .5) - y); if (y > top - 10 && y < st.y + 6 && Math.abs(st.x - x) < st.h * .32 && d < bd) { bd = d; best = st; } }
  for (const k of Object.keys(staffC)) { const o = staffC[k]; if (!o.c) continue; const c = o.c; if (Math.abs(c.x - x) < c.drawH * .3 && y < c.y && y > c.y - c.drawH) { tagShow = { x: c.x, y: c.y - c.drawH * 1.02, name: `${o.st.role} ${o.st.name}`, t: 3.2 }; return; } }
  if (!best) return; const q = seatPeer(best.i), mine = best.i === me.seat, p = pil[best.i];
  const name = mine ? G().S.name + ' (나)' : q ? q.name : p ? p.name : null; if (!name) return; tagShow = { x: best.x, y: best.y - best.h * 1.02, name, t: 3.2, seat: best.i };
  if (q) personCard(q); }
function personCard(q) { const g = G(); g.dialog?.(q.name, '같은 예배당에 앉아 있는 이웃이에요.', [['인사하기', () => { g.net?.send('wh', { k: 'g', to: q.id, n: g.S.name }); g.toast(`${q.name}님에게 인사했어요`); me.act = 'wave'; me.actT = 0; }], ['신고 · 차단', () => window.Safe?.menu?.(q.id, q.name, '')], ['닫기', () => { }]]); }

// ---------------- render
function frame(now) { if (!open) return; raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - lastT) / 1000); lastT = now; fps = fps * .95 + (1 / Math.max(dt, 1e-3)) * .05; fpsN++;
  const P = phaseAt(); if (P.i !== lastPh) { onPhase(P); lastPh = P.i; } sendPres(false); tickNotify(); for (const [id, q] of peers) if (now - q.seen > 16000) peers.delete(id);
  if (now - enterT > 120e3 && !enter.done) attend();
  if (!lowQ && fpsN % 90 === 0 && now - enterT > 2500 && fps < 48 && dpr > 1) { lowQ = true; resize(); }
  ox = panX == null ? Math.min(0, Math.max(vw - BW * s, vw / 2 - PUL.x * s)) : Math.min(0, Math.max(vw - BW * s, panX)); if (BW * s <= vw) ox = (vw - BW * s) / 2;
  const c = ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#efe3d6'; c.fillRect(0, 0, vw, vh); if (oy + BH * s < vh) { const gr = c.createLinearGradient(0, oy + BH * s, 0, vh); gr.addColorStop(0, '#c9a6d4'); gr.addColorStop(1, '#b896c8'); c.fillStyle = gr; c.fillRect(0, oy + BH * s - 2, vw, vh); }
  c.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
  drawBg(c, now); drawStage(c, dt, P); drawSeats(c, dt, now, P); drawFx(c, dt); drawTag(c, dt);
  c.setTransform(dpr, 0, 0, dpr, 0, 0); drawReact(c, dt); hudText(P); }
function drawBg(c, now) { if (!bg.complete || !bg.naturalWidth) return; const w = weatherNow();
  if (!bgT || bgT.w !== w) { bgT = { w, cv: document.createElement('canvas') }; bgT.cv.width = BW; bgT.cv.height = BH; const x = bgT.cv.getContext('2d'); x.drawImage(bg, 0, 0, BW, BH);
    const T = TINT[w]; if (T) { x.globalCompositeOperation = 'multiply'; x.globalAlpha = T[3] * 2.2; x.fillStyle = T[0]; x.fillRect(0, 0, BW, BH); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      if (w === 'night' || w === 'rainnight' || w === 'dawn') { const g2 = x.createRadialGradient(PUL.x, 180, 40, PUL.x, 260, 520); g2.addColorStop(0, 'rgba(255,226,170,.38)'); g2.addColorStop(1, 'rgba(255,226,170,0)'); x.fillStyle = g2; x.fillRect(0, 0, BW, BH); } }
    pulImg = document.createElement('canvas'); pulImg.width = PULCROP[2]; pulImg.height = PULCROP[3]; pulImg.getContext('2d').drawImage(bgT.cv, PULCROP[0], PULCROP[1], PULCROP[2], PULCROP[3], 0, 0, PULCROP[2], PULCROP[3]); }
  c.drawImage(bgT.cv, 0, 0); if (mask.complete && mask.naturalWidth) drawWindows(c, w, now); }
const flakes = Array.from({ length: 110 }, (_, i) => { const r = rnd(i + 11); return { x: r() * 400, y: r() * 225, v: .5 + r(), z: r() }; });
const lights = Array.from({ length: 70 }, (_, i) => { const r = rnd(i + 501); return { x: r() * 400, y: 40 + r() * 170, a: r(), f: r() }; });
let wlT = 0;
function drawWindows(c, w, now) { const T = TINT[w]; if (!T && w === 'day') return; if (now - wlT > 33) { wlT = now; const x = wctx; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, 400, 225);
    if (T) { x.fillStyle = T[0]; x.globalAlpha = T[1]; x.fillRect(0, 0, 400, 225); x.globalAlpha = 1; }
    if (w === 'sunset') { const g = x.createLinearGradient(0, 0, 0, 225); g.addColorStop(0, 'rgba(255,170,120,.5)'); g.addColorStop(.6, 'rgba(255,120,150,.25)'); g.addColorStop(1, 'rgba(120,90,160,.1)'); x.fillStyle = g; x.fillRect(0, 0, 400, 225); }
    if (w === 'night' || w === 'rainnight' || w === 'snow' && kstNow().getUTCHours() >= 18) for (const L2 of lights) { const tw = .55 + .45 * Math.sin(now / 900 * (1 + L2.f) + L2.a * 6); x.fillStyle = `rgba(255,${200 + L2.f * 40 | 0},140,${.5 * tw})`; x.fillRect(L2.x, L2.y, 1.6, 1.6); }
    if (w === 'dawn') { const g = x.createLinearGradient(0, 120, 0, 225); g.addColorStop(0, 'rgba(160,190,255,0)'); g.addColorStop(1, 'rgba(190,210,255,.35)'); x.fillStyle = g; x.fillRect(0, 0, 400, 225); }
    if (w === 'rain' || w === 'rainnight') { x.strokeStyle = 'rgba(220,232,255,.55)'; x.lineWidth = .7; x.beginPath(); for (const f of flakes) { f.y += 7 * f.v; f.x -= 1.2; if (f.y > 225) { f.y -= 230; f.x = Math.random() * 420; } x.moveTo(f.x, f.y); x.lineTo(f.x - 1.6, f.y + 6 + f.z * 4); } x.stroke(); }
    if (w === 'snow') { x.fillStyle = 'rgba(255,255,255,.9)'; for (const f of flakes) { f.y += .9 * f.v; f.x += Math.sin(now / 800 + f.z * 9) * .3; if (f.y > 225) { f.y -= 230; f.x = Math.random() * 400; } x.beginPath(); x.arc(f.x, f.y, .6 + f.z * .9, 0, 7); x.fill(); } }
    x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0, 400, 225); x.globalCompositeOperation = 'source-over'; }
  c.drawImage(wl, 0, 0, BW, BH); }
function drawStage(c, dt, P) { const k = P.p.k, sc = staffC; const t = performance.now() / 1000;
  for (const ch of sc.choirs) { const e = sprite(ch.av, 'S'); if (e) { const h = 92, f = h / SRC_H, bob = k === 'song' ? Math.sin(t * 3 + ch.x) * 1.2 : 0; c.drawImage(e.cv, ch.x - e.ax * f, ch.y - e.ay * f + bob, e.cv.width * f, e.cv.height * f); } }
  for (const id of ['choir', 'assoc', 'evang', 'praise', 'senior', 'usher']) { const o = sc[id]; if (!o) continue; const ch = o.c;
    const lead = P.p.who === id; ch.emote = (id === 'senior' && (k === 'pray' || k === 'cry')) || (id === 'assoc' && k === 'pray') ? 'pray' : null; if (ch.emote) ch.emoteT = .2;
    ch.update(dt); ch.emote = ch.emote; ch._draw(c);
    if (id === 'senior') { if (pulImg) c.drawImage(pulImg, PULCROP[0], PULCROP[1]); if (k === 'bless') arms(c, ch.x, ch.headY ?? (ch.y - ch.drawH), ch.drawH, 1); }
    if (id === 'choir' && k === 'song') { const a = Math.sin(t * 4) * .5; c.strokeStyle = '#6b5a8a'; c.lineWidth = 3; c.beginPath(); c.moveTo(ch.x - 14, ch.y - ch.drawH * .62); c.lineTo(ch.x - 30, ch.y - ch.drawH * (.78 + a * .1)); c.stroke(); }
    if (lead || id === 'senior' || id === 'usher') label(c, ch.x, (ch.headY ?? ch.y - ch.drawH) - 10, o.st.role, lead ? '#ffe38a' : '#fff', id === 'senior' ? 17 : 14); } }
function arms(c, x, top, h, k) { c.save(); c.strokeStyle = '#f3cdb7'; c.lineCap = 'round'; c.lineWidth = Math.max(2.5, h * .055); const sy = top + h * .36, up = top - h * .06 * k;
  c.beginPath(); c.moveTo(x - h * .16, sy); c.quadraticCurveTo(x - h * .3, top + h * .12, x - h * .24, up); c.moveTo(x + h * .16, sy); c.quadraticCurveTo(x + h * .3, top + h * .12, x + h * .24, up); c.stroke();
  c.fillStyle = '#f7d9c6'; c.beginPath(); c.arc(x - h * .24, up, h * .045, 0, 7); c.arc(x + h * .24, up, h * .045, 0, 7); c.fill(); c.restore(); }
function label(c, x, y, t, col, fs = 14) { c.font = `700 ${fs}px Pretendard, sans-serif`; c.textAlign = 'center'; const w = c.measureText(t).width + fs; c.fillStyle = 'rgba(50,40,80,.62)'; rrect(c, x - w / 2, y - fs * .85, w, fs * 1.6, fs * .8); c.fill(); c.fillStyle = col; c.fillText(t, x, y + fs * .32); }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
let crowdCv = null, crowdKey = '', spriteN = 0;
function drawSeats(c, dt, now, P) { if (!lowQ) return seatPass(c, dt, now, P, 0);
  const occ = [...peers.values()].map(q => q.seat).join(','), key = P.p.k + '|' + (P.p.hands && P.t > 8) + '|' + me.seat + '|' + occ + '|' + spriteN + '|' + s;
  if (key !== crowdKey) { crowdKey = key; crowdCv = crowdCv || document.createElement('canvas'); const k2 = s * dpr; crowdCv.width = Math.ceil(BW * k2); crowdCv.height = Math.ceil(BH * k2); const x = crowdCv.getContext('2d'); x.setTransform(k2, 0, 0, k2, 0, 0); seatPass(x, 0, now, P, 1); }
  c.drawImage(crowdCv, 0, 0, BW, BH); seatPass(c, dt, now, P, 2); }
function seatPass(c, dt, now, P, md) { const t = now / 1000, k = P.p.k, song = k === 'song', prayK = k === 'pray' || k === 'cry' || k === 'bless';
  const occ = new Map(); for (const q of peers.values()) occ.set(q.seat, q);
  for (const row of L.rows) { const far = row.r <= 1; // LOD: far rows skip per-seat breathing/sway transforms
    for (const st of row.pts) { const mine = st.i === me.seat, q = mine ? null : occ.get(st.i), p = q ? null : pil[st.i];
      if (!mine && !q && !p) continue; const stat = !!p && !p.act && !(p.amenAt && now >= p.amenAt); if ((md === 1 && !stat) || (md === 2 && stat)) continue; if (md === 1) dt = 0; const av = mine ? G().player.av : q ? q.av : p.av; let state = mine ? me.st : q ? q.st : null, hands = mine ? me.hands : q ? q.hands : false;
      if (p) { state = prayK ? (p.pray < .85 ? 'pray' : 'sit') : song ? (p.sing < .72 ? 'sing' : 'sit') : 'sit'; hands = song && P.p.hands && p.sing < .4 && P.t > 8; }
      let actN = mine ? me.act : q ? q.act : null, actT = mine ? me.actT : q ? q.actT : 0;
      if (p && p.amenAt && now >= p.amenAt) { p.act = 'amen'; p.actT = 0; p.amenAt = 0; } if (p && p.act) { p.actT += dt; actN = p.act; actT = p.actT; if (p.actT > 1.3) p.act = null; }
      if (mine && me.act) { me.actT += dt; if (me.actT > (ACT_DUR[me.act] || 1.4)) me.act = null; } if (q && q.act) { q.actT += dt; if (q.actT > 1.4) q.act = null; }
      const e = sprite(av, st.face); if (!e) continue; const f = st.h / SRC_H; let dx = 0, dy = 0;
      if (!far && md !== 1) { dy = Math.sin(t * 2.2 + st.i) * .5; if (state === 'sing') dx = Math.sin(t * 2.4 + st.i * .7) * 1.6; }
      if (state === 'pray') dy += st.h * .05; if (actN === 'amen') dy -= Math.sin(Math.min(1, actT / .45) * Math.PI) * st.h * .09; if (actN === 'cry') dx += Math.sin(t * 22) * 1.2;
      c.drawImage(e.cv, st.x - e.ax * f + dx, st.y - e.ay * f + dy, e.cv.width * f, e.cv.height * f);
      const top = st.y - e.top * f + dy; if (hands) arms(c, st.x + dx, top, st.h, 1);
      if (state === 'pray' && !far) { c.fillStyle = 'rgba(255,240,190,.35)'; c.beginPath(); c.arc(st.x, top - st.h * .06, st.h * .09, 0, 7); c.fill(); }
      if (state === 'sing' && !far && md !== 1 && ((t * 1.3 + st.i * .37) % 3) < 1) { const u = (t * 1.3 + st.i * .37) % 1; c.fillStyle = `rgba(120,90,170,${.8 - u * .7})`; c.font = `${Math.round(st.h * .16)}px serif`; c.textAlign = 'center'; c.fillText('♪', st.x + st.h * .2, top - u * st.h * .25); }
      if (actN === 'amen' && actT < 1.2) { const fs = Math.max(11, Math.round(st.h * .15)); label(c, st.x, top - st.h * .16, '아멘', '#ffe9a8', fs); }
      if (actN === 'wave' && actT < 1.6) arms(c, st.x, top, st.h, .6 + Math.sin(actT * 14) * .3);
      if (mine) { c.fillStyle = '#ffd25a'; c.beginPath(); const yy = top - st.h * .1 + Math.sin(t * 3) * 2; c.moveTo(st.x - 7, yy - 10); c.lineTo(st.x + 7, yy - 10); c.lineTo(st.x, yy - 1); c.closePath(); c.fill(); }
      if (q && !mine) { c.fillStyle = '#ff9ec7'; c.beginPath(); c.arc(st.x, top - st.h * .08, 3.2, 0, 7); c.fill(); } }
    drawPew(c, row); }
  const recent = amenLog.filter(x => now - x < 1800); amenLog = recent; const pilA = pil.reduce((a, p) => a + (p && p.act === 'amen' ? 1 : 0), 0);
  if ((recent.length + pilA >= 8) && (!ripple || now - ripple.t0 > 2600)) { ripple = { t0: now, x: L.seats[me.seat]?.x || PUL.x, y: L.seats[me.seat]?.y || 700 }; window.Aud?.sfx?.('amen'); } }
function drawPew(c, row) { if (!row.arc) return; const A = row.arc; c.beginPath(); for (let i = 0; i < A.length; i++) { const [x, y, h] = A[i]; const yt = y - h * .36; i ? c.lineTo(x, yt) : c.moveTo(x, yt); }
  for (let i = A.length - 1; i >= 0; i--) { const [x, y, h] = A[i]; c.lineTo(x, y - h * .02); } c.closePath(); c.fillStyle = '#b98a64'; c.fill();
  c.beginPath(); for (let i = 0; i < A.length; i++) { const [x, y, h] = A[i]; const yt = y - h * .36; i ? c.lineTo(x, yt) : c.moveTo(x, yt); } c.strokeStyle = '#e2bf98'; c.lineWidth = 3; c.stroke();
  c.beginPath(); for (let i = 0; i < A.length; i++) { const [x, y, h] = A[i]; i ? c.lineTo(x, y - h * .12) : c.moveTo(x, y - h * .12); } c.strokeStyle = 'rgba(120,80,60,.35)'; c.lineWidth = 2; c.stroke(); }
function drawFx(c, dt) { if (!ripple) return; const u = (performance.now() - ripple.t0) / 1600; if (u > 1) { ripple = null; return; }
  c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const v = u - i * .12; if (v <= 0) continue; c.strokeStyle = `rgba(255,214,120,${.42 * (1 - v)})`; c.lineWidth = 16 * (1 - v) + 2; c.beginPath(); c.ellipse(ripple.x, ripple.y - 40, 60 + v * 900, (60 + v * 900) * .46, 0, 0, 7); c.stroke(); }
  c.restore(); c.font = '800 54px Pretendard, sans-serif'; c.textAlign = 'center'; c.fillStyle = `rgba(255,236,170,${Math.sin(u * Math.PI)})`; c.strokeStyle = `rgba(90,60,120,${.6 * Math.sin(u * Math.PI)})`; c.lineWidth = 6; c.strokeText('아멘!', PUL.x, 250); c.fillText('아멘!', PUL.x, 250); }
function drawTag(c, dt) { if (!tagShow) return; tagShow.t -= dt; if (tagShow.t <= 0) { tagShow = null; return; } label(c, tagShow.x, tagShow.y, tagShow.name, '#fff', 16); }
function drawReact(c, dt) { if (!react) return; react.t += dt; const u = react.t; if (u > 2.2) { react = null; return; }
  const a = Math.min(1, u / .25, (2.2 - u) / .3), n = react.list.length, w = Math.min(vw - 24, 84 * n + 40), h = 132, x = (vw - w) / 2, y = vh > vw * 1.2 ? Math.max(112, Math.min(BH * s + oy - h - 10, vh - 200 - h)) : 74;
  c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(255,250,244,.94)'; rrect(c, x, y, w, h, 20); c.fill(); c.strokeStyle = 'rgba(160,130,200,.5)'; c.lineWidth = 2; c.stroke();
  c.font = '700 13px Pretendard, sans-serif'; c.fillStyle = '#7a62a8'; c.textAlign = 'left'; c.fillText(react.kind === '아멘' ? '함께 아멘' : '함께 찬양', x + 14, y + 22);
  react.list.forEach((m, i) => { const e = sprite(m.av, 'S', null, react.kind === '아멘' ? 'happy' : null) || sprite(m.av, 'S'); if (!e) return; const hh = 96, f = hh / SRC_H, cx = x + 20 + (w - 40) * (i + .5) / n, cy = y + h - 8 - Math.abs(Math.sin(u * 6 + i)) * 6;
    c.drawImage(e.cv, cx - e.ax * f, cy - e.ay * f, e.cv.width * f, e.cv.height * f); if (m.me) { c.fillStyle = '#ffd25a'; c.beginPath(); c.arc(cx, y + 30, 4, 0, 7); c.fill(); } });
  c.restore(); }

// ---------------- phase changes, subtitles, lyrics
let subKey = '';
function onPhase(P) { const g = G(), p = P.p; if (lastPh >= 0) { if (p.k === 'song') { try { window.Aud?.music?.(p.song ? 'joy' : 'old100'); } catch { } } else { try { window.Aud?.stopHymn?.(); window.Aud?.el?.pause?.(); } catch { } } }
  if (p.k !== 'song' && me.st === 'sing') me.st = 'sit'; if (p.k !== 'song') me.hands = false; syncBar();
  if (p.k === 'news' && !localStorage.getItem('wh_newbie')) { localStorage.setItem('wh_newbie', '1'); setTimeout(() => { if (open) { g.toast(`새가족 ${g.S.name}님, 환영합니다!`); reaction('아멘'); echoAmen(L.seats[me.seat], true); } }, 3500); } }
function hudText(P) { const p = P.p, occ = occurrences(), live = occ.find(o => o.live), nx = occ.find(o => !o.live);
  const key = `${P.i}|${Math.floor(P.t / 2)}|${live?.e.id}|${Math.floor(Date.now() / 30e3)}`; if (key === subKey) return; subKey = key;
  $('#wh-ph').textContent = `${p.n} · ${P.i + 1}/${PH.length}`;
  $('#wh-next').textContent = live ? `지금 ${live.e.name} 시간이에요` : nx ? `다음 ${nx.e.name} · ${fmtLeft(nx.st - Date.now())} 후` : '';
  const who = STAFF.find(x => x.id === p.who); $('#wh-who').textContent = p.k === 'song' ? `${who.role} · ${SONGS[p.song].t}` : `${who.role} ${who.name}`;
  let line; if (p.k === 'song') { const L2 = SONGS[p.song].l, per = p.dur / L2.length, li = Math.min(L2.length - 1, Math.floor(P.t / per)), nxt = L2[li + 1];
    line = `<span class="ly on">${esc(L2[li])}</span>${nxt ? `<span class="ly">${esc(nxt)}</span>` : ''}`; }
  else if (p.k === 'word' && P.t < 10) line = `<span class="vs">${esc(p.verse)}</span>`;
  else { const Ls = p.lines, off = p.k === 'word' ? 10 : 0, per = (p.dur - off) / Ls.length; line = esc(Ls[Math.min(Ls.length - 1, Math.max(0, Math.floor((P.t - off) / per)))]); }
  $('#wh-line').innerHTML = line; syncBar(); }

// ---------------- attendance streak (free 달란트 only)
async function attend() { enter.done = true; const k = kstNow(), day = `${k.getUTCFullYear()}-${k.getUTCMonth() + 1}-${k.getUTCDate()}`; const a = JSON.parse(localStorage.getItem('wh_att') || '[]');
  if (a.includes(day)) return; a.push(day); localStorage.setItem('wh_att', JSON.stringify(a.slice(-60))); const d = await window.W?.earn?.('service').catch(() => null);
  G().toast(`예배 출석 ${streak()}일째${d && d.granted ? ` · 달란트 +${d.granted}` : ''}`); G().refreshHud?.(); }
export function streak() { const a = new Set(JSON.parse(localStorage.getItem('wh_att') || '[]')); let n = 0; for (let i = 0; i < 60; i++) { const k = kstNow(Date.now() - i * 864e5), d = `${k.getUTCFullYear()}-${k.getUTCMonth() + 1}-${k.getUTCDate()}`; if (a.has(d)) n++; else if (i > 0) break; } return n; }

// ---------------- reminders (in-game toast; optional browser Notification)
let ntLast = 0; const notified = new Set();
function notifyList() { try { return JSON.parse(localStorage.getItem('wh_notify') || '[]'); } catch { return []; } }
function tickNotify() { const now = Date.now(); if (now - ntLast < 20e3) return; ntLast = now; const on = notifyList(); if (!on.length) return;
  for (const o of occurrences(now)) { if (!on.includes(o.e.id)) continue; for (const [lead, msg] of [[10, '10분 뒤 시작해요'], [0, '지금 시작해요']]) { const at = o.st - lead * 60e3, id = o.e.id + o.st + lead; if (now >= at && now - at < 90e3 && !notified.has(id)) { notified.add(id); const t = `${o.e.name} · ${msg}`; G()?.toast?.(t); try { if (Notification?.permission === 'granted' && document.hidden) new Notification('마실채플', { body: t, icon: 'assets/icon-192.png' }); } catch { } } } } }
setInterval(() => { if (!open && window.G?.S) tickNotify(); }, 30e3);

// ---------------- 안내 sheet: 시간표 / 섬기는 사람들 / 프로그램 / 공동체 / 쉼터
const TABS = [['time', '시간표'], ['staff', '섬기는 사람들'], ['prog', '프로그램'], ['comm', '공동체'], ['rest', '쉼터']];
function sheet(tab) { const sh = $('#wh-sheet'); if (!tab) { sh.classList.remove('show'); return; } sh.classList.add('show');
  $('#wh-tabs').innerHTML = TABS.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join(''); $('#wh-tabs').querySelectorAll('button').forEach(b => b.onclick = () => sheet(b.dataset.t));
  const B = $('#wh-body'); B.innerHTML = renderTab(tab); B.scrollTop = 0; bindTab(tab, B); }
export function timetableHtml() { const on = notifyList(), now = Date.now();
  return `<div class="wh-tt">${occurrences(now).map(o => `<div class="wh-row"><div><b>${esc(o.e.name)}</b><small>${o.e.days.length > 1 ? '월–토' : '일월화수목금토'[o.e.days[0]] + '요일'} ${String(o.e.h).padStart(2, '0')}:${String(o.e.m).padStart(2, '0')} · ${o.e.dur}분</small></div><span class="wh-cd ${o.live ? 'live' : ''}">${o.live ? '지금 진행 중' : fmtLeft(o.st - now) + ' 후'}</span><button class="wh-nt ${on.includes(o.e.id) ? 'on' : ''}" data-n="${o.e.id}" aria-pressed="${on.includes(o.e.id)}">${on.includes(o.e.id) ? '알림 켜짐' : '알림'}</button></div>`).join('')}</div><p class="wh-note">시간은 한국 시간 기준이에요. 알림은 이 화면이 열려 있을 때 알려 드려요(브라우저 알림을 허용하면 다른 탭에 있어도 알려요).</p>`; }
function renderTab(t) { const g = G();
  if (t === 'time') return timetableHtml() + `<div class="wh-row2"><button class="wh-go" data-go="dawn">새벽기도 장면으로</button><button class="wh-go" data-go="service">본당 예배로</button></div>`;
  if (t === 'staff') return `<div class="wh-staff">${STAFF.map(x => `<div class="wh-row"><div><b>${esc(x.role)}</b><small>${esc(x.name)} · ${esc(x.duty)}</small></div><span class="wh-tag">${x.holder === 'npc' ? '안내 캐릭터' : '성도'}</span></div>`).join('')}</div><p class="wh-note">섬김 역할은 앞으로 실제 성도가 맡을 수 있도록 준비되어 있어요. 역할자는 운영진 승인 후 지정되고, 신고 · 차단 · 역할 해제로 관리돼요.</p>`;
  if (t === 'prog') { const ev = yearEvents(); return `<div class="wh-prog">${[['bible', '성경공부', '오늘의 말씀 읽기와 묵상 질문'], ['cell', '셀모임', `${myCell()} · 금요일 21:00 온라인`], ['praise', '찬양집회', '본당에서 찬양만 이어서 불러요'], ['newbie', '새가족 환영', newbieStep()], ['serve', '봉사활동', '안내 · 찬양팀 · 주일학교 보조 지원'], ['event', '교회 행사', ev[0] ? `다음: ${ev[0][0]} · ${ev[0][1]}일 후` : '']].map(([k, n, d]) => `<button class="wh-card" data-p="${k}"><b>${n}</b><small>${esc(d)}</small></button>`).join('')}</div>`; }
  if (t === 'comm') { const list = [...peers.values()]; const pc = pil.filter(Boolean).length;
    return `<div class="wh-comm"><div class="wh-stat"><div><b>${streak()}</b><small>연속 출석(일)</small></div><div><b>${list.length + 1}</b><small>함께 있는 성도</small></div><div><b>${pc}</b><small>순례자</small></div></div>
    <h4>지금 함께 있는 성도</h4>${list.length ? list.map(q => `<div class="wh-row"><div><b>${esc(q.name)}</b><small>${q.st === 'pray' ? '기도 중' : q.st === 'sing' ? '찬양 중' : '앉아 있어요'}</small></div><button data-g="${esc(q.id)}">인사하기</button><button class="alt" data-r="${esc(q.id)}">신고 · 차단</button></div>`).join('') : '<p class="wh-note">지금은 순례자들과 함께 예배하고 있어요. 친구를 초대해 보세요.</p>'}
    <h4>중보기도</h4><div id="wh-pr"><p class="wh-note">불러오는 중…</p></div><div class="wh-row2"><button class="wh-go" data-c="post">기도제목 올리기</button><button class="wh-go" data-c="chat">교제 채팅</button></div>
    <h4>나의 셀</h4><p class="wh-note">${esc(myCell())} · 셀리더 서나눔 · 금요일 21:00</p></div>`; }
  if (t === 'rest') return `<div class="wh-prog">${SPOTS.map(x => `<button class="wh-card" data-s="${x.id}"><b>${x.n}</b><small>${x.d}</small></button>`).join('')}</div>`;
  return ''; }
function bindTab(t, B) { const g = G();
  B.querySelectorAll('[data-n]').forEach(b => b.onclick = async () => { const id = b.dataset.n; let on = notifyList(); on = on.includes(id) ? on.filter(x => x !== id) : [...on, id]; localStorage.setItem('wh_notify', JSON.stringify(on));
    if (on.includes(id) && window.Notification && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch { } } sheet('time'); });
  B.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { sheet(null); const m = b.dataset.go; close(); enter({ mode: m }); });
  B.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const q = peers.get(b.dataset.g); if (!q) return; g.net?.send('wh', { k: 'g', to: q.id, n: g.S.name }); g.toast(`${q.name}님에게 인사했어요`); b.disabled = true; });
  B.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { const q = peers.get(b.dataset.r); q && window.Safe?.menu?.(q.id, q.name, ''); });
  B.querySelectorAll('[data-p]').forEach(b => b.onclick = () => program(b.dataset.p));
  B.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sheet(null); spot(b.dataset.s); });
  B.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { if (b.dataset.c === 'post') { close(); g.openBoard?.(); } else { close(); setTimeout(() => $('#chatin')?.focus(), 200); } });
  if (t === 'comm') loadPrayers(); }
async function loadPrayers() { const box = $('#wh-pr'), g = G(); const d = g.V?.current?.(); if (!box) return;
  try { const r = await g.net.prayers(d.cd); const L2 = r.list.filter(x => x.is_public).slice(0, 6); box.innerHTML = L2.length ? L2.map(p => `<div class="wh-row"><div><b>${esc(window.Safe ? window.Safe.clean(p.name) : p.name)}</b><small>${esc(window.Safe ? window.Safe.clean(p.body) : p.body).slice(0, 60)}</small></div><span class="wh-tag">${p.amen_count || 0}명 기도</span><button data-pw="${p.id}">함께 기도</button></div>`).join('') : '<p class="wh-note">아직 기도제목이 없어요. 첫 기도제목을 올려 보세요.</p>';
    box.querySelectorAll('[data-pw]').forEach(b => b.onclick = async () => { b.disabled = true; try { const n = await g.net.prayWith(b.dataset.pw); b.previousElementSibling.textContent = `${n}명 기도`; b.textContent = '기도했어요'; } catch { b.textContent = '잠시 후 다시'; } }); }
  catch { box.innerHTML = '<p class="wh-note">오프라인이라 기도제목을 불러올 수 없어요.</p>'; } }
function myCell() { const n = ['사랑셀', '소망셀', '믿음셀', '은혜셀', '평화셀']; return n[hash(G().net?.secret?.() || 'x') % n.length]; }
function newbieStep() { const v = JSON.parse(localStorage.getItem('wh_att') || '[]').length; return v >= 4 ? '4주 새가족반 수료 · 셀 배정 완료' : `새가족반 ${Math.min(4, v)}/4주 · 출석하면 다음 단계로`; }
function yearEvents() { const now = Date.now(), y = kstNow().getUTCFullYear(); const E = [['추수감사주일', Date.UTC(2026, 10, 15)], ['성탄 예배', Date.UTC(y, 11, 25)], ['송구영신 예배', Date.UTC(y, 11, 31, 22)], ['특별새벽기도', Date.UTC(2027, 0, 4)], ['부활절 예배', Date.UTC(2027, 2, 28)], ['맥추감사주일', Date.UTC(2027, 6, 4)], ['여름성경학교 · 수련회', Date.UTC(2027, 6, 26)]];
  return E.map(([n, t]) => [n, Math.ceil((t - KST - now) / 864e5)]).filter(x => x[1] >= 0).sort((a, b) => a[1] - b[1]); }
function program(k) { const g = G();
  if (k === 'praise') { sheet(null); const P = phaseAt(); g.toast(P.p.k === 'song' ? '지금 찬양 순서예요. 찬양 버튼을 눌러 함께 불러요' : `다음 찬양까지 ${Math.ceil(untilSong())}초`); return; }
  if (k === 'bible') { close(); (window.P2?.openBible || g.openVerse || (() => $('#btn-p2bible')?.click() || $('#btn-verse')?.click()))(); return; }
  const T = { cell: [`${myCell()} 셀모임`, '매주 금요일 21:00, 셀리더 서나눔과 함께 근황 나눔 → 말씀 한 구절 → 서로를 위한 기도 순서로 진행해요. 공동체 탭의 중보기도도 함께 기억해요.'],
    newbie: ['새가족 환영', `등록 → 환영 인사 → 4주 새가족반 → 셀 배정 순서예요. 지금: ${newbieStep()}. 본당 예배에 2분 이상 함께하면 한 주 출석으로 기록돼요.`],
    serve: ['봉사활동', '안내위원 · 찬양팀 · 주일학교 보조 섬김은 운영진 확인 후 역할이 지정돼요. 지금은 예배에 꾸준히 출석하며 이웃에게 인사해 주세요.'],
    event: ['교회 행사', yearEvents().map(([n, d]) => `${n} · ${d}일 후`).join('\n')] }[k];
  if (T) g.dialog?.(T[0], T[1], [['확인', () => { }]]); }
function untilSong() { const P = phaseAt(); let s2 = P.left; for (let j = 1; j < PH.length; j++) { const p = PH[(P.i + j) % PH.length]; if (p.k === 'song') return s2; s2 += p.dur; } return s2; }

// ---------------- healing spots (calm seated scenes)
const SPOTS = [{ id: 'roof', n: '옥상 기도정원', d: '도시 노을을 보며 묵상기도', img: 'roof', at: [790, 610], face: 'N' }, { id: 'tree', n: '안뜰 큰 나무 벤치', d: '나무 그늘에서 말씀 듣기', img: 'tree', at: [545, 590], face: 'S' },
  { id: 'ivy', n: '담쟁이 벽돌 교회', d: '작은 예배당 앞에서 피아노 찬송', img: 'ivy', at: [600, 730], face: 'S' }, { id: 'park', n: '동네 작은 공원', d: '연못가 벤치에서 설교 듣기', img: 'park', at: [640, 680], face: 'S' }];
let spotEl = null;
function spot(id) { const S0 = SPOTS.find(x => x.id === id); if (!S0) return; close(); spotEl?.remove(); const d = spotEl = document.createElement('div'); d.id = 'whspot';
  d.innerHTML = `<canvas></canvas><div class="wh-top"><div class="wh-title"><b>${S0.n}</b><small>잠시 쉬어 가요</small></div><div class="wh-tbtns"><button data-x>나가기</button></div></div><div class="wh-sub"><small id="sp-who">쉼터</small><p id="sp-line">아래에서 활동을 골라 보세요.</p></div><div class="wh-bar"><button data-a="med"><span>묵상기도</span></button><button data-a="word"><span>말씀 듣기</span></button><button data-a="piano"><span>피아노 찬송</span></button><button data-a="sermon"><span>설교</span></button></div>`;
  document.body.append(d); window.__whOpen = true; const c = d.querySelector('canvas'), x = c.getContext('2d'), im = new Image(); im.src = `assets/worship/${S0.img}.webp`; let on = true, tm = null;
  const fit = () => { const k = Math.min(devicePixelRatio || 1, 2); c.width = innerWidth * k; c.height = innerHeight * k; c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px'; return k; };
  let kk = fit(); const rs = () => { kk = fit(); }; addEventListener('resize', rs);
  const draw = t => { if (!on) return; requestAnimationFrame(draw); const W = innerWidth, H = innerHeight, sc = Math.max(W / BW, H / BH), oxx = Math.min(0, Math.max(W - BW * sc, W / 2 - S0.at[0] * sc)), oyy = (H - BH * sc) / 2;
    x.setTransform(kk * sc, 0, 0, kk * sc, kk * oxx, kk * oyy); if (im.complete && im.naturalWidth) x.drawImage(im, 0, 0, BW, BH);
    const e = sprite(G().player.av, S0.face); if (e) { const h = 170, f = h / SRC_H, br = Math.sin(t / 900) * 1.2; x.drawImage(e.cv, S0.at[0] - e.ax * f, S0.at[1] - e.ay * f + br, e.cv.width * f, e.cv.height * f); } };
  requestAnimationFrame(draw);
  const say = (who, line) => { d.querySelector('#sp-who').textContent = who; d.querySelector('#sp-line').textContent = line; };
  const speak = t => { try { const u = new SpeechSynthesisUtterance(t); u.lang = 'ko-KR'; u.rate = .92; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { } };
  const quit = () => { on = false; clearInterval(tm); try { speechSynthesis.cancel(); window.Aud?.el?.pause?.(); } catch { } removeEventListener('resize', rs); d.remove(); spotEl = null; window.__whOpen = false; };
  d.querySelector('[data-x]').onclick = quit;
  d.querySelectorAll('.wh-bar button').forEach(b => b.onclick = () => { clearInterval(tm); d.querySelectorAll('.wh-bar button').forEach(z => z.classList.toggle('on', z === b)); const a = b.dataset.a;
    if (a === 'med') { const steps = ['숨을 천천히 들이마셔요', '잠시 멈추고 주님을 생각해요', '천천히 내쉬며 걱정을 내려놓아요', '오늘 감사한 일 하나를 떠올려요']; let i = 0; say('묵상기도 · 3분', steps[0]); tm = setInterval(() => say('묵상기도 · 3분', steps[++i % steps.length]), 6000); setTimeout(() => clearInterval(tm), 180e3); }
    if (a === 'word') { const v = PH[2].verse; say('말씀 듣기', v); speak(v); }
    if (a === 'piano') { say('피아노 찬송', '잔잔한 찬송이 흘러요'); try { window.Aud?.music?.('stanne'); } catch { } }
    if (a === 'sermon') { let i = 0; const Ls = PH[2].lines; say('설교 · 김은혜 목사', Ls[0]); speak(Ls[0]); tm = setInterval(() => { if (++i >= Ls.length) return clearInterval(tm); say('설교 · 김은혜 목사', Ls[i]); speak(Ls[i]); }, 7000); } }); }

// ---------------- soft city ambience (WebAudio filtered noise; respects the game's mute)
function startAmbience() { const A = window.Aud; if (!A?.ctx || A.muted) return; try { const c = A.ctx, len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let l = 0;
  for (let i = 0; i < len; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(.05, c.currentTime, 1.5);
  src.connect(lp); lp.connect(g); g.connect(A.out); src.start(); audio = { src, g };
  const w = weatherNow(); if (w === 'rain' || w === 'rainnight') { const s2 = c.createBufferSource(); s2.buffer = buf; s2.loop = true; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800; const g2 = c.createGain(); g2.gain.value = .025; s2.connect(hp); hp.connect(g2); g2.connect(A.out); s2.start(); audio.s2 = s2; } } catch { } }
function stopAmbience() { if (!audio) return; try { const c = window.Aud.ctx; audio.g.gain.setTargetAtTime(0, c.currentTime, .3); const a = audio; setTimeout(() => { try { a.src.stop(); a.s2?.stop(); } catch { } }, 900); } catch { } audio = null; }

// ---------------- QA hooks: simulated clients + fps
export const WH = { enter, close, get open() { return open; }, get fps() { return fps; }, seats: () => L?.seats.length || 0, get peers() { return peers; }, phaseAt, occurrences, setWeather: w => { weather = w; bgT = null; }, act, sheet, spot,
  simulate(n = 20) { for (let i = 0; i < n; i++) { const id = 'sim' + (simN++); onNet({ id, k: 'p', s: (hash(id) % (L?.seats.length || 100)), n: '테스트' + i, av: pilgrimAv(rnd(hash(id))), st: i % 3 ? 'sing' : 'pray', hd: i % 2 }); }
    clearInterval(WH._sim); WH._sim = setInterval(() => { for (const [id] of peers) if (id.startsWith('sim')) { if (Math.random() < .08) onNet({ id, k: 'a', a: 'amen' }); else onNet({ id, k: 'p', s: peers.get(id).seat, n: peers.get(id).name, av: peers.get(id).av, st: peers.get(id).st, hd: 0 }); } }, 1000); },
  onNet, get me() { return me; } };
window.WH = WH;
function hook() { const g = G(); if (!g?.net) return setTimeout(hook, 500); g.net.on('wh', p => onNet(p)); }
hook();
function wire() { const g = G(), b = document.getElementById('btn-wh'); if (!g?.V || !b) return setTimeout(wire, 500);
  b.onclick = () => enter();
  const op = g.V.openPrayers.bind(g.V); g.V.openPrayers = async (...a) => { const r = op(...a); const L0 = document.getElementById('blist'); let t = document.getElementById('wh-ttb');
    if (L0 && !t) { t = document.createElement('div'); t.id = 'wh-ttb'; L0.parentElement.insertBefore(t, L0); }
    if (t) { const o = occurrences(), live = o.find(x => x.live), nx = o.filter(x => !x.live).slice(0, 2); t.innerHTML = `<b>예배 시간표</b>${live ? `<span class="live">지금 ${esc(live.e.name)}</span>` : ''}${nx.map(x => `<span>${esc(x.e.name)} ${fmtWhen(x.st)} · ${fmtLeft(x.st - Date.now())} 후</span>`).join('')}<button id="wh-ttgo">본당 입장</button>`;
      t.querySelector('#wh-ttgo').onclick = () => { g.closeModal?.(); enter(); }; } return r; }; }
wire();

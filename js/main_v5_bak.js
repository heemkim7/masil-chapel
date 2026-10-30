// Main: scenes, input, loop, UI glue
import { loadAll, Sprites, IMG } from './assets.js';
import { World, Char, rr } from './world.js';
import { Interior } from './interior.js';
import * as St from './state.js';

const $ = s => document.querySelector(s);
const cv = $('#game'), ctx = cv.getContext('2d');
let cfg, atlas, SP, world, inside, S, player, scene = 'field', cam = { x: 0, y: 0, z: 1 };
const fieldNpcs = [], wanderers = [], inNpcs = [], pickups = [];
const keys = {}; let joy = { x: 0, y: 0, on: false }, clickTarget = null, sitting = null, modal = null, decorSel = null, decorFlip = false, ghost = null;
let worship = null; const board = new St.Board('chapel_v4_board', St.BOARD_SEED);
window.__errors = [];

// ---------- boot ----------
(async () => {
  cfg = await (await fetch('config.json')).json();
  atlas = await loadAll(cfg, p => $('#loadbar').style.width = (p * 100 | 0) + '%');
  SP = new Sprites(atlas); world = new World(cfg); inside = new Interior(cfg);
  $('#loading').style.display = 'none'; showTitle();
  requestAnimationFrame(loop); window.__ready = true;
})().catch(e => { console.error(e); });

// ---------- title / character select ----------
let selOutfit = 'basic', titlePrev = [];
function showTitle() {
  $('#title').style.display = 'flex'; $('#continue').disabled = !St.hasSave();
  const box = $('#outfits'); box.innerHTML = '';
  const names = { basic: '기본 원피스', choir: '성가대 가운', mint: '민트 후디' };
  titlePrev = [];
  for (const o of ['basic', 'choir', 'mint']) {
    const d = document.createElement('button'); d.className = 'ocard' + (o === selOutfit ? ' on' : ''); d.dataset.o = o;
    const c = document.createElement('canvas'); const pr = Math.min(3, devicePixelRatio || 1); c.width = 120 * pr; c.height = 150 * pr; c.dataset.pr = pr; d.append(c, Object.assign(document.createElement('span'), { textContent: names[o] }));
    d.onclick = () => { selOutfit = o; box.querySelectorAll('.ocard').forEach(b => b.classList.toggle('on', b.dataset.o === o)); };
    box.append(d); titlePrev.push({ c, ch: new Char(SP, 'player', o, 60, 140, { drawH: 115, cfg }), o });
  }
}
function drawTitlePreviews(dt) { for (const p of titlePrev) { const g = p.c.getContext('2d'), pr = +p.c.dataset.pr || 1; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, p.c.width, p.c.height); g.setTransform(pr, 0, 0, pr, 0, 0); g.imageSmoothingQuality = 'high'; p.ch.update(dt);
  const sel = p.o === selOutfit; p.ch.speedNow = sel ? 1 : 0; if (sel) { p.ch.dist += dt * 90; p.ch.face = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'][Math.floor(p.ch.t / 1.2) % 8]; } else p.ch.face = 'S'; p.ch.draw(g); } }
$('#newgame').onclick = () => { const n = $('#pname').value.trim() || '새싹'; St.wipe(); startGame(St.newSave(n, selOutfit)); };
$('#continue').onclick = () => { const s = St.load(); if (s) startGame(s); };

function startGame(save) {
  S = save; S.decorInv ||= {}; if (!S.started) { Object.assign(S.decorInv, cfg.startDecor); S.started = 1; }
  $('#title').style.display = 'none'; $('#hud').style.display = 'block'; S.mode = null; document.body.classList.remove('decor', 'worship');
  player = new Char(SP, 'player', S.outfit, 0, 0, { name: S.name, tagColor: '#ffe38a', equip: S.equip, cfg });
  fieldNpcs.length = wanderers.length = inNpcs.length = 0;
  for (const n of cfg.npcs) { const c = new Char(SP, n.char, n.outfit, n.x, n.y, { name: n.name, tagColor: '#c8f7d6', cfg, drawH: n.char === 'lamb' ? 125 : 150 }); c.id = n.id; c.home = { x: n.x, y: n.y }; fieldNpcs.push(c); }
  cfg.wanderers.forEach((w, i) => { const p = world.randomPoint(); const c = new Char(SP, 'player', w.outfit, p.x, p.y, { name: w.name, tagColor: '#d7e6ff', cfg, drawH: 145 }); c.ai = { t: Math.random() * 3, tgt: null, chat: 3 + Math.random() * 6 }; wanderers.push(c); });
  for (const n of cfg.interiorNpcs) { let x = n.x, y = n.y; if (n.pew != null) { const r = inside.pewRect(n.pew); x = r.cx + (n.id === 'visit1' ? -60 : 70); y = r.cy - 4; }
    const c = new Char(SP, n.char, n.outfit, x, y, { name: n.name, tagColor: n.sit ? '#d7e6ff' : '#c8f7d6', cfg }); c.id = n.id; c.sit = !!n.sit; inNpcs.push(c); }
  if (S.scene === 'inside') enterChapel(true); else { scene = 'field'; const p = S.pos || { x: cfg.chapel.door.x, y: cfg.chapel.door.y + 120 }; player.x = p.x; player.y = p.y; }
  spawnPickups(); snapCam(); refreshHud(); persist(); toast(`${S.name}님, ㅇㅇ동 마을예배당에 오신 걸 환영해요!`);
}
function persist() { S.pos = scene === 'field' ? { x: player.x | 0, y: player.y | 0 } : null; S.scene = scene; St.save(S); }
setInterval(() => S && persist(), 3000); addEventListener('pagehide', () => S && persist());

// ---------- quest ----------
function spawnPickups() {
  pickups.length = 0; if (S.quest.stage !== 2) return;
  let seed = S.quest.round * 977; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < cfg.quest.needStars; i++) { if (S.quest.got.includes(i)) continue; let p; do p = world.randomPoint(rnd); while (Math.hypot(p.x - cfg.chapel.x, p.y - cfg.chapel.y) < 300);
    pickups.push({ i, x: p.x, y: p.y, img: i % 2 ? 'item_0_2.png' : 'item_0_1.png' }); }
}
function questLine() { const q = S.quest; let t = St.QUEST_TEXT[Math.min(q.stage, 4)];
  if (q.stage === 1) t += ` ${['haeun', 'lamb'].filter(k => q.talked[k]).length}/2`;
  if (q.stage === 2) t += ` ${q.got.length}/${cfg.quest.needStars}`; return t; }
const QTEXT2 = ['예배당 안 목사님께 인사하기', null, null, '예배당 안 목사님께 별 전해드리기', '예배에 참여하기 (목사님께 말 걸기)', '완료! 목사님께 새 임무 받기'];
function talkTo(npc) {
  const q = S.quest, id = npc.id;
  if (id === 'pastor') {
    if (q.stage === 0) { dialog('목사님', '어서 와요! 우리 마을 친구 하은이와 양이에게 먼저 인사해 볼래요? 바깥 마당에 있어요.', [['네! 다녀올게요', () => { q.stage = 1; }]]); npc.doEmote('wave'); }
    else if (q.stage === 1) dialog('목사님', '하은이와 양이를 만나고 오세요 😊');
    else if (q.stage === 2) dialog('목사님', `섬 곳곳에 축복의 별과 꽃잎 ${cfg.quest.needStars}개가 숨겨져 있대요. (${q.got.length}/${cfg.quest.needStars})`);
    else if (q.stage === 3) { npc.doEmote('pray'); dialog('목사님', `와! 별을 모두 모아왔군요. 고마워요! 헌금 코인 ${cfg.quest.rewardCoins}개를 드릴게요. 이제 예배에 함께해요!`, [['감사합니다!', () => { S.coins += cfg.quest.rewardCoins; addXp(cfg.quest.rewardXp); q.stage = 4; coinFx(); }]]); }
    else if (q.stage === 4) dialog('목사님', '곧 찬양 예배가 시작돼요. 함께 찬양할까요? 박자에 맞춰 ♪ 버튼(스페이스)을 눌러요.', [['예배 참여하기 🙏', startWorship], ['조금 있다가', null]]);
    else dialog('목사님', '오늘도 함께해서 기뻐요. 또 별을 찾아 줄래요? 아니면 예배를 한 번 더 드릴까요?', [['새 별 찾기', () => { q.stage = 2; q.got = []; q.round++; spawnPickups(); }], ['예배 드리기', startWorship], ['괜찮아요', null]]);
  } else if (id === 'haeun' || id === 'lamb') {
    const L = id === 'haeun' ? ['하은', '안녕! 나는 성가대 하은이야 🎵 예배당 안에서 찬양 연습하면 재밌어!'] : ['양이', '음메~ 나는 양이! 별을 찾으면 목사님이 좋아하실 거야 ⭐'];
    npc.doEmote(id === 'haeun' ? 'happy' : 'jump');
    dialog(L[0], L[1], [['반가워!', () => { if (q.stage === 1) { q.talked[id] = 1; if (q.talked.haeun && q.talked.lamb) { q.stage = 2; spawnPickups(); toast('⭐ 새 임무: 숨겨진 별 찾기!'); } } }]]);
  } else if (npc.sit) { npc.say(['평안하세요~', '같이 예배드려요', '오늘 찬양 기대돼요'][Math.random() * 3 | 0]); }
  refreshHud();
}
function addXp(n) { const before = St.levelInfo(cfg, S.xp).lv; S.xp = Math.max(0, S.xp + n); const after = St.levelInfo(cfg, S.xp).lv; if (after > before) toast(`🎉 예배당 레벨 업! Lv.${after}`); refreshHud(); }

// ---------- scenes ----------
function enterChapel(silent) { scene = 'inside'; player.x = cfg.interior.spawn.x; player.y = cfg.interior.spawn.y; player.face = 'N'; sitting = null; snapCam(); if (!silent) toast('⛪ 예배당 안으로 들어왔어요'); persist(); refreshHud(); }
function exitChapel() { scene = 'field'; player.x = cfg.chapel.door.x; player.y = cfg.chapel.door.y + 80; player.face = 'S'; sitting = null; snapCam(); persist(); refreshHud(); }
const cur = () => scene === 'field' ? world : inside;
const npcList = () => scene === 'field' ? fieldNpcs : inNpcs;
function nearest() {
  let best = null, bd = 140;
  for (const n of npcList()) { const d = Math.hypot(n.x - player.x, n.y - player.y); if (d < bd) { bd = d; best = { type: 'npc', n }; } }
  if (scene === 'field') { const D = cfg.chapel.door; if (Math.hypot(D.x - player.x, D.y - player.y) < 130) best = { type: 'door' }; }
  else { const I = cfg.interior, chk = (p, type, r = 130) => { if (Math.hypot(p.x - player.x, p.y - player.y) < r) best = { type }; };
    chk(I.offering, 'offering', 120); chk(I.board, 'board', 150); chk(I.door, 'exit', 110);
    I.pews.forEach((p, i) => { const r = inside.pewRect(i); if (Math.abs(player.x - r.cx) < r.w / 2 && player.y > r.y + r.h - 10 && player.y < r.y + r.h + 70 && !best) best = { type: 'pew', i }; });
    if (!best || best.type === 'pew') for (const n of inNpcs) if (Math.hypot(n.x - player.x, n.y - player.y) < 140) best = { type: 'npc', n }; }
  return best;
}
const ACTLBL = { npc: '대화', door: '들어가기', exit: '나가기', offering: '헌금하기', board: '게시판', pew: '앉기' };
function interact() {
  if (modal || !S) return; if (sitting) { standUp(); return; }
  const t = nearest(); if (!t) return;
  if (t.type === 'npc') { t.n.face = facingTo(t.n, player); talkTo(t.n); }
  else if (t.type === 'door') enterChapel(); else if (t.type === 'exit') exitChapel();
  else if (t.type === 'offering') openGacha(); else if (t.type === 'board') openBoard(); else if (t.type === 'pew') sitOn(t.i);
}
function facingTo(a, b) { const ang = Math.atan2(b.y - a.y, b.x - a.x); return ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8]; }
function sitOn(i) { const r = inside.pewRect(i); sitting = { i, back: { x: player.x, y: player.y } }; player.x = Math.max(r.x + 40, Math.min(r.x + r.w - 40, player.x)); player.y = r.cy - 4; player.face = 'N'; player.vx = player.vy = 0; toast('의자에 앉았어요. 목사님께 말 걸면 예배가 시작돼요 (다시 누르면 일어나기)'); }
function standUp() { if (!sitting) return; player.x = sitting.back.x; player.y = sitting.back.y; sitting = null; }

// ---------- worship mini-game ----------
function startWorship() {
  closeModal(); if (scene !== 'inside') enterChapel(true);
  if (!sitting) { const r = inside.pewRect(0); sitting = { i: 0, back: { x: r.cx, y: r.y + r.h + 40 } }; player.x = r.cx + 10; player.y = r.cy - 4; player.face = 'N'; }
  const W = cfg.worship, beat = 60 / W.bpm; const notes = []; let t = 2.2;
  for (let i = 0; i < W.notes; i++) { notes.push({ t, hit: null }); t += beat * (i % 4 === 3 ? 2 : 1); }
  worship = { t: 0, notes, end: t + 1.2, hits: 0, perfect: 0, combo: 0, fx: [], line: 0 };
  document.body.classList.add('worship'); $('#worship').style.display = 'block'; for (const n of inNpcs) { n.doEmote(n.id === 'pastor' ? 'wave' : 'pray'); }
}
function worshipTap() { if (!worship) return; const w = worship; let best = null;
  for (const n of w.notes) if (!n.hit && Math.abs(n.t - w.t) < .22) { if (!best || Math.abs(n.t - w.t) < Math.abs(best.t - w.t)) best = n; }
  if (!best) { w.combo = 0; w.fx.push({ txt: '…', t: 0 }); return; }
  const e = Math.abs(best.t - w.t); best.hit = e < .09 ? 'p' : 'g'; w.hits++; if (best.hit === 'p') w.perfect++; w.combo++;
  w.fx.push({ txt: best.hit === 'p' ? '완벽해요! ✨' : '좋아요 🎵', t: 0 }); }
function updateWorship(dt) {
  const w = worship; w.t += dt; for (const n of w.notes) if (!n.hit && w.t - n.t > .22) { n.hit = 'miss'; w.combo = 0; }
  const L = cfg.worship.hymn; const li = Math.min(L.length - 1, Math.floor(w.t / (w.end / L.length))); if (li !== w.line) { w.line = li; const n = inNpcs[1 + (li % 2)]; n && n.say('🎵 ' + L[li], 2.5); }
  if (w.t > w.end) finishWorship();
}
function finishWorship() { const w = worship; worship = null; document.body.classList.remove('worship'); $('#worship').style.display = 'none';
  const coins = w.hits * cfg.worship.coinPerHit + w.perfect * 4, xp = w.hits * cfg.worship.xpPerHit; S.coins += coins; addXp(xp); S.worshipBest = Math.max(S.worshipBest || 0, w.hits);
  if (S.quest.stage === 4) S.quest.stage = 5; for (const n of inNpcs) n.doEmote(n.char === 'pastor' ? 'pray' : 'jump');
  dialog('찬양 예배 끝!', `${w.hits}/${w.notes.length} 박자 성공 (완벽 ${w.perfect})\n헌금 코인 +${coins} · 예배당 경험치 +${xp}`, [['아멘 🙏', null]]); coinFx(); refreshHud(); persist(); }
function drawWorship() { const c = $('#wcv'), g = c.getContext('2d'), w = worship; const W = c.width = c.clientWidth * devicePixelRatio, H = c.height = c.clientHeight * devicePixelRatio; g.scale(devicePixelRatio, devicePixelRatio);
  const cw = c.clientWidth, ch = c.clientHeight, hx = 70, cy = ch / 2, spd = 260;
  g.fillStyle = 'rgba(255,250,240,.92)'; rr(g, 0, 0, cw, ch, 20); g.fill();
  g.strokeStyle = '#e8d6f5'; g.lineWidth = 3; g.beginPath(); g.moveTo(20, cy); g.lineTo(cw - 20, cy); g.stroke();
  g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(hx, cy, 30, 0, 7); g.fill(); g.strokeStyle = '#e9b949'; g.lineWidth = 4; g.stroke();
  g.font = '28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const n of w.notes) { if (n.hit && n.hit !== 'miss') continue; const x = hx + (n.t - w.t) * spd; if (x < -20 || x > cw + 20) continue; g.globalAlpha = n.hit === 'miss' ? .3 : 1; g.fillText('🎵', x, cy); g.globalAlpha = 1; }
  g.fillStyle = '#4a3f66'; g.font = '700 18px Pretendard,sans-serif'; g.textAlign = 'left'; g.fillText(`🎶 ${cfg.worship.hymn[w.line]}`, 20, 26); g.textAlign = 'right'; g.fillText(`성공 ${w.hits} · 콤보 ${w.combo}`, cw - 20, 26);
  w.fx = w.fx.filter(f => (f.t += 1 / 60) < .8); for (const f of w.fx) { g.globalAlpha = 1 - f.t / .8; g.textAlign = 'center'; g.fillStyle = '#c0568a'; g.fillText(f.txt, hx + 60, cy - 40 - f.t * 30); } g.globalAlpha = 1; }

// ---------- gacha (헌금 뽑기) ----------
function openGacha() { openModal('#gacha'); $('#gres').innerHTML = `<img src="assets/item_1_1.png" class="capsule"><p>헌금 ${cfg.gacha.cost}🪙으로 꾸미기 아이템을 뽑아요</p>`; $('#gcost').textContent = cfg.gacha.cost; }
function doRoll() { const r = St.rollGacha(cfg, S); if (r.err) { toast(r.err + ' — 별 찾기나 예배로 코인을 모아요'); return; }
  const it = r.item, img = it.kind === 'decor' ? cfg.decor.find(d => d.id === it.id).img : cfg.acc[it.id].img, cls = { 일반: 'r1', 희귀: 'r2', 전설: 'r3' }[it.rar];
  $('#gres').innerHTML = `<img src="assets/item_1_1.png" class="capsule shake">`;
  setTimeout(() => { $('#gres').innerHTML = `<div class="rar ${cls}">${it.rar}</div><img src="assets/${img}" class="prize pop"><h3>${it.name}</h3><p>${r.dup ? `이미 있어요! ${cfg.gacha.dupRefund}🪙 돌려받았어요` : it.kind === 'decor' ? '배치 가방에 추가됐어요 (🪑 배치)' : '꾸미기에서 착용할 수 있어요'}</p>`; refreshHud(); persist(); }, 700); }

// ---------- inventory / 꾸미기 ----------
function openInv() { openModal('#inv'); renderInv(); }
function renderInv() {
  const on = { basic: '기본 원피스', choir: '성가대 가운', mint: '민트 후디' };
  $('#inv-outfits').innerHTML = Object.entries(on).map(([k, v]) => `<button class="chip ${S.outfit === k ? 'on' : ''}" data-o="${k}">${v}</button>`).join('');
  const slots = { hat: '머리', back: '등', pet: '친구' };
  $('#inv-items').innerHTML = Object.entries(slots).map(([sl, lb]) => `<div class="slot"><b>${lb}</b>` + `<button class="item ${!S.equip[sl] ? 'on' : ''}" data-s="${sl}" data-i="">없음</button>` +
    cfg.gacha.pool.filter(p => p.slot === sl).map(p => { const own = S.inv.includes(p.id); return `<button class="item ${S.equip[sl] === p.id ? 'on' : ''}" ${own ? '' : 'disabled'} data-s="${sl}" data-i="${p.id}"><img src="assets/${cfg.acc[p.id].img}"><small>${own ? p.name : '🔒 ' + p.rar}</small></button>`; }).join('') + '</div>').join('');
  $('#inv-decor').innerHTML = cfg.decor.map(d => `<div class="dchip"><img src="assets/${d.img}">${d.name} ×${S.decorInv[d.id] || 0}</div>`).join('');
  $('#inv-outfits').querySelectorAll('button').forEach(b => b.onclick = () => { S.outfit = b.dataset.o; player.outfit = S.outfit; renderInv(); persist(); });
  $('#inv-items').querySelectorAll('button').forEach(b => b.onclick = () => { S.equip[b.dataset.s] = b.dataset.i || null; player.equip = S.equip; renderInv(); persist(); });
}

// ---------- decorating (yard + interior) ----------
const placedList = () => scene === 'field' ? S.yard : S.inside;
function decorOK(x, y) { if (scene === 'field') { const Y = cfg.yard; return ((x - Y.x) / Y.rx) ** 2 + ((y - Y.y) / Y.ry) ** 2 < 1 && world.walkable(x, y); } return inside.walkable(x, y); }
function openDecor() { if (modal) closeModal(); S.mode = 'decor'; document.body.classList.add('decor'); $('#decorbar').style.display = 'flex'; renderDecor(); toast(scene === 'field' ? '마당(점선 안)을 눌러 배치해요' : '예배당 바닥을 눌러 배치해요'); }
function renderDecor() { $('#decor-items').innerHTML = cfg.decor.map(d => `<button class="ditem ${decorSel === d.id ? 'on' : ''}" data-d="${d.id}" ${(S.decorInv[d.id] || 0) ? '' : 'disabled'}><img src="assets/${d.img}"><small>${d.name} ×${S.decorInv[d.id] || 0}</small></button>`).join('');
  $('#decor-items').querySelectorAll('button').forEach(b => b.onclick = () => { decorSel = b.dataset.d; renderDecor(); }); $('#dflip').textContent = decorFlip ? '↔ 방향: 왼쪽' : '↔ 방향: 오른쪽'; }
function placeAt(x, y) {
  const L = placedList(); const hit = L.findIndex(p => Math.hypot(p.x - x, p.y - y) < 45);
  if (hit >= 0 && !decorSel) { const p = L.splice(hit, 1)[0]; S.decorInv[p.id] = (S.decorInv[p.id] || 0) + 1; addXp(-cfg.decor.find(d => d.id === p.id).xp); toast('회수했어요'); renderDecor(); persist(); return; }
  if (!decorSel) { toast('아래에서 놓을 아이템을 골라요 (빈 선택에서 누르면 회수)'); return; }
  if (!(S.decorInv[decorSel] > 0)) return; if (!decorOK(x, y)) { toast(scene === 'field' ? '마당 안에만 놓을 수 있어요' : '여기엔 놓을 수 없어요'); return; }
  if (L.length >= cfg.yard.max) { toast('더 이상 놓을 수 없어요'); return; }
  L.push({ id: decorSel, x: x | 0, y: y | 0, flip: decorFlip }); S.decorInv[decorSel]--; addXp(cfg.decor.find(d => d.id === decorSel).xp);
  if (!S.decorInv[decorSel]) decorSel = null; renderDecor(); persist(); }
$('#dflip').onclick = () => { decorFlip = !decorFlip; const L = placedList(); if (L.length) L[L.length - 1].flip = decorFlip; renderDecor(); persist(); };
$('#dundo').onclick = () => { const L = placedList(); const p = L.pop(); if (p) { S.decorInv[p.id] = (S.decorInv[p.id] || 0) + 1; addXp(-cfg.decor.find(d => d.id === p.id).xp); renderDecor(); persist(); } };
$('#dpick').onclick = () => { decorSel = null; renderDecor(); toast('놓인 아이템을 누르면 회수돼요'); };
$('#ddone').onclick = () => { S.mode = null; document.body.classList.remove('decor'); decorSel = null; $('#decorbar').style.display = 'none'; ghost = null; };
function decorObjects() { return placedList().map(p => { const d = cfg.decor.find(q => q.id === p.id), im = IMG[d.img]; return { y: p.y, draw: g => { const h = d.h, w = h * im.width / im.height;
  g.fillStyle = 'rgba(40,60,40,.2)'; g.beginPath(); g.ellipse(p.x, p.y, w * .4, 9, 0, 0, 7); g.fill(); g.save(); g.translate(p.x, p.y); if (p.flip) g.scale(-1, 1); g.drawImage(im, -w / 2, -h * .95, w, h); g.restore(); } }; }); }

// ---------- board ----------
async function openBoard() { openModal('#board'); renderBoard(); }
async function renderBoard() { const L = await board.list(); $('#blist').innerHTML = L.map(p => `<div class="post ${p.kind}"><div><b>${esc(p.author)}</b> <small>${p.kind === 'notice' ? '📢 공지' : '🙏 기도제목'}</small></div><p>${esc(p.text)}</p><button data-id="${p.id}">🙏 함께 기도 ${p.prayers}</button></div>`).join('');
  $('#blist').querySelectorAll('button').forEach(b => b.onclick = async () => { await board.pray(b.dataset.id); renderBoard(); }); }
$('#bpost').onclick = async () => { const t = $('#btext').value.trim(); if (!t) return; await board.post(S.name, t); $('#btext').value = ''; addXp(5); renderBoard(); toast('기도제목을 올렸어요'); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- chat + emotes ----------
function chatLog(who, txt, me) { const d = document.createElement('div'); d.className = 'cl' + (me ? ' me' : ''); d.innerHTML = `<b>${esc(who)}</b> ${esc(txt)}`; const L = $('#chatlog'); L.append(d); while (L.children.length > 30) L.firstChild.remove(); L.scrollTop = 1e6; }
$('#chatform').onsubmit = e => { e.preventDefault(); const t = $('#chatin').value.trim(); if (!t) return; $('#chatin').value = ''; $('#chatin').blur(); player.say(t); chatLog(S.name, t, 1);
  const pool = scene === 'field' ? wanderers : inNpcs; const near = pool.filter(w => Math.hypot(w.x - player.x, w.y - player.y) < 600); const r = near[Math.random() * near.length | 0];
  if (r) setTimeout(() => { const a = ['반가워요 ' + S.name + '님!', '맞아요 ㅎㅎ', '좋아요 😊', '같이 가요~', '아멘 🙏'][Math.random() * 5 | 0]; r.say(a); chatLog(r.name, a); }, 900); };
function emote(e) { if (!player || modal) return; if (sitting && e !== 'pray') standUp(); player.doEmote(e); const lbl = { wave: '👋', jump: '🙌', pray: '🙏' }[e]; chatLog(S.name, lbl + ' (이모트)', 1); }
document.querySelectorAll('[data-emote]').forEach(b => b.onclick = () => emote(b.dataset.emote));

// ---------- HUD / modals ----------
function refreshHud() { if (!S) return; $('#coins').textContent = S.coins; const L = St.levelInfo(cfg, S.xp); $('#lvl').textContent = `예배당 Lv.${L.lv}`; $('#lvbar').style.width = (L.pct * 100) + '%';
  $('#qtext').textContent = S.quest.stage === 1 || S.quest.stage === 2 ? questLine() : QTEXT2[S.quest.stage]; $('#scene').textContent = scene === 'field' ? '🌳 마을 섬' : '⛪ 예배당 안'; }
function dialog(name, text, opts = [['닫기', null]]) { openModal('#dialog'); $('#dname').textContent = name; $('#dtext').textContent = text; const o = $('#dopts'); o.innerHTML = '';
  for (const [l, fn] of opts) { const b = document.createElement('button'); b.textContent = l; b.onclick = () => { closeModal(); fn && fn(); refreshHud(); persist(); }; o.append(b); } }
function openModal(sel) { closeModal(); $('#toast').classList.remove('show'); document.body.classList.add('modal-open'); modal = sel; $(sel).style.display = 'flex'; }
function closeModal() { if (modal) $(modal).style.display = 'none'; modal = null; document.body.classList.remove('modal-open'); }
document.querySelectorAll('.close').forEach(b => b.onclick = closeModal);
$('#btn-gacha').onclick = () => openGacha(); $('#groll').onclick = doRoll; $('#btn-inv').onclick = openInv; $('#btn-decor').onclick = openDecor; $('#btn-board').onclick = openBoard;
$('#btn-act').onclick = () => worship ? worshipTap() : interact(); $('#wtap').onclick = worshipTap;
$('#minimap').onclick = openMap;
$('#btn-menu').onclick = () => { persist(); location.reload(); };
let toastT; function toast(t) { const d = $('#toast'); d.textContent = t; d.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => d.classList.remove('show'), 2600); }
function coinFx() { const d = $('#coinbox'); d.classList.remove('bump'); void d.offsetWidth; d.classList.add('bump'); }

// ---------- input ----------
addEventListener('keydown', e => { if (document.activeElement.tagName === 'INPUT') { if (e.key === 'Escape') document.activeElement.blur(); return; }
  keys[e.code] = 1; if (e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); worship ? worshipTap() : interact(); }
  if (e.code === 'Escape') closeModal(); if (e.code === 'Digit1') emote('wave'); if (e.code === 'Digit2') emote('jump'); if (e.code === 'Digit3') emote('pray'); if (e.code === 'Enter' && S) $('#chatin').focus(); });
addEventListener('keyup', e => keys[e.code] = 0);
const toWorld = (cx, cy) => ({ x: (cx - innerWidth / 2) / cam.z + cam.x, y: (cy - innerHeight / 2) / cam.z + cam.y });
cv.addEventListener('pointerdown', e => { if (!S || modal) return; const p = toWorld(e.clientX, e.clientY);
  if (S.mode === 'decor') { placeAt(p.x, p.y); return; } if (e.pointerType === 'touch') return; clickTarget = p; });
cv.addEventListener('pointermove', e => { if (S && S.mode === 'decor') ghost = toWorld(e.clientX, e.clientY); });
// virtual joystick
const jz = $('#joyzone'), jk = $('#joyknob'); let jid = null, jc = null;
jz.addEventListener('pointerdown', e => { jid = e.pointerId; jz.setPointerCapture(jid); const r = jz.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; moveJoy(e); });
jz.addEventListener('pointermove', e => { if (e.pointerId === jid) moveJoy(e); });
const endJoy = e => { if (e.pointerId !== jid) return; jid = null; joy = { x: 0, y: 0, on: false }; jk.style.transform = ''; };
jz.addEventListener('pointerup', endJoy); jz.addEventListener('pointercancel', endJoy);
function moveJoy(e) { let dx = e.clientX - jc.x, dy = e.clientY - jc.y; const m = Math.hypot(dx, dy), R = 50; if (m > R) { dx *= R / m; dy *= R / m; } joy = { x: dx / R, y: dy / R, on: true }; jk.style.transform = `translate(${dx}px,${dy}px)`; }

// ---------- loop ----------
let last = performance.now(), scripted = null;
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  try { if (!S) drawTitlePreviews(dt); else { update(dt); render(); } } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
function update(dt) {
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), iy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (joy.on) { ix = joy.x; iy = joy.y; }
  if (scripted) { ix = Math.cos(scripted.a); iy = Math.sin(scripted.a); if ((scripted.ms -= dt * 1000) <= 0) scripted = null; }
  if (ix || iy) clickTarget = null;
  if (clickTarget) { const dx = clickTarget.x - player.x, dy = clickTarget.y - player.y, d = Math.hypot(dx, dy); if (d < 12) clickTarget = null; else { ix = dx / d; iy = dy / d; } }
  const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  if (modal || worship) ix = iy = 0;
  if (sitting && (ix || iy)) standUp();
  if (!sitting) player.move(cur(), ix, iy, dt, cfg.player.speed, cfg.player.accel); else player.speedNow = 0;
  player.update(dt);
  if (scene === 'field') {
    for (const n of fieldNpcs) { n.update(dt); n.speedNow = 0; }
    for (const w of wanderers) { const A = w.ai; w.update(dt);
      if (!A.tgt && (A.t -= dt) <= 0) A.tgt = world.randomPoint();
      if (A.tgt) { const dx = A.tgt.x - w.x, dy = A.tgt.y - w.y, d = Math.hypot(dx, dy); if (d < 20) { A.tgt = null; A.t = 1 + Math.random() * 4; if (Math.random() < .3) w.doEmote('wave'); w.move(world, 0, 0, dt, 120, 8); } else { const ox = w.x, oy = w.y; w.move(world, dx / d, dy / d, dt, 120, 6); if (Math.hypot(w.x - ox, w.y - oy) < .01) A.tgt = null; } }
      else w.move(world, 0, 0, dt, 120, 8);
      if ((A.chat -= dt) <= 0) { A.chat = 5 + Math.random() * 8; const t = cfg.chats[Math.random() * cfg.chats.length | 0]; w.say(t); if (Math.hypot(w.x - player.x, w.y - player.y) < 900) chatLog(w.name, t); } }
    for (let i = pickups.length - 1; i >= 0; i--) { const p = pickups[i]; if (Math.hypot(p.x - player.x, p.y - player.y) < 60) { pickups.splice(i, 1); S.quest.got.push(p.i); toast(`⭐ 축복의 별을 찾았어요! (${S.quest.got.length}/${cfg.quest.needStars})`);
      if (S.quest.got.length >= cfg.quest.needStars) { S.quest.stage = 3; toast('모두 찾았어요! 예배당 안 목사님께 가요'); } refreshHud(); persist(); } }
  } else for (const n of inNpcs) { n.update(dt); n.speedNow = 0; if (!n.sit && !n.emote && Math.random() < dt * .05) n.doEmote('wave'); }
  if (worship) { updateWorship(dt); if (worship) drawWorship(); }
  if ((mmT -= dt) <= 0) { mmT = .1; drawMinimap(); if (modal === '#map') drawMap(); }
  const t = nearest(); const b = $('#btn-act'); b.textContent = worship ? '♪' : sitting ? '일어나기' : t ? ACTLBL[t.type] : '대화'; b.classList.toggle('glow', !!t || !!sitting || !!worship);
  // camera
  const Wd = cur(), z = cam.z = Math.max(.55, Math.min(1, Math.min(innerWidth, innerHeight * 1.4) / (scene === 'field' ? 1200 : 1100)));
  let tx = player.x, ty = player.y - 60; const hw = innerWidth / 2 / z, hh = innerHeight / 2 / z;
  tx = Wd.W > hw * 2 ? Math.max(hw, Math.min(Wd.W - hw, tx)) : Wd.W / 2; ty = Wd.H > hh * 2 ? Math.max(hh, Math.min(Wd.H - hh, ty)) : Wd.H / 2;
  const k = 1 - Math.exp(-6 * dt); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
}
function snapCam() { cam.x = player.x; cam.y = player.y - 60; }
function render() {
  const dpr = devicePixelRatio || 1; if (cv.width !== innerWidth * dpr || cv.height !== innerHeight * dpr) { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = scene === 'field' ? cfg.world.sky : '#3b2f4a'; ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.translate(innerWidth / 2, innerHeight / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  const objs = [], tm = performance.now() / 1000;
  if (scene === 'field') {
    ctx.imageSmoothingQuality = 'high'; ctx.drawImage(IMG.island, 0, 0, world.W, world.H);
    if (S.mode === 'decor') { const Y = cfg.yard; ctx.save(); ctx.setLineDash([14, 10]); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; ctx.fillStyle = 'rgba(255,240,200,.18)'; ctx.beginPath(); ctx.ellipse(Y.x, Y.y, Y.rx, Y.ry, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
    const C = cfg.chapel, ci = IMG[C.img]; const cw = C.h * ci.width / ci.height, cl = C.x - cw * C.ax, ct = C.door.y - C.h * C.ay;
    // grounded: soft contact shadow under the painted base patch, drawn on the ground layer
    { const sx = cl + cw * .55, sy = ct + C.h * .8; ctx.save(); ctx.translate(sx, sy); ctx.scale(1, .32); const gr = ctx.createRadialGradient(0, 0, 10, 0, 0, cw * .5); gr.addColorStop(0, 'rgba(40,60,30,.28)'); gr.addColorStop(1, 'rgba(40,60,30,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, cw * .5, 0, 7); ctx.fill(); ctx.restore(); }
    objs.push({ y: C.y + C.sortDy, draw: g => g.drawImage(ci, cl, ct, cw, C.h) });
    for (const p of cfg.props) { const im = IMG[p.img]; objs.push({ y: p.y, draw: g => { const h = p.h, w = h * im.width / im.height; if (p.r) { g.fillStyle = 'rgba(40,60,40,.2)'; g.beginPath(); g.ellipse(p.x, p.y, w * .35, 12, 0, 0, 7); g.fill(); } g.drawImage(im, p.x - w / 2, p.y - h * .95, w, h); } }); }
    for (const p of pickups) objs.push({ y: p.y, draw: g => { const im = IMG[p.img], b = Math.sin(tm * 3 + p.i) * 8, s = 56; g.fillStyle = 'rgba(255,240,150,.35)'; g.beginPath(); g.ellipse(p.x, p.y, 26, 9, 0, 0, 7); g.fill(); g.drawImage(im, p.x - s / 2, p.y - s - 14 + b, s, s); } });
    for (const c of [...fieldNpcs, ...wanderers]) objs.push({ y: c.y, draw: g => c.draw(g), c });
  } else {
    inside.drawStatic(ctx); objs.push(...inside.objects());
    for (const c of inNpcs) objs.push({ y: c.y + (c.sit ? 8 : 0), draw: g => sitDraw(g, c, c.sit), c });
  }
  objs.push(...decorObjects());
  objs.push({ y: player.y + (sitting ? 8 : 0), draw: g => sitDraw(g, player, !!sitting), c: player });
  objs.sort((a, b) => a.y - b.y); for (const o of objs) o.draw(ctx);
  if (S.mode === 'decor' && ghost && decorSel) { const d = cfg.decor.find(q => q.id === decorSel), im = IMG[d.img], h = d.h, w = h * im.width / im.height; ctx.globalAlpha = decorOK(ghost.x, ghost.y) ? .6 : .25; ctx.save(); ctx.translate(ghost.x, ghost.y); if (decorFlip) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h * .95, w, h); ctx.restore(); ctx.globalAlpha = 1; }
  for (const o of objs) if (o.c) o.c.drawLabel(ctx);
  // interaction hint marker
  const t = !modal && nearest(); if (t && t.type !== 'pew') { const p = t.type === 'npc' ? t.n : t.type === 'door' ? cfg.chapel.door : cfg.interior[{ exit: 'door', offering: 'offering', board: 'board' }[t.type]];
    ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💬', p.x, p.y - (t.type === 'npc' ? 200 : 170) + Math.sin(tm * 4) * 5); }
  if (scene === 'field') { const D = cfg.chapel.door; ctx.font = '700 18px Pretendard,sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(80,60,100,.6)'; ctx.lineWidth = 4; ctx.textAlign = 'center'; ctx.strokeText('⛪ ㅇㅇ동 마을예배당', D.x, D.y + 40); ctx.fillText('⛪ ㅇㅇ동 마을예배당', D.x, D.y + 40); }
}
function sitDraw(g, c, sit) { if (!sit) { c.draw(g); return; } g.save(); g.translate(0, 0); const y = c.y; c.y = y + 6; const oh = c.drawH; c.speedNow = 0; g.beginPath(); g.rect(c.x - 200, y - 400, 400, 400 + 6 - 4); g.clip(); c.draw(g); c.y = y; g.restore(); }

// ---------- minimap + full map ----------
let mmT = 0, mapBg = null;
function fieldBg() { if (mapBg) return mapBg; const c = document.createElement('canvas'); c.width = 900; c.height = Math.round(900 * world.H / world.W); c.getContext('2d').drawImage(IMG.island, 0, 0, c.width, c.height); return (mapBg = c); }
// fit world (W x H) into box (w x h) "contain"
function fit(W, H, w, h) { const s = Math.min(w / W, h / H); return { s, ox: (w - W * s) / 2, oy: (h - H * s) / 2 }; }
function dot(g, x, y, r, fill, stroke = '#fff') { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = fill; g.fill(); g.lineWidth = Math.max(1.5, r * .45); g.strokeStyle = stroke; g.stroke(); }
function paintMap(g, w, h, big) {
  g.clearRect(0, 0, w, h); g.fillStyle = cfg.world.sky; g.fillRect(0, 0, w, h);
  const F = fit(world.W, world.H, w, h), P = (x, y) => [F.ox + x * F.s, F.oy + y * F.s];
  g.drawImage(fieldBg(), F.ox, F.oy, world.W * F.s, world.H * F.s);
  const r = big ? 7 : 3.2;
  for (const p of pickups) { const [x, y] = P(p.x, p.y); dot(g, x, y, r * .8, '#ffd84a'); }
  for (const n of fieldNpcs) { const [x, y] = P(n.x, n.y); dot(g, x, y, r * .85, '#5fcf8a'); }
  for (const n of wanderers) { const [x, y] = P(n.x, n.y); dot(g, x, y, r * .7, '#86a8ff'); }
  { const [x, y] = P(cfg.chapel.x, cfg.chapel.y); g.font = `${big ? 30 : 15}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⛪', x, y); }
  const pp = scene === 'field' ? player : { x: cfg.chapel.door.x, y: cfg.chapel.door.y };
  { const [x, y] = P(pp.x, pp.y); const pulse = 1 + Math.sin(performance.now() / 220) * .2; g.globalAlpha = .35; dot(g, x, y, r * 2.2 * pulse, '#ff6fa8', 'rgba(0,0,0,0)'); g.globalAlpha = 1; dot(g, x, y, r * 1.15, '#ff4f93');
    if (scene === 'field') { g.strokeStyle = '#ff4f93'; g.lineWidth = big ? 3 : 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(player.ang) * r * 3, y + Math.sin(player.ang) * r * 3); g.stroke(); } }
  return F;
}
function sizeCanvas(c) { const pr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight; if (c.width !== Math.round(w * pr) || c.height !== Math.round(h * pr)) { c.width = Math.round(w * pr); c.height = Math.round(h * pr); } const g = c.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0); return [g, w, h]; }
function drawMinimap() { if (!S || !world) return; const c = $('#mmcv'); if (!c.clientWidth) return; const [g, w, h] = sizeCanvas(c);
  if (scene === 'inside') { g.clearRect(0, 0, w, h); const F = fit(inside.W, inside.H, w, h); g.fillStyle = '#3b2f4a'; g.fillRect(0, 0, w, h); g.drawImage(IMG.in_bg, F.ox, F.oy, inside.W * F.s, inside.H * F.s); dot(g, F.ox + player.x * F.s, F.oy + player.y * F.s, 3.5, '#ff4f93'); }
  else paintMap(g, w, h, false); }
function openMap() { if (!S || worship) return; if (S.mode === 'decor') $('#ddone').click(); openModal('#map');
  $('#mapnote').textContent = scene === 'inside' ? '지금은 예배당 안이에요 · 장소를 누르면 밖으로 나가 그곳으로 이동해요' : '장소를 누르면 그곳으로 순간이동해요';
  requestAnimationFrame(() => { drawMap(); layoutSpots(); }); }
let mapF = null;
function drawMap() { const c = $('#mapcv'); if (!c.clientWidth) return; const [g, w, h] = sizeCanvas(c); mapF = paintMap(g, w, h, true); }
function layoutSpots() { const box = $('#mapspots'); const c = $('#mapcv'); const F = mapF || fit(world.W, world.H, c.clientWidth, c.clientHeight);
  box.innerHTML = ''; for (const sp of cfg.spots) { const b = document.createElement('button'); b.className = 'spot'; b.dataset.spot = sp.id; b.innerHTML = `<b>${sp.icon}</b>${esc(sp.name)}`;
    b.style.left = (F.ox + sp.x * F.s) + 'px'; b.style.top = (F.oy + sp.y * F.s - 20) + 'px'; b.onclick = () => teleport(sp); box.append(b); } }
addEventListener('resize', () => { if (modal === '#map') { drawMap(); layoutSpots(); } });
function nearWalk(x, y) { for (let r = 0; r < 600; r += 20) for (let a = 0; a < 6.28; a += .5) { const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (world.walkable(px, py)) return { x: px, y: py }; } return { x: cfg.chapel.door.x, y: cfg.chapel.door.y + 120 }; }
function teleport(sp) { closeModal(); if (scene !== 'field') exitChapel(); sitting = null; const p = nearWalk(sp.x, sp.y); player.x = p.x; player.y = p.y; player.vx = player.vy = 0; clickTarget = null; snapCam(); persist(); toast(`${sp.icon} ${sp.name}(으)로 이동했어요`); }

// ---------- test hooks ----------
window.G = { get S() { return S; }, get player() { return player; }, get scene() { return scene; }, cfg: () => cfg,
  start: (n, o) => { St.wipe(); selOutfit = o; startGame(St.newSave(n, o)); }, moveDir: (deg, ms) => { scripted = { a: deg * Math.PI / 180, ms }; },
  tp: (x, y) => { sitting = null; player.x = x; player.y = y; snapCam(); }, interact, enterChapel, exitChapel, openGacha, doRoll, openInv, openDecor, placeAt, openBoard, startWorship, worshipTap,
  get worship() { return worship; }, openMap, teleport, world: () => world, closeModal, emote, pickups, nearest, refreshHud, sitOn };

import { initPhase2 } from './phase2.js';
import { initPhase1 } from './phase1.js';
// Main: scenes, input, loop, UI glue
import { loadAll, Sprites, IMG } from './assets.js';
import { AV } from './avatar.js';
import { Cust } from './custom.js';
import './dongnpc.js';
import { World, Char, rr, CK } from './world.js';
import { Interior } from './interior.js';
import * as St from './state.js';
import { Net } from './net.js';
import { W } from './wallet.js';
import './payments.js';
import { Safe } from './safety.js';
import { C as Col } from './collect.js';
import { Svc } from './service.js';
import { V } from './v6.js';
import { initMobile } from './mobile.js';
import { initIcons } from './icons.js';
try { initIcons(); } catch (e) { console.warn('icons', e); }
import { initPhase4 } from './phase4.js';
// session: 30-min sliding TTL; same presence key on reload => no ghost duplicate of ourselves
const SESS = 'maeul_sess_v6', TTL = 30 * 60 * 1000;
const sess = (() => { try { const o = JSON.parse(localStorage.getItem(SESS)); if (o && Date.now() - o.t < TTL) return o; } catch { } return null; })();
const net = new Net(), remotes = new Map(); let netReady = null;
import('./account.js').catch(e => console.warn('acct', e));
// returning from a magic link / OAuth redirect: start the client now so it can pick the session out of the URL, then restore
if (/[?&#](code|access_token|error_description)=/.test(location.href)) { netReady = net.init(); netReady.then(() => window.Acct?.boot()); }
if (sess) net.id = sess.id;
let lastAct = Date.now(); const touchSess = () => { if (window.__RESETTING) return; localStorage.setItem(SESS, JSON.stringify({ id: net.id, t: lastAct })); };
const endSess = () => localStorage.removeItem(SESS);
['keydown', 'pointerdown'].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); }, { capture: true, passive: true }));

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
  SP = new Sprites(atlas); AV.init(atlas); Cust.init(SP, cfg); world = new World(cfg); inside = new Interior(cfg);
  Col.init({ S: () => S, player: () => player, world: () => world, chapel: () => cfg.chapel, room: () => (V.current() ? V.current().cd : 'solo'), net, toast, coinFx, refreshHud, persist });
  Svc.init({ S: () => S, net, scene: () => scene, enterChapel, sitAny: () => { if (!sitting) sitOn(pickPew()); }, startWorship, worshipOn: () => !!worship, endWorship, pastor: () => inNpcs.find(n => n.id === 'pastor'),
    say: sayLine, emote, npcs: () => inNpcs, addXp, toast, refreshHud, coinFx, persist, V, dialog, cfg: () => cfg, tp: (x, y) => { sitting = null; player.x = x; player.y = y; snapCam(); }, player: () => player, remotes, chatLog, refreshLead: () => {} });
  V.init({ S: () => S, player: () => player, net, toast, chatLog, openModal, closeModal, addXp, emote, refreshHud, persist, remotes, coinFx, board, meState, dialog, say: sayLine });
  $('#loading').style.display = 'none';
  const Q = new URLSearchParams(location.search), qr = (Q.get('room') || '').match(/^(\d{10})(?:-(\d{1,3}))?$/);
  const sv = St.hasSave() && St.load();
  if (qr || Q.has('play')) { // zero-friction entry: a shared link drops straight into the live room as a guest
    window.__resumed = !!(sess && sv); startGame(sv || St.newSave(cuteNick(), 'basic'));
    if (qr) V.setDong(qr[1], { keepShard: true, visit: !!(S.dong && S.dong.cd !== qr[1]) }).then(ok => { if (ok) { S.shard = +(qr[2] || 1); S.shardLock = true; persist(); V.hud(); } });
    if (!sv) toast(`🐑 ${S.name}님으로 들어왔어요. 이름은 꾸미기에서 바꿀 수 있어요`); }
  else if (sess && sv) { window.__resumed = true; startGame(sv); toast('🔄 이전 세션을 이어서 시작했어요'); } else { if (sv) selOutfit = sv.outfit || 'basic'; endSess(); showTitle(); }
  requestAnimationFrame(loop); try { initPhase1(); } catch (e) { console.error(e); } try { initPhase2(); } catch (e) { console.error(e); } try { initMobile(); } catch (e) { console.error(e); } try { initPhase4(); } catch (e) { console.error(e); } window.__ready = true;
})().catch(e => { console.error(e); });

// ---------- title / character select ----------
let selOutfit = 'basic', titlePrev = [];
let selAv = AV.DEFAULT;
function showTitle() {
  $('#title').style.display = 'flex'; $('#continue').disabled = !St.hasSave();
  Safe.mountTitle(); titlePrev = []; Cust.mount($('#outfits'), selAv, { title: true, compact: innerHeight < 700, onChange: c => { selAv = c; selOutfit = AV.parse(c).o; } });
}
function drawTitlePreviews(dt) { for (const p of titlePrev) { const g = p.c.getContext('2d'), pr = +p.c.dataset.pr || 1; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, p.c.width, p.c.height); g.setTransform(pr, 0, 0, pr, 0, 0); g.imageSmoothingQuality = 'high'; p.ch.update(dt);
  const sel = p.o === selOutfit; p.ch.speedNow = sel ? 1 : 0; if (sel) { p.ch.dist += dt * 90; p.ch.face = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'][Math.floor(p.ch.t / 1.2) % 8]; } else p.ch.face = 'S'; p.ch.draw(g); } }
$('#pname').value = cuteNick();
$('#newgame').onclick = () => { const n = $('#pname').value.trim() || '새싹'; St.wipe(); const sv = St.newSave(n, 'basic'); sv.av = selAv; startGame(sv); };
$('#continue').onclick = () => { const s = St.load(); if (s) startGame(s); };

function cuteNick() { const A = ['포근한', '작은', '반짝이는', '말랑한', '다정한', '졸린', '용감한', '수줍은', '향긋한', '보송한'], B = ['양', '별', '구름', '토끼', '참새', '민들레', '곰돌이', '새싹', '달님', '솜사탕'];
  return A[Math.random() * A.length | 0] + ' ' + B[Math.random() * B.length | 0]; }
function startGame(save) { touchSess();
  S = save; S.decorInv ||= {}; if (!S.started) { Object.assign(S.decorInv, cfg.startDecor); S.started = 1; }
  $('#title').style.display = 'none'; $('#hud').style.display = 'block'; S.mode = null; document.body.classList.remove('decor', 'worship');
  player = new Char(SP, 'player', S.outfit, 0, 0, { name: S.name, tagColor: '#ffe38a', equip: S.equip, cfg });
  S.cos ||= []; S.av ||= `f.1.0.0.0.${['basic', 'choir', 'mint'].includes(S.outfit) ? S.outfit : 'basic'}.-.-.-.-`; AV.apply(player, S.av); AV.preload(AV.parse(S.av));
  fieldNpcs.length = wanderers.length = inNpcs.length = 0;
  for (const n of cfg.npcs) { const c = new Char(SP, n.char, n.outfit, n.x, n.y, { name: n.name, tagColor: '#c8f7d6', cfg, drawH: n.char === 'lamb' ? 125 : 150 }); c.id = n.id; c.home = { x: n.x, y: n.y }; fieldNpcs.push(c); }
  cfg.wanderers.forEach((w, i) => { const p = world.randomPoint(); const c = new Char(SP, 'player', w.outfit, p.x, p.y, { name: w.name, tagColor: '#d7e6ff', cfg, drawH: 145 }); c.ai = { t: Math.random() * 3, tgt: null, chat: 3 + Math.random() * 6 }; wanderers.push(c); });
  for (const n of cfg.interiorNpcs) { let x = n.x, y = n.y; if (n.pew != null) { const st = inside.seat(n.pew); x = st.x; y = st.y; }
    const c = new Char(SP, n.char, n.outfit, x, y, { name: n.name, tagColor: n.sit ? '#d7e6ff' : '#c8f7d6', cfg }); c.id = n.id; c.sit = !!n.sit; c.pewI = n.pew; c.face = n.sit ? 'W' : n.id === 'pastor' ? 'E' : c.face; inNpcs.push(c); }
  if (S.scene === 'inside') enterChapel(true); else { scene = 'field'; let p = S.pos || { x: cfg.chapel.door.x, y: cfg.chapel.door.y + 120 }; if (!world.walkable(p.x, p.y)) p = { x: cfg.chapel.door.x, y: cfg.chapel.door.y + 120 }; player.x = p.x; player.y = p.y; }
  spawnPickups(); snapCam(); refreshHud(); persist(); const _first = !netReady; netReady ||= net.init(); Promise.resolve(netReady).then(() => { W.sync(); if (_first) window.Acct?.boot(); }); toast(`${S.name}님, 마실채플에 오신 걸 환영해요!`);
  if (!S.dong && !S.solo && !S.hintDong) { S.hintDong = 1; setTimeout(() => toast('🌈 지금은 모두의 광장이에요. 위쪽 📍 버튼으로 우리 동네를 인증하면 동네 방에 들어가요'), 2500); }
}
// ---------- multiplayer glue ----------
const meState = () => ({ name: S.name, outfit: player.outfit, x: player.x, y: player.y, face: player.face, anim: player.speedNow > 0 ? 'walk' : sitting ? 'sit' : 'idle', fl: scene === 'inside' ? inside.floor : 'F', equip: player.equip, av: player.av });
net.on('join', (p, m) => { const c = new Char(SP, 'player', m.outfit || 'basic', m.x || 0, m.y || 0, { name: m.name || '이웃', tagColor: '#ffc6e0', cfg, equip: m.equip || null, drawH: 150 }); if (m.av) { AV.apply(c, m.av); AV.preload(c._avp); } c.face = m.face || 'S'; c._lf = c.face; remotes.set(p.id, c); refreshOnline(); Col.shareRecent(); });
net.on('pick', p => Col.remotePick(p)); net.on('picks', p => Col.remotePicks(p));
net.on('leave', id => { remotes.delete(id); refreshOnline(); Svc.peerLeft(id); });
let lastRoomOnline = null;
net.on('update', p => { const c = remotes.get(p.id); if (!c) return; if (p.name) c.name = p.name; c.fl = p.fl; if (p.outfit && SP.has('player', p.outfit, 'walk_S')) c.outfit = p.outfit; c.equip = p.equip || null; if (p.av && p.av !== c.av) { AV.apply(c, String(p.av).slice(0, 80)); AV.preload(c._avp); } });
net.on('status', s => { refreshOnline(); if (s === 'online' && net.room !== lastRoomOnline) { lastRoomOnline = net.room; Svc.joined(); } });
net.on('chat', p => { const nm = String(p.name || '이웃').slice(0, 12); if (Safe.isBlocked(p.id, nm)) return; const c = remotes.get(p.id); const t = Safe.clean(String(p.text || '').slice(0, 80)); if (c) c.say(t); chatLog(nm, t, 0, p.id); });
net.on('emote', p => { const c = remotes.get(p.id); if (c && ['wave', 'jump', 'pray'].includes(p.e)) c.doEmote(p.e); });
net.on('jump', p => { const c = remotes.get(p.id); c && c.jump(); });
net.on('praise', p => { const c = remotes.get(p.id); c && V.remotePraise(c, p.line); });
net.on('prayer', () => { if (modal === '#board') V.renderPrayers(); });
net.on('counts', () => { if (modal === '#map' && $('#dongmap').style.display === 'flex') V.drawDongMap(); });
net.on('history', L => { if (!L.length) return; chatLog('📜', '최근 대화'); for (const m of L) chatLog(m.name, m.body); });
function sameFl(c) { const me = scene === 'inside' ? inside.floor : 'F'; return !c.fl || c.fl === me; }
function refreshOnline() { const e = $('#online'); if (!e) return; const on = net.status === 'online'; e.textContent = S && S.solo ? '🌙 혼자' : on ? `🟢 ${remotes.size + 1}명` : net.status === 'connecting' ? '🟡 연결 중…' : '⚪ 오프라인'; e.title = on ? '같은 방에 있는 이웃 수' : '오프라인: 혼자서도 계속 플레이할 수 있어요'; }
function updateRemotes(dt) {
  if (netReady && net.sb) V.tickRoom(scene);
  if (S) net.tick(meState());
  for (const [id, c] of remotes) { const p = net.peers.get(id), s = p && net.sample(p); if (!s) continue;
    const dx = s.x - c.x, dy = s.y - c.y, d = Math.hypot(dx, dy);
    if (d > 400) { c.x = s.x; c.y = s.y; c.snapFace = true; } else { const kp = 1 - Math.exp(-18 * dt); c.x += dx * kp; c.y += dy * kp; c.dist += d * kp; } // v10 eased remote position
    // v7: steady remotes — facing comes from the sender's own hysteretic face (never from noisy per-frame deltas), speed is smoothed
    const walking = s.anim === 'walk'; const kv = 1 - Math.exp(-8 * dt); c.svx = (c.svx || 0) + ((dt ? dx / dt : 0) - (c.svx || 0)) * kv; c.vx = c.svx;
    c.speedNow = walking ? Math.max(60, c.speedNow ? c.speedNow + (d / Math.max(dt, 1e-3) - c.speedNow) * kv : 120) : 0; c.sitting = s.anim === 'sit';
    if (s.face && c.face !== s.face && !c.emote) c.face = s.face;
    c.update(dt); }
}
function doJump() { if (!player || modal || sitting || worship) return; if (player.jump()) net.send('jump', {}); }
function persist() { if (window.__RESETTING) return; if (Date.now() - lastAct < TTL) touchSess(); S.pos = scene === 'field' ? { x: player.x | 0, y: player.y | 0 } : null; S.scene = scene; St.save(S); }
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
  const q = S.quest, id = npc.id; try { window.P2?.voice(id, npc); } catch {}
  if (id === 'pastor') {
    if (q.stage === 0) { dialog('목사님', '어서 와요! 우리 마을 친구 하은이와 양이에게 먼저 인사해 볼래요? 바깥 마당에 있어요.', [['네! 다녀올게요', () => { q.stage = 1; }]]); npc.doEmote('wave'); }
    else if (q.stage === 1) dialog('목사님', '하은이와 양이를 만나고 오세요 😊');
    else if (q.stage === 2) dialog('목사님', `섬 곳곳에 축복의 별과 꽃잎 ${cfg.quest.needStars}개가 숨겨져 있대요. (${q.got.length}/${cfg.quest.needStars})`);
    else if (q.stage === 3) { npc.doEmote('pray'); dialog('목사님', `와! 별을 모두 모아왔군요. 고마워요! 헌금 달란트 ${cfg.quest.rewardCoins}개를 드릴게요. 이제 예배에 함께해요!`, [['감사합니다!', () => { S.coins += cfg.quest.rewardCoins; W.earn('quest'); addXp(cfg.quest.rewardXp); q.stage = 4; coinFx(); }]]); }
    else if (q.stage === 4) dialog('목사님', '곧 찬양 예배가 시작돼요. 함께 찬양할까요? 박자에 맞춰 ♪ 버튼(스페이스/E)을 눌러요.', svcOpts([['조금 있다가', null]]));
    else dialog('목사님', '오늘도 함께해서 기뻐요. 또 별을 찾아 줄래요? 아니면 예배를 한 번 더 드릴까요?', [['새 별 찾기', () => { q.stage = 2; q.got = []; q.round++; spawnPickups(); }], ...svcOpts([['괜찮아요', null]])]);
  } else if (id === 'haeun' || id === 'lamb') {
    const L = id === 'haeun' ? ['하은', '안녕! 나는 성가대 하은이야 🎵 예배당 안에서 찬양 연습하면 재밌어!'] : ['양이', '음메~ 나는 양이! 별을 찾으면 목사님이 좋아하실 거야 ⭐'];
    npc.doEmote(id === 'haeun' ? 'happy' : 'jump');
    dialog(L[0], L[1], [['반가워!', () => { if (q.stage === 1) { q.talked[id] = 1; if (q.talked.haeun && q.talked.lamb) { q.stage = 2; spawnPickups(); toast('⭐ 새 임무: 숨겨진 별 찾기!'); } } }]]);
  } else if (wanderers.includes(npc)) { npc.ai.tgt = null; npc.ai.t = 4; npc.doEmote('wave'); const L = (npc.lines || []).concat(cfg.chats || []); dialog(npc.name || '주민', L[Math.random() * L.length | 0] || '안녕하세요! 좋은 하루예요 😊', [['반가워요!', null]]);
  } else if (npc.sit) { npc.say(['평안하세요~', '같이 예배드려요', '오늘 찬양 기대돼요'][Math.random() * 3 | 0]); }
  refreshHud();
}
function addXp(n) { const before = St.levelInfo(cfg, S.xp).lv; S.xp = Math.max(0, S.xp + n); const after = St.levelInfo(cfg, S.xp).lv; if (after > before) toast(`🎉 예배당 레벨 업! Lv.${after}`); refreshHud(); }

// ---------- scenes ----------
function enterChapel(silent) { scene = 'inside'; inside.floor = '1F'; try { window.Aud?.music('old100'); } catch { } player.x = cfg.interior.spawn.x; player.y = cfg.interior.spawn.y; player.face = 'N'; sitting = null; snapCam(); if (!silent) toast('⛪ 예배당 안으로 들어왔어요'); persist(); refreshHud(); }
function exitChapel() { scene = 'field'; player.x = cfg.chapel.door.x; player.y = cfg.chapel.door.y + 80; player.face = 'S'; sitting = null; snapCam(); persist(); refreshHud(); }
function goFloor(to) { const I = cfg.interior, from = inside.floor; inside.floor = to; sitting = null;
  if (to === '1F') { const st = (I.stairs1 || []).find(s => s.to === from) || I.spawn; player.x = st.x - 70; player.y = st.y + 20; if (!inside.walkable(player.x, player.y)) { player.x = I.spawn.x; player.y = I.spawn.y; } }
  else { const f = inside.F(); player.x = f.spawn.x; player.y = f.spawn.y; }
  snapCam(); try { window.P2?.sfx?.('step'); } catch { } toast(`🪜 ${to === '1F' ? '1층 본당' : inside.F().name}(으)로 이동했어요`); }
const SPOTMSG = { organ: '🎹 파이프 오르간이 웅장하게 울려요 (찬양 모드는 🎵 버튼)', choir: '🎶 성가대석이에요. 함께 찬양해요!', cafe: '☕ 따뜻한 차 한 잔 하며 이웃과 이야기해요', prayer: '🕯 조용히 기도하는 방이에요. 잠시 마음을 모아요' };
function spotAct(sp) { if (sp.t === 'choir' || sp.t === 'organ') { startWorship(); return; } if (sp.t === 'prayer') emote('pray'); toast(SPOTMSG[sp.t] || sp.label); }
window.__goFloor = goFloor;
const cur = () => scene === 'field' ? world : inside;
const npcList = () => scene === 'field' ? fieldNpcs : inNpcs;
function nearest() {
  let best = null, bd = 140;
  for (const n of npcList()) { const d = Math.hypot(n.x - player.x, n.y - player.y); if (d < bd) { bd = d; best = { type: 'npc', n }; } }
  if (scene === 'field') { const D = cfg.chapel.door; if (Math.hypot(D.x - player.x, D.y - player.y) < 130) best = { type: 'door' }; for (const sh of cfg.shops || []) if (Math.hypot(sh.door.x - player.x, sh.door.y - player.y) < 120) best = { type: 'shop', s: sh }; }
  else { const I = cfg.interior, chk = (p, type, r = 130) => { if (Math.hypot(p.x - player.x, p.y - player.y) < r) best = { type }; };
    if (!inside.on1) { for (const sp of inside.spots()) if (Math.hypot(sp.x - player.x, sp.y - player.y) < 140) best = { type: 'spot', sp }; for (const st of inside.stairs()) if (Math.hypot(st.x - player.x, st.y - player.y) < 110) best = { type: 'stairs', st }; return best; }
    chk(I.offering, 'offering', 120); chk(I.board, 'board', 150); chk(I.door, 'exit', 110);
    for (const st of inside.stairs()) if (Math.hypot(st.x - player.x, st.y - player.y) < 100) best = { type: 'stairs', st };
    I.pews.forEach((p, i) => { const r = inside.pewRect(i); if (Math.abs(player.x - r.cx) < 58 && Math.abs(player.y - r.cy) < 60 && !best) best = { type: 'pew', i }; });
    if (!best || best.type === 'pew') for (const n of inNpcs) if (Math.hypot(n.x - player.x, n.y - player.y) < 140) best = { type: 'npc', n }; }
  if (scene === 'field' && window.P2?.signPos) { const sp = P2.signPos(); if (Math.hypot(sp.x - player.x, sp.y + 20 - player.y) < 120) best = { type: 'sign' }; }
  if (!best && scene === 'field') { let wd = 110; for (const w of wanderers) { const d = Math.hypot(w.x - player.x, w.y - player.y); if (d < wd) { wd = d; best = { type: 'npc', n: w }; } } }
  return best;
}
const ACTLBL = { sign: '레벨 보기', stairs: '계단 이동', spot: '둘러보기', shop: '상점 들어가기', npc: '대화', door: '들어가기', exit: '나가기', offering: '헌금하기', board: '게시판', pew: '앉기' };
function interact() {
  if (modal || !S) return; if (sitting) { standUp(); return; }
  const t = nearest(); if (!t) return;
  if (t.type === 'npc') { t.n.face = facingTo(t.n, player); talkTo(t.n); }
  else if (t.type === 'sign') P2.openLevels(); else if (t.type === 'stairs') goFloor(t.st.to); else if (t.type === 'spot') spotAct(t.sp);
  else if (t.type === 'door') enterChapel(); else if (t.type === 'exit') exitChapel();
  else if (t.type === 'shop') window.P2 && P2.openShop(t.s); else if (t.type === 'offering') (window.P2 ? P2.openOffer(true) : openGacha()); else if (t.type === 'board') openBoard(); else if (t.type === 'pew') sitOn(t.i);
}
function facingTo(a, b) { const ang = Math.atan2(b.y - a.y, b.x - a.x); return ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8]; }
function sitOn(i) { if (window.P2 && P2.seatTaken(i)) { toast('이미 다른 분이 앉은 자리예요'); return; } const st = inside.seat(i); sitting = { i, back: { x: player.x, y: Math.min(player.y, st.y - 18) + (player.y < st.y ? 0 : 36) } }; player.x = st.x; player.y = st.y; player.face = 'W'; window.P2 && P2.claim(i); window.P2 && P2.sfx('click'); player.vx = player.vy = 0; toast('의자에 앉았어요. 목사님께 말 걸면 예배가 시작돼요 (다시 누르면 일어나기)'); }
function svcOpts(tail) { const o = [['⛪ 예배 드리기 (찬양→기도→말씀→헌금→축도)', () => Svc.start()]];
  if (net.status === 'online') o.push(Svc.isLeader() ? ['🎙 인도 그만하기', () => Svc.release()] : ['🎙 오늘의 인도자 하기', () => Svc.claim()]); return o.concat(tail); }
function pickPew() { const used = new Set(inNpcs.filter(n => n.sit).map(n => n.pewI)); let best = 0, bd = 1e9; cfg.interior.pews.forEach((p, i) => { const d = Math.hypot(p[0] - player.x, p[1] - player.y) + (used.has(i) || (window.P2 && P2.seatTaken(i)) ? 4000 : 0); if (d < bd) { bd = d; best = i; } }); return best; }
function endWorship(abort) { if (!worship) return; if (abort) try { window.Aud?.stopMusic(); } catch { } if (abort) { worship = null; document.body.classList.remove('worship'); $('#worship').style.display = 'none'; } else worship.t = worship.end + 1; }
function standUp() { if (!sitting) return; window.P2 && P2.release(sitting.i); const st = inside.seat(sitting.i); player.x = st.x - 20; player.y = st.y + 26; if (!inside.walkable(player.x, player.y)) { player.x = sitting.back.x; player.y = sitting.back.y; } sitting = null; }

// ---------- worship mini-game ----------
let hymnI = 0; function startWorship(opt = {}) { try { const ids = ['old100', 'newbrit', 'nicaea', 'stanne', 'joy']; window.Aud?.music(ids[hymnI++ % ids.length]); } catch { }
  closeModal(); if (scene !== 'inside') enterChapel(true);
  if (!sitting) sitOn(pickPew());
  const W = cfg.worship, beat = 60 / W.bpm; const notes = []; let t = 2.2;
  for (let i = 0; i < W.notes; i++) { notes.push({ t, hit: null }); t += beat * (i % 4 === 3 ? 2 : 1); }
  worship = { svc: !!opt.svc, t: 0, notes, end: t + 1.2, hits: 0, perfect: 0, combo: 0, fx: [], line: 0 };
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
function finishWorship() { try { window.Aud?.stopMusic(); scene === 'inside' && window.Aud?.music('old100'); } catch { } const w = worship; worship = null; document.body.classList.remove('worship'); $('#worship').style.display = 'none';
  const coins = w.hits * cfg.worship.coinPerHit + w.perfect * 4, xp = w.hits * cfg.worship.xpPerHit; S.coins += coins; W.earn('worship', coins); addXp(xp); S.worshipBest = Math.max(S.worshipBest || 0, w.hits);
  if (S.quest.stage === 4) S.quest.stage = 5; for (const n of inNpcs) n.doEmote(n.char === 'pastor' ? 'pray' : 'jump');
  if (w.svc) { toast(`🎵 찬양 ${w.hits}/${w.notes.length} · 달란트 +${coins}`); coinFx(); refreshHud(); persist(); Svc.afterPraise(); return; }
  dialog('찬양 예배 끝!', `${w.hits}/${w.notes.length} 박자 성공 (완벽 ${w.perfect})\n헌금 달란트 +${coins} · 예배당 경험치 +${xp}`, [['아멘 🙏', null]]); coinFx(); refreshHud(); persist(); }
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
function openGacha() { openModal('#gacha'); $('#gres').innerHTML = `<img src="assets/item_1_1.png" class="capsule"><p>헌금 ${cfg.gacha.cost}달란트로 꾸미기 아이템을 뽑아요</p>`; $('#gcost').textContent = cfg.gacha.cost; }
function doRoll() { const r = St.rollGacha(cfg, S); if (r.err) { toast(r.err + ' — 별 찾기나 예배로 코인을 모아요'); return; }
  const it = r.item, img = it.kind === 'decor' ? cfg.decor.find(d => d.id === it.id).img : cfg.acc[it.id].img, cls = { 일반: 'r1', 희귀: 'r2', 전설: 'r3' }[it.rar];
  $('#gres').innerHTML = `<img src="assets/item_1_1.png" class="capsule shake">`;
  setTimeout(() => { $('#gres').innerHTML = `<div class="rar ${cls}">${it.rar}</div><img src="assets/${img}" class="prize pop"><h3>${it.name}</h3><p>${r.dup ? `이미 있어요! ${cfg.gacha.dupRefund}달란트 돌려받았어요` : it.kind === 'decor' ? '배치 가방에 추가됐어요 (🪑 배치)' : '꾸미기에서 착용할 수 있어요'}</p>`; refreshHud(); persist(); }, 700); }

// ---------- inventory / 꾸미기 ----------
function openInv() { openModal('#inv'); renderInv(); }
function renderInv() {
  const on = { basic: '기본 원피스', choir: '성가대 가운', mint: '민트 후디' };
  $('#inv-outfits').innerHTML = Object.entries(on).map(([k, v]) => `<button class="chip ${S.outfit === k ? 'on' : ''}" data-o="${k}">${v}</button>`).join('');
  const slots = { hat: '머리', back: '등', pet: '친구' };
  $('#inv-items').innerHTML = Object.entries(slots).map(([sl, lb]) => `<div class="slot"><b>${lb}</b>` + `<button class="item ${!S.equip[sl] ? 'on' : ''}" data-s="${sl}" data-i="">없음</button>` +
    cfg.gacha.pool.filter(p => p.slot === sl).map(p => { const own = S.inv.includes(p.id); return `<button class="item ${S.equip[sl] === p.id ? 'on' : ''}" ${own ? '' : 'disabled'} data-s="${sl}" data-i="${p.id}"><img src="assets/${cfg.acc[p.id].img}"><small>${own ? p.name : '🔒 ' + p.rar}</small></button>`; }).join('') + '</div>').join('');
  $('#inv-decor').innerHTML = cfg.decor.map(d => `<div class="dchip"><img src="assets/${d.img}">${d.name} ×${S.decorInv[d.id] || 0}</div>`).join('');
  $('#inv-outfits').innerHTML = `<button class="chip on" id="inv-cz">👗 캐릭터 꾸미기 (성별·나이·헤어·옷·소품)</button>`; $('#inv-cz').onclick = () => { closeModal(); Cust.open(); };
  $('#inv-items').querySelectorAll('button').forEach(b => b.onclick = () => { S.equip[b.dataset.s] = b.dataset.i || null; player.equip = S.equip; renderInv(); persist(); });
}

// ---------- decorating (yard + interior) ----------
// shared placements (Supabase place_* RPCs + 'decor' broadcast)
const SH = { room: null, list: [], loading: false }; const HID = new Set(JSON.parse(localStorage.getItem('maeul_hidden_decor') || '[]'));
const shOn = () => !!(net.sb && net.room); const shKey = () => String(net.room).slice(0, 16);
const shMap = p => ({ sid: p.id, id: p.item, x: p.x, y: p.y, flip: !!p.rot, owner: p.owner_name || '이웃', mine: !!p.mine });
async function shLoad() { const r = net.room; SH.room = r; SH.list = []; SH.loading = true;
  const L = scene === 'field' ? S.yard : S.inside; if (L?.length) { for (const q of L) S.decorInv[q.id] = (S.decorInv[q.id] || 0) + 1; L.length = 0; persist(); }
  const { data, error } = await net.sb.rpc('place_list', { p_room: shKey(), p_secret: net.secret() }); SH.loading = false;
  if (SH.room === r && !error) SH.list = (data || []).filter(p => !HID.has(p.id) && cfg.decor.some(d => d.id === p.item)).map(shMap); }
net.on('decor', p => { if (p.room !== SH.room) return; const i = SH.list.findIndex(q => q.sid === (p.sid ?? p.p?.id));
  if (p.op === 'add' && i < 0 && !HID.has(p.p.id) && cfg.decor.some(d => d.id === p.p.item)) SH.list.push(shMap({ ...p.p, mine: false }));
  else if (p.op === 'mv' && i >= 0) Object.assign(SH.list[i], { x: p.x, y: p.y, flip: !!p.rot }); else if (p.op === 'rm' && i >= 0) SH.list.splice(i, 1); });
const SHERR = { limit_user: '이 구역엔 1인당 12개까지 놓을 수 있어요', limit_area: '이 구역이 꽉 찼어요 (최대 80개)', crowded: '다른 장식과 너무 가까워요', rate: '조금 천천히 놓아 주세요' };
function shErr(e) { const k = Object.keys(SHERR).find(k => String(e?.message).includes(k)); toast(k ? SHERR[k] : '저장 실패 — 잠시 후 다시'); }
async function shAdd(x, y) { const id = decorSel, flip = decorFlip; S.decorInv[id]--; renderDecor();
  const { data, error } = await net.sb.rpc('place_add', { p_room: shKey(), p_item: id, p_x: x | 0, p_y: y | 0, p_rot: flip ? 1 : 0, p_name: S.name || '', p_secret: net.secret() });
  if (error) { S.decorInv[id]++; renderDecor(); return shErr(error); }
  SH.list.push(shMap(data)); net.send('decor', { op: 'add', room: SH.room, p: { ...data, mine: false } }); addXp(cfg.decor.find(d => d.id === id).xp); if (!S.decorInv[decorSel]) decorSel = null; renderDecor(); persist(); }
async function shRemove(p) { const { data, error } = await net.sb.rpc('place_remove', { p_id: p.sid, p_secret: net.secret() }); if (error || !data) return toast('내 장식만 회수할 수 있어요');
  const i = SH.list.indexOf(p); if (i >= 0) SH.list.splice(i, 1); net.send('decor', { op: 'rm', room: SH.room, sid: p.sid });
  S.decorInv[p.id] = (S.decorInv[p.id] || 0) + 1; addXp(-cfg.decor.find(d => d.id === p.id).xp); toast('회수했어요'); renderDecor(); persist(); }
async function shFlip(p) { const rot = p.flip ? 0 : 1; const { data } = await net.sb.rpc('place_move', { p_id: p.sid, p_x: p.x, p_y: p.y, p_rot: rot, p_secret: net.secret() }); if (data) { p.flip = !!rot; net.send('decor', { op: 'mv', room: SH.room, sid: p.sid, x: p.x, y: p.y, rot }); } }
function shOwner(p) { let el = $('#p2own'); if (!el) { el = document.createElement('div'); el.id = 'p2own'; document.body.appendChild(el); }
  const d = cfg.decor.find(q => q.id === p.id); el.innerHTML = `<b>${d?.name || ''}</b><span>놓은 사람: ${String(p.owner).replace(/[<>&]/g, '')}${p.mine ? ' (나)' : ''}</span>` + (p.mine ? `<button data-a="rm">회수</button>` : `<button data-a="hide">숨기기</button><button data-a="rep">신고</button>`) + `<button data-a="x">✕</button>`;
  el.style.display = 'flex'; el.onclick = async e => { const a = e.target.dataset?.a; if (!a) return; el.style.display = 'none';
    if (a === 'rm') shRemove(p); if (a === 'hide' || a === 'rep') { HID.add(p.sid); localStorage.setItem('maeul_hidden_decor', JSON.stringify([...HID])); const i = SH.list.indexOf(p); if (i >= 0) SH.list.splice(i, 1); }
    if (a === 'rep') { await net.sb.rpc('place_report', { p_id: p.sid, p_secret: net.secret() }); toast('신고했어요. 3명 이상 신고되면 모두에게 숨겨져요'); } else if (a === 'hide') toast('나에게서 숨겼어요'); };
  clearTimeout(shOwner.t); shOwner.t = setTimeout(() => el.style.display = 'none', 6000); }
const shHit = (x, y) => SH.list.find(p => Math.hypot(p.x - x, p.y - y) < 40);
const placedList = () => { if (shOn()) { if (SH.room !== net.room && !SH.loading) shLoad(); return SH.list; } return scene === 'field' ? S.yard : S.inside; };
let decorWhy = '', decorHover = null; let gridSnap = localStorage.getItem('maeul_grid') === '1';
function decorOK(x, y) { decorWhy = '';
  const W = scene === 'field' ? world : inside; const ring = [[0, 0], [14, 0], [-14, 0], [0, -10], [0, 8]];
  if (!ring.every(([dx, dy]) => W.walkable(x + dx, y + dy))) { decorWhy = '걸을 수 있는 땅 위에만 놓을 수 있어요'; return false; }
  const doors = scene === 'field' ? [cfg.chapel.door, ...(cfg.shops || []).map(s => s.door)] : [cfg.interior?.door || inside.door || { x: -999, y: -999 }];
  if (doors.some(d => d && Math.hypot(d.x - x, d.y - y) < 80)) { decorWhy = '문 앞은 비워 둬야 해요'; return false; }
  if (npcList().some(n => Math.hypot(n.x - x, n.y - y) < 55)) { decorWhy = '이웃(NPC) 자리와 너무 가까워요'; return false; }
  if (placedList().some(p => Math.hypot(p.x - x, p.y - y) < 36)) { decorWhy = '다른 장식과 겹쳐요'; return false; }
  if (Math.hypot(player.x - x, player.y - y) < 28) { decorWhy = '내 자리에는 놓을 수 없어요'; return false; }
  // keep paths open: point must not seal a 1-tile corridor (needs walkable on both sides in at least one axis)
  const open = (dx, dy) => W.walkable(x + dx, y + dy) && W.walkable(x - dx, y - dy);
  if (!(open(60, 0) || open(0, 50)) || !(W.walkable(x + 60, y) || W.walkable(x - 60, y)) ) { decorWhy = '좁은 길을 막을 수 있어요'; return false; }
  if (scene === 'field' && (cfg.spots || []).some(t => t.x != null && Math.hypot(t.x - x, t.y - y) < 40)) { decorWhy = '길 표지 자리예요'; return false; }
  return true; }
const snap = v => gridSnap ? Math.round(v / 40) * 40 : v;
function openDecor() { if (modal) closeModal(); S.mode = 'decor'; document.body.classList.add('decor'); $('#decorbar').style.display = 'flex'; renderDecor(); toast('걸을 수 있는 곳 어디든 눌러 배치해요 (문 앞·길목 제외)'); }
function renderDecor() { $('#decor-items').innerHTML = cfg.decor.map(d => `<button class="ditem ${decorSel === d.id ? 'on' : ''}" data-d="${d.id}" ${(S.decorInv[d.id] || 0) ? '' : 'disabled'}><img src="assets/${d.img}"><small>${d.name} ×${S.decorInv[d.id] || 0}</small></button>`).join('');
  $('#decor-items').querySelectorAll('button').forEach(b => b.onclick = () => { decorSel = b.dataset.d; renderDecor(); }); $('#dflip').textContent = decorFlip ? '↔ 방향: 왼쪽' : '↔ 방향: 오른쪽'; }
function placeAt(x, y) { if (decorSel) { x = snap(x); y = snap(y); }
  if (shOn()) { const h = shHit(x, y); if (h) { if (h.mine && !decorSel) return shRemove(h); return shOwner(h); }
    if (!decorSel) { toast('아래에서 놓을 아이템을 골라요 (내 장식을 누르면 회수)'); return; } if (!(S.decorInv[decorSel] > 0)) return;
    if (!decorOK(x, y)) { toast(decorWhy || '여기엔 놓을 수 없어요'); return; } return shAdd(x, y); }
  const L = placedList(); const hit = L.findIndex(p => Math.hypot(p.x - x, p.y - y) < 45);
  if (hit >= 0 && !decorSel) { const p = L.splice(hit, 1)[0]; S.decorInv[p.id] = (S.decorInv[p.id] || 0) + 1; addXp(-cfg.decor.find(d => d.id === p.id).xp); toast('회수했어요'); renderDecor(); persist(); return; }
  if (!decorSel) { toast('아래에서 놓을 아이템을 골라요 (빈 선택에서 누르면 회수)'); return; }
  if (!(S.decorInv[decorSel] > 0)) return; if (!decorOK(x, y)) { toast(decorWhy || '여기엔 놓을 수 없어요'); return; }
  if (L.length >= cfg.yard.max) { toast('더 이상 놓을 수 없어요'); return; }
  L.push({ id: decorSel, x: x | 0, y: y | 0, flip: decorFlip }); S.decorInv[decorSel]--; addXp(cfg.decor.find(d => d.id === decorSel).xp);
  if (!S.decorInv[decorSel]) decorSel = null; renderDecor(); persist(); }
$('#dflip').onclick = () => { decorFlip = !decorFlip; if (shOn()) { const m = SH.list.filter(p => p.mine).pop(); if (m && m.flip !== decorFlip) shFlip(m); renderDecor(); return; } const L = placedList(); if (L.length) L[L.length - 1].flip = decorFlip; renderDecor(); persist(); };
$('#dundo').onclick = () => { if (shOn()) { const m = SH.list.filter(p => p.mine).pop(); if (m) shRemove(m); return; } const L = placedList(); const p = L.pop(); if (p) { S.decorInv[p.id] = (S.decorInv[p.id] || 0) + 1; addXp(-cfg.decor.find(d => d.id === p.id).xp); renderDecor(); persist(); } };
$('#dgrid') && ($('#dgrid').onclick = () => { gridSnap = !gridSnap; localStorage.setItem('maeul_grid', gridSnap ? '1' : '0'); $('#dgrid').classList.toggle('on', gridSnap); toast(gridSnap ? '격자 맞춤 켜짐 (40px)' : '자유 배치'); });
$('#dpick').onclick = () => { decorSel = null; renderDecor(); toast('놓인 아이템을 누르면 회수돼요'); };
$('#ddone').onclick = () => { S.mode = null; document.body.classList.remove('decor'); decorSel = null; $('#decorbar').style.display = 'none'; ghost = null; };
function decorObjects() { const PL = placedList(); if (scene === 'field' && world) world.extra = PL.map(p => { const d = cfg.decor.find(q => q.id === p.id); return d ? { x: p.x, y: p.y, r: Math.max(16, Math.min(70, d.h * .22)) } : null; }).filter(Boolean); return PL.map(p => { const d = cfg.decor.find(q => q.id === p.id), im = IMG[d.img]; return { y: p.y, draw: g => { const h = d.h, w = h * im.width / im.height;
  g.fillStyle = 'rgba(40,60,40,.2)'; g.beginPath(); g.ellipse(p.x, p.y, w * .4, 9, 0, 0, 7); g.fill(); g.save(); g.translate(p.x, p.y); if (p.flip) g.scale(-1, 1); g.drawImage(im, -w / 2, -h * .95, w, h); g.restore(); } }; }); }

// ---------- board ----------
async function openBoard() { V.openPrayers(); }
async function renderBoard() { const L = await board.list(); $('#blist').innerHTML = L.map(p => `<div class="post ${p.kind}"><div><b>${esc(p.author)}</b> <small>${p.kind === 'notice' ? '📢 공지' : '🙏 기도제목'}</small></div><p>${esc(p.text)}</p><button data-id="${p.id}">🙏 함께 기도 ${p.prayers}</button></div>`).join('');
  $('#blist').querySelectorAll('button').forEach(b => b.onclick = async () => { await board.pray(b.dataset.id); renderBoard(); }); }
const _oldPost = async () => { const t = $('#btext').value.trim(); if (!t) return; await board.post(S.name, t); $('#btext').value = ''; addXp(5); renderBoard(); toast('기도제목을 올렸어요'); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- chat + emotes ----------
function chatLog(who, txt, me, rid) { const d = document.createElement('div'); d.className = 'cl' + (me ? ' me' : ''); d.innerHTML = `<b>${esc(who)}</b> ${esc(txt)}`; if (rid) { d.dataset.id = rid; const f = document.createElement('button'); f.className = 'flag'; f.title = '신고 · 차단'; f.textContent = '🚩'; f.onclick = e => { e.stopPropagation(); Safe.menu(rid, who, txt); }; d.append(f); } const L = $('#chatlog'); L.append(d); while (L.children.length > 30) L.firstChild.remove(); L.scrollTop = 1e6; }
function sayLine(t) { if (!player) return; if (Safe.bad(t)) toast('바른 말을 사용해 주세요 🙏 (일부 단어는 가려져요)'); t = Safe.clean(t); player.say(t); chatLog(S.name, t, 1); net.chat(S.name, t); V.onChat(t); }
$('#chatform').onsubmit = e => { e.preventDefault(); const t = $('#chatin').value.trim(); if (!t) return; if (!Safe.accepted()) { $('#chatin').blur(); return Safe.need(() => $('#chatform').requestSubmit()); } $('#chatin').value = ''; $('#chatin').blur(); sayLine(t);
  const pool = scene === 'field' ? wanderers : inNpcs; const near = pool.filter(w => Math.hypot(w.x - player.x, w.y - player.y) < 600); const r = near[Math.random() * near.length | 0];
  if (r) setTimeout(() => { const a = ['반가워요 ' + S.name + '님!', '맞아요 ㅎㅎ', '좋아요 😊', '같이 가요~', '아멘 🙏'][Math.random() * 5 | 0]; r.say(a); chatLog(r.name, a); }, 900); };
function emote(e) { if (!player || modal) return; if (sitting && e !== 'pray') standUp(); player.doEmote(e); net.send('emote', { e }); const lbl = { wave: '👋', jump: '🙌', pray: '🙏' }[e]; chatLog(S.name, lbl + ' (이모트)', 1); V.onEmote(e); }
document.querySelectorAll('[data-emote]').forEach(b => b.onclick = () => emote(b.dataset.emote));

// ---------- HUD / modals ----------
function refreshHud() { if (!S) return; $('#coins').textContent = S.coins; const L = St.levelInfo(cfg, S.xp); $('#lvl').textContent = `예배당 Lv.${L.lv}`; $('#lvbar').style.width = (L.pct * 100) + '%';
  $('#qtext').textContent = S.quest.stage === 1 || S.quest.stage === 2 ? questLine() : QTEXT2[S.quest.stage]; $('#scene').textContent = scene === 'field' ? '🌳 마을 섬' : '⛪ 예배당 안'; V.hud(); refreshOnline(); }
let DLG = null;
function dialog(name, text, opts = [['닫기', null]], def = -1) { openModal('#dialog'); $('#dname').textContent = name; const tx = $('#dtext'); tx.textContent = ''; const o = $('#dopts'); o.innerHTML = '';
  if (def < 0) { def = opts.findIndex(x => /나가기|처음부터/.test(x[0])) >= 0 ? opts.findIndex(x => /취소/.test(x[0])) : 0; if (def < 0) def = 0; }
  DLG = { text: String(text), i: 0, sel: def, btns: [] }; clearInterval(DLG.tm); const D = DLG;
  D.tm = setInterval(() => { if (DLG !== D) return clearInterval(D.tm); D.i += 2; tx.textContent = D.text.slice(0, D.i); if (D.i >= D.text.length) { clearInterval(D.tm); D.done = 1; o.classList.remove('wait'); } }, 22); o.classList.add('wait');
  opts.forEach(([l, fn], k) => { const b = document.createElement('button'); b.textContent = l; b.onclick = () => { DLG = null; closeModal(); fn && fn(); refreshHud(); persist(); }; o.append(b); D.btns.push(b); }); dlgSel(0); }
function dlgSel(d) { if (!DLG) return; const n = DLG.btns.length; DLG.sel = (DLG.sel + d + n) % n; DLG.btns.forEach((b, k) => b.classList.toggle('sel', k === DLG.sel)); }
function dlgAdvance() { if (!DLG) return false; if (!DLG.done) { clearInterval(DLG.tm); DLG.done = 1; DLG.i = DLG.text.length; $('#dtext').textContent = DLG.text; $('#dopts').classList.remove('wait'); return true; } DLG.btns[DLG.sel]?.click(); return true; }
function openModal(sel) { closeModal(); $('#toast').classList.remove('show'); document.body.classList.add('modal-open'); modal = sel; $(sel).style.display = 'flex'; }
function closeModal() { if (modal) $(modal).style.display = 'none'; modal = null; document.body.classList.remove('modal-open'); }
document.querySelectorAll('.close').forEach(b => b.onclick = closeModal);
$('#btn-gacha').onclick = () => (window.P2 ? P2.openOffer(false) : openGacha()); $('#groll').onclick = doRoll; $('#btn-inv').onclick = openInv; $('#btn-decor').onclick = openDecor; $('#btn-board').onclick = openBoard;
$('#btn-act').onclick = () => worship ? worshipTap() : interact(); $('#wtap').onclick = worshipTap;
$('#minimap').onclick = () => openMap(); $('#dtext').onclick = () => dlgAdvance(); $('#btn-jump').onclick = doJump;
$('#chlv') && ($('#chlv').onclick = () => window.P2?.openLevels()); $('#btn-set') && ($('#btn-set').onclick = () => window.P2?.openSet()); $('#btn-menu').onclick = () => dialog('🚪 나가기', '어떻게 나갈까요?\n· 잠깐 나가기: 이 기기에 저장이 남아 다음에 이어서 해요\n· 로그아웃: 이 기기의 세션·저장을 지우고 다음엔 새 손님으로 시작해요 (서버 기록은 남지만 손님 계정은 다시 찾을 수 없어요)', [['🚪 잠깐 나가기', () => { persist(); endSess(); net.leave(); location.reload(); }], ['🔓 로그아웃', () => dialog('🔓 로그아웃', '정말 로그아웃할까요?\n손님 계정이라 이 기기의 저장을 지우면 지금 캐릭터로 다시 돌아올 수 없어요.', [['로그아웃', () => { window.__RESETTING = true; try { net.leave(); } catch { } window.MaeulReset.logout(); }], ['취소', null]])], ['취소', null]]);
let toastT; function toast(t) { const d = $('#toast'); d.textContent = t; d.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => d.classList.remove('show'), 2600); }
function coinFx() { const d = $('#coinbox'); d.classList.remove('bump'); void d.offsetWidth; d.classList.add('bump'); }

// ---------- input ----------
addEventListener('keydown', e => { const ae = document.activeElement, tg = ae && ae.tagName;
  if (tg === 'INPUT' || tg === 'TEXTAREA' || (ae && ae.isContentEditable)) { if (e.key === 'Escape') ae.blur(); return; }
  if (tg === 'BUTTON' && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); ae.blur(); } // no double trigger (button click + game action)
  const act = e.code === 'Space' || e.code === 'KeyE' || e.code === 'KeyF';
  if (modal === '#dialog' && DLG) { if (act || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) dlgAdvance(); return; }
    if (/Arrow(Left|Up)|Key[WA]/.test(e.code)) { e.preventDefault(); dlgSel(-1); return; } if (/Arrow(Right|Down)|Key[SD]/.test(e.code)) { e.preventDefault(); dlgSel(1); return; } }
  if (e.code === 'Tab') { e.preventDefault(); if (e.repeat) return; if (modal === '#map') closeModal(); else if (!modal || /map|missions|p2|inv|church/.test(modal)) openMap(); return; }
  if (modal && e.code !== 'Escape') return; {
  keys[e.code] = 1; if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { if (!e.repeat) doJump(); }
  if (act) { e.preventDefault(); if (e.repeat) return; worship ? worshipTap() : interact(); }
  if (e.code === 'Escape') { if (!modal && !worship && !DLG) { window.P2?.openSet?.(); return; } closeModal(); $('#emopanel').style.display = 'none'; } if (e.code === 'Digit1') emote('wave'); if (e.code === 'Digit2') emote('jump'); if (e.code === 'Digit3') emote('pray'); if (e.code === 'Enter' && S) { e.preventDefault(); $('#chatin').focus(); } } });
addEventListener('keyup', e => keys[e.code] = 0);
const toWorld = (cx, cy) => ({ x: (cx - innerWidth / 2) / cam.z + cam.x, y: (cy - innerHeight / 2) / cam.z + cam.y });
cv.addEventListener('pointerdown', e => { if (!S || modal) return; const p = toWorld(e.clientX, e.clientY);
  if (S.mode === 'decor') { placeAt(p.x, p.y); return; } if (scene === 'field' && window.P2?.signPos) { const sp = P2.signPos(); if (Math.abs(p.x - sp.x) < 155 && p.y > sp.y - 140 && p.y < sp.y + 10) { P2.openLevels(); return; } } if (shOn()) { const h = shHit(p.x, p.y); if (h) { shOwner(h); return; } } if (e.pointerType === 'touch') return; clickTarget = p; });
cv.addEventListener('pointermove', e => { if (S && S.mode === 'decor') { const p = toWorld(e.clientX, e.clientY); decorHover = { x: snap(p.x), y: snap(p.y) }; } if (!S || !shOn() || e.pointerType === 'touch') return; const p = toWorld(e.clientX, e.clientY), h = shHit(p.x, p.y); cv.title = h ? `${cfg.decor.find(d => d.id === h.id)?.name || ''} · 놓은 사람: ${h.owner}` : ''; });
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
      if (!A.tgt && (A.t -= dt) <= 0) A.tgt = w.pilgrim && Math.random() < .5 ? { x: cfg.chapel.door.x + (Math.random() - .5) * 160, y: cfg.chapel.door.y + 90 + Math.random() * 60 } : Math.random() < .75 ? world.pathPoint() : world.randomPoint();
      if (A.tgt) { const dx = A.tgt.x - w.x, dy = A.tgt.y - w.y, d = Math.hypot(dx, dy); if (d < 20) { A.tgt = null; A.t = 1 + Math.random() * 4; if (Math.random() < .3) w.doEmote('wave'); w.move(world, 0, 0, dt, 120, 8); } else { const ox = w.x, oy = w.y; w.move(world, dx / d, dy / d, dt, 120, 6); if (Math.hypot(w.x - ox, w.y - oy) < .01) A.tgt = null; } }
      else w.move(world, 0, 0, dt, 120, 8);
      if ((A.chat -= dt) <= 0) { A.chat = 5 + Math.random() * 8; const t = w.lines && Math.random() < .6 ? w.lines[Math.random() * w.lines.length | 0] : cfg.chats[Math.random() * cfg.chats.length | 0]; w.say(t); if (Math.hypot(w.x - player.x, w.y - player.y) < 900) chatLog(w.name, t); } }
    for (let i = pickups.length - 1; i >= 0; i--) { const p = pickups[i]; if (Math.hypot(p.x - player.x, p.y - player.y) < 60) { pickups.splice(i, 1); S.quest.got.push(p.i); toast(`⭐ 축복의 별을 찾았어요! (${S.quest.got.length}/${cfg.quest.needStars})`);
      if (S.quest.got.length >= cfg.quest.needStars) { S.quest.stage = 3; toast('모두 찾았어요! 예배당 안 목사님께 가요'); } refreshHud(); persist(); } }
  } else for (const n of inNpcs) { n.update(dt); n.speedNow = 0; if (!n.sit && !n.emote && Math.random() < dt * .05) n.doEmote('wave'); }
  updateRemotes(dt); V.update(dt); Col.update(dt, scene);
  if (worship) { updateWorship(dt); if (worship) drawWorship(); }
  if ((mmT -= dt) <= 0) { mmT = .1; drawMinimap(); if (modal === '#map') drawMap(); }
  const t = nearest(); const b = $('#btn-act'); b.textContent = worship ? '♪' : sitting ? '일어나기' : t ? ACTLBL[t.type] : '대화'; b.classList.toggle('glow', !!t || !!sitting || !!worship);
  // camera
  const Wd = cur(), Vw = scene === 'field' ? { x: 0, y: 0, w: Wd.W, h: Wd.H } : inside.view(), zc = Math.min(1, innerWidth / Vw.w, innerHeight / Vw.h), z = cam.z = scene === 'field' ? Math.max(.55, Math.min(1, Math.min(innerWidth, innerHeight * 1.4) / 1200)) : innerHeight > innerWidth * 1.2 ? Math.max(zc, Math.min(1, innerHeight * .55 / Vw.h, innerWidth / (Vw.w * .42))) : zc; CK.k = scene === 'field' ? 1 : inside.cs(); // v11: portrait phones fit room HEIGHT (≈42% of width visible, camera follows) so characters stay readable; else CONTAIN. v10 interior: CONTAIN-fit (whole room visible, never zoomed past 1:1 so sprites never upscale)
  let tx = player.x, ty = player.y - 60; const hw = innerWidth / 2 / z, hh = innerHeight / 2 / z;
  tx = Vw.w > hw * 2 ? Math.max(Vw.x + hw, Math.min(Vw.x + Vw.w - hw, tx)) : Vw.x + Vw.w / 2; ty = Vw.h > hh * 2 ? Math.max(Vw.y + hh, Math.min(Vw.y + Vw.h - hh, ty)) : Vw.y + Vw.h / 2;
  if (scene !== 'field' && Math.abs(cam.zPrev - z) > .001) { cam.x = tx; cam.y = ty; } cam.zPrev = z;
  const k = 1 - Math.exp(-6 * dt); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
}
// HD background: EDSR x3 WebP tiles (1 tile px = 1 world px), lazy-loaded only for visible tiles and only when the base image would be upscaled noticeably (PC / high-DPR)
const HD = { meta: null, t: {}, busy: 0, off: /[?&]hd=0/.test(location.search) };

function drawHD(dpr) {
  if (!HD.req && cfg) { HD.req = 1; fetch((cfg.world.hd || 'assets/island_hd/') + 'meta.json').then(r => r.ok ? r.json() : null).then(m => { HD.meta = m; }).catch(() => {}); }
  const m = HD.meta; if (!m || HD.off) return; const sx = world.W / IMG.island.width; if (cam.z * dpr * sx < 1.25) return;
  const k = m.W / world.W, hw = innerWidth / 2 / cam.z, hh = innerHeight / 2 / cam.z, T = m.tile / k;
  const c0 = Math.max(0, Math.floor((cam.x - hw) / T)), c1 = Math.min(m.cols - 1, Math.floor((cam.x + hw) / T)), r0 = Math.max(0, Math.floor((cam.y - hh) / T)), r1 = Math.min(m.rows - 1, Math.floor((cam.y + hh) / T));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const id = r + '_' + c; let im = HD.t[id];
    if (!im) { if (HD.busy >= 4) continue; HD.busy++; im = HD.t[id] = new Image(); im.decoding = 'async'; im.onload = im.onerror = () => { HD.busy--; }; im.src = (cfg.world.hd || 'assets/island_hd/') + 't_' + id + '.webp'; continue; }
    if (im.complete && im.naturalWidth) ctx.drawImage(im, c * T, r * T, im.naturalWidth / k + .5, im.naturalHeight / k + .5);
  }
}
function snapCam() { cam.x = player.x; cam.y = player.y - 60; cam.zPrev = -1; }
function render() {
  const dpr = Math.min(window.__dprCap || 2, devicePixelRatio || 1), bw = Math.round(innerWidth * dpr), bh = Math.round(innerHeight * dpr); if ((cv.width !== bw || cv.height !== bh) && !(document.body.classList.contains('kbd') && cv.width === bw)) { cv.width = bw; cv.height = bh; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = scene === 'field' ? cfg.world.sky : '#3b2f4a'; ctx.fillRect(0, 0, innerWidth, innerHeight);
  { const q = cam.z * (window.devicePixelRatio || 1); ctx.translate(Math.round(innerWidth / 2), Math.round(innerHeight / 2)); ctx.scale(cam.z, cam.z); ctx.translate(-Math.round(cam.x * q) / q, -Math.round(cam.y * q) / q); } // v7: camera snapped to device pixels (no sub-pixel shimmer)
  const objs = [], tm = performance.now() / 1000;
  if (scene === 'field') {
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(IMG.island, 0, 0, world.W, world.H); drawHD(dpr); window.P2 && P2.ground(ctx, tm);
    if (S.mode === 'decor') { ctx.save(); ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(230,80,110,.75)'; ctx.fillStyle = 'rgba(255,120,140,.12)';
      for (const d of [cfg.chapel.door, ...(cfg.shops || []).map(q => q.door)]) if (d) { ctx.beginPath(); ctx.arc(d.x, d.y, 80, 0, 7); ctx.fill(); ctx.stroke(); }
      if (gridSnap) { ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,255,255,.7)'; const x0 = Math.floor((player.x - 600) / 40) * 40, y0 = Math.floor((player.y - 400) / 40) * 40; for (let gx = x0; gx < player.x + 600; gx += 40) for (let gy = y0; gy < player.y + 400; gy += 40) ctx.fillRect(gx - 1.5, gy - 1.5, 3, 3); }
      if (decorHover && decorSel) { const ok = decorOK(decorHover.x, decorHover.y); ctx.setLineDash([]); ctx.strokeStyle = ok ? 'rgba(80,190,110,.95)' : 'rgba(230,70,90,.95)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(decorHover.x, decorHover.y, 30, 12, 0, 0, 7); ctx.stroke(); }
      ctx.restore(); }
    const _t = window.P2 ? P2.tier : 1; if (world.chTier !== _t) world.setChapel(_t); const C = { ...cfg.chapel, ...world.chapelArt(_t) }, ci = IMG[C.img]; const cw = C.h * ci.width / ci.height, cl = C.door.x - cw * C.ax, ct = C.door.y - C.h * C.ay;
    // grounded: soft contact shadow under the painted base patch, drawn on the ground layer
    { const sx = cl + cw * .55, sy = ct + C.h * .8; ctx.save(); ctx.translate(sx, sy); ctx.scale(1, .32); const gr = ctx.createRadialGradient(0, 0, 10, 0, 0, cw * .5); gr.addColorStop(0, 'rgba(40,60,30,.28)'); gr.addColorStop(1, 'rgba(40,60,30,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, cw * .5, 0, 7); ctx.fill(); ctx.restore(); }
    objs.push({ y: C.door.y - 20, draw: g => g.drawImage(ci, cl, ct, cw, C.h) });
    if (window.DEBUG_COL) objs.push({ y: 1e9, draw: g => { g.save(); g.fillStyle = 'rgba(255,40,80,.28)'; g.strokeStyle = '#ff2050'; g.lineWidth = 3; for (const b of [world.chapelBox, ...world.boxes]) { g.fillRect(b.x, b.y, b.w, b.h); g.strokeRect(b.x, b.y, b.w, b.h); } for (const c of world.circles) { g.beginPath(); g.ellipse(c.x, c.y, c.r, c.r / 1.6, 0, 0, 7); g.fill(); g.stroke(); } g.fillStyle = 'rgba(60,200,120,.6)'; g.beginPath(); g.arc(cfg.chapel.door.x, cfg.chapel.door.y, 18, 0, 7); g.fill(); g.restore(); } });
    for (const p of cfg.props) { const im = IMG[p.img]; objs.push({ y: p.y, draw: g => { const h = p.h, w = h * im.width / im.height; if (p.r) { g.fillStyle = 'rgba(40,60,40,.2)'; g.beginPath(); g.ellipse(p.x, p.y, w * .35, 12, 0, 0, 7); g.fill(); } g.drawImage(im, p.x - w / 2, p.y - h * .95, w, h); } }); }
    Col.objs(objs, tm, scene); window.P2 && objs.push(...P2.fieldObjs(tm));
    for (const p of pickups) objs.push({ y: p.y, draw: g => { const im = IMG[p.img], b = Math.sin(tm * 3 + p.i) * 8, s = 56; g.fillStyle = 'rgba(255,240,150,.35)'; g.beginPath(); g.ellipse(p.x, p.y, 26, 9, 0, 0, 7); g.fill(); g.drawImage(im, p.x - s / 2, p.y - s - 14 + b, s, s); } });
    for (const c of remotes.values()) if (sameFl(c)) objs.push({ y: c.y, draw: g => c.draw(g), c });
    for (const c of [...fieldNpcs, ...wanderers]) objs.push({ y: c.y, draw: g => c.draw(g), c });
  } else {
    inside.drawStatic(ctx); if (inside.on1) { objs.push(...inside.objects()); window.P2 && objs.push(...P2.objs(tm)); }
    for (const c of remotes.values()) { if (!sameFl(c)) continue; if (c.sitting) c.face = 'W'; objs.push({ y: c.y, draw: g => sitDraw(g, c, !!c.sitting), c }); }
    if (inside.on1) for (const c of inNpcs) objs.push({ y: c.y, draw: g => sitDraw(g, c, c.sit), c });
  }
  if (scene === 'field' || inside.on1) objs.push(...decorObjects());
  objs.push({ y: player.y, draw: g => sitDraw(g, player, !!sitting), c: player });
  objs.sort((a, b) => a.y - b.y); for (const o of objs) o.draw(ctx);
  if (S.mode === 'decor' && ghost && decorSel) { const d = cfg.decor.find(q => q.id === decorSel), im = IMG[d.img], h = d.h, w = h * im.width / im.height; ctx.globalAlpha = decorOK(ghost.x, ghost.y) ? .6 : .25; ctx.save(); ctx.translate(ghost.x, ghost.y); if (decorFlip) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h * .95, w, h); ctx.restore(); ctx.globalAlpha = 1; }
  V.drawWorld(ctx);
  if (!worship && !modal) { const t = sitting ? { type: 'stand' } : nearest(); if (t) { // contextual prompt bubble: [E] 들어가기 / 나가기 / 대화
    const I = cfg.interior, at = t.type === 'npc' ? { x: t.n.x, y: t.n.y - 175 } : t.type === 'door' ? { x: cfg.chapel.door.x, y: cfg.chapel.door.y - 60 } : { x: player.x, y: player.y - 185 };
    const lbl = (matchMedia('(pointer:coarse)').matches ? '' : '[Space] ') + (t.type === 'stand' ? '일어나기' : ACTLBL[t.type]); ctx.font = '800 17px Pretendard,sans-serif'; const w = ctx.measureText(lbl).width + 24, b = Math.sin(performance.now() / 250) * 3;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#c9a8ff'; ctx.lineWidth = 2.5; rr(ctx, at.x - w / 2, at.y - 30 + b, w, 32, 16); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(at.x - 7, at.y + 2 + b); ctx.lineTo(at.x + 7, at.y + 2 + b); ctx.lineTo(at.x, at.y + 11 + b); ctx.fill();
    ctx.fillStyle = '#6b4f9a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lbl, at.x, at.y - 14 + b); ctx.textBaseline = 'alphabetic'; } }
  for (const o of objs) if (o.c) o.c.drawLabel(ctx);
  // interaction hint marker
  const t = !modal && nearest(); if (t && t.type !== 'pew' && t.type !== 'shop') { const p = t.type === 'npc' ? t.n : t.type === 'stairs' ? t.st : t.type === 'spot' ? t.sp : t.type === 'sign' ? { x: P2.signPos().x, y: P2.signPos().y + 30 } : t.type === 'door' ? cfg.chapel.door : cfg.interior[{ exit: 'door', offering: 'offering', board: 'board' }[t.type]];
    ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💬', p.x, p.y - (t.type === 'npc' ? 200 : 170) + Math.sin(tm * 4) * 5); }
  if (scene === 'field') { const D = cfg.chapel.door; ctx.font = '700 18px Pretendard,sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(80,60,100,.6)'; ctx.lineWidth = 4; ctx.textAlign = 'center'; const nm = `⛪ 마실채플 · ${V.current() ? V.current().name : '우리 동네'}`; ctx.strokeText(nm, D.x, D.y + 40); ctx.fillText(nm, D.x, D.y + 40); }
}
function sitDraw(g, c, sit) { if (!sit || scene !== 'inside') { c.draw(g); return; }
  // v7 side-view seated pose: side-profile body raised onto the cushion, legs clipped at the seat line, then the pew's seat-front + legs are redrawn over the lap
  const I = cfg.interior, y = c.y, sx = c.speedNow, em = c.emote; c.speedNow = 0; if (em !== 'pray') c.emote = null; if (!['E', 'W'].includes(c.face)) c.face = 'W'; c.dface = c.face;
  let pi = -1, bd = 1e9; I.pews.forEach((p, k) => { const d = Math.abs(p[0] + I.seatDx - c.x) + Math.abs(p[1] - y); if (d < bd) { bd = d; pi = k; } });
  g.save(); g.beginPath(); g.rect(c.x - 200, y - 500, 400, 500 - I.seatCut); g.clip(); c.y = y - I.sitLift; c.draw(g); c.y = y; g.restore();
  if (pi >= 0) inside.drawPew(g, pi, 'front'); c.speedNow = sx; if (em !== 'pray') c.emote = em; }

// ---------- minimap + full map ----------
let mmT = 0, mapBg = null;
function fieldBg() { if (mapBg) return mapBg; const c = document.createElement('canvas'); c.width = 900; c.height = Math.round(900 * world.H / world.W); const g = c.getContext('2d'), k = c.width / world.W; g.drawImage(IMG.island, 0, 0, c.width, c.height);
  // v7: paint buildings/trees onto the map too (y-sorted), so the minimap reads like the village
  const L = [{ img: cfg.chapel.img, x: cfg.chapel.x, y: cfg.chapel.door.y, h: cfg.chapel.h, ax: cfg.chapel.ax, ay: cfg.chapel.ay }, ...cfg.props].sort((a, b) => a.y - b.y);
  for (const p of L) { const im = IMG[p.img]; if (!im) continue; const h = p.h * k * 1.15, w = h * im.width / im.height; g.drawImage(im, p.x * k - w * (p.ax ?? .5), p.y * k - h * (p.ay ?? .95), w, h); }
  return (mapBg = c); }
// fit world (W x H) into box (w x h) "contain"
function fit(W, H, w, h) { const s = Math.min(w / W, h / H); return { s, ox: (w - W * s) / 2, oy: (h - H * s) / 2 }; }
function dot(g, x, y, r, fill, stroke = '#fff') { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = fill; g.fill(); g.lineWidth = Math.max(1.5, r * .45); g.strokeStyle = stroke; g.stroke(); }
function paintMap(g, w, h, big) {
  g.clearRect(0, 0, w, h); g.fillStyle = cfg.world.sky; g.fillRect(0, 0, w, h);
  const F = fit(world.W, world.H, w, h), P = (x, y) => [F.ox + x * F.s, F.oy + y * F.s];
  g.drawImage(fieldBg(), F.ox, F.oy, world.W * F.s, world.H * F.s);
  const r = big ? 7 : 3.2;
  Col.dots((cx, cy, c) => { const [x, y] = P(cx, cy); dot(g, x, y, r * .6, c); });
  for (const p of pickups) { const [x, y] = P(p.x, p.y); dot(g, x, y, r * .8, '#ffd84a'); }
  for (const n of fieldNpcs) { const [x, y] = P(n.x, n.y); dot(g, x, y, r * .85, '#5fcf8a'); }
  for (const n of wanderers) { const [x, y] = P(n.x, n.y); dot(g, x, y, r * .7, '#86a8ff'); }
  { const [x, y] = P(cfg.chapel.x, cfg.chapel.y); g.font = `${big ? 30 : 15}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⛪', x, y); }
  { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${big ? 13 : 9}px Pretendard,sans-serif`; g.lineWidth = big ? 4 : 3; g.strokeStyle = 'rgba(255,255,255,.95)'; g.fillStyle = '#4a2b78';
    if (!big) for (const sp of cfg.spots) { const [x, y] = P(sp.x, sp.y); g.strokeText(sp.name, x, y); g.fillText(sp.name, x, y); } }
  const pp = scene === 'field' ? player : { x: cfg.chapel.door.x, y: cfg.chapel.door.y };
  { const [x, y] = P(pp.x, pp.y); const pulse = 1 + Math.sin(performance.now() / 220) * .2; g.globalAlpha = .35; dot(g, x, y, r * 2.2 * pulse, '#ff6fa8', 'rgba(0,0,0,0)'); g.globalAlpha = 1; dot(g, x, y, r * 1.15, '#ff4f93');
    if (scene === 'field') { g.strokeStyle = '#ff4f93'; g.lineWidth = big ? 3 : 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(player.ang) * r * 3, y + Math.sin(player.ang) * r * 3); g.stroke(); } }
  return F;
}
function sizeCanvas(c) { const pr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight; if (c.width !== Math.round(w * pr) || c.height !== Math.round(h * pr)) { c.width = Math.round(w * pr); c.height = Math.round(h * pr); } const g = c.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0); return [g, w, h]; }
function drawMinimap() { if (!S || !world) return; const c = $('#mmcv'); if (!c.clientWidth) return; const [g, w, h] = sizeCanvas(c);
  if (scene === 'inside') { g.clearRect(0, 0, w, h); const F = fit(inside.W, inside.H, w, h); g.fillStyle = '#3b2f4a'; g.fillRect(0, 0, w, h); g.drawImage(IMG.in_bg, F.ox, F.oy, inside.W * F.s, inside.H * F.s); dot(g, F.ox + player.x * F.s, F.oy + player.y * F.s, 3.5, '#ff4f93'); }
  else paintMap(g, w, h, false); }
function openMap(tab = 'isle') { if (!S || worship) return; if (S.mode === 'decor') $('#ddone').click(); openModal('#map'); V.mapTab(tab);
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
window.DEBUG_COL = /[?&]debug=col/.test(location.search); addEventListener('keydown', e => { if (e.code === 'Backquote' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) { window.DEBUG_COL = !window.DEBUG_COL; } });
window.G = { inNpcs: () => inNpcs, get modalOpen() { return !!document.querySelector(".modal.show, .modal.open, .modal[style*=flex]"); }, SH, placeAt, AV, Cust, wanderers, addWanderer: () => { const p = world.randomPoint(); const c = new Char(SP, 'player', 'basic', p.x, p.y, { name: '주민', tagColor: '#d7e6ff', cfg, drawH: 145 }); c.ai = { t: Math.random() * 3, tgt: null, chat: 3 + Math.random() * 6 }; wanderers.push(c); return c; }, get S() { return S; }, get player() { return player; }, get scene() { return scene; }, cfg: () => cfg,
  start: (n, o) => { St.wipe(); selOutfit = o; startGame(St.newSave(n, o)); }, moveDir: (deg, ms) => { scripted = { a: deg * Math.PI / 180, ms }; },
  tp: (x, y) => { sitting = null; player.x = x; player.y = y; snapCam(); }, interact, enterChapel, exitChapel, openGacha, doRoll, openInv, openDecor, placeAt, openBoard, startWorship, worshipTap,
  get worship() { return worship; }, V, net, remotes, jump: doJump, openMap, teleport, world: () => world, closeModal, emote, pickups, C: Col, Svc, nearest, refreshHud, sitOn, toast, openModal, get inside() { return inside; }, cam, goFloor, addXp, coinFx, persist, dialog, get modal() { return modal; }, get sitting() { return sitting; }, standUp, pickPew, openInv, drawMinimap: () => drawMinimap() };

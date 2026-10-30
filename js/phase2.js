// Phase 2: 달란트 currency, offering ritual, shops, collections/achievements, hotkeys, join toasts, seats, SFX, voices,
// church tiers + leaderboard, nationwide dong map, per-dong village variation. In-game currency only (no real money).
import { Aud } from './audio.js';
import { Reader } from './reader.js';
const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const G = () => window.G, C = () => G().cfg(), S = () => G().S;
const TAL = '<img class="tal" src="assets/v7/ic_talent.webp" alt="">';
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const RAR = { 일반: { c: '#8aa0c8', fx: 1 }, 희귀: { c: '#b06cff', fx: 2 }, 영웅: { c: '#ff6fa8', fx: 2 }, 전설: { c: '#ffb020', fx: 3 } };
const VERSES = [['여호와는 나의 목자시니 내게 부족함이 없으리로다', '시편 23:1'], ['항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라', '데살로니가전서 5:16-18'], ['너희 염려를 다 주께 맡기라 이는 그가 너희를 돌보심이라', '베드로전서 5:7'], ['내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라', '빌립보서 4:13'], ['수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라', '마태복음 11:28'], ['사랑은 오래 참고 사랑은 온유하며', '고린도전서 13:4'], ['너는 마음을 다하여 여호와를 신뢰하고', '잠언 3:5'], ['두려워하지 말라 내가 너와 함께 함이라', '이사야 41:10'], ['각각 그 마음에 정한 대로 할 것이요 인색함으로나 억지로 하지 말지니', '고린도후서 9:7'], ['너희는 세상의 빛이라', '마태복음 5:14']];
const GLASS = [{ id: 'g1', name: '어린양의 창', n: 4 }, { id: 'g2', name: '비둘기의 창', n: 4 }, { id: 'g3', name: '빛의 십자가 창', n: 4 }];
const BADGES = [[7, '🫒 올리브 잎'], [30, '🕊️ 비둘기'], [100, '🌟 빛의 비둘기']];
const ART = t => t >= 4 ? 3 : t >= 2 ? 2 : 1; // server tier 1..5 → interior art 1..3
// v8: every level is a real church (no tent / log cabin). Thresholds mirror server church_tier().
export const LEVELS = [
  { t: 1, need: 0, name: '스테인드글라스 예배당', img: 'v7/church_grand.webp', unlock: ['종탑과 스테인드글라스 본당', '1층 본당 · 2층 성가대석 · 지하 친교실'] },
  { t: 2, need: 1000, name: '두 종 예배당', img: 'v7/church_l2.webp', unlock: ['더 높은 종탑 · 종 2개', '꽃 정원과 산울타리', '따뜻한 랜턴', '실내 장식 업그레이드'] },
  { t: 3, need: 5000, name: '정원 예배당', img: 'v7/church_l3.webp', unlock: ['오른쪽 별관(부속동)', '분수와 꽃길', '파사드 줄조명', '장미창 추가'] },
  { t: 4, need: 20000, name: '빛의 대성당', img: 'v7/church_l4.webp', unlock: ['쌍둥이 종탑', '빛나는 황금 십자가', '양쪽 날개 건물', '빛의 대예배당 실내'] },
  { t: 5, need: 80000, name: '영광의 대성당', img: 'v7/church_l5.webp', unlock: ['파스텔 돔과 금빛 장식', '두 개의 아치 별관', '반짝이는 스테인드글라스', '정원 · 분수 · 줄조명 완성'] }];
const lvOf = t => LEVELS.reduce((a, L) => t >= L.need ? L.t : a, 1);
function lvProg() { const L = LEVELS[tier - 1], N = LEVELS[tier]; return N ? Math.max(0, Math.min(1, (total - L.need) / (N.need - L.need))) : 1; }
function lvHud() { const b = document.getElementById('chlv'); if (!b) return; const t = document.getElementById('chlvt'); if (t) t.textContent = `Lv.${tier}`; const bar = document.getElementById('chlvbar'); if (bar) bar.style.width = (lvProg() * 100).toFixed(1) + '%'; const N = LEVELS[tier]; b.title = N ? `${LEVELS[tier - 1].name} · 다음 레벨까지 ${(N.need - total).toLocaleString()} 달란트` : `${LEVELS[tier - 1].name} · 최고 레벨`; }
export function openLevels() { const m = modal('p2lv', '⛪ 우리 예배당 레벨'), d = G().V?.current?.();
  m.querySelector('.body').innerHTML = `<p class="lvsum"><b>${esc(d ? d.name : '우리 동네')} 마실채플 Lv.${tier}</b> · 누적 헌금 ${total.toLocaleString()} 달란트${LEVELS[tier] ? ` · 다음 레벨까지 ${(LEVELS[tier].need - total).toLocaleString()}` : ' · 최고 레벨!'}<span class="lvbarbig"><i style="width:${(lvProg() * 100).toFixed(1)}%"></i></span><small>헌금은 무료 달란트로만 드려요 · 동네 모두의 헌금이 모여 레벨이 올라가요</small></p>
  <div class="lvlist">${LEVELS.map(L => `<div class="lvcard ${L.t === tier ? 'cur' : L.t > tier ? 'locked' : 'done'}"><div class="lvimg"><img src="assets/${L.img}" alt="Lv.${L.t}" loading="lazy">${L.t > tier ? '<span class="lock">🔒</span>' : ''}${L.t === tier ? '<span class="now">지금 여기</span>' : ''}</div>
    <div class="lvtx"><b>Lv.${L.t} ${L.name}</b><em>${L.need ? `누적 ${L.need.toLocaleString()} 달란트` : '시작 레벨'}</em><ul>${L.unlock.map(u => `<li>${u}</li>`).join('')}</ul></div></div>`).join('')}</div>`;
  G().openModal('#p2lv'); }

let P, seats = new Map(), names = new Map(), joinMute = 0, tq = [], tbusy = 0, DL = null, tier = 1, total = 0, shards = [], vary = null, ritual = null, last = {};

function st() { const s = S(); s.p2 ||= { shard: 0, fruit: 0, days: [], glass: {}, food: 0, ach: {}, offered: 0 }; return s.p2; }
function save() { try { G().persist(); } catch { } }
function sfx(n) { try { Aud.play(n); } catch { } }
export function jtoast(text, sound = 'bell') { if (tq.length > 4) tq.shift(); tq.push([text, sound]); if (!tbusy) nextToast(); }
function nextToast() { const it = tq.shift(); if (!it) { tbusy = 0; return; } tbusy = 1; const box = $('#jtoasts'); const d = document.createElement('div'); d.className = 'jt'; d.innerHTML = it[0]; box.append(d); if (it[1]) sfx(it[1]);
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); nextToast(); }, 2300); }
function modal(id, title, wide) { let m = document.getElementById(id); if (!m) { m = document.createElement('div'); m.id = id; m.className = 'modal'; m.innerHTML = `<div class="panel ${wide ? 'wide' : ''}"><button class="close">✕</button><h2>${title}</h2><div class="body"></div></div>`; document.body.append(m); m.querySelector('.close').onclick = () => G().closeModal(); } return m; }
function toggle(id, fn) { if (G().modal === '#' + id) { G().closeModal(); return; } fn(); }
function addCoins(n) { S().coins += n; window.W?.earn('collect', n); G().coinFx(); G().refreshHud(); save(); }
function celebrate(text) { const f = document.createElement('div'); f.className = 'p2cele'; f.innerHTML = `<div>${text}</div>` + Array.from({ length: 24 }, (_, i) => `<i style="--a:${i * 15}deg;--d:${(i % 4) * .08}s"></i>`).join(''); document.body.append(f); sfx('fanfare'); setTimeout(() => f.remove(), 2600); }
function ach(id, label) { const p = st(); if (p.ach[id]) return; p.ach[id] = today(); celebrate('🏆 업적 달성!<br><b>' + label + '</b>'); save(); }

// ---------- currency / HUD ----------
function renameCurrency() { const cb = $('#coinbox'); if (cb && !cb.querySelector('.tal')) { cb.innerHTML = `${TAL} <b id="coins">${S()?.coins ?? 0}</b><small>달란트</small>`; }
  for (const b of document.querySelectorAll('#svgive button')) if (+b.dataset.g) b.textContent = b.dataset.g + ' 달란트';
  const btn = $('#btn-gacha'); if (btn) btn.innerHTML = '💝<small>헌금하기</small>';
  const ch = $('#btn-church'); if (ch) { ch.style.display = ''; ch.innerHTML = '🏆<small>순위</small>'; ch.onclick = () => toggle('church', openLead); }
  const cd = $('#btn-candle'); if (cd) cd.style.display = 'none'; }

// ---------- join / leave toasts ----------
function wireNet() { const net = G().net; if (!net || !net.on) return;
  net.on('join', (p, m) => { const n = (m && (m.name || m.n)) || p.name || '친구'; names.set(p.id, n); if (performance.now() < joinMute) return; const d = G().V?.current?.(); jtoast(`👋 <b>${esc(n)}</b>님이 접속했어요${d ? ' · ' + esc(d.name) : ''}`, 'bell'); });
  net.on('leave', k => { const n = names.get(k); names.delete(k); for (const [i, o] of seats) if (o.id === k) seats.delete(i); if (n && performance.now() > joinMute) jtoast(`🌙 ${esc(n)}님이 나갔어요`, null); });
  net.on('seat', p => { if (p.op === 'claim') seats.set(p.i, { id: p.id || p.from, name: p.name }); else for (const [i, o] of seats) if (i === p.i) seats.delete(i); });
  net.on('offer', p => { if (Aud.P().ndon) jtoast(`💝 <b>${esc(p.name)}</b>님이 헌금 ${+p.amount}달란트를 드렸어요`, 'coin'); if (p.total) setTotal(p.total, p.tier); });
  net.on('tier', p => { if (p.tier > tier) { setTotal(p.total, p.tier); upgradeFx(); } });
  net.on('prayer', p => { if (p.op === 'amen' && p.owner && p.owner === net.secret?.().slice(0, 8)) jtoast('🕯 누군가 내 기도제목에 함께 기도했어요', 'amen'); });
  const orig = net.join?.bind(net); if (orig) net.join = async (...a) => { joinMute = performance.now() + 2500; seats.clear(); return orig(...a); };
  joinMute = performance.now() + 2500; }

// ---------- seats ----------
const seatApi = { seatTaken: i => seats.has(i) && seats.get(i).id !== 'me', claim(i) { seats.set(i, { id: 'me' }); G().net?.send?.('seat', { op: 'claim', i, name: S().name }); },
  release() { for (const [i, o] of seats) if (o.id === 'me') { seats.delete(i); G().net?.send?.('seat', { op: 'free', i }); } } };

// ---------- church tier ----------
function setTotal(t, tr) { total = Math.max(total, +t || 0); tier = Math.max(tier, tr || 1); const ins = G().inside; if (ins) ins.tier = ART(tier); lvHud(); }
async function loadTotal() { const d = G().V?.current?.(), sb = G().net?.sb; if (!d) { const L = +localStorage.getItem('p2_local_total') || 0; setTotal(L, lvOf(L)); return; }
  try { const r = await sb.from('churches').select('total').eq('dong', d.cd === '0' ? '0000000000' : d.cd).maybeSingle(); const t = r.data?.total || 0; const tr = await sb.rpc('church_tier', { t }); setTotal(t, tr.data || 1); } catch { } }
function upgradeFx() { if (!Aud.P().nlvl) return; celebrate(`⛪ 예배당이 새로워졌어요!<br><b>Lv${tier} ${LEVELS[tier - 1]?.name || ''}</b>`); voiceCat('pastor', 'upgrade'); }

// ---------- offering ritual ----------
function openOffer(atBox) { if (!S()) return; const m = modal('p2offer', '💝 헌금하기'); const b = m.querySelector('.body');
  b.innerHTML = `<p class="mnote">${atBox ? '⛪ 예배당 헌금함 앞이에요 · 더 큰 축복의 기회!' : '어디서든 감사의 마음을 드릴 수 있어요'}</p>
  <div class="row amt">${[10, 30, 100, 300].map(a => `<button class="am" data-a="${a}" ${S().coins < a ? 'disabled' : ''}>${TAL}${a}</button>`).join('')}</div>
  <input id="p2pray" maxlength="40" placeholder="기도제목 한 줄 (선택 · 기도벽에 올라가요)">
  <p class="mnote">내 달란트: <b>${S().coins}</b> · 게임 속 달란트로만 드려요 (실제 결제 없음) · <a href="#" id="p2odds">[? 확률 정보]</a></p><button id="p2give" class="big" disabled>헌금 드리기</button>`;
  $('#p2odds').onclick = e => { e.preventDefault(); openOdds(); };
  let amt = 0; b.querySelectorAll('.am').forEach(x => x.onclick = () => { amt = +x.dataset.a; b.querySelectorAll('.am').forEach(y => y.classList.toggle('on', y === x)); $('#p2give').disabled = false; sfx('click'); });
  $('#p2give').onclick = () => give(amt, $('#p2pray').value.trim(), atBox);
  G().openModal('#p2offer'); }
async function openOdds() { let rows = await window.W?.odds?.().catch(() => null); const pool = C().gacha.pool, tw = pool.reduce((a, p) => a + p.w, 0);
  if (!rows) rows = pool.map(p => ({ name: p.name, rar: p.rar, pct: +(100 * p.w / tw).toFixed(2), pct_box: null }));
  const m = modal('p2odds_m', '🎲 축복 선물 확률'); m.querySelector('.body').innerHTML = `<p class="mnote">헌금(게임 속 달란트)을 드리면 아래 확률로 선물 1개를 받아요. 확률은 서버에서 정하고 기록돼요. 실제 돈으로는 뽑을 수 없어요.</p>
  <table class="odds"><tr><th>선물</th><th>등급</th><th>확률</th><th>헌금함 앞</th></tr>${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.rar)}</td><td>${r.pct}%</td><td>${r.pct_box ?? '-'}%</td></tr>`).join('')}</table>
  <p class="mnote">이미 가진 장신구가 나오면 ${C().gacha.dupRefund}달란트로 돌려드려요 · 40% 확률로 위 선물 대신 옷장 코스튬(외형만)이 나와요</p><button class="big" onclick="G.closeModal()">확인</button>`; G().openModal('#p2odds_m'); }
function roll(atBox) { const pool = C().gacha.pool.map(p => ({ ...p, w: p.rar === '일반' ? p.w : p.w * (atBox ? 1.8 : 1) })); let r = Math.random() * pool.reduce((a, p) => a + p.w, 0); for (const p of pool) if ((r -= p.w) < 0) return p; return pool[0]; }
async function give(amt, pray, atBox) { const s = S(); if (!amt || s.coins < amt) return; s.coins -= amt; G().refreshHud(); G().closeModal(); save();
  const pl = G().player; pl.kneel = 1; sfx('page');
  const d = G().V?.current?.(), net = G().net, online = !!(d && net?.sb && window.W?.online);
  // server decides the reward (server-side random + gacha_logs); local roll only when offline
  const srv = online ? Promise.resolve(net.sb.rpc('offer', { p_dong: d.cd, p_dong_name: d.name, p_name: s.name, p_amount: amt, p_secret: net.secret(), p_at_box: !!atBox })).catch(e => ({ error: e })) : null;
  const v = VERSES[Math.floor(Math.random() * VERSES.length)];
  const fx = document.createElement('div'); fx.id = 'p2ritual'; fx.className = atBox ? 'grand' : ''; fx.innerHTML = `<canvas></canvas><small>탭하면 건너뛰기</small>`; document.body.append(fx);
  const cv = fx.querySelector('canvas'); let skip = false; fx.onclick = () => skip = true;
  const t0 = performance.now(), D = atBox ? 3600 : 3000; setTimeout(() => sfx('bell'), 200); setTimeout(() => sfx('amen'), 1500);
  await new Promise(res => { const step = () => { const t = (performance.now() - t0) / D; drawRitual(cv, Math.min(1, t), atBox); if (t >= 1 || skip) return res(); requestAnimationFrame(step); }; step(); });
  const R = srv ? await srv : null; fx.remove(); pl.kneel = 0;
  if (R && (R.error || !R.data)) { const m = String(R.error?.message || ''); s.coins += amt; await window.W?.sync(); G().refreshHud(); return G().toast(m.includes('insufficient') ? '달란트가 부족해요' : m.includes('rate') || m.includes('cap') ? '잠시 후 다시 드려주세요 🙏' : '헌금을 전하지 못했어요. 잠시 후 다시 시도해요'); }
  const SI = R?.data?.item; let it;
  if (SI) it = (SI.cos && window.AV && window.AV.rollCos(atBox, s.cos ||= [])) || C().gacha.pool.find(p => p.id === SI.id) || { id: SI.id, name: SI.name, rar: SI.rar, kind: SI.kind === 'decor' ? 'decor' : undefined };
  else it = (window.AV && Math.random() < .4 && window.AV.rollCos(atBox, s.cos ||= [])) || roll(atBox);
  // reward
  const p = st(); p.offered += amt; p.fruit += 1; let dup = false, glass = null;
  if (it.kind === 'cos') { s.cos ||= []; s.cos.push(it.id); } else if (it.kind === 'decor') s.decorInv[it.id] = (s.decorInv[it.id] || 0) + 1; else if (s.inv.includes(it.id)) { dup = true; if (!R) s.coins += C().gacha.dupRefund; } else s.inv.push(it.id);
  if (SI ? SI.glass : Math.random() < (atBox ? .6 : .35)) glass = addGlass();
  if (R?.data && typeof R.data.talent === 'number') s.coins = R.data.talent;
  G().addXp(Math.round(amt / 5) + 5); save(); reveal(it, v, dup, glass, atBox);
  // server: dong gauge / leaderboard / broadcast
  if (R) { try { const r = R; if (!r.error && r.data) { const before = tier; const tr = (await net.sb.rpc('church_tier', { t: r.data.total })).data || tier; setTotal(r.data.total, tr); net.send('offer', { name: s.name, amount: amt, total: r.data.total, tier: tr }); if (tr > before) { net.send('tier', { tier: tr, total: r.data.total }); setTimeout(upgradeFx, 2500); } } } catch (e) { console.warn('[offer]', e); } }
  else { const L = (+localStorage.getItem('p2_local_total') || 0) + amt; localStorage.setItem('p2_local_total', L); const before = tier; setTotal(L, L >= 5000 ? 3 : L >= 1000 ? 2 : 1); if (tier > before) setTimeout(upgradeFx, 2500); }
  if (pray && d && net?.sb) { try { await net.postPrayer(d.cd, s.name, pray.slice(0, 40), true); } catch { } }
  if (p.offered >= 1000) ach('off1000', '헌금 1000달란트'); }
function drawRitual(cv, t, grand) { const w = cv.width = innerWidth, h = cv.height = innerHeight, g = cv.getContext('2d'); const cx = w / 2, cy = h * .62;
  g.fillStyle = `rgba(40,25,70,${.55 * Math.min(1, t * 3)})`; g.fillRect(0, 0, w, h);
  const rays = grand ? 14 : 9; for (let i = 0; i < rays; i++) { const a = -Math.PI / 2 + (i - (rays - 1) / 2) * .11, L = h * 1.2 * Math.min(1, t * 2); const gr = g.createLinearGradient(cx, 0, cx, cy); gr.addColorStop(0, 'rgba(255,240,180,.0)'); gr.addColorStop(1, `rgba(255,236,170,${.35 + .2 * Math.sin(t * 20 + i)})`); g.fillStyle = gr; g.beginPath(); g.moveTo(cx + Math.cos(a) * 40 - 0, cy - L); g.lineTo(cx + (i - rays / 2) * 30 + 15, cy - L); g.lineTo(cx, cy); g.fill(); }
  const ey = cy - t * h * .5, s = Math.min(w, h) * .12; g.save(); g.translate(cx, ey); g.rotate(Math.sin(t * 9) * .08); g.fillStyle = '#fff6e6'; g.strokeStyle = '#e8b04a'; g.lineWidth = 3; g.beginPath(); g.roundRect(-s, -s * .62, s * 2, s * 1.24, 10); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-s, -s * .62); g.lineTo(0, s * .1); g.lineTo(s, -s * .62); g.stroke(); g.fillStyle = '#e8577d'; g.font = `${s * .6}px sans-serif`; g.textAlign = 'center'; g.fillText('♥', 0, s * .45); g.restore();
  for (let i = 0; i < (grand ? 60 : 32); i++) { const k = (hash(i) % 1000) / 1000, a = k * 7, r = (t * 300 + k * 200) % (h * .5); g.fillStyle = `rgba(255,${220 + (i % 3) * 10},150,${1 - r / (h * .5)})`; g.beginPath(); g.arc(cx + Math.cos(a) * r, ey + Math.sin(a) * r * .6, 2 + (i % 3), 0, 7); g.fill(); }
  g.fillStyle = '#fff'; g.font = '800 22px Pretendard,sans-serif'; g.textAlign = 'center'; g.fillText(t < .5 ? '🙏 두 손 모아 기도해요…' : '✨ 감사의 마음이 올라가요', cx, h * .86); }
function reveal(it, v, dup, glass, atBox) { const m = modal('p2bless', '🌟 오늘의 축복'); const r = RAR[it.rar] || RAR['일반'];
  const img = it.kind === 'cos' ? it.img : it.kind === 'decor' ? C().decor.find(d => d.id === it.id)?.img : C().acc[it.id]?.img;
  m.querySelector('.body').innerHTML = `<div class="vcard bless"><p>“${esc(v[0])}”</p><small>${esc(v[1])}</small></div>
   <div class="gift r${r.fx}" style="--rc:${r.c}"><img src="assets/${img}" alt=""><b>${esc(it.name)}</b><span>${it.rar}</span>${dup ? `<small>이미 있어서 ${C().gacha.dupRefund}달란트로 돌려받았어요</small>` : ''}</div>
   ${glass ? `<p class="mnote">🪟 스테인드글라스 조각 획득 · ${esc(glass)}</p>` : ''}${atBox ? '<p class="mnote">⛪ 헌금함 보너스: 희귀 확률 UP</p>' : ''}<button class="big" id="p2bok">아멘 🙏</button>`;
  G().openModal('#p2bless'); $('#p2bok').onclick = () => G().closeModal(); sfx(r.fx >= 2 ? 'rare' : 'levelup'); if (r.fx >= 3) celebrate('✨ 전설 축복! ✨'); }
function addGlass() { const p = st(); const open = GLASS.filter(w => (p.glass[w.id] || 0) < w.n); if (!open.length) return null; const w = open[Math.floor(Math.random() * open.length)]; p.glass[w.id] = (p.glass[w.id] || 0) + 1; if (p.glass[w.id] >= w.n) setTimeout(() => ach('glass_' + w.id, w.name + ' 완성 · 예배당 창에 빛나요'), 2800); return `${w.name} ${p.glass[w.id]}/${w.n}`; }

// ---------- shops ----------
function itemInfo(x) { if (x.kind === 'acc') { const p = C().gacha.pool.find(q => q.id === x.id); return { name: p?.name || x.id, img: 'assets/' + C().acc[x.id].img }; }
  if (x.kind === 'decor') { const d = C().decor.find(q => q.id === x.id); return { name: d?.name || x.id, img: 'assets/' + d?.img }; } return { name: x.name, icon: x.icon }; }
function openShop(sh) { const m = modal('p2shop', '🛍️ 상점', true); m.querySelector('h2').textContent = `${sh.icon} ${sh.name}`; const lines = window.DN?.shopLines(sh) || C().shopLines[sh.id] || ['어서 오세요!'];
  const draw = () => { const s = S(); m.querySelector('.body').innerHTML = `<div class="keeper"><b>${esc(sh.keeper)}</b><p>${esc(lines[Math.floor(Math.random() * lines.length)])}</p></div><p class="mnote">내 달란트 ${TAL}<b>${s.coins}</b></div>
    <div class="shopgrid">${(C().shopItems[sh.id] || []).map((x, i) => { const f = itemInfo(x), own = x.kind === 'acc' && s.inv.includes(x.id); return `<button class="sitem" data-i="${i}" ${own || s.coins < x.price ? 'disabled' : ''}>${f.img ? `<img src="${f.img}" alt="">` : `<span class="emo">${f.icon}</span>`}<b>${esc(f.name)}</b><small>${own ? '보유 중' : TAL + x.price}</small></button>`; }).join('')}</div>`;
    m.querySelectorAll('.sitem').forEach(b => b.onclick = () => buy(sh, C().shopItems[sh.id][+b.dataset.i], draw));
    if (sh.id === 'clothes' && window.Cust) { const bd = m.querySelector('.body'); bd.insertAdjacentHTML('afterbegin', `<button class="big" id="shopcz" style="width:100%;margin-bottom:8px">👗 캐릭터 꾸미기 (성별·나이·헤어·옷)</button>`); bd.querySelector('#shopcz').onclick = () => { G().closeModal(); window.Cust.open(); }; window.Cust.shelf(bd, draw); } };
  draw(); G().openModal('#p2shop'); sfx('door'); }
function buy(sh, x, redraw) { const s = S(); if (s.coins < x.price) return; s.coins -= x.price; window.W?.spend(x.price, 'shop:' + x.id); const f = itemInfo(x);
  if (x.kind === 'acc') s.inv.push(x.id); else if (x.kind === 'decor') s.decorInv[x.id] = (s.decorInv[x.id] || 0) + 1; else { st().food++; G().addXp(x.xp || 5); }
  G().refreshHud(); G().coinFx(); save(); sfx('coin'); G().toast(x.kind === 'food' ? `${f.icon} ${f.name} 냠냠! 경험치 +${x.xp}` : `🛍️ ${f.name}을(를) 샀어요 · 가방(I)에서 확인`); redraw(); }

// ---------- bag / collections ----------
function openBag() { const s = S(), p = st(), m = modal('p2bag', '🎒 가방', true);
  const acc = s.inv.map(id => `<button class="sitem" data-acc="${id}"><img src="assets/${C().acc[id]?.img}"><b>${esc(C().gacha.pool.find(q => q.id === id)?.name || id)}</b><small>${Object.values(s.equip).includes(id) ? '착용 중' : '착용하기'}</small></button>`).join('') || '<p class="mnote">아직 없어요 · 헌금 축복이나 옷가게에서 얻어요</p>';
  const dec = Object.entries(s.decorInv).filter(([, n]) => n).map(([id, n]) => { const d = C().decor.find(q => q.id === id); return `<div class="sitem"><img src="assets/${d?.img}"><b>${esc(d?.name)}</b><small>×${n}</small></div>`; }).join('') || '<p class="mnote">없어요</p>';
  m.querySelector('.body').innerHTML = `<div class="bagtop"><span>${TAL}<b>${s.coins}</b> 달란트</span><span><img class="tal" src="assets/v7/ic_shard.webp">빛조각 <b>${p.shard}</b></span><span><img class="tal" src="assets/v7/ic_fruit.webp">감사 열매 <b>${p.fruit}</b></span></div><h4>장신구</h4><div class="shopgrid">${acc}</div><h4>꾸미기 소품 (B 배치)</h4><div class="shopgrid">${dec}</div>`;
  m.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => { G().closeModal(); G().openInv(); });
  G().openModal('#p2bag'); }
function openCol() { const p = st(), m = modal('p2col', '🏅 수집 도감 · 업적', true), days = p.days.length;
  const basket = Math.min(1, (p.fruit % 30) / 30);
  m.querySelector('.body').innerHTML = `<div class="colrow"><img src="assets/v7/ic_candle.webp"><div><b>빛조각 ${p.shard}/100</b><div class="bar"><i style="width:${Math.min(100, p.shard)}%"></i></div><small>${p.shard >= 100 ? '🏆 빛의 촛대 획득!' : '100개 모으면 빛의 촛대 트로피'}</small></div></div>
   <div class="colrow"><img src="assets/v7/ic_fruit.webp"><div><b>감사 열매 ${p.fruit}개</b><div class="basket"><i style="height:${Math.round(basket * 100)}%"></i></div><small>예배·임무·헌금으로 바구니가 채워져요 (30개마다 한 바구니)</small></div></div>
   <div class="colrow"><img src="assets/v7/ic_dove.webp"><div><b>출석 ${days}일</b><div class="badges">${BADGES.map(([n, l]) => `<span class="${days >= n ? 'on' : ''}">${l}<small>${n}일</small></span>`).join('')}</div></div></div>
   <h4>🪟 스테인드글라스 도감 <small>(완성하면 예배당 창에 나타나요)</small></h4><div class="glassbook">${GLASS.map(w => { const n = p.glass[w.id] || 0; return `<div class="gw ${n >= w.n ? 'done' : ''}"><img src="assets/v7/ic_glass.webp" style="clip-path:inset(${100 - n / w.n * 100}% 0 0 0)"><b>${w.name}</b><small>${n}/${w.n}</small></div>`; }).join('')}</div>
   <h4>업적</h4><div class="achl">${Object.entries(p.ach).map(([k, d]) => `<span>🏆 ${esc(k)} <small>${d}</small></span>`).join('') || '<small class="mnote">아직 없어요</small>'}</div>`;
  G().openModal('#p2col'); }

// ---------- leaderboard ----------
async function openLead() { G().openModal('#church'); const d = G().V?.current?.(); $('#chname').textContent = d ? `${d.name} 예배당` : '우리 동네 예배당'; G().V?.index?.().then(I => { let e = $('#chregion'); if (!e) { e = document.createElement('p'); e.id = 'chregion'; e.className = 'mnote'; $('#chtier').before(e); } e.innerHTML = `📍 ${esc(regionOf(I, d?.cd) || '지역을 아직 고르지 않았어요')} <button id="chregbtn" class="mini">지역 바꾸기</button>`; $('#chregbtn').onclick = () => { G().closeModal(); $('#dongbtn')?.click(); }; }).catch(() => {});
  const nx = [0, 1000, 5000, 20000, 80000, 1e9][tier]; $('#chtier').innerHTML = `<b>Tier ${tier}</b> · 동네 달란트 ${TAL}${total.toLocaleString()}달란트`; $('#chbar').style.width = Math.min(100, total / nx * 100) + '%'; $('#chnext').textContent = tier < 5 ? `다음 단계까지 ${(nx - total).toLocaleString()}달란트` : '최고 단계예요!';
  document.querySelectorAll('.chg').forEach(b => { b.textContent = b.dataset.g + ' 달란트'; b.onclick = () => { G().closeModal(); openOffer(false); }; });
  let sc = 'dong', pe = 'week'; const run = async () => { const L = $('#lblist'), sb = G().net?.sb; L.innerHTML = '<li class="mnote">불러오는 중…</li>';
    try { let rows; if (sc === 'church') { const I = await G().V.index().catch(() => []); rows = (await sb.rpc('church_rank', { p_period: pe })).data.map(r => [r.name + ' 예배당', r.total, regionOf(I, r.dong)]); } else rows = (await sb.rpc('leaderboard', { p_scope: sc, p_dong: d?.cd || '', p_period: pe })).data.map(r => [r.name, r.total]);
      L.innerHTML = rows.length ? rows.map(([n, t, rg], i) => `<li><b>${['🥇', '🥈', '🥉'][i] || i + 1}</b> <span class="lbn">${esc(n)}${rg !== undefined ? `<small class="lbrg">${esc(rg || '지역 정보 없음')}</small>` : ''}</span> <span>헌금 ${(+t).toLocaleString()}달란트</span></li>`).join('') : '<li class="mnote">아직 기록이 없어요 · 첫 헌금을 드려 보세요</li>'; }
    catch { L.innerHTML = '<li class="mnote">오프라인이에요</li>'; } };
  document.querySelectorAll('.lbt').forEach(b => b.onclick = () => { sc = b.dataset.s; document.querySelectorAll('.lbt').forEach(x => x.classList.toggle('on', x === b)); run(); });
  document.querySelectorAll('.lbp').forEach(b => b.onclick = () => { pe = b.dataset.p; document.querySelectorAll('.lbp').forEach(x => x.classList.toggle('on', x === b)); run(); });
  run(); }

// ---------- pickups (field 빛조각, interior 달란트) ----------
function seedShards() { const w = G().world(), W = w.W, H = w.H; let seed = hash(today()); const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) % 100000) / 100000;
  shards = []; for (let k = 0; k < 4000 && shards.length < 40; k++) { const x = rnd() * W, y = rnd() * H; if (w.walkable(x, y)) shards.push({ x, y, i: shards.length, t: 0 }); } }
function tickPickups(tm) { const pl = G().player, s = S(); if (!pl || !s) return; const p = st();
  if (G().scene === 'field') for (const o of shards) { if (o.t > tm) continue; if (Math.hypot(o.x - pl.x, o.y - pl.y) < 55) { o.t = tm + 90; p.shard++; sfx('pick'); if (p.shard % 10 === 0) addCoins(5); G().toast(`✨ 빛조각 ${p.shard}/100`); if (p.shard >= 100) ach('candle', '빛의 촛대'); save(); } }
  else { const key = 'in_' + today(); p[key] ||= []; (C().interior.pickups || []).forEach(([x, y], i) => { if (p[key].includes(i)) return; if (Math.hypot(x - pl.x, y - pl.y) < 50) { p[key].push(i); addCoins(5); sfx('coin'); G().toast('달란트 +5'); if (i === 0) { const g = addGlass(); if (g) G().toast('🪟 ' + g); } } }); } }
function objs(tm) { const p = S() && st(), key = 'in_' + today(), got = (p && p[key]) || [], out = [];
  (C().interior.pickups || []).forEach(([x, y], i) => { if (got.includes(i)) return; out.push({ y, draw: g => { const b = Math.sin(tm * 3 + i) * 5; g.drawImage(IMG('v7/ic_talent.webp'), x - 18, y - 52 + b, 36, 36); } }); });
  // completed stained-glass windows glow on the interior wall
  GLASS.forEach((w, i) => { if ((p?.glass?.[w.id] || 0) < w.n) return; out.push({ y: -1, draw: g => { const x = 640 + i * 260, y = 150; g.save(); g.globalAlpha = .55 + .2 * Math.sin(tm * 2 + i); const gr = g.createRadialGradient(x, y, 10, x, y, 120); gr.addColorStop(0, 'rgba(255,240,170,.9)'); gr.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = gr; g.fillRect(x - 120, y - 120, 240, 240); g.globalAlpha = 1; g.drawImage(IMG('v7/ic_glass.webp'), x - 55, y - 70, 110, 140); g.restore(); } }); });
  return out; }
const imgs = {}; function IMG(n) { if (!imgs[n]) { imgs[n] = new Image(); imgs[n].src = 'assets/' + n; } return imgs[n]; }
function fieldObjs(tm) { const out = []; const im = IMG('v7/ic_shard.webp');
  for (const o of shards) if (o.t < tm) out.push({ y: o.y, draw: g => { const b = Math.sin(tm * 3 + o.i) * 6; g.fillStyle = 'rgba(255,250,200,.35)'; g.beginPath(); g.ellipse(o.x, o.y, 20, 7, 0, 0, 7); g.fill(); g.drawImage(im, o.x - 20, o.y - 50 + b, 40, 40); } });
  // per-dong signboard + landmark label
  const c = C().chapel, d = G().V?.current?.(), nm = d ? d.name : '우리 동네', v = vary;
  out.push({ y: c.door.y + 70, draw: g => { const x = c.door.x + 250, y = c.door.y + 60; g.fillStyle = '#8a5a3a'; g.fillRect(x - 5, y - 70, 10, 70); g.fillStyle = '#fff8ea'; g.strokeStyle = '#b07a4a'; g.lineWidth = 5; g.beginPath(); g.roundRect(x - 150, y - 132, 300, 72, 14); g.fill(); g.stroke(); g.fillStyle = '#4a2b78'; g.font = '800 23px Pretendard,sans-serif'; g.textAlign = 'center'; g.fillText(`${nm} 마실채플 Lv.${tier}`, x, y - 100); const pw = 230, pr = lvProg(); g.fillStyle = '#eadcf7'; g.beginPath(); g.roundRect(x - pw / 2, y - 86, pw, 12, 6); g.fill(); g.fillStyle = '#f2b33d'; if (pr > 0) { g.beginPath(); g.roundRect(x - pw / 2, y - 86, Math.max(12, pw * pr), 12, 6); g.fill(); } g.font = '700 12px Pretendard,sans-serif'; g.fillStyle = '#7a5a9a'; g.fillText('👆 눌러서 레벨 보기', x, y - 50); } });
  if (v) { const L = C().spots.find(s => s.id === 'plaza'); out.push({ y: 1e5, draw: g => { g.font = '800 30px Pretendard,sans-serif'; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = '#fff'; g.fillStyle = '#4a2b78'; g.strokeText(v.land, L.x, L.y - 260); g.fillText(v.land, L.x, L.y - 260); } }); }
  return out; }
// per-dong deterministic palette / season (light variation; full unique maps per dong = later expansion)
const SEASONS = [['🌸 봄', 'rgba(255,190,220,.10)', '#ffd1e3'], ['🌿 여름', 'rgba(120,220,150,.08)', '#bff0c8'], ['🍁 가을', 'rgba(255,160,80,.12)', '#ffd2a8'], ['❄️ 겨울', 'rgba(220,235,255,.18)', '#ffffff']];
function computeVary() { const d = G().V?.current?.(); try { window.DN?.apply(d); } catch (e) { console.warn(e); } const h = hash(d ? d.cd : 'solo'); const se = SEASONS[h % 4]; vary = { h, se, land: `${se[0]} ${d ? d.name : '마실'} ${['느티나무 광장', '분수 광장', '꽃길 광장', '별빛 광장'][(h >> 3) % 4]}` }; }
function ground(g, tm) { if (!vary) return; const w = G().world(); g.fillStyle = vary.se[1]; g.fillRect(0, 0, w.W, w.H);
  if (vary.h % 4 === 3 || vary.h % 4 === 0) { g.fillStyle = vary.se[2]; const sp = g.canvas ? 0 : 0; for (let i = 0; i < 60; i++) { const x = (hash(i * 7) % w.W), y = ((hash(i * 13) + tm * 40 * (1 + i % 3)) % w.H); g.globalAlpha = .7; g.beginPath(); g.arc(x, y, 5 + i % 4, 0, 7); g.fill(); } g.globalAlpha = 1; } }

// ---------- voices ----------
async function dl() { return DL ||= await (await fetch('data/dialogue.json')).json(); }
let au = null; function playVoice(line) { try { au?.pause(); au = new Audio(`assets/voice/${line.id}.mp3`); au.volume = Aud.muted ? 0 : .9; au.play().catch(() => { }); } catch { } }
async function voice(who, npc) { if (!Aud.P().voice) return; const D = await dl(); const L = D.lines.filter(l => l.who === who && (l.cat === 'talk' || l.cat === 'greet')); if (!L.length) return; const l = L[Math.floor(Math.random() * L.length)]; playVoice(l); npc?.say?.(l.text, 4); }
async function voiceCat(who, cat, i) { if (!Aud.P().voice) return; const D = await dl(); const L = D.lines.filter(l => l.who === who && l.cat === cat); if (!L.length) return; const l = L[i ?? Math.floor(Math.random() * L.length)] || L[0]; playVoice(l); return l; }

// ---------- service extras: portrait + 오늘의 인도자 + group photo ----------
function wireService() { const Svc = G().C && G().Svc; if (!Svc) return; const r0 = Svc.render.bind(Svc), f0 = Svc.finish.bind(Svc);
  Svc.render = function () { r0(); const box = $('#svc'); let pp = $('#svport'); if (!pp) { pp = document.createElement('div'); pp.id = 'svport'; pp.innerHTML = '<canvas width="120" height="120"></canvas><div><small>오늘의 인도자</small><b id="svlead"></b></div>'; box.prepend(pp); }
    $('#svlead').textContent = (Svc.leadName?.() || '목사님'); const P = G().inside && (Svc.a?.pastor?.()); if (P) { const g = pp.querySelector('canvas').getContext('2d'); g.clearRect(0, 0, 120, 120); g.save(); const ox = P.x, oy = P.y; g.translate(60 - ox * 1, 0); g.beginPath(); g.arc(ox, 60, 56, 0, 7); g.fillStyle = '#ffeef6'; g.fill(); g.clip(); const sc = 1.4; g.translate(ox, 0); g.scale(sc, sc); g.translate(-ox, 0); P.y = 120; try { P.draw(g); } catch { } P.y = oy; g.restore(); }
    if (Svc.phase !== last.ph) { last.ph = Svc.phase; if (Svc.phase >= 0) voiceCat('pastor', 'svc', Svc.phase); } };
  Svc.finish = function () { const r = f0(); const p = st(); p.fruit += 2; const g = addGlass(); save(); voiceCat('pastor', 'bless');
    setTimeout(() => { jtoast('📸 함께 예배한 기념 단체사진!', 'stamp'); $('#btn-shot')?.click(); if (g) G().toast('🪟 ' + g); }, 1800); return r; }; }

// ---------- attendance ----------
function attend() { const p = st(), d = today(); if (!p.days.includes(d)) { p.days.push(d); if (p.days.length > 400) p.days.shift(); save(); for (const [n, l] of BADGES) if (p.days.length === n) ach('att' + n, `출석 ${n}일 · ${l}`); } }

// ---------- hotkeys ----------
const KEYS = { KeyI: ['🎒 가방', () => toggle('p2bag', openBag)], KeyC: ['👗 캐릭터 꾸미기', () => toggle('inv', () => G().openInv())], KeyB: ['🪑 배치 모드', () => $('#btn-decor')?.click()],
  KeyM: ['🗺️ 마을 지도', () => toggle('map', () => G().openMap())], KeyJ: ['🌱 말씀 여정 · 임무', () => toggle('missions', () => G().V.openMissions())], KeyK: ['🏅 수집 도감 · 업적', () => toggle('p2col', openCol)],
  KeyV: ['📖 성경 읽기', () => toggle('p2bible', () => Reader.open())], KeyL: ['🏆 동네 예배당 성장 순위', () => toggle('church', openLead)], KeyP: ['📸 장면 담기', () => toggle('shotm', () => $('#btn-shot')?.click())], KeyO: ['⚙️ 설정', () => toggle('p2set', openSet)], KeyH: ['⌨️ 단축키 안내', () => toggle('p2help', openHelp)], KeyN: ['🧭 전국 지도', () => toggle('p2nat', openNation)], KeyG: ['💝 헌금하기', () => toggle('p2offer', () => openOffer(false))] };
function openHelp() { const m = modal('p2help', '⌨️ 단축키'); m.querySelector('.body').innerHTML = `<div class="keys">${[['WASD/방향키', '이동'], ['Space / E', '대화 · 들어가기/나가기 · 앉기/일어나기 · 대사 넘기기(타이핑 중이면 완성)'], ['Shift', '점프'], ['Tab', '지도 열기/닫기'], ['←→ / WASD', '대화 선택지 고르기'], ['Enter', '채팅'], ['Esc', '닫기'], ['1 2 3', '이모트'], ...Object.entries(KEYS).map(([k, [l]]) => [k.slice(3), l])].map(([k, l]) => `<div><kbd>${k}</kbd><span>${l}</span></div>`).join('')}</div><p class="mnote">같은 키를 다시 누르면 닫혀요 · 배치 모드: R 회전 · Esc 취소</p>`; G().openModal('#p2help'); }
function openAcct() { if (G().modal) G().closeModal(); modal('p2acct', '🔗 계정 연동'); G().openModal('#p2acct'); window.Acct?.open(); }
function openSet() { const m = modal('p2set', '⚙️ 설정'), P = Aud.P(), ck = (id, k, l) => `<label class="setrow">${l} <input type="checkbox" data-pk="${k}" id="${id}" ${P[k] ? 'checked' : ''}></label>`, rg = (k, l) => `<label class="setrow">${l} <input type="range" data-pv="${k}" min="0" max="1" step=".05" value="${P[k]}"></label>`;
  m.querySelector('.body').innerHTML = `<h4 class="seth">🎵 소리</h4>${ck('p2bgm', 'bgm', '🎹 찬송 배경음악')}${rg('bgmVol', '배경음악 음량')}${ck('p2snd', 'sfx', '🔊 효과음')}${rg('sfxVol', '효과음 음량')}${ck('p2voice', 'voice', '🗣️ NPC 목소리')}
  <h4 class="seth">🔔 알림</h4>${ck('p2jt', 'njoin', '접속 알림 (이웃이 들어왔어요)')}${ck('p2don', 'ndon', '💝 헌금 알림')}${ck('p2lvl', 'nlvl', '⛪ 예배당 레벨업 알림')}
  <h4 class="seth">🛡️ 안전</h4><div class="setrow"><span>🙈 차단한 이웃 <b>${window.Safe?.list().length || 0}</b>명<small>차단하면 채팅·말풍선이 보이지 않아요</small></span><button id="p2unblk" class="warnbtn soft">모두 해제</button></div>
  <div class="setrow"><span>📜 이용약관 · 운영정책</span><button id="p2terms" class="warnbtn soft">보기</button></div>
  <h4 class="seth">👤 계정</h4><div class="setrow"><span>🔗 계정 연동<small id="p2acst">손님으로 플레이 중 · 연동하면 어느 기기에서든 이어할 수 있어요</small></span><button id="p2acctbtn" class="warnbtn soft">계정 연동</button></div><div class="setrow danger"><span>🔓 로그아웃<small>이 기기의 세션·저장만 지워요 (손님 계정은 다시 찾을 수 없어요)</small></span><button id="p2logout" class="warnbtn soft">로그아웃</button></div>
  <div class="setrow danger"><span>🔁 처음부터 다시 시작<small>서버의 내 기록(기도·배치·여정·지갑 등)까지 모두 지워요</small></span><button id="p2reset" class="warnbtn">처음부터</button></div>`;
  m.querySelectorAll('[data-pk]').forEach(x => x.onchange = () => { Aud.setPref(x.dataset.pk, x.checked); if (x.dataset.pk === 'njoin') localStorage.setItem('p2_jt', x.checked ? '1' : '0'); if (x.dataset.pk === 'sfx') Aud.setMuted?.(false); });
  m.querySelectorAll('[data-pv]').forEach(x => x.oninput = () => Aud.setPref(x.dataset.pv, +x.value));
  $('#p2unblk').onclick = () => { window.Safe?.unblockAll(); G().toast('차단을 모두 해제했어요'); openSet(); }; $('#p2terms').onclick = () => window.Safe?.showTerms();
  $("#p2acctbtn").onclick = () => openAcct();
  window.Acct?.isLinked().then(l => { const e = $('#p2acst'); if (l && e) e.textContent = '연동됨 · 로그아웃해도 다시 로그인하면 돌아와요'; });
  $('#p2logout').onclick = async () => { const out = ['로그아웃', () => { window.__RESETTING = true; try { G().net.leave(); } catch { } window.MaeulReset.logout(); }];
    if (await window.Acct?.isLinked()) { window.Acct.backup(); return G().dialog('🔓 로그아웃', '로그아웃할까요?\n연동된 계정으로 다시 로그인하면 같은 예배당·캐릭터·지갑으로 돌아와요.', [out, ['취소', null]]); }
    G().dialog('⚠️ 손님 계정 로그아웃', '지금은 손님 계정이에요.\n로그아웃하면 이 캐릭터·예배당·지갑으로 다시 돌아올 수 없어요.\n먼저 계정을 연동해 두는 걸 추천해요.', [['🔗 먼저 계정 연동', () => setTimeout(openAcct, 0)], ['그래도 로그아웃', out[1]], ['취소', null]]); };
  $('#p2reset').onclick = () => G().dialog('🔁 처음부터 다시 시작', '정말 처음부터 시작할까요?\n서버에 저장된 내 기록과 이 기기의 저장이 모두 지워지고 되돌릴 수 없어요.', [['모두 지우고 처음부터', () => { window.__RESETTING = true; try { G().net.leave(); } catch { } window.MaeulReset.full(); }], ['취소', null]]); G().openModal('#p2set'); }
function wireKeys() { addEventListener('keydown', e => { const ae = document.activeElement, tg = ae && ae.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || ae?.isContentEditable || !S() || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.code === 'KeyR' && S().mode === 'decor') { $('#dflip')?.click(); return; }
    if (e.code === 'Escape' && S().mode === 'decor') { $('#ddone')?.click(); return; }
    const k = KEYS[e.code]; if (!k) return; if (G().modal && !G().modal.match(/p2|inv|map|missions|church|shotm|bible/)) return; e.preventDefault(); e.stopPropagation(); if (G().modal && G().modal !== '#' + ({ KeyI: 'p2bag', KeyC: 'inv', KeyM: 'map', KeyJ: 'missions', KeyK: 'p2col', KeyL: 'church', KeyP: 'shotm', KeyO: 'p2set', KeyH: 'p2help', KeyN: 'p2nat', KeyG: 'p2offer', KeyV: 'p2bible' }[e.code])) G().closeModal(); k[1](); }, { capture: true });
  // desktop-only key hints on HUD buttons
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) { const H = { 'btn-gacha': 'G', 'btn-inv': 'C', 'btn-decor': 'B', 'btn-church': 'L', 'btn-shot': 'P', 'minimap': 'Tab', 'mbadge': 'J', 'btn-p2bag': 'I', 'btn-p2col': 'K', 'btn-p2bible': 'V', 'btn-p2nat': 'N', 'btn-p2help': 'H', 'btn-act': 'Space', 'btn-jump': 'Shift' }; for (const [id, k] of Object.entries(H)) { const b = document.getElementById(id); if (b && !b.querySelector('.kh')) b.insertAdjacentHTML('beforeend', `<kbd class="kh">${k}</kbd>`); } } }

// region label for a 행정동 code, e.g. 1144071000 → "서울 마포구 망원동" (from the bundled 통계청 index; no server field needed)
const SIDO_S = { 서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 광주광역시: '광주', 대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종', 경기도: '경기', 강원도: '강원', 강원특별자치도: '강원', 충청북도: '충북', 충청남도: '충남', 전라북도: '전북', 전북특별자치도: '전북', 전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주' };
export function regionOf(I, cd) { const r = cd && (I || []).find(x => x.cd === cd); return r ? [SIDO_S[r.sido] || r.sido, r.sido === r.sgg ? '' : r.sgg, r.name].filter(Boolean).join(' ') : ''; }
// ---------- nationwide map: 시·도 → 시·군·구 → 행정동 (vuski/admdongkor, lazy per level) ----------
const NM = { lv: 0, sido: null, sgg: null, z: 1, x: 0, y: 0, cache: {} };
async function geo(f) { return NM.cache[f] ||= await (await fetch('assets/geo/' + f)).json(); }
async function openNation() { const m = modal('p2nat', '🧭 전국 마실채플 지도', true); m.querySelector('.body').innerHTML = `<div class="natbar"><button id="natup">⬅ 위로</button><span id="natpath">전국</span><input id="natq" placeholder="동 이름 검색 (예: 삼청동)"></div><div class="natwrap"><canvas id="natcv"></canvas><div id="natres"></div></div><p class="mnote" id="natnote">시·도를 눌러 들어가요 · 드래그/휠/핀치로 이동·확대 · 👥 = 지금 접속 인원</p><small class="mnote">경계: vuski/admdongkor (통계청 행정구역 경계 기반, 2025-04) · 단순화</small>`;
  G().openModal('#p2nat'); NM.lv = 0; NM.sido = NM.sgg = null; fitView(); await drawNat(); wireNat(); }
function bounds(rs) { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const r of rs) for (const [x, y] of r) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); } return [a, b, c, d]; }
let VB = [124.5, 131, 33, 38.7]; function fitView(b) { VB = b || [124.5, 131, 33, 38.7]; NM.z = 1; NM.x = NM.y = 0; }
async function layer() { if (NM.lv === 0) { const N = await geo('nation.json'); return Object.entries(N).map(([k, v]) => ({ k, n: v.n, r: v.r })); }
  if (NM.lv === 1) { const N = await geo(`sgg_${NM.sido}.json`); return Object.entries(N).map(([k, v]) => ({ k, n: v.n, r: v.r })); }
  const D = await geo(`sido_${NM.sido}.json`), I = await G().V.index(); return I.filter(d => d.cd.startsWith(NM.sgg)).map(d => ({ k: d.cd, n: d.name, r: D[d.cd] || [], d })); }
async function drawNat() { const cv = $('#natcv'); if (!cv) return; const pr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; cv.width = w * pr; cv.height = h * pr; const g = cv.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0);
  g.fillStyle = '#e7f3ff'; g.fillRect(0, 0, w, h); const L = await layer(); NM.items = L; const [x0, x1, y0, y1] = VB, cos = Math.cos((y0 + y1) / 2 * Math.PI / 180);
  const s0 = Math.min((w - 20) / ((x1 - x0) * cos), (h - 20) / (y1 - y0)), s = s0 * NM.z, ox = w / 2 - ((x0 + x1) / 2 * cos) * s + NM.x, oy = h / 2 + ((y0 + y1) / 2) * s + NM.y;
  NM.T = (x, y) => [ox + x * cos * s, oy - y * s]; NM.inv = (px, py) => [(px - ox) / (cos * s), (oy - py) / s];
  const counts = G().net?.counts || {}, cur = G().V?.current?.(), pal = ['#ffd9e6', '#e3f4d9', '#fff2c6', '#dfe9ff', '#f0e2ff', '#d9f3f0', '#ffe5d4'];
  const cnt = it => { if (NM.lv === 2) return counts[it.k] || 0; let n = 0; for (const [k, v] of Object.entries(counts)) if (k.startsWith(it.k)) n += v; return n; };
  L.forEach((it, i) => { const me = cur && cur.cd.startsWith(it.k); g.beginPath(); for (const r of it.r) r.forEach(([x, y], j) => { const [px, py] = NM.T(x, y); j ? g.lineTo(px, py) : g.moveTo(px, py); }); g.fillStyle = me ? '#ffb8d2' : it.k === NM.hover ? '#fff' : pal[i % pal.length]; g.fill('evenodd'); g.lineWidth = me ? 2.5 : 1; g.strokeStyle = me ? '#e0659a' : '#9a8cc0'; g.stroke(); });
  try { window.P4 && (await window.P4.churchTops(), window.P4.pillars(g, L, NM.lv, NM.T, bounds)); } catch (e) { console.warn(e); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; for (const it of L) { const b = bounds(it.r); if (!isFinite(b[0])) continue; const [px, py] = NM.T((b[0] + b[1]) / 2, (b[2] + b[3]) / 2); const bw = (b[1] - b[0]) * cos * s; if (bw < 26 && NM.lv) continue; const n = cnt(it);
    g.font = `800 ${NM.lv ? 11 : 13}px Pretendard,sans-serif`; g.lineWidth = 3; g.strokeStyle = '#fff'; g.fillStyle = '#4a2b78'; const t = it.n.replace(/특별자치|특별|광역|자치/g, '') + (n ? ` 👥${n}` : ''); g.strokeText(t, px, py); g.fillText(t, px, py); }
  $('#natpath').textContent = ['전국', NM.sidoN, NM.sggN].filter(Boolean).join(' › '); $('#natup').disabled = NM.lv === 0; }
function hit(px, py) { if (!NM.items) return null; const [x, y] = NM.inv(px, py); for (const it of NM.items) for (const r of it.r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } if (c) return it; } return null; }
async function pick(it) { if (!it) return; sfx('click'); if (NM.lv === 0) { NM.lv = 1; NM.sido = it.k; NM.sidoN = it.n; fitView(bounds(it.r)); }
  else if (NM.lv === 1) { NM.lv = 2; NM.sgg = it.k; NM.sggN = it.n; fitView(bounds(it.r)); }
  else { const d = it.d; G().V.dongTap(d); return; } await drawNat(); }
function wireNat() { const cv = $('#natcv'); let drag = null, moved = 0; const pts = new Map(); let pinch = 0;
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.offsetX, e.offsetY]); drag = [e.offsetX, e.offsetY]; moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } };
  cv.onpointermove = e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.offsetX, e.offsetY]); if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) { NM.z = Math.max(.6, Math.min(12, NM.z * d / pinch)); } pinch = d; moved = 9; drawNat(); return; }
    const dx = e.offsetX - drag[0], dy = e.offsetY - drag[1]; if (Math.abs(dx) + Math.abs(dy) > 3) { moved += Math.abs(dx) + Math.abs(dy); NM.x += dx; NM.y += dy; drag = [e.offsetX, e.offsetY]; drawNat(); } };
  cv.onpointerup = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (moved < 6 && !pts.size) pick(hit(e.offsetX, e.offsetY)); };
  cv.onwheel = e => { e.preventDefault(); NM.z = Math.max(.6, Math.min(12, NM.z * (e.deltaY < 0 ? 1.2 : 1 / 1.2))); drawNat(); };
  $('#natup').onclick = async () => { if (NM.lv === 2) { NM.lv = 1; NM.sggN = null; const N = await geo('nation.json'); fitView(bounds(N[NM.sido].r)); } else { NM.lv = 0; NM.sidoN = null; fitView(); } drawNat(); };
  $('#natq').oninput = async e => { const q = e.target.value.replace(/\s/g, ''); const box = $('#natres'); if (!q) { box.innerHTML = ''; return; } const I = await G().V.index(), counts = G().net?.counts || {};
    const L = I.filter(d => (d.sido + d.sgg + d.name).replace(/\s/g, '').includes(q)).slice(0, 12); box.innerHTML = L.map(d => `<button data-cd="${d.cd}"><b>${esc(d.name)}</b> <small>${esc(d.sido)} ${esc(d.sgg)}${counts[d.cd] ? ' · 👥' + counts[d.cd] : ''}</small></button>`).join('') || '<p class="mnote">결과 없음</p>';
    box.querySelectorAll('button').forEach(b => b.onclick = async () => { const d = I.find(x => x.cd === b.dataset.cd); NM.lv = 2; NM.sido = d.cd.slice(0, 2); NM.sgg = d.cd.slice(0, 5); NM.sidoN = d.sido; NM.sggN = d.sgg; const S2 = await geo(`sgg_${NM.sido}.json`); fitView(bounds(S2[NM.sgg].r)); box.innerHTML = ''; e.target.value = ''; await drawNat(); G().V.dongTap(d); }); };
  addEventListener('resize', () => G().modal === '#p2nat' && drawNat()); }

// ---------- extra HUD buttons ----------
function hudButtons() { const side = $('#side'); if (!side || $('#btn-p2bag')) return;
  const add = (id, html, fn) => { const b = document.createElement('button'); b.id = id; b.innerHTML = html; b.onclick = fn; side.append(b); };
  add('btn-p2bag', '🎒<small>가방</small>', () => toggle('p2bag', openBag)); add('btn-p2col', '🏅<small>도감</small>', () => toggle('p2col', openCol)); add('btn-p2bible', '📖<small>성경</small>', () => toggle('p2bible', () => Reader.open())); add('btn-p2nat', '🧭<small>전국</small>', () => toggle('p2nat', openNation)); add('btn-p2help', '⌨️<small>도움말</small>', () => toggle('p2help', openHelp));
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) $('#btn-p2help').style.display = 'none'; }

let lastRoom = '';
export function initPhase2() { if (!$('#jtoasts')) { const d = document.createElement('div'); d.id = 'jtoasts'; document.body.append(d); }
  const unlock = () => { try { Aud.init?.(); Aud.unlock?.(); } catch { } }; addEventListener('pointerdown', unlock, { once: true }); addEventListener('keydown', unlock, { once: true });
  P = window.P2 = { ...seatApi, sfx, objs, fieldObjs, ground, openShop, openOffer, openBag, openCol, openLead, openNation, voice, jtoast, openSet, openLevels, signPos: () => { const c = C().chapel; return { x: c.door.x + 250, y: c.door.y + 60 }; }, get total() { return total; }, st, get tier() { return tier; }, setTier: t => setTotal(total, t), forceTier: t => { tier = t; total = LEVELS[t - 1].need; setTotal(total, t); }, shards: () => shards, addGlass };
  wireNet(); wireKeys(); wireService();
  const boot = () => { if (!S() || !G().world?.()) return setTimeout(boot, 300); renameCurrency(); hudButtons(); window.__p2mobile?.(); attend(); seedShards(); computeVary(); loadTotal(); };
  boot();
  setInterval(() => { if (!S()) return; tickPickups(performance.now() / 1000); const d = G().V?.current?.(), id = d ? d.cd : 'solo'; if (id !== lastRoom) { lastRoom = id; computeVary(); loadTotal(); }
    const cb = $('#coinbox'); if (cb && !cb.querySelector('.tal')) renameCurrency(); }, 120);
  // mission completions → 감사 열매
  const V = G().V; if (V?.done) { const d0 = V.done.bind(V); V.done = (...a) => { const r = d0(...a); try { st().fruit++; save(); } catch { } return r; }; }
}
// ---------- mobile: compact menu + soft-keyboard handling ----------
function mobileHud() { const side = $('#side'); if (!side || $('#btn-more')) return; const b = document.createElement('button'); b.id = 'btn-more'; b.innerHTML = '☰<small>메뉴</small>'; side.prepend(b);
  b.onclick = e => { e.stopPropagation(); document.body.classList.toggle('menuopen'); b.innerHTML = document.body.classList.contains('menuopen') ? '✕<small>닫기</small>' : '☰<small>메뉴</small>'; };
  side.addEventListener('click', e => { if (e.target.closest('button') && e.target.closest('button') !== b) { document.body.classList.remove('menuopen'); b.innerHTML = '☰<small>메뉴</small>'; } });
  const vv = window.visualViewport, inp = $('#chatin'); const upd = () => { const kb = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0; document.documentElement.style.setProperty('--kb', kb + 'px'); };
  if (vv) { vv.addEventListener('resize', upd); vv.addEventListener('scroll', upd); }
  if (inp) { inp.addEventListener('focus', () => { document.body.classList.add('kbd'); upd(); }); inp.addEventListener('blur', () => { setTimeout(() => { document.body.classList.remove('kbd'); document.documentElement.style.setProperty('--kb', '0px'); scrollTo(0, 0); }, 50); }); } }
window.__p2mobile = mobileHud;

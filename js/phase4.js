// Phase 4: pilgrim bots (fill quiet rooms), 오병이어 shared bread/fish rain, gold pillars on the nationwide map
const G = () => window.G;
const PNAMES = ['순례자 요셉', '순례자 한나', '순례자 디모데', '순례자 룻', '순례자 바나바', '순례자 마리아'];
const PLINES = ['먼 동네에서 걸어왔어요 🧳 이 예배당 참 예뻐요!', '샬롬! 함께 기도해도 될까요? 🙏', '오늘도 은혜로운 하루 되세요 ☀️', '다음 마을 예배당도 들러볼 거예요 🗺️', '헌금함 옆에서 소원을 빌면 좋대요 ✨'];
let pil = [], pt = 0, obiCd = 0, rain = null;
function pilgrims(dt) { const g = G(); if (!g?.S) return; pt -= dt; if (pt > 0) return; pt = 4;
  const real = g.remotes.size, want = g.scene === 'field' ? Math.max(0, 2 - real) : 0;
  pil = pil.filter(c => g.wanderers.includes(c));
  while (pil.length < want) { const c = g.addWanderer(); c.name = 'NPC ' + PNAMES[Math.random() * PNAMES.length | 0]; c.npc = true; c.tagColor = '#ffe9a8'; c.lines = PLINES; c.pilgrim = true; pil.push(c); c.say?.('🧳 ' + PLINES[0], 3); }
  while (pil.length > want) { const c = pil.pop(), i = g.wanderers.indexOf(c); i >= 0 && g.wanderers.splice(i, 1); }
  for (const c of pil) if (Math.random() < .2) c.say?.(PLINES[Math.random() * PLINES.length | 0], 3); }
function btn() { let b = document.getElementById('btn-obi'); if (!b) { b = document.createElement('button'); b.id = 'btn-obi'; b.className = 'obibtn'; b.textContent = '🍞🐟 오병이어'; b.title = '방 안 모두에게 빵과 물고기 비를 내려요'; b.onclick = () => start(true); document.body.appendChild(b); }
  const g = G(); b.style.display = g?.S && g.scene === 'field' && !g.modalOpen && !g.worship ? '' : 'none'; b.disabled = Date.now() < obiCd; }
export function start(mine, seed) {
  const g = G(); if (rain || g?.scene !== 'field' || g?.worship) return; if (mine) { if (Date.now() < obiCd) return; obiCd = Date.now() + 10 * 60e3; g.net?.send('obi', { name: g.S?.name || '이웃' }); g.toast?.('🍞🐟 오병이어! 떨어지는 빵과 물고기를 눌러 모아요'); }
  const cv = document.createElement('canvas'); cv.id = 'obicv'; cv.style.pointerEvents = 'none'; document.body.appendChild(cv); const pr = Math.min(2, devicePixelRatio || 1);
  const fit = () => { cv.width = innerWidth * pr; cv.height = innerHeight * pr; }; fit();
  rain = { cv, t: 0, got: 0, P: [], end: 7 }; for (let i = 0; i < 26; i++) rain.P.push({ x: Math.random() * innerWidth, y: -Math.random() * innerHeight * 1.2 - 30, v: 90 + Math.random() * 90, e: Math.random() < .6 ? '🍞' : '🐟', r: Math.random() * 6, on: 1 });
  const tap = ev => { const p0 = ev.touches?.[0] || ev, x = p0.clientX, y = p0.clientY; for (const p of rain.P) if (p.on && Math.hypot(p.x - x, p.y - y) < 34) { p.on = 0; rain.got++; try { window.Aud?.play?.('coin'); } catch { } ev.preventDefault(); ev.stopPropagation(); break; } };
  addEventListener('pointerdown', tap, true); rain.tap = tap; let last = performance.now();
  const f = now => { if (!rain) return; const dt = Math.min(.05, (now - last) / 1000); last = now; rain.t += dt; if (g.scene !== 'field') rain.t = rain.end; const c = cv.getContext('2d'); c.setTransform(pr, 0, 0, pr, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight);
    c.font = '40px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (const p of rain.P) { if (!p.on) continue; p.y += p.v * dt; p.r += dt; if (p.y > innerHeight + 40) p.y = -40; c.save(); c.translate(p.x + Math.sin(p.r * 2) * 10, p.y); c.rotate(Math.sin(p.r) * .4); c.fillText(p.e, 0, 0); c.restore(); }
    c.font = '800 20px Pretendard,sans-serif'; c.fillStyle = '#7a4b00'; c.strokeStyle = '#fff'; c.lineWidth = 4; const s = `🍞🐟 ${rain.got}개 모았어요 · ${Math.max(0, Math.ceil(rain.end - rain.t))}초`; const cy = innerWidth < 760 ? 228 : 128; c.strokeText(s, innerWidth / 2, cy); c.fillText(s, innerWidth / 2, cy);
    if (rain.t < rain.end) requestAnimationFrame(f); else finish(); };
  requestAnimationFrame(f); }
async function finish() { const r = rain; rain = null; r.cv.remove(); removeEventListener('pointerdown', r.tap, true); const g = G(); if (r.got > 0) { const d = await window.W?.earn?.('obi'); g?.toast?.(d && d.granted ? `🙌 ${r.got}개를 모아 달란트 +${d.granted}! 나눔의 기적이에요` : `🙌 ${r.got}개를 모았어요! (오늘 보상은 이미 받았어요)`); g?.refreshHud?.(); } }
// gold pillars: churches with the biggest (free 달란트) offering totals rise as golden pillars on the map
let tops = null, topsAt = 0;
export async function churchTops() { if (tops && Date.now() - topsAt < 60e3) return tops; const sb = G()?.net?.sb; if (!sb) return tops || []; topsAt = Date.now(); try { const r = await sb.from('churches').select('dong,total').gt('total', 0).order('total', { ascending: false }).limit(300); if (r.error) { topsAt = 0; return tops || []; } tops = r.data || []; } catch { topsAt = 0; tops = tops || []; } return tops; }
export function pillars(g, items, lv, T, bounds, total) { const T0 = tops || []; if (!T0.length) return; const max = Math.max(...T0.map(t => t.total)), t = performance.now() / 1000;
  for (const it of items) { const tot = lv === 2 ? (T0.find(x => x.dong === it.k)?.total || 0) : T0.filter(x => x.dong.startsWith(it.k)).reduce((a, x) => a + x.total, 0); if (!tot) continue; const b = bounds(it.r); if (!isFinite(b[0])) continue;
    const [px, py] = T((b[0] + b[1]) / 2, (b[2] + b[3]) / 2), h = 10 + 46 * Math.sqrt(tot / Math.max(max, lv === 2 ? max : tot)), w = 9;
    const gr = g.createLinearGradient(px - w, 0, px + w, 0); gr.addColorStop(0, '#d8a200'); gr.addColorStop(.5, '#fff3a6'); gr.addColorStop(1, '#c98f00');
    g.save(); g.globalAlpha = .92; g.fillStyle = 'rgba(120,80,0,.25)'; g.beginPath(); g.ellipse(px, py, w + 3, 4, 0, 0, 7); g.fill(); g.fillStyle = gr; g.fillRect(px - w / 2, py - h, w, h); g.beginPath(); g.ellipse(px, py - h, w / 2, 2.5, 0, 0, 7); g.fillStyle = '#fff8c8'; g.fill();
    g.globalAlpha = .5 + .5 * Math.sin(t * 3 + px); g.fillStyle = '#fff'; g.font = '11px serif'; g.textAlign = 'center'; g.fillText('✨', px, py - h - 8); g.restore(); } }
export function initPhase4() { window.P4 = { start, pillars, churchTops }; const g = G(); g?.net?.on?.('obi', p => { if (window.Safe?.isBlocked?.(p.id, p.name)) return; g.toast?.(`🍞🐟 ${String(p.name || '이웃').slice(0, 12)}님이 오병이어를 나눴어요!`); start(false); });
  let last = performance.now(); const loop = now => { const dt = Math.min(.5, (now - last) / 1000); last = now; try { pilgrims(dt); btn(); } catch (e) { console.warn(e); } requestAnimationFrame(loop); }; requestAnimationFrame(loop); churchTops(); }

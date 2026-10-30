// v6 collectibles: pastel pickups shared per 행정동 room. Spawns are deterministic from (room, 90s slot) so every
// client sees the same items without a server; a pickup is broadcast ('pick') so it vanishes for everyone.
// 헌금 달란트 is in-game currency only. Daily cap stops farming.
const SLOT = 90e3, CAP = 7, DAY_CAP = 300, LIFE = 2; // items live for 2 slots => at most 2*CAP on the field
const KINDS = [
  { k: 'light', name: '빛조각', gold: 3, w: 40, col: ['#fff3a8', '#ffd84a'] },
  { k: 'candy', name: '별사탕', gold: 5, w: 32, col: ['#ffd1e8', '#ff9cc9'] },
  { k: 'flower', name: '작은 꽃', gold: 4, w: 25, col: ['#e6d8ff', '#b99cff'] },
  { k: 'feather', name: '무지개 깃털', gold: 25, w: 3, rare: 1, col: ['#bff3ff', '#ffc6e0'] }];
const today = () => new Date().toLocaleDateString('sv');
function rng(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
export const C = {
  items: [], gone: new Set(), fx: [], room: null, slot: -1,
  init(api) { this.a = api; },
  st() { const S = this.a.S(); if (!S.col || S.col.day !== today()) S.col = { day: today(), gold: 0, n: 0, picked: [] }; return S.col; },
  build(room, now) {
    const slot = Math.floor(now / SLOT); if (room === this.room && slot === this.slot) return;
    this.room = room; this.slot = slot; const w = this.a.world(), ch = this.a.chapel(), st = this.st(), out = [];
    for (let s = slot - LIFE + 1; s <= slot; s++) { const r = rng(room + ':' + s);
      for (let i = 0; i < CAP; i++) { let p, t = 0; do p = w.randomPoint(r); while (Math.hypot(p.x - ch.x, p.y - ch.y) < 260 && ++t < 20);
        let x = r() * 100, kd = KINDS[0]; for (const K of KINDS) { if ((x -= K.w) < 0) { kd = K; break; } }
        const id = `${s}.${i}`; if (!this.gone.has(room + id) && !st.picked.includes(room + id)) out.push({ id, x: p.x, y: p.y, kd, ph: r() * 6 }); } }
    this.items = out; },
  update(dt, scene) {
    if (scene !== 'field') return; const room = this.a.room(); this.build(room, Date.now()); const pl = this.a.player();
    for (let i = this.items.length - 1; i >= 0; i--) { const it = this.items[i]; if (Math.hypot(it.x - pl.x, it.y - pl.y) < 52) { this.items.splice(i, 1); this.take(it, room); } }
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < .9); },
  take(it, room) {
    const st = this.st(), S = this.a.S(); this.gone.add(room + it.id); st.picked.push(room + it.id); if (st.picked.length > 400) st.picked.splice(0, 100);
    this.a.net.send('pick', { iid: it.id, room }); this.pop(it);
    const g = Math.min(it.kd.gold, DAY_CAP - st.gold); st.n++;
    if (g > 0) { st.gold += g; S.coins += g; this.a.coinFx(); this.a.toast(`${it.kd.rare ? '🌈 희귀! ' : '✨ '}${it.kd.name} +${g} 달란트 (오늘 ${st.gold}/${DAY_CAP})`); }
    else this.a.toast(`✨ ${it.kd.name} — 오늘 모을 수 있는 달란트를 다 모았어요! 내일 또 만나요`);
    this.a.refreshHud(); this.a.persist(); },
  pop(it) { this.fx.push({ x: it.x, y: it.y, t: 0, kd: it.kd }); },
  remotePick(p) { if (!p || !p.iid) return; const key = (p.room || this.room) + p.iid; if (this.gone.has(key)) return; this.gone.add(key);
    const i = this.items.findIndex(x => x.id === p.iid && p.room === this.room); if (i >= 0) { this.pop(this.items[i]); this.items.splice(i, 1); } },
  shareRecent() { const r = this.room; if (!r) return; const ids = [...this.gone].filter(k => k.startsWith(r)).map(k => k.slice(r.length)).slice(-30); if (ids.length) this.a.net.send('picks', { room: r, ids }); },
  remotePicks(p) { for (const iid of p.ids || []) this.remotePick({ iid, room: p.room }); },
  shape(g, kd, s) { const [a, b] = kd.col; g.fillStyle = a; g.strokeStyle = b; g.lineWidth = 3; g.beginPath();
    if (kd.k === 'light') { g.moveTo(0, -s); g.lineTo(s * .6, 0); g.lineTo(0, s); g.lineTo(-s * .6, 0); }
    else if (kd.k === 'candy') for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .5 : s, an = i * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
    else if (kd.k === 'flower') { for (let i = 0; i < 5; i++) { const an = i * 1.2566; g.moveTo(Math.cos(an) * s * .55 + s * .4, Math.sin(an) * s * .55); g.arc(Math.cos(an) * s * .55, Math.sin(an) * s * .55, s * .4, 0, 7); } }
    else { g.ellipse(0, 0, s * .35, s, .5, 0, 7); }
    g.closePath(); g.fill(); g.stroke();
    if (kd.k === 'flower') { g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(0, 0, s * .3, 0, 7); g.fill(); }
    if (kd.rare) { const gr = g.createLinearGradient(-s, -s, s, s); ['#ffb3c7', '#ffe29a', '#b8f2c9', '#b3d9ff', '#d8c2ff'].forEach((c, i) => gr.addColorStop(i / 4, c)); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, s * .3, s * .92, .5, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(-s * .2, -s * .3, s * .14, 0, 7); g.fill(); },
  objs(objs, tm, scene) { if (scene !== 'field') return;
    for (const it of this.items) objs.push({ y: it.y, draw: g => { const b = Math.sin(tm * 3 + it.ph) * 6, s = it.kd.rare ? 20 : 15;
      g.fillStyle = it.kd.rare ? 'rgba(200,170,255,.35)' : 'rgba(255,240,180,.35)'; g.beginPath(); g.ellipse(it.x, it.y, 20, 7, 0, 0, 7); g.fill();
      g.save(); g.translate(it.x, it.y - 30 + b); g.rotate(Math.sin(tm * 2 + it.ph) * .25); this.shape(g, it.kd, s); g.restore();
      if (it.kd.rare || Math.sin(tm * 4 + it.ph) > .7) { g.fillStyle = '#fff'; const sx = it.x + Math.cos(tm * 2 + it.ph) * 18, sy = it.y - 34 + Math.sin(tm * 3) * 10; g.beginPath(); g.arc(sx, sy, 2.5, 0, 7); g.fill(); } } });
    for (const f of this.fx) objs.push({ y: f.y + 1, draw: g => { const k = f.t / .9, s = 15 * (1 + k * .8);
      g.save(); g.globalAlpha = 1 - k; g.translate(f.x, f.y - 30 - k * 50); g.scale(1 + k, 1 + k); this.shape(g, f.kd, 15); g.restore();
      g.save(); g.globalAlpha = 1 - k; for (let i = 0; i < 8; i++) { const an = i * .785 + f.t * 2; g.fillStyle = f.kd.col[i % 2]; g.beginPath(); g.arc(f.x + Math.cos(an) * s * 2.6, f.y - 30 + Math.sin(an) * s * 2.6 - k * 30, 4 * (1 - k) + 1, 0, 7); g.fill(); }
      g.fillStyle = '#7a5aa8'; g.font = '800 18px Pretendard,sans-serif'; g.textAlign = 'center'; g.fillText(`+${f.kd.gold}`, f.x, f.y - 70 - k * 40); g.restore(); } }); },
  dots(fn) { for (const it of this.items) fn(it.x, it.y, it.kd.rare ? '#c9a8ff' : '#ffb3d1'); }
};

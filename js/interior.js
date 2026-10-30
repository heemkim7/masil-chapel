// v7 Phase 2: SIDE-VIEW chapel interior. Pulpit on the LEFT (pastor faces right in profile), pews in one row facing LEFT
// (congregation sits in side profile). Background art swaps by church tier (1..3). Walkability = floor-band mask minus pew feet.
import { IMG } from './assets.js';
export class Interior {
  constructor(cfg) {
    this.cfg = cfg; const I = cfg.interior; this.I = I; this.W = I.W; this.H = I.H; this.tier = 1; this.floor = '1F';
    const m = IMG.in_mask, c = document.createElement('canvas'); c.width = m.width; c.height = m.height;
    const g = c.getContext('2d'); g.drawImage(m, 0, 0); this.mw = m.width; this.mh = m.height; this.md = g.getImageData(0, 0, m.width, m.height).data;
  }
  // pew i: x = centre, y = floor line. Footprint is small (the pew runs "into" the screen), so you can walk in front of / behind it.
  pewRect(i) { const [x, y] = this.I.pews[i]; return { x: x - 34, y: y - 14, w: 68, h: 22, cx: x, cy: y }; }
  // where a seated character's feet-anchor goes (drawn raised by sitLift, legs tucked behind the seat front)
  seat(i) { const [x, y] = this.I.pews[i]; return { x: x + this.I.seatDx, y: y + 1 }; }
  F() { return (this.I.floors || []).find(f => f.id === this.floor) || { id: '1F' }; }
  view() { return this.on1 ? (this.I.view1 || { x: 0, y: 0, w: this.W, h: this.H }) : { x: 0, y: 0, w: this.W, h: this.H }; }
  get on1() { return this.floor === '1F'; }
  stairs() { return this.on1 ? (this.I.stairs1 || []) : [{ ...this.F().stairs, label: '⬆️ 1층 본당으로' }]; }
  spots() { return this.on1 ? [] : (this.F().spots || []); }
  walkable(x, y) {
    if (!this.on1) { const f = this.F(); return y > f.band[0] && y < f.band[1] && x > f.xr[0] && x < f.xr[1]; }
    const s = this.I.maskScale, mx = x / s | 0, my = y / s | 0;
    if (mx < 0 || my < 0 || mx >= this.mw || my >= this.mh || this.md[(my * this.mw + mx) * 4] < 128) return false;
    for (let i = 0; i < this.I.pews.length; i++) { const r = this.pewRect(i); if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return false; }
    const o = this.I.offering; if (Math.abs(x - o.x) < 40 && Math.abs(y - o.y) < 14) return false;
    return true;
  }
  randomPoint() { for (let i = 0; i < 400; i++) { const x = Math.random() * this.W, y = Math.random() * this.H; if (this.walkable(x, y)) return { x, y }; } return this.I.spawn; }
  drawStatic(ctx) {
    ctx.fillStyle = '#efe2ff'; ctx.fillRect(-2000, -2000, this.W + 4000, this.H + 4000);
    if (!this.on1) { ctx.drawImage(IMG['in_' + this.floor], 0, 0, this.W, this.H); this.drawMarks(ctx); return; }
    ctx.drawImage(IMG['in_bg' + this.tier] || IMG.in_bg, 0, 0, this.W, this.H); this.drawMarks(ctx);
    const D = this.I.door; ctx.font = '700 20px Pretendard,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(74,43,120,.75)'; ctx.fillStyle = '#fff';
    ctx.strokeText('🚪 나가기', D.x, D.y + 50); ctx.fillText('🚪 나가기', D.x, D.y + 50);
  }
  drawMarks(ctx) { const t = performance.now() / 1000; ctx.textAlign = 'center';
    for (const st of this.stairs()) { const up = /⬆/.test(st.label), b = Math.sin(t * 3) * 4; ctx.fillStyle = 'rgba(255,240,170,.5)'; ctx.beginPath(); ctx.ellipse(st.x, st.y + 6, 46, 14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#c79b6b'; for (let i = 0; i < 4; i++) { ctx.fillRect(st.x - 34 + (up ? i * 6 : 0), st.y - 8 - i * 12, 68 - i * 6, 10); } // little staircase
      ctx.font = '800 17px Pretendard,sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(74,43,120,.8)'; ctx.fillStyle = '#fff'; ctx.strokeText(st.label, st.x, st.y - 64 + b); ctx.fillText(st.label, st.x, st.y - 64 + b); }
    for (const sp of this.spots()) { ctx.font = '800 18px Pretendard,sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(74,43,120,.8)'; ctx.fillStyle = '#fff'; ctx.strokeText(sp.label, sp.x, sp.y - 90); ctx.fillText(sp.label, sp.x, sp.y - 90); }
    if (!this.on1) { ctx.font = '900 22px Pretendard,sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(74,43,120,.85)'; ctx.fillStyle = '#ffe9a8'; ctx.strokeText(this.F().name, this.W / 2, 40); ctx.fillText(this.F().name, this.W / 2, 40); } }
  pewImgH() { return this.I.pewH; }
  drawPew(ctx, i, part) { // part: 'all' | 'front' (seat box + legs only, drawn over a sitter's lap)
    const im = IMG.in_pew_side, [x, y] = this.I.pews[i], h = this.I.pewH, w = h * im.width / im.height, x0 = x - w / 2, y0 = y - h;
    if (part === 'front') { const f = this.I.frontFrac, sy = im.height * f; ctx.drawImage(im, 0, sy, im.width, im.height - sy, x0, y0 + h * f, w, h * (1 - f)); return; }
    ctx.fillStyle = 'rgba(70,40,30,.18)'; ctx.beginPath(); ctx.ellipse(x, y - 2, w * .55, 7, 0, 0, 7); ctx.fill(); ctx.drawImage(im, x0, y0, w, h);
  }
  objects() {
    const I = this.I, out = []; if (!this.on1) return out;
    I.pews.forEach((p, i) => out.push({ y: p[1] - .5, draw: ctx => this.drawPew(ctx, i, 'all') }));
    const o = I.offering; out.push({ y: o.y, draw: ctx => { const im = IMG.in_offering, w = 84, h = w * im.height / im.width; ctx.drawImage(im, o.x - w / 2, o.y - h + 8, w, h);
      ctx.fillStyle = '#4a2b78'; ctx.font = '800 14px Pretendard,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💝 헌금함', o.x, o.y + 26); } });
    const b = I.board; out.push({ y: b.y, draw: ctx => { const im = IMG.in_board, w = 96, h = w * im.height / im.width; ctx.drawImage(im, b.x - w / 2, b.y - h + 6, w, h);
      ctx.fillStyle = '#4a2b78'; ctx.font = '800 14px Pretendard,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('기도 게시판', b.x, b.y + 24); } });
    return out;
  }
}

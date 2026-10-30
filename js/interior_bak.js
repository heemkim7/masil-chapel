// Chapel interior scene: procedurally painted room (no extra assets), walk/collision, pews
import { rr } from './world.js';
export class Interior {
  constructor(cfg) { this.cfg = cfg; const I = cfg.interior; this.W = I.W; this.H = I.H; this.I = I; this.bg = this.paint(); }
  pewRect(i) { const [x, y] = this.I.pews[i], w = this.I.pewW; return { x: x - w / 2, y: y - 30, w, h: 50, cx: x, cy: y }; }
  walkable(x, y) {
    const [x0, y0, x1, y1] = this.I.floor; if (x < x0 || x > x1 || y < y0 + 60 || y > y1) return false;
    if (Math.abs(x - this.I.altar.x) < 210 && y < this.I.altar.y + 90) return false;
    for (let i = 0; i < this.I.pews.length; i++) { const r = this.pewRect(i); if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return false; }
    const o = this.I.offering; if (Math.hypot(x - o.x, (y - o.y) * 1.5) < 55) return false;
    const b = this.I.board; if (Math.abs(x - b.x) < 100 && y < b.y + 25) return false;
    return true;
  }
  randomPoint() { for (let i = 0; i < 400; i++) { const x = Math.random() * this.W, y = Math.random() * this.H; if (this.walkable(x, y)) return { x, y }; } return this.I.spawn; }
  paint() {
    const c = document.createElement('canvas'); c.width = this.W; c.height = this.H; const g = c.getContext('2d'), I = this.I;
    g.fillStyle = '#e9dcf3'; g.fillRect(0, 0, this.W, this.H);
    // back wall
    let gr = g.createLinearGradient(0, 0, 0, 340); gr.addColorStop(0, '#fff6ea'); gr.addColorStop(1, '#f6e3d2'); g.fillStyle = gr; g.fillRect(110, 40, this.W - 220, 300);
    // side walls (perspective)
    g.fillStyle = '#f1dccb'; g.beginPath(); g.moveTo(110, 40); g.lineTo(0, 0); g.lineTo(0, this.H); g.lineTo(150, 1020); g.lineTo(150, 340); g.lineTo(110, 340); g.fill();
    g.beginPath(); g.moveTo(this.W - 110, 40); g.lineTo(this.W, 0); g.lineTo(this.W, this.H); g.lineTo(this.W - 150, 1020); g.lineTo(this.W - 150, 340); g.lineTo(this.W - 110, 340); g.fill();
    // stained glass windows
    const win = (x, y, w, h) => { g.save(); g.fillStyle = '#b48a6a'; rr(g, x - 6, y - 6, w + 12, h + 12, w / 2 + 6); g.fill(); rr(g, x, y, w, h, w / 2); g.clip();
      const cols = ['#ffd6e7', '#c9e4ff', '#fff1b8', '#d8f5d0', '#e5d4ff']; for (let i = 0; i < 18; i++) { g.fillStyle = cols[i % 5]; g.fillRect(x + (i % 3) * w / 3, y + Math.floor(i / 3) * h / 6, w / 3 + 1, h / 6 + 1); }
      g.strokeStyle = 'rgba(150,110,90,.5)'; g.lineWidth = 3; for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(x + i * w / 3, y); g.lineTo(x + i * w / 3, y + h); g.stroke(); } g.restore(); };
    win(230, 90, 90, 170); win(430, 80, 90, 180); win(980, 80, 90, 180); win(1180, 90, 90, 170);
    // round rose window
    g.save(); g.translate(750, 120); for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.fillStyle = i % 2 ? '#ffd1e3' : '#cfe6ff'; g.beginPath(); g.ellipse(0, 32, 18, 34, 0, 0, 7); g.fill(); } g.fillStyle = '#fff1b8'; g.beginPath(); g.arc(0, 0, 20, 0, 7); g.fill(); g.restore();
    // floor planks
    const [x0, y0, x1, y1] = I.floor; gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#d9a877'); gr.addColorStop(1, '#e8bd8c'); g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0 + 80);
    g.strokeStyle = 'rgba(140,90,50,.18)'; g.lineWidth = 2; for (let y = y0; y < y1 + 80; y += 34) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); for (let x = x0 + ((y / 34) % 2) * 90; x < x1; x += 180) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 34); g.stroke(); } }
    // carpet aisle
    g.fillStyle = '#e88a9a'; g.fillRect(690, y0 + 60, 120, y1 - y0 + 20); g.fillStyle = '#f7c6cf'; g.fillRect(698, y0 + 60, 6, y1 - y0 + 20); g.fillRect(796, y0 + 60, 6, y1 - y0 + 20);
    // altar platform
    g.fillStyle = '#c99366'; rr(g, 520, 300, 460, 110, 30); g.fill(); g.fillStyle = '#ddb085'; rr(g, 530, 290, 440, 90, 28); g.fill();
    // door (bottom)
    g.fillStyle = '#a8724a'; rr(g, 690, 1035, 120, 60, 12); g.fill(); g.fillStyle = '#fff'; g.font = '700 22px Pretendard,sans-serif'; g.textAlign = 'center'; g.fillText('🚪 나가기', 750, 1074);
    return c;
  }
  drawStatic(ctx) { ctx.drawImage(this.bg, 0, 0); }
  // y-sorted objects of the room
  objects() {
    const I = this.I, out = [];
    out.push({ y: I.altar.y + 40, draw: ctx => { // altar table + cross + candles
      ctx.fillStyle = '#fffaf2'; rr(ctx, 640, 300, 220, 70, 14); ctx.fill(); ctx.fillStyle = '#f1c9d6'; ctx.fillRect(640, 318, 220, 16);
      ctx.fillStyle = '#e9b949'; ctx.fillRect(744, 200, 12, 100); ctx.fillRect(720, 225, 60, 12);
      for (const cx of [668, 832]) { ctx.fillStyle = '#fff'; ctx.fillRect(cx - 6, 262, 12, 38); const f = 1 + Math.sin(performance.now() / 160 + cx) * .15; ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.ellipse(cx, 254, 5 * f, 10 * f, 0, 0, 7); ctx.fill(); } } });
    I.pews.forEach((p, i) => { const r = this.pewRect(i); out.push({ y: r.y + r.h, draw: ctx => {
      ctx.fillStyle = 'rgba(80,40,20,.18)'; rr(ctx, r.x + 6, r.y + 30, r.w, 26, 10); ctx.fill();
      ctx.fillStyle = '#9b6340'; rr(ctx, r.x, r.y - 40, r.w, 50, 12); ctx.fill(); ctx.fillStyle = '#b8784e'; rr(ctx, r.x, r.y + 6, r.w, 30, 10); ctx.fill();
      ctx.fillStyle = '#d29a6a'; rr(ctx, r.x + 8, r.y - 34, r.w - 16, 10, 5); ctx.fill(); } }); });
    const o = I.offering; out.push({ y: o.y + 30, draw: ctx => { ctx.fillStyle = '#8a5a3a'; rr(ctx, o.x - 50, o.y - 50, 100, 80, 12); ctx.fill(); ctx.fillStyle = '#c88a5a'; rr(ctx, o.x - 50, o.y - 62, 100, 22, 10); ctx.fill(); ctx.fillStyle = '#3a2418'; ctx.fillRect(o.x - 22, o.y - 55, 44, 6);
      ctx.fillStyle = '#fff'; ctx.font = '700 17px Pretendard,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('헌금함', o.x, o.y - 10); ctx.font = '22px sans-serif'; ctx.fillText('🪙', o.x, o.y + 18); } });
    const b = I.board; out.push({ y: b.y + 20, draw: ctx => { ctx.fillStyle = '#7a4f33'; rr(ctx, b.x - 95, b.y - 150, 190, 150, 10); ctx.fill(); ctx.fillStyle = '#d9b27c'; rr(ctx, b.x - 85, b.y - 140, 170, 130, 8); ctx.fill();
      const cs = ['#fff6a8', '#ffd2e0', '#cfe8ff', '#d9f7cf']; for (let i = 0; i < 4; i++) { ctx.fillStyle = cs[i]; ctx.fillRect(b.x - 75 + (i % 2) * 80, b.y - 130 + Math.floor(i / 2) * 60, 66, 50); }
      ctx.fillStyle = '#7a4f33'; ctx.fillRect(b.x - 4, b.y, 8, 30); ctx.fillStyle = '#4a3f66'; ctx.font = '700 16px Pretendard,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('기도 게시판', b.x, b.y + 50); } });
    return out;
  }
}

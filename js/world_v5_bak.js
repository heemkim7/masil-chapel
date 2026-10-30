// World: walk mask, collision, characters, y-sorted rendering
import { IMG, facingFromAngle } from './assets.js';

export class World {
  constructor(cfg) {
    this.cfg = cfg; const k = cfg.world.scale, isl = IMG.island;
    this.W = isl.width * k; this.H = isl.height * k;
    const m = IMG.mask, c = document.createElement('canvas'); c.width = m.width; c.height = m.height;
    const x = c.getContext('2d'); x.drawImage(m, 0, 0);
    this.mw = m.width; this.mh = m.height; this.md = x.getImageData(0, 0, m.width, m.height).data;
    this.circles = [{ x: cfg.chapel.x, y: cfg.chapel.y - 40, r: cfg.chapel.r }, ...cfg.props.filter(p => p.r).map(p => ({ x: p.x, y: p.y, r: p.r }))];
  }
  walkable(x, y) {
    const mx = Math.floor(x / this.W * this.mw), my = Math.floor(y / this.H * this.mh);
    if (mx < 0 || my < 0 || mx >= this.mw || my >= this.mh) return false;
    if (this.md[(my * this.mw + mx) * 4] < 128) return false;
    for (const c of this.circles) { const dx = x - c.x, dy = (y - c.y) * 1.6; if (dx * dx + dy * dy < c.r * c.r) return false; }
    return true;
  }
  randomPoint(rnd = Math.random) {
    for (let i = 0; i < 500; i++) { const x = rnd() * this.W, y = rnd() * this.H; if (this.walkable(x, y)) return { x, y }; }
    return { x: this.cfg.yard.x, y: this.cfg.yard.y };
  }
}

export class Char {
  constructor(sprites, char, outfit, x, y, opts = {}) {
    Object.assign(this, { sprites, char, outfit, x, y, vx: 0, vy: 0, face: 'S', ang: Math.PI / 2, dist: 0, t: Math.random() * 9, emote: null, emoteT: 0, name: opts.name || '', tagColor: opts.tagColor || '#fff', drawH: opts.drawH || 150, bubble: null, bubbleT: 0, equip: opts.equip || null, cfg: opts.cfg });
  }
  move(world, ix, iy, dt, speed, accel) {
    const tx = ix * speed, ty = iy * speed, k = 1 - Math.exp(-accel * dt);
    this.vx += (tx - this.vx) * k; this.vy += (ty - this.vy) * k;
    const sp = Math.hypot(this.vx, this.vy);
    if (Math.hypot(ix, iy) > 0.05) { this.ang = Math.atan2(iy, ix); this.face = facingFromAngle(this.ang); this.emote = null; }
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    let moved = 0;
    if (world.walkable(nx, ny)) { moved = Math.hypot(nx - this.x, ny - this.y); this.x = nx; this.y = ny; }
    else if (world.walkable(nx, this.y)) { moved = Math.abs(nx - this.x); this.x = nx; this.vy *= .5; }
    else if (world.walkable(this.x, ny)) { moved = Math.abs(ny - this.y); this.y = ny; this.vx *= .5; }
    else { this.vx = this.vy = 0; }
    this.dist += moved; this.speedNow = sp > 8 && moved > 0 ? sp : 0;
  }
  say(text, dur = 3.5) { this.bubble = text; this.bubbleT = dur; }
  doEmote(e) { this.emote = e; this.emoteT = 0; this.face = 'S'; }
  update(dt) { this.t += dt; if (this.bubbleT > 0 && (this.bubbleT -= dt) <= 0) this.bubble = null; if (this.emote && (this.emoteT += dt) > 1.6) this.emote = null; }
  // pick frame + transform
  pose() {
    const S = this.sprites, c = this.char, o = this.outfit, walking = this.speedNow > 0;
    let sx = 1, sy = 1, lift = 0, sel, fi = 0;
    if (this.emote) {
      sel = S.get(c, o, this.emote, 'S');
      if (sel) { fi = Math.floor(this.emoteT * 6) % sel.frames.length;
        if (this.emote === 'jump' || this.emote === 'happy') { const p = (this.emoteT * 2.2) % 1; lift = Math.sin(p * Math.PI) * 38; sy = p < .12 || p > .88 ? .9 : 1.05; sx = 2 - sy; }
        if (sel.frames.length === 1 && this.emote !== 'jump') { sy = 1 + Math.sin(this.emoteT * 9) * .03; }
        if (this.emote === 'wave' && sel.frames.length === 1) sx = 1 + Math.sin(this.emoteT * 12) * .02;
      }
    }
    if (!sel && walking) {
      sel = S.get(c, o, 'walk', this.face); const n = sel.frames.length, ph = this.dist / (this.cfg.player.stepLen);
      fi = Math.floor(ph) % n; const b = Math.sin(ph / n * Math.PI * 4);
      lift = Math.abs(b) * 4; sy = 1 + b * .015; sx = 1 - b * .012;
    }
    if (!sel) {
      const front = ['S', 'SE', 'SW'].includes(this.face) && S.has(c, o, 'idle_S');
      sel = front ? S.get(c, o, 'idle', 'S') : S.get(c, o, 'walk', this.face);
      const br = Math.sin(this.t * 2.4); sy = 1 + br * .018; sx = 1 - br * .01;
      if (front) { const n = sel.frames.length, cyc = this.t % 4; fi = cyc > 3.75 ? n - 1 : Math.floor(cyc * 1.5) % Math.max(1, n - 1); if (front && this.face !== 'S') sel = { ...sel, flip: this.face === 'SE' ? false : false }; }
      else fi = 0;
    }
    return { key: sel.frames[fi], flip: sel.flip, sx, sy, lift, dir: sel.dir };
  }
  draw(ctx) {
    const p = this.pose(), img = IMG[p.key]; if (!img) return;
    const at = this.sprites.a, k = this.drawH / 220, w = at.frameW * k, h = at.frameH * k, by = at.baselineY * k;
    // shadow
    ctx.save(); ctx.fillStyle = 'rgba(40,60,40,.25)'; ctx.beginPath(); ctx.ellipse(this.x, this.y, 30 * k * (1 - p.lift / 120), 11 * k, 0, 0, 7); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(this.x, this.y - p.lift); ctx.scale(p.flip ? -p.sx : p.sx, p.sy);
    const back = p.dir === 'N' || p.dir === 'NW';
    const acc = (front) => { if (!this.equip) return; for (const slot of ['back', 'hat', 'pet']) { const id = this.equip[slot]; if (!id) continue; const A = this.cfg.acc[id]; const ai = IMG[A.img]; if (!ai) continue;
      const isFront = A.back ? back : true; if (isFront !== front) continue;
      const aw = this.drawH * A.w * 1.0, ah = aw * ai.height / ai.width, bob = A.bob ? Math.sin(this.t * 3) * 5 : 0;
      ctx.drawImage(ai, -aw / 2 + (A.x || 0) * this.drawH, -this.drawH * (1 - A.y) - ah / 2 + (A.back ? 0 : -this.drawH * .02) + bob, aw, ah); } };
    acc(false);
    const M = at.meta && at.meta[p.key];
    if (M) { const k2 = k * M[0]; ctx.drawImage(img, -M[1] * k2, -M[2] * k2, at.frameW * k2, at.frameH * k2); } else ctx.drawImage(img, -w / 2, -by, w, h);
    acc(true);
    ctx.restore();
  }
  drawLabel(ctx) {
    const top = this.y - this.drawH * 1.08 - 6;
    if (this.name) { ctx.font = '600 15px Pretendard, sans-serif'; ctx.textAlign = 'center'; const tw = ctx.measureText(this.name).width + 14;
      ctx.fillStyle = 'rgba(40,40,70,.55)'; rr(ctx, this.x - tw / 2, top - 11, tw, 22, 11); ctx.fill(); ctx.fillStyle = this.tagColor; ctx.fillText(this.name, this.x, top + 5); }
    if (this.bubble) { ctx.font = '500 16px Pretendard, sans-serif'; const tw = Math.min(260, ctx.measureText(this.bubble).width + 22), y = top - 46;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c9b8e8'; ctx.lineWidth = 2; rr(ctx, this.x - tw / 2, y - 16, tw, 32, 14); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.x - 7, y + 15); ctx.lineTo(this.x, y + 25); ctx.lineTo(this.x + 7, y + 15); ctx.fill();
      ctx.fillStyle = '#4a3f66'; ctx.textAlign = 'center'; ctx.fillText(this.bubble, this.x, y + 6); }
  }
}
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

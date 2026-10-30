// World: walk mask, collision, characters, y-sorted rendering
import { IMG, facingFromAngle } from './assets.js';

export class World {
  constructor(cfg) {
    this.cfg = cfg; const k = cfg.world.scale, isl = IMG.island;
    this.W = isl.width * k; this.H = isl.height * k;
    const m = IMG.mask, c = document.createElement('canvas'); c.width = m.width; c.height = m.height;
    const x = c.getContext('2d'); x.drawImage(m, 0, 0);
    this.mw = m.width; this.mh = m.height; this.md = x.getImageData(0, 0, m.width, m.height).data;
    this.cfg = cfg; this.circles = cfg.props.filter(p => p.r && p.r < 100).map(p => ({ x: p.x, y: p.cy ?? p.y, r: p.r }));
    // ground footprints (boxes) for buildings; door is the only way in (interact near door)
    this.boxes = cfg.props.filter(p => p.r >= 100).map(p => { const im = IMG[p.img], w = p.h * im.width / im.height; return { x: p.x - w * .42, y: p.y - p.h * .42, w: w * .84, h: p.h * .42 - 8 }; });
    this.setChapel(1);
  }
  chapelArt(t) { const C = this.cfg.chapel; let a = C; for (const r of C.arts || []) if (t >= r.min) a = r; return a; }
  setChapel(t) { const C = this.cfg.chapel, a = this.chapelArt(t), im = IMG[a.img]; if (!im) return; const h = a.h, w = h * im.width / im.height, l = C.door.x - w * a.ax, top = C.door.y - h * a.ay;
    this.chapelBox = { x: l + w * .06, y: top + h * .55, w: w * .9, h: C.door.y - 14 - (top + h * .55) }; this.chTier = t; }
  walkable(x, y) {
    const mx = Math.floor(x / this.W * this.mw), my = Math.floor(y / this.H * this.mh);
    if (mx < 0 || my < 0 || mx >= this.mw || my >= this.mh) return false;
    if (this.md[(my * this.mw + mx) * 4] < 128) return false;
    const B = this.chapelBox; if (B && x > B.x && x < B.x + B.w && y > B.y && y < B.y + B.h) return false;
    for (const b of this.boxes) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return false;
    for (const c of this.circles) { const dx = x - c.x, dy = (y - c.y) * 1.6; if (dx * dx + dy * dy < c.r * c.r) return false; }
    return true;
  }
  randomPoint(rnd = Math.random) {
    for (let i = 0; i < 500; i++) { const x = rnd() * this.W, y = rnd() * this.H; if (this.walkable(x, y)) return { x, y }; }
    return { x: this.cfg.yard.x, y: this.cfg.yard.y };
  }
}

const DIRS8 = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'], SEC = Math.PI / 4;
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
export class Char {
  constructor(sprites, char, outfit, x, y, opts = {}) {
    Object.assign(this, { sprites, char, outfit, x, y, vx: 0, vy: 0, face: 'S', ang: Math.PI / 2, visAng: Math.PI / 2, dist: 0, t: Math.random() * 9, emote: null, emoteT: 0, name: opts.name || '', tagColor: opts.tagColor || '#fff', drawH: opts.drawH || 150, bubble: null, bubbleT: 0, equip: opts.equip || null, cfg: opts.cfg,
      steer: false, prevFace: null, blendT: 1, _lf: 'S', lean: 0, puffs: [], _step: 0 });
  }
  move(world, ix, iy, dt, speed, accel) {
    const tx = ix * speed, ty = iy * speed, k = 1 - Math.exp(-accel * dt);
    this.vx += (tx - this.vx) * k; this.vy += (ty - this.vy) * k;
    const sp = Math.hypot(this.vx, this.vy);
    this.steer = Math.hypot(ix, iy) > 0.05; if (this.steer) { this.ang = Math.atan2(iy, ix); this.emote = null; }
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    let moved = 0;
    if (world.walkable(nx, ny)) { moved = Math.hypot(nx - this.x, ny - this.y); this.x = nx; this.y = ny; }
    else if (world.walkable(nx, this.y)) { moved = Math.abs(nx - this.x); this.x = nx; this.vy *= .5; }
    else if (world.walkable(this.x, ny)) { moved = Math.abs(ny - this.y); this.y = ny; this.vx *= .5; }
    else { this.vx = this.vy = 0; }
    this.dist += moved; this.speedNow = sp > 8 && moved > 0 ? sp : 0;
  }
  // smooth facing: visual angle eases toward the steering angle; the 8-way sprite only switches
  // once visAng is past the sector edge by a hysteresis margin (no flicker on near-diagonal input)
  updateFacing(dt) {
    if (this.steer) {
      this.visAng += angDiff(this.ang, this.visAng) * (1 - Math.exp(-16 * dt));
      let ci = DIRS8.indexOf(this.face); if (ci < 0) ci = 2;
      if (Math.abs(angDiff(this.visAng, ci * SEC)) > SEC / 2 + 0.22) this.face = DIRS8[((Math.round(this.visAng / SEC) % 8) + 8) % 8];
    } else { const ci = DIRS8.indexOf(this.face); if (ci >= 0 && Math.abs(angDiff(this.visAng, ci * SEC)) > SEC) this.visAng = ci * SEC; }
    if (this.face !== this._lf) { this.prevFace = this._lf; this._lf = this.face; this.blendT = 0; }
    this.blendT = Math.min(1, this.blendT + dt / 0.13);
    // lean toward lateral motion (screen x), eased
    this.lean = 0; // v7: lean removed (it rotated the head around the feet and read as head shake)
    // dust puffs at footfalls
    const step = Math.floor(this.dist / ((this.cfg && this.cfg.player.stepLen) || 34));
    if (step !== this._step) { if (this.speedNow > 60 && step % 2 === 0 && this.puffs.length < 8) this.puffs.push({ x: this.x - Math.cos(this.ang) * 10, y: this.y - Math.sin(this.ang) * 4, t: 0, s: .7 + Math.random() * .5 }); this._step = step; }
    for (const p of this.puffs) p.t += dt; this.puffs = this.puffs.filter(p => p.t < .5);
  }
  say(text, dur = 3.5) { this.bubble = text; this.bubbleT = dur; }
  doEmote(e) { this.emote = e; this.emoteT = 0; this.face = 'S'; }
  update(dt) { this.t += dt; if (this.bubbleT > 0 && (this.bubbleT -= dt) <= 0) this.bubble = null; if (this.emote && (this.emoteT += dt) > 1.6) this.emote = null; this.updateFacing(dt); this.steer = false; if (this.jumpT != null && (this.jumpT += dt) > .56) this.jumpT = null; }
  jump() { if (this.jumpT == null) { this.jumpT = 0; return true; } return false; }
  // pick frame + transform. Walk frames step by distance travelled; `mix` = fraction toward the next frame (for in-betweening)
  pose(face = this.face) {
    const S = this.sprites, c = this.char, o = this.outfit, walking = this.speedNow > 0;
    let sx = 1, sy = 1, lift = 0, sel, fi = 0, mix = 0;
    if (this.emote) {
      sel = S.get(c, o, this.emote, 'S');
      if (sel) { fi = Math.floor(this.emoteT * 6) % sel.frames.length;
        if (this.emote === 'jump' || this.emote === 'happy') { const p = (this.emoteT * 2.2) % 1; lift = Math.sin(p * Math.PI) * 38; sy = p < .12 || p > .88 ? .9 : 1.05; sx = 2 - sy; }
        if (sel.frames.length === 1 && this.emote !== 'jump') { sy = 1 + Math.sin(this.emoteT * 9) * .03; }
        if (this.emote === 'wave' && sel.frames.length === 1) sx = 1 + Math.sin(this.emoteT * 12) * .02;
      }
    }
    if (!sel && walking) {
      sel = S.get(c, o, 'walk', face); const n = sel.frames.length, ph = this.dist / (this.cfg.player.stepLen);
      fi = Math.floor(ph) % n; mix = ph - Math.floor(ph);
      // continuous bob/squash per footstep (2 steps per cycle of n frames => one bounce every n/2 frames)
      const b = Math.sin(ph / n * Math.PI * 4);
      lift = Math.round(Math.abs(b) * 2); // v7: gentle whole-pixel bob, no squash while walking (squash read as trembling)
    }
    if (!sel) {
      const front = ['S', 'SE', 'SW'].includes(face) && S.has(c, o, 'idle_S');
      sel = front ? S.get(c, o, 'idle', 'S') : S.get(c, o, 'walk', face);
      const br = Math.sin(this.t * 2.4); sy = 1 + br * .018; sx = 1 - br * .01;
      if (front) { const n = sel.frames.length, cyc = this.t % 4; fi = cyc > 3.75 ? n - 1 : Math.floor(cyc * 1.5) % Math.max(1, n - 1); }
      else fi = 0;
    }
    if (this.jumpT != null) { const q = this.jumpT / .56; lift += Math.sin(q * Math.PI) * 48;
      if (q < .12) { sy *= .86; sx *= 1.12; } else if (q > .9) { sy *= .88; sx *= 1.1; } else { const st = 1 + Math.sin(q * Math.PI) * .07; sy *= st; sx /= Math.sqrt(st); } }
    return { key: sel.frames[fi], next: walking && !this.emote ? sel.frames[(fi + 1) % sel.frames.length] : null, mix, flip: sel.flip, sx, sy, lift, dir: sel.dir };
  }
  _img(ctx, key, alpha) {
    const img = (this.av && window.AV?.frame(this, key)) || IMG[key]; if (!img || alpha <= 0.01) return 0; const at = this.sprites.a, k = this.drawH / 220; ctx.globalAlpha = alpha;
    const M = at.meta && at.meta[key];
    if (M) { const k2 = k * M[0]; ctx.drawImage(img, -M[1] * k2, -M[2] * k2, at.frameW * k2, at.frameH * k2); return ((img.top ?? 0) - M[2]) * k2; } ctx.drawImage(img, -at.frameW * k / 2, -at.baselineY * k, at.frameW * k, at.frameH * k); return ((img.top ?? 0) - at.baselineY) * k;
  }
  _layer(ctx, p, alpha) {
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y - p.lift)); ctx.scale(p.flip ? -p.sx : p.sx, p.sy);
    const back = p.dir === 'N' || p.dir === 'NW';
    const acc = (front) => { if (!this.equip) return; for (const slot of ['back', 'hat', 'pet']) { const id = this.equip[slot]; if (!id) continue; const A = this.cfg.acc[id]; const ai = IMG[A.img]; if (!ai) continue;
      const isFront = A.back ? back : true; if (isFront !== front) continue;
      const aw = this.drawH * A.w * 1.0, ah = aw * ai.height / ai.width, bob = A.bob ? Math.sin(this.t * 3) * 5 : 0; ctx.globalAlpha = alpha;
      ctx.drawImage(ai, -aw / 2 + (A.x || 0) * this.drawH, -this.drawH * (1 - A.y) - ah / 2 + (A.back ? 0 : -this.drawH * .02) + bob, aw, ah); } };
    acc(false);
    const ht = this._img(ctx, p.key, alpha); if (alpha > .3) this.headY = Math.min(this.headY ?? 1e9, this.y - p.lift + ht * p.sy);
    // in-between: fade the next walk frame in over the last part of each step (12 perceived frames from 6 drawn)
    // v7: no in-between ghost frame (double head image = left/right head shake)
    acc(true);
    ctx.restore();
  }
  draw(ctx) {
    const p = this.pose(); if (!IMG[p.key]) return; this.headY = null;
    const k = this.drawH / 220;
    // dust puffs (behind) + soft contact shadow
    for (const d of this.puffs) { const q = d.t / .5; ctx.fillStyle = `rgba(235,225,205,${.45 * (1 - q)})`; ctx.beginPath(); ctx.ellipse(d.x, d.y - q * 10 * k, (8 + q * 16) * k * d.s, (5 + q * 8) * k * d.s, 0, 0, 7); ctx.fill(); }
    ctx.save(); const sr = 30 * k * (1 - p.lift / 120); const gr = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, sr); gr.addColorStop(0, 'rgba(40,60,40,.34)'); gr.addColorStop(1, 'rgba(40,60,40,0)');
    ctx.translate(this.x, this.y); ctx.scale(1, 11 / 30); ctx.translate(-this.x, -this.y); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(this.x, this.y, sr, 0, 7); ctx.fill(); ctx.restore();
    // brief crossfade between direction sprites when turning
    if (this.kneel) { // v7 kneel/pray pose: legs fold under (lower body hidden, body lowered) + folded-hands glyph
      const H = this.drawH, cut = H * .3; ctx.save(); ctx.beginPath(); ctx.rect(this.x - 200, this.y - 600, 400, 600); ctx.clip(); ctx.translate(0, cut * .78);
      ctx.beginPath(); ctx.rect(this.x - 200, this.y - 600 - cut, 400, 600 - cut * .78 - 4); ctx.clip(); this._layer(ctx, p, 1); ctx.restore();
      ctx.fillStyle = 'rgba(120,90,160,.25)'; ctx.beginPath(); ctx.ellipse(this.x, this.y - 6, H * .2, H * .06, 0, 0, 7); ctx.fill();
      ctx.font = `${Math.round(H * .17)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('🙏', this.x, this.y - H * .38); ctx.globalAlpha = 1; return; }
    if (this.blendT < 1 && this.prevFace && !this.emote) { const pp = this.pose(this.prevFace); this._layer(ctx, pp, 1); this._layer(ctx, p, this.blendT); }
    else this._layer(ctx, p, 1);
    ctx.globalAlpha = 1;
  }
  drawLabel(ctx) {
    const top = Math.min(this.y - this.drawH * 1.08 - 6, (this.headY ?? 1e9) - 15); // tag sits above the actual head top of the frame drawn this tick
    if (this.name) { ctx.font = '600 15px Pretendard, sans-serif'; ctx.textAlign = 'center'; const tw = ctx.measureText(this.name).width + 14;
      ctx.fillStyle = 'rgba(40,40,70,.55)'; rr(ctx, this.x - tw / 2, top - 11, tw, 22, 11); ctx.fill(); ctx.fillStyle = this.tagColor; ctx.fillText(this.name, this.x, top + 5); }
    if (this.bubble) { ctx.font = '500 16px Pretendard, sans-serif'; const MW = 220, LH = 21;
      if (this._bt !== this.bubble) { this._bt = this.bubble; const L = []; let cur = ''; for (const w of String(this.bubble).split(/(\s+)/)) { const t = cur + w; if (ctx.measureText(t).width <= MW) { cur = t; continue; } if (cur.trim()) L.push(cur.trim()); cur = ''; for (const ch of w.trimStart()) { if (ctx.measureText(cur + ch).width > MW) { L.push(cur); cur = ''; } cur += ch; } } if (cur.trim()) L.push(cur.trim()); if (L.length > 4) { L.length = 4; L[3] = L[3].slice(0, -1) + '…'; } this._bl = L; this._bw = Math.max(...L.map(l => ctx.measureText(l).width)) + 26; }
      const L = this._bl, tw = this._bw, bh = L.length * LH + 12, by = top - 30 - bh;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c9b8e8'; ctx.lineWidth = 2; rr(ctx, this.x - tw / 2, by, tw, bh, 14); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.x - 7, by + bh - 1); ctx.lineTo(this.x, by + bh + 10); ctx.lineTo(this.x + 7, by + bh - 1); ctx.fill();
      ctx.fillStyle = '#4a3f66'; ctx.textAlign = 'center'; L.forEach((l, i) => ctx.fillText(l, this.x, by + 6 + LH * (i + 1) - 5)); }
  }
}
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

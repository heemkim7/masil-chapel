// Layered paper-doll avatars: base body sheet (gender) → skin/hair/outfit recolor via per-pixel mask sheets →
// hair pieces → hat / face / back / held cosmetics. Every composed frame is cached per appearance code.
// Code: "g.a.s.hs.hc.o.hat.face.back.held" e.g. "f.1.0.0.0.basic.-.-.-.-"  (synced via presence as `av`)
import { IMG } from './assets.js';
const L = (a, b) => a.map((x, i) => [x, b[i]]);
export const GENDER = { f: { name: '여', char: 'player' }, m: { name: '남', char: 'boy' } };
export const AGE = [{ name: '어린이', k: .84 }, { name: '청년', k: 1 }, { name: '중년', k: 1.05 }, { name: '어르신', k: 1, hair: 7 }];
export const SKIN = [['기본', [1, 1, 1]], ['밝은', [1.05, 1.04, 1.05]], ['밀빛', [.95, .86, .76]], ['구릿빛', [.83, .68, .56]], ['짙은', [.66, .5, .4]], ['깊은', [.5, .37, .3]]];
export const HAIRC = [['기본', null], ['흑갈색', [58, 40, 32]], ['밤색', [122, 74, 42]], ['금발', [236, 196, 110]], ['분홍', [246, 160, 190]], ['하늘', [130, 190, 255]], ['라벤더', [184, 160, 232]], ['은발', [214, 214, 224]], ['민트', [150, 220, 196]]];
const NATIVE = { f: [244, 160, 186], m: [74, 52, 40] };
// free outfits: [id, name, base sheet outfit, tint rgb|null]
export const OUTFITS = {
  f: [['basic', '기본 후드', 'basic', null], ['choir', '성가대', 'choir', null], ['mint', '민트 원피스', 'mint', null], ['sky', '하늘 원피스', 'mint', [140, 190, 250]], ['lav', '라벤더 원피스', 'mint', [190, 160, 235]], ['peach', '피치 원피스', 'mint', [250, 180, 150]]],
  m: [['basic', '기본 후드', 'basic', null], ['mint', '민트 티셔츠', 'mint', null], ['sky', '하늘 티셔츠', 'mint', [140, 190, 250]], ['lav', '라벤더 티셔츠', 'mint', [190, 160, 235]], ['peach', '피치 티셔츠', 'mint', [250, 180, 150]], ['navy', '네이비 후드', 'basic', [110, 130, 190]]] };
// hair pieces (h00..h11) — layer 'over' (on top of head) or 'back' (behind body when facing front)
const HP = { h00: { w: .5, y: -.08, at: 'top', l: 'over' }, h01: { w: 1.55, y: -.02, at: 'top', l: 'over', cap: 1 }, h02: { w: 1.3, y: -.04, at: 'top', l: 'over', cap: 1 }, h03: { w: 1.08, y: .3, at: 'top', l: 'back' },
  h04: { w: .22, y: .55, at: 'top', l: 'over', dx: .42 }, h05: { w: 1.35, y: -.08, at: 'top', l: 'over', cap: 1 }, h06: { w: 1.18, y: -.1, at: 'top', l: 'over' }, h07: { w: .2, y: -.14, at: 'top', l: 'over', dx: .05 },
  h08: { w: 1.16, y: -.1, at: 'top', l: 'over' }, h09: { w: 1.02, y: .02, at: 'top', l: 'over', front: 1 }, h10: { w: 1.02, y: .32, at: 'top', l: 'back' }, h11: { w: .42, y: .5, at: 'top', l: 'back' } };
export const HAIRS = { f: [['기본 단발', null], ['똥머리', 'h00'], ['양갈래', 'h01'], ['포니테일', 'h02'], ['긴 생머리', 'h03'], ['땋은 머리', 'h04'], ['양쪽 번', 'h05'], ['낮은 묶음', 'h11']],
  m: [['기본 숏컷', null], ['뾰족 머리', 'h06'], ['더듬이', 'h07'], ['곱슬 머리', 'h08'], ['앞머리 내림', 'h09'], ['울프컷', 'h10'], ['꽁지 머리', 'h11']] };
// 48 shop cosmetics: [id, name, slot, rarity, price, place]
const R = { 일반: 120, 희귀: 400, 영웅: 900, 전설: 1800 };
const D = (n, slot, rar, p = {}) => ({ name: n, slot, rar, price: R[rar] + (p.add || 0), ...p });
export const COS = {
  c00: D('밀짚모자', 'hat', '일반', { w: 1.35, sink: .3 }), c01: D('빨간 베레모', 'hat', '일반', { w: 1.05, sink: .26 }), c02: D('방울 비니', 'hat', '일반', { w: 1.0, sink: .38 }), c03: D('파란 캡모자', 'hat', '일반', { w: 1.1, sink: .32 }),
  c04: D('꽃 화관', 'hat', '희귀', { w: 1.1, sink: .14 }), c05: D('황금 왕관', 'hat', '전설', { w: .72, sink: .12 }), c06: D('신사 실크햇', 'hat', '영웅', { w: 1.0, sink: .2 }), c07: D('토끼 머리띠', 'hat', '희귀', { w: .95, sink: .18 }),
  c08: D('고양이 머리띠', 'hat', '희귀', { w: 1.0, sink: .2 }), c09: D('산타 모자', 'hat', '희귀', { w: 1.2, sink: .32 }), c10: D('학사모', 'hat', '영웅', { w: 1.15, sink: .2 }), c11: D('요리사 모자', 'hat', '희귀', { w: .95, sink: .22 }),
  c12: D('천사 링', 'hat', '전설', { w: .72, sink: -.12 }), c13: D('분홍 리본', 'hat', '일반', { w: .6, sink: .1, dx: .3 }), c14: D('썬바이저', 'hat', '일반', { w: 1.08, sink: .3 }), c15: D('초록 벙거지', 'hat', '희귀', { w: 1.2, sink: .34 }),
  c16: D('동글 안경', 'face', '일반', { w: .78 }), c17: D('하트 선글라스', 'face', '희귀', { w: .8 }), c18: D('별 선글라스', 'face', '영웅', { w: .84 }), c19: D('외눈 안경', 'face', '희귀', { w: .22, dx: -.18 }),
  c20: D('하트 볼터치', 'face', '일반', { w: .7, dy: .12 }), c21: D('콧수염', 'face', '희귀', { w: .4, dy: .2 }), c22: D('하얀 마스크', 'face', '일반', { w: .62, dy: .22 }), c23: D('나비 핀', 'hat', '희귀', { w: .32, sink: .45, dx: .4 }),
  c24: D('천사 날개', 'back', '전설', { w: 1.25 }), c25: D('나비 날개', 'back', '영웅', { w: 1.2 }), c26: D('빨간 망토', 'back', '희귀', { w: .78, dy: .06 }), c27: D('노란 백팩', 'back', '일반', { w: .62 }),
  c28: D('곰돌이 백팩', 'back', '희귀', { w: .66 }), c29: D('기타', 'back', '영웅', { w: .7, dy: .05 }), c30: D('무지개 목도리', 'back', '희귀', { w: .62, dy: -.12, front: 1 }), c31: D('요정 날개', 'back', '전설', { w: 1.2 }),
  c32: D('꽃다발', 'held', '희귀'), c33: D('하트 풍선', 'held', '일반', { w: .34, dy: -.5 }), c34: D('등불', 'held', '희귀'), c35: D('작은 성경', 'held', '일반'),
  c36: D('왕사탕', 'held', '일반'), c37: D('아이스크림', 'held', '일반'), c38: D('곰인형', 'held', '희귀', { w: .3 }), c39: D('우산', 'held', '희귀', { w: .4, dy: -.3 }),
  c40: D('물뿌리개', 'held', '일반'), c41: D('촛불', 'held', '희귀'), c42: D('십자가 목걸이', 'face', '영웅', { w: .3, dy: .5 }), c43: D('별 요술봉', 'held', '영웅'),
  c44: D('커피 한 잔', 'held', '일반'), c45: D('바게트', 'held', '일반'), c46: D('종이비행기', 'held', '일반'), c47: D('음표 팻말', 'held', '희귀') };
const SLOTS = ['hat', 'face', 'back', 'held'];
export const DEFAULT = 'f.1.0.0.0.basic.-.-.-.-';
export function parse(code) { const p = String(code || DEFAULT).split('.'); const d = DEFAULT.split('.');
  const g = p[0] === 'm' ? 'm' : 'f', n = (i, max) => Math.max(0, Math.min(max, +p[i] || 0));
  const o = OUTFITS[g].find(x => x[0] === p[5]) ? p[5] : 'basic';
  const cos = i => (COS[p[i]] && COS[p[i]].slot === SLOTS[i - 6]) ? p[i] : '-';
  return { g, a: p.length > 1 ? n(1, 3) : +d[1], s: n(2, SKIN.length - 1), hs: n(3, HAIRS[g].length - 1), hc: n(4, HAIRC.length - 1), o, hat: cos(6), face: cos(7), back: cos(8), held: cos(9) }; }
export function encode(a) { return [a.g, a.a, a.s, a.hs, a.hc, a.o, a.hat, a.face, a.back, a.held].join('.'); }
const loaded = {}; function img(src) { if (!loaded[src]) { const i = new Image(); i.src = src; loaded[src] = i; } return loaded[src].complete && loaded[src].naturalWidth ? loaded[src] : null; }
const tintCache = {};
function tinted(id, rgb) { const k = id + rgb; if (tintCache[k]) return tintCache[k]; const im = img(`assets/cos/${id}.png`); if (!im) return null;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const l = (p[i] + p[i + 1] + p[i + 2]) / 3 / 175; p[i] = Math.min(255, rgb[0] * l); p[i + 1] = Math.min(255, rgb[1] * l); p[i + 2] = Math.min(255, rgb[2] * l); }
  g.putImageData(d, 0, 0); return (tintCache[k] = c); }
// mask frames: sliced lazily from the mask sheet using the same atlas cell rects
let ATLAS = null; const maskSheets = {};
function maskFrame(co, f) { const sh = ATLAS?.sheets?.[co]; if (!sh) return null; const src = 'assets/characters/' + sh.img.replace('.png', '_mask.png'); const m = img(src); if (!m) return null; const cell = sh.cells[f]; if (!cell) return null;
  const k = co + '|' + cell; if (maskSheets[k]) return maskSheets[k]; const c = document.createElement('canvas'); c.width = ATLAS.frameW; c.height = ATLAS.frameH; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(m, cell[0], cell[1], c.width, c.height, 0, 0, c.width, c.height);
  return (maskSheets[k] = g.getImageData(0, 0, c.width, c.height).data); }
const cache = new Map();
function compose(a, key) { // key: "<char>/<outfit>/<frame>"
  const base = IMG[key]; if (!base) return null; const [ch, of, f] = key.split('/'); const co = ch + '/' + of; const M = maskFrame(co, f); if (!M) return null;
  const W = ATLAS.frameW, H = ATLAS.frameH, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
  const dir = (f.match(/_(N|NW|SW|S|W)_/) || [])[1] || 'S', back = dir === 'N' || dir === 'NW', side = dir === 'W';
  // pixel recolor
  const L0 = document.createElement('canvas'); L0.width = W; L0.height = H; const g0 = L0.getContext('2d', { willReadFrequently: true }); g0.drawImage(base, 0, 0); const id = g0.getImageData(0, 0, W, H), p = id.data;
  const sk = SKIN[a.s][1], hcol = a.hc ? HAIRC[a.hc][1] : (a.a === 3 ? HAIRC[7][1] : null), oft = OUTFITS[a.g].find(x => x[0] === a.o)[3];
  let hl = 0, hn = 0, ol = 0, on = 0; for (let i = 0; i < p.length; i += 4) { if (M[i] > 128) { hl += p[i] + p[i + 1] + p[i + 2]; hn++; } if (M[i + 2] > 128 && sat(p, i) > .1) { ol += p[i] + p[i + 1] + p[i + 2]; on++; } }
  hl = hn ? hl / hn : 1; ol = on ? ol / on : 1;
  let x0 = W, x1 = 0, y0 = H, y1 = 0, top = H, bot = 0;
  for (let i = 0, j = 0; i < p.length; i += 4, j++) { const x = j % W, y = (j / W) | 0; if (p[i + 3] > 40) { if (y < top) top = y; if (y > bot) bot = y; }
    if (M[i] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (hcol) { const l = (p[i] + p[i + 1] + p[i + 2]) / hl, k = a.g === 'm' && !a.hc ? 1 : Math.min(1.35, l); for (let q = 0; q < 3; q++) p[i + q] = Math.min(255, hcol[q] * (a.g === 'm' ? Math.min(1.6, .55 + l * .5) : k)); } }
    else if (M[i + 1] > 8 && a.s) { const w = M[i + 1] / 255; for (let q = 0; q < 3; q++) p[i + q] = Math.min(255, p[i + q] * (1 - w + w * sk[q])); }
    else if (M[i + 2] > 128 && oft && sat(p, i) > .1) { const l = (p[i] + p[i + 1] + p[i + 2]) / ol; for (let q = 0; q < 3; q++) p[i + q] = Math.min(255, oft[q] * Math.min(1.3, l)); } }
  g0.putImageData(id, 0, 0);
  if (!back && a.a !== 1) { const t0 = (() => { for (let i = 3, j = 0; i < p.length; i += 4, j++) if (p[i] > 40) return (j / W) | 0; return 0; })(); try { ageFace(g0, p, M, W, H, headBox(p, W, t0, H - 1), a.a, side); } catch { } }
  if (x1 < x0) { x0 = 60; x1 = 140; y0 = top; y1 = top + 90; }
  // v10 anchors: head box measured from the BODY silhouette of this exact frame (top row → neck narrowing),
  // so hair/hat/face layers follow the head in every direction and walk frame (no floating afro on side views)
  const HB = headBox(p, W, top, bot); ch_anchor = HB;
  const fh = bot - top, hw = Math.min(HB.x1 - HB.x0, fh * .5), cx = (HB.x0 + HB.x1) / 2, ht = Math.min(y0, HB.y0 + 2), hairCol = hcol || NATIVE[a.g];
  const put = (im, w, cxx, cy, alignTop) => { if (!im) return; const ww = w, hh = ww * im.height / im.width; g.drawImage(im, cxx - ww / 2, alignTop ? cy : cy - hh / 2, ww, hh); return hh; };
  const hp = HAIRS[a.g][a.hs][1], H0 = hp && HP[hp];
  const hairPiece = layer => { if (!H0 || H0.l !== layer && !(back && layer === 'over' && H0.l === 'back')) return; if (back && H0.front) return; const t = tinted(hp, hairCol); if (!t) return; let dx = (H0.dx || 0) * hw; if (side) dx = Math.abs(dx) + (H0.l === 'back' ? hw * .18 : 0); if (back) dx = -dx;
    put(t, hw * H0.w * (side && H0.cap ? .85 : 1), cx + dx, ht + H0.y * fh * .5, true); };
  const cosIm = id => id && id !== '-' ? img(`assets/cos/${id}.png`) : null;
  const backItem = () => { const C = COS[a.back]; if (!C) return; put(cosIm(a.back), fh * (C.w || .7), cx + (side ? hw * .25 : 0), top + fh * (.52 + (C.dy || 0))); };
  const held = () => { const C = COS[a.held]; if (!C) return; put(cosIm(a.held), fh * (C.w || .24), side ? cx - hw * .2 : back ? cx + hw * .5 : cx - hw * .58, top + fh * (.66 + (C.dy || 0))); };
  const hat = () => { const C = COS[a.hat]; if (!C) return; const im = cosIm(a.hat); if (!im) return; const w = hw * C.w, h = w * im.height / im.width; let dx = (C.dx || 0) * hw; if (back) dx = -dx; const hy = ht - h + h * (C.sink || .25) + (C.sink < 0 ? -fh * .02 : 0);
    if ((C.sink || .25) >= .19 && C.w >= .9) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillRect(cx + dx - w * .6, 0, w * 1.2, hy + h * .45); g.restore(); } // clip hair poking through the crown
    g.drawImage(im, cx + dx - w / 2, hy, w, h); };
  const face = () => { const C = COS[a.face]; if (!C || back) return; const w = hw * C.w * (side ? .6 : 1); put(cosIm(a.face), w, cx + (C.dx || 0) * hw - (side ? hw * .2 : 0), top + fh * (.215 + (C.dy || 0) * .5)); };
  // draw order
  if (!back) { backItem(); hairPiece('back'); } else held();
  g.drawImage(L0, 0, 0);
  hairPiece('over'); if (back) { hairPiece('back'); backItem(); } else if (COS[a.back]?.front) backItem();
  face(); hat(); if (!back) held();
  // name-tag anchor = first opaque row (hats can raise it)
  const d2 = g.getImageData(0, 0, W, H).data; let t2 = H; outer: for (let y = 0; y < H; y++) for (let x = 0; x < W; x += 2) if (d2[(y * W + x) * 4 + 3] > 40) { t2 = y; break outer; } c.top = t2; return c; }
// v10 age faces, painted on the recoloured frame: eyes found as the dark blobs inside the head box.
// 0 child: bigger eyes + round rosy cheeks · 2 middle-aged: slightly lowered lids + soft smile lines · 3 senior: lids, crow's feet, softer rosy cheeks
function eyesOf(p, M, W, HB) { const y0 = Math.round(HB.y0 + (HB.y1 - HB.y0) * .42), y1 = Math.round(HB.y1 - (HB.y1 - HB.y0) * .12), seen = new Uint8Array(W * (y1 - y0 + 1)), blobs = [];
  const dark = (x, y) => { const i = (y * W + x) * 4; return p[i + 3] > 200 && M[i] <= 128 && p[i] + p[i + 1] + p[i + 2] < 230; };
  for (let y = y0; y <= y1; y++) for (let x = HB.x0; x <= HB.x1; x++) { const k = (y - y0) * W + x; if (seen[k] || !dark(x, y)) continue; const st = [[x, y]]; seen[k] = 1; let n = 0, ax = 1e9, bx = -1, ay = 1e9, by = -1;
    while (st.length) { const [u, v] = st.pop(); n++; ax = Math.min(ax, u); bx = Math.max(bx, u); ay = Math.min(ay, v); by = Math.max(by, v);
      for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = u + du, V2 = v + dv; if (U < HB.x0 || U > HB.x1 || V2 < y0 || V2 > y1) continue; const kk = (V2 - y0) * W + U; if (!seen[kk] && dark(U, V2)) { seen[kk] = 1; st.push([U, V2]); } } }
    const w = bx - ax + 1, h = by - ay + 1; if (n > 25 && w < (HB.x1 - HB.x0) * .32 && h < (HB.y1 - HB.y0) * .3 && h > 4) blobs.push({ x: ax, y: ay, w, h, n }); }
  return blobs.sort((a, b) => b.n - a.n).slice(0, 2); }
function ageFace(g, p, M, W, H, HB, age, side) { const E = eyesOf(p, M, W, HB); if (!E.length) return;
  const skinAt = (x, y) => { const i = (Math.round(y) * W + Math.round(x)) * 4; return [p[i], p[i + 1], p[i + 2]]; };
  const fc = (HB.x0 + HB.x1) / 2, eh = Math.max(...E.map(e => e.h)), cy = Math.max(...E.map(e => e.y + e.h)) + eh * .55;
  const shade = (c, k, al) => `rgba(${c.map(v => Math.round(v * k)).join(',')},${al})`;
  const blush = (r, al) => { for (const e of E) { const ex = e.x + e.w / 2, out = ex < fc ? -1 : 1, x = side ? ex + (ex < fc ? -1 : 1) * e.w * .1 : ex + out * e.w * .25; const gr = g.createRadialGradient(x, cy, 0, x, cy, r); gr.addColorStop(0, `rgba(255,130,150,${al})`); gr.addColorStop(1, 'rgba(255,130,150,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, cy, r, r * .72, 0, 0, 7); g.fill(); } };
  if (age === 0) { const src = document.createElement('canvas'); src.width = W; src.height = H; src.getContext('2d').drawImage(g.canvas, 0, 0);
    for (const e of E) { const pad = 2, sx = e.x - pad, sy = e.y - pad, sw = e.w + pad * 2, sh = e.h + pad * 2, k = 1.16; g.drawImage(src, sx, sy, sw, sh, sx - sw * (k - 1) / 2, sy - sh * (k - 1) * .6, sw * k, sh * k); }
    blush(Math.max(5, eh * .62), .42); return; }
  for (const e of E) { const sk = skinAt(e.x + e.w / 2, Math.max(HB.y0, e.y - Math.max(3, e.h * .45))); g.fillStyle = `rgb(${sk.join(',')})`; const lid = e.h * (age === 2 ? .16 : .2);
    g.beginPath(); g.ellipse(e.x + e.w / 2, e.y + lid * .2, e.w * .62, lid * 1.1, 0, Math.PI, 0); g.fill(); // gently lowered upper lid
    const ln = shade(sk, .72, age === 3 ? .55 : .4); g.strokeStyle = ln; g.lineWidth = 1.4; g.lineCap = 'round';
    const ex = e.x + e.w / 2, out = side ? (ex < fc ? -1 : 1) : ex < fc ? -1 : 1, ox = out < 0 ? e.x - 1.5 : e.x + e.w + 1.5;
    if (age === 3) { for (const dy of [-.18, .12, .42]) { g.beginPath(); g.moveTo(ox, e.y + e.h * (.3 + dy * .4)); g.lineTo(ox + out * e.w * .22, e.y + e.h * (.3 + dy)); g.stroke(); } }
    // smile line beside the cheek
    if (!side || ex > fc - 1) { const sx = ex + out * e.w * .55, sy = cy + eh * .25; g.strokeStyle = shade(sk, .78, age === 3 ? .45 : .32); g.beginPath(); g.arc(sx, sy, eh * .45, out < 0 ? -.1 * Math.PI : .55 * Math.PI, out < 0 ? .45 * Math.PI : 1.1 * Math.PI); g.stroke(); } }
  if (age === 3) blush(Math.max(4, eh * .5), .26); }
let ch_anchor = null; export const lastAnchor = () => ch_anchor;
export function headBox(p, W, top, bot) { const fh = bot - top, lim = top + Math.round(fh * .55); let best = 0, bestY = top; const rows = [];
  for (let y = top; y <= lim; y++) { let a = -1, b = -1; for (let x = 0; x < W; x++) if (p[(y * W + x) * 4 + 3] > 40) { if (a < 0) a = x; b = x; } rows.push([a, b]); const w = a < 0 ? 0 : b - a; if (w > best) { best = w; bestY = y; } }
  let neck = lim; for (let y = bestY; y <= lim; y++) { const [a, b] = rows[y - top]; if (a >= 0 && b - a < best * .62) { neck = y; break; } }
  let x0 = 1e9, x1 = -1; for (let y = top; y < neck; y++) { const [a, b] = rows[y - top]; if (a >= 0) { x0 = Math.min(x0, a); x1 = Math.max(x1, b); } }
  return { x0, x1, y0: top, y1: neck, cx: (x0 + x1) / 2 }; }
function sat(p, i) { const mx = Math.max(p[i], p[i + 1], p[i + 2]), mn = Math.min(p[i], p[i + 1], p[i + 2]); return mx ? (mx - mn) / mx : 0; }
function ready(a) { const hp = HAIRS[a.g][a.hs]?.[1]; if (hp && !img(`assets/cos/${hp}.png`)) return false; return SLOTS.every(s => !a[s] || a[s] === '-' || !COS[a[s]] || img(`assets/cos/${a[s]}.png`)); }
// public: used by Char._img
export function frame(ch, key) { if (!ch.av) return null; const k = ch.av + '|' + key; let c = cache.get(k); if (c) return c; const A = ch._avp || (ch._avp = parse(ch.av)); if (!ready(A)) return null; c = compose(A, key); if (c) { if (cache.size > 1600) cache.clear(); cache.set(k, c); } return c; }
export function apply(ch, code) { const a = parse(code); ch.av = encode(a); ch._avp = a; ch.char = GENDER[a.g].char; ch.outfit = OUTFITS[a.g].find(x => x[0] === a.o)[2]; ch.drawH = Math.round(150 * AGE[a.a].k); }
export function init(atlas) { ATLAS = atlas; for (const [k, s] of Object.entries(atlas.sheets || {})) if (/^(player|boy)\//.test(k)) img('assets/characters/' + s.img.replace('.png', '_mask.png')); Object.keys(HP).forEach(h => img(`assets/cos/${h}.png`)); }
export function preload(a) { SLOTS.forEach(s => a[s] && a[s] !== '-' && img(`assets/cos/${a[s]}.png`)); }
export function rollCos(atBox, owned) { const pool = Object.entries(COS).filter(([id]) => !owned.includes(id)); if (!pool.length) return null;
  const w = { 일반: 10, 희귀: atBox ? 6 : 3.5, 영웅: atBox ? 2.2 : 1, 전설: atBox ? .8 : .3 }; let r = Math.random() * pool.reduce((s, [, c]) => s + w[c.rar], 0);
  for (const [id, c] of pool) if ((r -= w[c.rar]) < 0) return { id, kind: 'cos', name: c.name, rar: c.rar, img: `cos/${id}.png` }; return null; }
export const AV = { GENDER, AGE, SKIN, HAIRC, OUTFITS, HAIRS, COS, SLOTS, DEFAULT, parse, encode, frame, apply, init, preload, rollCos };
window.AV = AV;

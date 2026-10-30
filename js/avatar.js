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
  f: [['basic', '기본 후드', 'basic', null], ['choir', '성가대', 'choir', null], ['mint', '민트 원피스', 'mint', null], ['sky', '하늘 원피스', 'mint', [140, 190, 250]], ['lav', '라벤더 원피스', 'mint', [190, 160, 235]], ['peach', '피치 원피스', 'mint', [250, 180, 150]],
    ['hanbok', '색동 한복', 'hanbok', null], ['formal', '예배 정장', 'formal', null], ['winter', '성탄 스웨터', 'winter', null], ['summer', '여름 마린룩', 'summer', null], ['spring', '봄꽃 원피스', 'spring', null], ['autumn', '가을 체크', 'autumn', null]],
  m: [['basic', '기본 후드', 'basic', null], ['mint', '민트 티셔츠', 'mint', null], ['sky', '하늘 티셔츠', 'mint', [140, 190, 250]], ['lav', '라벤더 티셔츠', 'mint', [190, 160, 235]], ['peach', '피치 티셔츠', 'mint', [250, 180, 150]], ['navy', '네이비 후드', 'basic', [110, 130, 190]], ['choir', '성가대 가운', 'choir', null],
    ['hanbok', '한복 저고리', 'hanbok', null], ['formal', '예배 정장', 'formal', null], ['winter', '성탄 후드', 'winter', null], ['summer', '여름 마린룩', 'summer', null], ['spring', '봄 새싹 후드', 'spring', null], ['autumn', '가을 체크', 'autumn', null]] };
// outfits unlocked by gacha (cos id 'o_<id>'); everything else in SHIP is a free starter
export const LOCKED_OUTFITS = ['hanbok', 'formal', 'winter', 'summer', 'spring', 'autumn'];
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
  c00: D('밀짚모자', 'hat', '일반', { w: 1.35, sink: .3 }), c01: D('빨간 베레모', 'hat', '일반', { w: 1.05, sink: .26 }), c02: D('방울 비니', 'hat', '일반', { w: .92, sink: .22 }), c03: D('파란 캡모자', 'hat', '일반', { w: 1.1, sink: .32 }),
  c04: D('꽃 화관', 'hat', '희귀', { w: 1.1, sink: .14 }), c05: D('황금 왕관', 'hat', '전설', { w: .72, sink: .12 }), c06: D('신사 실크햇', 'hat', '영웅', { w: 1.0, sink: .2 }), c07: D('토끼 머리띠', 'hat', '희귀', { w: .95, sink: .18 }),
  c08: D('고양이 머리띠', 'hat', '희귀', { w: 1.0, sink: .2 }), c09: D('산타 모자', 'hat', '희귀', { w: 1.2, sink: .32 }), c10: D('학사모', 'hat', '영웅', { w: 1.15, sink: .2 }), c11: D('요리사 모자', 'hat', '희귀', { w: .95, sink: .22 }),
  c12: D('천사 링', 'hat', '전설', { w: .72, sink: -.12 }), c13: D('분홍 리본', 'hat', '일반', { w: .6, sink: .1, dx: .3 }), c14: D('썬바이저', 'hat', '일반', { w: 1.08, sink: .3 }), c15: D('초록 벙거지', 'hat', '희귀', { w: 1.2, sink: .34 }),
  c16: D('동글 안경', 'face', '일반', { w: .78 }), c17: D('하트 선글라스', 'face', '희귀', { w: .8 }), c18: D('별 선글라스', 'face', '영웅', { w: .84 }), c19: D('외눈 안경', 'face', '희귀', { w: .38, dx: -.18, dy: -.035, dxsw: -.09 }),
  c20: D('하트 볼터치', 'face', '일반', { w: .7, dy: .12 }), c21: D('콧수염', 'face', '희귀', { w: .4, dy: .2 }), c22: D('하얀 마스크', 'face', '일반', { w: .58, dy: .06 }), c23: D('나비 핀', 'hat', '희귀', { w: .32, sink: .45, dx: .4 }),
  c24: D('천사 날개', 'back', '전설', { w: 1.35, ay: .45 }), c25: D('나비 날개', 'back', '영웅', { w: 1.2, ay: .5 }), c26: D('빨간 망토', 'back', '희귀', { w: .8, ay: .12 }), c27: D('노란 백팩', 'back', '일반', { w: .62, ay: .12 }),
  c28: D('곰돌이 백팩', 'back', '희귀', { w: .66, ay: .2 }), c29: D('기타', 'back', '영웅', { w: .7, ay: .35 }), c30: D('무지개 목도리', 'back', '희귀', { w: .6, ay: .02, front: 1 }), c31: D('요정 날개', 'back', '전설', { w: 1.2, ay: .5 }),
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
  for (let i = 0; i < p.length; i += 4) { const l = Math.min(1.12, (p[i] + p[i + 1] + p[i + 2]) / 3 / 175) /* capped: bright tips must not blow out to white specks */; p[i] = Math.min(255, rgb[0] * l); p[i + 1] = Math.min(255, rgb[1] * l); p[i + 2] = Math.min(255, rgb[2] * l); }
  g.putImageData(d, 0, 0); return (tintCache[k] = c); }
// mask frames: sliced lazily from the mask sheet using the same atlas cell rects
let ATLAS = null; const maskSheets = {};
function maskFrame(co, f) { const sh = ATLAS?.sheets?.[co]; if (!sh) return null; const src = 'assets/characters/' + sh.img.replace('.png', '_mask.png'); const m = img(src); if (!m) return null; const cell = sh.cells[f]; if (!cell) return null;
  const k = co + '|' + cell; if (maskSheets[k]) return maskSheets[k]; const c = document.createElement('canvas'); c.width = ATLAS.frameW; c.height = ATLAS.frameH; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(m, cell[0], cell[1], c.width, c.height, 0, 0, c.width, c.height);
  return (maskSheets[k] = g.getImageData(0, 0, c.width, c.height).data); }
const cache = new Map();
function compose(a, key) { const hp0 = HAIRS[a.g][a.hs][1]; // key: "<char>/<outfit>/<frame>"
  const base = IMG[key]; if (!base) return null; const [ch, of, f] = key.split('/'); const co = ch + '/' + of; let M = maskFrame(co, f); if (!M) return null;
  const W = ATLAS.frameW, H = ATLAS.frameH, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
  const dir = (f.match(/_(N|NW|SW|S|W)_/) || [])[1] || 'S', back = dir === 'N' || dir === 'NW', side = dir === 'W';
  // pixel recolor
  const L0 = document.createElement('canvas'); L0.width = W; L0.height = H; const g0 = L0.getContext('2d', { willReadFrequently: true }); g0.drawImage(base, 0, 0); const id = g0.getImageData(0, 0, W, H), p = id.data;
  const NT = window.__noTint, sk = SKIN[NT ? 0 : a.s][1], hcol = NT ? null : a.hc ? HAIRC[a.hc][1] : (a.a === 3 ? HAIRC[7][1] : null), oft = NT ? null : OUTFITS[a.g].find(x => x[0] === a.o)[3];
  // v14: masks are rebuilt offline (tools/clean_masks.py) with SOFT weights: R=hair, G=skin, B=outfit, 255−sum = keep base colour
  // (eyes, brows, mouth, shoes). Antialias pixels blend the recolours by weight → no specks, halos or blotches; no runtime heuristics.
  let hl = 0, hn = 0, ol = 0, on = 0; for (let i = 0; i < p.length; i += 4) { if (M[i] > 200) { hl += p[i] + p[i + 1] + p[i + 2]; hn++; } if (M[i + 2] > 200) { ol += p[i] + p[i + 1] + p[i + 2]; on++; } }
  hl = hn ? hl / hn : 1; ol = on ? ol / on : 1;
  let x0 = W, x1 = 0, y0 = H, y1 = 0, top = H, bot = 0;
  for (let i = 0, j = 0; i < p.length; i += 4, j++) { const x = j % W, y = (j / W) | 0; if (p[i + 3] > 40) { if (y < top) top = y; if (y > bot) bot = y; }
    if (M[i] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const wh = hcol ? M[i] / 255 : 0, ws = a.s ? M[i + 1] / 255 : 0, wo = oft ? M[i + 2] / 255 : 0; if (!(wh || ws || wo)) continue;
    const r = p[i], gg = p[i + 1], bb = p[i + 2], sum = r + gg + bb, wn = 1 - wh - ws - wo, o = [0, 0, 0];
    if (wh) { const l = sum / hl, k = a.g === 'm' && !a.hc ? 1 : Math.min(1.12, l), m2 = a.g === 'm' ? Math.min(1.15, .55 + l * .5) : k; for (let q = 0; q < 3; q++) o[q] += wh * Math.min(255, hcol[q] * m2); }
    if (ws) for (let q = 0; q < 3; q++) o[q] += ws * Math.min(255, p[i + q] * sk[q]);
    if (wo) { const l = Math.min(1.3, sum / ol); for (let q = 0; q < 3; q++) o[q] += wo * Math.min(255, oft[q] * l); }
    for (let q = 0; q < 3; q++) p[i + q] = o[q] + wn * p[i + q]; }
  g0.putImageData(id, 0, 0);
  if (!back && a.a !== 1) { const t0 = (() => { for (let i = 3, j = 0; i < p.length; i += 4, j++) if (p[i] > 40) return (j / W) | 0; return 0; })(); try { ageFace(g0, p, M, W, H, headBox(p, W, t0, H - 1), a.a, side); } catch { } }
  if (x1 < x0) { x0 = 60; x1 = 140; y0 = top; y1 = top + 90; }
  const HX0 = x0, HX1 = x1, HY1 = y1; // base-hair bbox of THIS frame (before the rig overrides y0): hair pieces must cover it
  // v10 anchors: head box measured from the BODY silhouette of this exact frame (top row → neck narrowing),
  // so hair/hat/face layers follow the head in every direction and walk frame (no floating afro on side views)
  const R = RIG && !window.__noRig && RIG[key]; let HB; // v12 rig: per-frame head anchor (same frame index + offset as the body) shared by hair, face, hat
  if (R) { const dy = top - R[2]; HB = { x0: R[0], x1: R[1], y0: top, y1: R[3] + dy, cx: (R[0] + R[1]) / 2 }; y0 = top; } else HB = headBox(p, W, top, bot); ch_anchor = HB;
  // v13: hair/hat size from ONE per-character reference (front walk frame) converted into this frame's native px via the atlas meta scale,
  // so pieces keep the same on-screen size in every direction/frame (rig head widths differ 102..133px by direction → hair grew/shrank while walking)
  // v16 hairless base: a full hair piece replaces ALL baked base hair – scalp inside the head contour repainted as skin, hair outside it removed
  if (hp0 && HP[hp0].w >= 1 && !window.__keepBaseHair) { const ex = (HB.x1 - HB.x0) / 2 * .97, ey = (HB.y1 - HB.y0) * .5, ecx = HB.cx, ecy = HB.y0 + (HB.y1 - HB.y0) * .52;
    let sr = 0, sg = 0, sb = 0, sn = 0; for (let y = HB.y0; y < HB.y1; y++) for (let x = HB.x0; x < HB.x1; x++) { const i = (y * W + x) * 4; if (M[i + 1] > 200 && p[i + 3] > 250) { sr += p[i]; sg += p[i + 1]; sb += p[i + 2]; sn++; } }
    if (sn) { sr /= sn; sg /= sn; sb /= sn; for (let j = 0, i = 0; j < W * H; j++, i += 4) { if (M[i] <= 128) continue; const x = j % W, y = (j / W) | 0, e = ((x - ecx) / ex) ** 2 + ((y - ecy) / ey) ** 2;
      if (e <= 1) { p[i] = sr; p[i + 1] = sg; p[i + 2] = sb; } else p[i + 3] = 0; } g0.putImageData(id, 0, 0); } }
  const MS = ATLAS.meta || {}, ms = (MS[key] || [1])[0], R0 = RIG && RIG[ch + '/' + of + '/walk_S_0.png'], ms0 = (MS[ch + '/' + of + '/walk_S_0.png'] || [1])[0];
  const fh = R0 ? R0[5] * ms0 / ms : bot - top, hw = R0 ? Math.min(R0[1] - R0[0], R0[5] * .5) * ms0 / ms : Math.min(HB.x1 - HB.x0, fh * .5), cx = (HB.x0 + HB.x1) / 2, ht = Math.min(y0, HB.y0 + 2), hairCol = hcol || NATIVE[a.g];
  const LOG = window.__rigLog, put = (im, w, cxx, cy, alignTop, h2) => { if (!im) return; const ww = w, hh = h2 || ww * im.height / im.width; if (LOG) LOG.push(['L', cxx - HB.cx, (alignTop ? cy : cy - hh / 2) - HB.y0, ww, hh]); g.drawImage(im, cxx - ww / 2, alignTop ? cy : cy - hh / 2, ww, hh); return hh; };
  const hp = HAIRS[a.g][a.hs][1], H0 = hp && HP[hp];
  const hairPiece = layer => { if (!H0 || (back ? layer !== 'over' : H0.l !== layer)) return; if (window.__rigLog) window.__hairN = (window.__hairN || 0) + 1; if (back && H0.front && !img(`assets/cos/${hp}_b.png`)) return; const t = tinted(back && img(`assets/cos/${hp}_b.png`) ? hp + '_b' : hp, hairCol); if (!t) return; let dx = (H0.dx || 0) * hw; if (side) dx = Math.abs(dx) + (H0.l === 'back' ? hw * .18 : 0); if (back) dx = -dx;
    let pw = hw * H0.w * (side && H0.cap ? .85 : 1), py = ht + H0.y * fh * .5, ph = 0;
    // v15 fit: full-cap 'over' pieces are anchored to this frame's base-hair contour – at least as wide as the hair, overlapping the
    // forehead/temples, and in back/side views stretched down to the hair's lower edge so no base hair or gap shows under the piece
    if ((H0.l === 'over' || back) && H0.w >= 1 && HX1 > HX0) { pw = Math.max(pw, (HX1 - HX0) * (side ? 1.0 : 1.06)); const nat = pw * t.height / t.width;
      if (H0.l === 'over') py = Math.min(py, ht - hw * H0.w * t.height / t.width * .04) /* top from per-character size only: constant full height while walking */; const need = (back || side ? HY1 + 2 : ht + nat * .78) - py; ph = Math.max(nat, Math.min(need, nat * (back ? 2 : 1.45))); ph = Math.min(ph, Math.max(nat, bot - 6 - py)) /* never below the feet: constant full height */; }
    { const n0 = ph || pw * t.height / t.width; ph = Math.max(n0 * .6, Math.min(n0, bot - 4 - py)); } /* hair never hangs below the feet → constant full height */
    if (window.__tx && (back || side) && H0.w > .9 && x1 >= x0) { const HM = document.createElement('canvas'); HM.width = W; HM.height = H; const hg = HM.getContext('2d'); const md = hg.createImageData(W, H); for (let i = 0; i < p.length; i += 4) if (M[i] > 128) md.data[i + 3] = p[i + 3]; hg.putImageData(md, 0, 0);
      const TX = document.createElement('canvas'); TX.width = W; TX.height = H; const tg = TX.getContext('2d'); for (let ty = y0 - 2; ty < y1 + 2; ty += (y1 - y0 + 4) / 2) tg.drawImage(t, t.width * .18, t.height * .1, t.width * .64, t.height * .38, x0 - 2, ty, x1 - x0 + 4, (y1 - y0 + 4) / 2 + 1); hg.globalCompositeOperation = 'source-in'; hg.drawImage(TX, 0, 0); g.drawImage(HM, 0, 0); } // v13: base-sheet hair re-textured with the selected piece in back view (no second hairstyle showing)
    put(t, pw, ((H0.l === 'over' || back) && H0.w >= 1 && HX1 > HX0 ? (cx + (HX0 + HX1) / 2) / 2 : cx) + dx, py, true, ph); };
  const cosIm = id => id && id !== '-' ? img(`assets/cos/${id}.png`) : null;
  const backItem = () => { const C = COS[a.back]; if (!C) return; put(cosIm(a.back), fh * (C.w || .7), cx + (side ? hw * .25 : 0), top + fh * (.52 + (C.dy || 0))); };
  const held = () => { const C = COS[a.held]; if (!C) return; put(cosIm(a.held), fh * (C.w || .24), side ? cx - hw * .2 : back ? cx + hw * .5 : cx - hw * .58, top + fh * (.66 + (C.dy || 0))); };
  const hat = () => { const C = COS[a.hat]; if (!C) return; const im = cosIm(a.hat); if (!im) return; const w = hw * C.w, h = w * im.height / im.width; let dx = (C.dx || 0) * hw; if (back) dx = -dx; const hy = ht - h + h * (C.sink || .25) + (C.sink < 0 ? -fh * .02 : 0);
    if ((C.sink || .25) >= .19 && C.w >= .9) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillRect(cx + dx - w * .6, 0, w * 1.2, hy + h * .45); g.restore(); } // clip hair poking through the crown
    if (LOG) LOG.push([a.hat, cx + dx - w / 2 - HB.cx, hy - HB.y0, w, h]); g.drawImage(im, cx + dx - w / 2, hy, w, h); };
  const face = () => { const C = COS[a.face]; if (!C || back) return; const w = hw * C.w * (side ? .6 : 1); put(cosIm(a.face), w, cx + (C.dx || 0) * hw - (side ? hw * .2 : 0), top + fh * (.215 + (C.dy || 0) * .5)); };
  // draw order
  if (!back) { backItem(); hairPiece('back'); } else held();
  g.drawImage(L0, 0, 0);
  hairPiece('over');
  // v12: the face (eyes/cheeks/mouth, skin label inside the head box below the brow line) always sits above hair pieces
  if (!back && H0 && H0.l === 'over') { const FC = document.createElement('canvas'); FC.width = W; FC.height = H; const fg = FC.getContext('2d'); const fd = fg.createImageData(W, H), q = fd.data;
    const by = Math.round(HB.y0 + (HB.y1 - HB.y0) * .4), ey = Math.round(HB.y1), fx0 = Math.round(HB.x0 + (HB.x1 - HB.x0) * (side ? .05 : .14)), fx1 = Math.round(HB.x1 - (HB.x1 - HB.x0) * (side ? .05 : .14));
    for (let y = by; y <= ey; y++) for (let x = fx0; x <= fx1; x++) { const i = (y * W + x) * 4; if (M[i + 1] > 8 && M[i] <= 128 || (M[i] <= 128 && p[i + 3] > 200 && p[i] + p[i + 1] + p[i + 2] < 300 && y < ey - 2)) { q[i] = p[i]; q[i + 1] = p[i + 1]; q[i + 2] = p[i + 2]; q[i + 3] = p[i + 3]; } }
    fg.putImageData(fd, 0, 0); g.drawImage(FC, 0, 0); }
  if (back) backItem(); else if (COS[a.back]?.front) backItem();
  face(); hat(); if (!back) held();
  if (!window.__noFin) finalize(g, W, H, 2 * ms / ms0);
  // name-tag anchor = first opaque row (hats can raise it)
  const d2 = g.getImageData(0, 0, W, H).data; let t2 = H; outer: for (let y = 0; y < H; y++) for (let x = 0; x < W; x += 2) if (d2[(y * W + x) * 4 + 3] > 40) { t2 = y; break outer; } c.top = t2; return c; }
// v15 finalize (one pass over the COMPOSITED frame, all parts together):
//  1 alpha binarised (≥96 → solid, else clear) + enclosed pin-holes (<30px) filled → no translucent strands or soft halos
//  2 rim de-fringe: former antialias pixels take the mean colour of solid interior neighbours → no light/dark fringe rings
//  3 ONE uniform outline (2px native ≈ 1px on screen, single colour) drawn around the whole silhouette → part seams vanish
export const OUTLINE = [62, 42, 38];
function finalize(g, W, H, OR = 2) { const RI = Math.ceil(OR), R2 = OR * OR + .5; const id = g.getImageData(0, 0, W, H), p = id.data, N = W * H, A0 = new Uint8Array(N), S = new Uint8Array(N);
  for (let j = 0; j < N; j++) { A0[j] = p[j * 4 + 3]; S[j] = A0[j] > 40 ? 1 : 0; }
  // enclosed small transparent pockets → solid
  const out = new Uint8Array(N), st = []; for (let x = 0; x < W; x++) st.push(x, N - W + x); for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
  while (st.length) { const k = st.pop(); if (out[k] || S[k]) continue; out[k] = 1; const x = k % W; if (x > 0) st.push(k - 1); if (x < W - 1) st.push(k + 1); if (k >= W) st.push(k - W); if (k < N - W) st.push(k + W); }
  const seen = new Uint8Array(N); for (let j = 0; j < N; j++) { if (S[j] || out[j] || seen[j]) continue; const q = [j], comp = []; seen[j] = 1; while (q.length) { const k = q.pop(); comp.push(k); const x = k % W;
      for (const n of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, k - W, k + W]) if (n >= 0 && n < N && !S[n] && !out[n] && !seen[n]) { seen[n] = 1; q.push(n); } }
    if (comp.length < 30) for (const k of comp) S[k] = 2; else for (const k of comp) out[k] = 1; }
  // de-fringe: rim = solid pixels that were translucent or touch the outside
  const core = j => S[j] === 1 && A0[j] >= 250 && j % W > 0 && j % W < W - 1 && j >= W && j < N - W && !out[j - 1] && !out[j + 1] && !out[j - W] && !out[j + W];
  const src = new Uint8ClampedArray(p);
  for (let j = W; j < N - W; j++) { if (!S[j] || core(j)) continue; let r = 0, gg = 0, b = 0, n = 0;
    for (let rad = 1; rad <= 3 && !n; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const k = j + dy * W + dx; if (k < 0 || k >= N || !core(k)) continue; r += src[k * 4]; gg += src[k * 4 + 1]; b += src[k * 4 + 2]; n++; }
    if (n) { p[j * 4] = r / n; p[j * 4 + 1] = gg / n; p[j * 4 + 2] = b / n; } }
  for (let j = 0; j < N; j++) p[j * 4 + 3] = S[j] ? 255 : 0;
  // uniform outline drawn INSIDE the silhouette (rim pixels within OR of the outside) → bbox/height identical to the un-outlined frame
  for (let j = 0; j < N; j++) { if (!S[j]) continue; const x = j % W, y = (j / W) | 0; let hit = 0;
    for (let dy = -RI; dy <= RI && !hit; dy++) for (let dx = -RI; dx <= RI; dx++) { if (dx * dx + dy * dy > R2) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || out[yy * W + xx]) { hit = 1; break; } }
    if (hit) { p[j * 4] = OUTLINE[0]; p[j * 4 + 1] = OUTLINE[1]; p[j * 4 + 2] = OUTLINE[2]; } }
  g.putImageData(id, 0, 0); }
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
export function frame(ch, key) { if (!ch.av) return null; if (key && key.startsWith('L:')) return still(ch, key.slice(2)); const k = ch.av + '|' + key; let c = cache.get(k); if (c) return c; const A = ch._avp || (ch._avp = parse(ch.av)); if (!ready(A)) return null; c = compose(A, key); if (c) { if (cache.size > 1600) cache.clear(); cache.set(k, c); } return c; }

// ---------------- v17 LAYERED test set (2D): one still 200x284 PNG per direction per layer (base · outfit+tint mask · hair), foot pivot (100,272).
// Only the shipped hairs/outfits are offered; any other code maps to the nearest shipped item (old codes keep working).
const NEW_O = ['hanbok', 'formal', 'winter', 'summer', 'spring', 'autumn']; // v22: all 6 outfits regenerated (hanbok, formal, winter, summer, spring, autumn), 5-dir per-cell + 3x checks passed 2026-10-31
export const SHIP = { f: { hairs: [0, 4, 5, 6], outfits: ['basic', 'choir', 'mint', 'sky', 'lav', 'peach', ...NEW_O] }, m: { hairs: [0, 1, 2, 3, 4, 5, 6], outfits: ['basic', 'mint', 'sky', 'lav', 'peach', 'navy', 'choir', ...NEW_O] } };
const NEAR_H = { f: [0, 6, 4, 4, 4, 5, 6, 4], m: [0, 1, 2, 3, 4, 5, 6] }; // index in HAIRS[g] → shipped index
export const LAYER_PIVOT = [100, 272];
const LDIR = { S: 'S', SW: 'SW', W: 'W', NW: 'NW', N: 'N' };
export const shipHair = (g, hs) => NEAR_H[g][hs] ?? SHIP[g].hairs[0];
export const shipOutfit = (g, o) => SHIP[g].outfits.includes(o) ? o : 'basic';
const LP = 'assets/characters/layered/';
function layerSrcs(a, d) { const ch = GENDER[a.g].char, of = OUTFITS[a.g].find(x => x[0] === shipOutfit(a.g, a.o)), hp = HAIRS[a.g][shipHair(a.g, a.hs)][1];
  return { base: `${LP}${ch}_base_${d}.png`, out: `${LP}${ch}_outfit_${of[2]}_${d}.png`, tint: of[3] ? `${LP}${ch}_outfit_${of[2]}_tint_${d}.png` : null, hair: `${LP}${ch}_hair_${hp || 'base'}_${d}.png`, oft: of[3] }; }
export function layeredReady(a, d = 'S') { const L = layerSrcs(a, d); return !!(img(L.base) && img(L.out) && img(L.hair) && (!L.tint || img(L.tint))); }
const lcache = new Map();
function lpix(im) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); return [c, g, g.getImageData(0, 0, c.width, c.height)]; }
export function still(ch, d) { const a = ch._avp || (ch._avp = parse(ch.av)); d = LDIR[d] || 'S'; const k = encode(a) + '|' + d; let c = lcache.get(k); if (c) return c;
  const L = layerSrcs(a, d); if (!layeredReady(a, d) || !SLOTS.every(s => a[s] === '-' || !COS[a[s]] || img(`assets/cos/${a[s]}.png`))) return null;
  const W = 200, H = 284; c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const sk = SKIN[a.s][1], hcol = a.hc ? HAIRC[a.hc][1] : (a.a === 3 ? HAIRC[7][1] : NATIVE[a.g]);
  // base: skin recolour on skin-hued pixels only (eyes/brows/mouth keep their colour)
  const [bc, bg, bd] = lpix(img(L.base)), bp = bd.data; let top = H, x0 = W, x1 = 0;
  for (let i = 0, j = 0; i < bp.length; i += 4, j++) { if (bp[i + 3] > 40) { const y = (j / W) | 0, x = j % W; if (y < top) top = y; }
    if (a.s && bp[i + 3] && bp[i] > 120 && bp[i] > bp[i + 1] + 10 && bp[i + 1] >= bp[i + 2] - 4) for (let q = 0; q < 3; q++) bp[i + q] = Math.min(255, bp[i + q] * sk[q]); }
  bg.putImageData(bd, 0, 0);
  // head box from the bald base: widest rows in the top 40% of the body
  for (let y = top; y < top + 70; y++) for (let x = 0; x < W; x++) if (bp[(y * W + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  const hw = x1 - x0, hcx = (x0 + x1) / 2, hh = hw * 1.05, back = d === 'N' || d === 'NW', side = d === 'W';
  // outfit with optional tint (same formula as tools/tint_mask.py: rgb·(0.62+0.42·lum) weighted by mask alpha)
  const [oc, og, od] = lpix(img(L.out)); if (L.tint) { const tp = lpix(img(L.tint))[2].data, op = od.data, t = L.oft;
    for (let i = 0; i < op.length; i += 4) { const w = tp[i + 3] / 255; if (!w) continue; const lum = (op[i] + op[i + 1] + op[i + 2]) / 765; for (let q = 0; q < 3; q++) op[i + q] = op[i + q] * (1 - w) + Math.min(255, t[q] * (.62 + .42 * lum)) * w; } og.putImageData(od, 0, 0); }
  // hair: neutral grey strands → hair colour by luminance
  const [hc2, hg, hd] = lpix(img(L.hair)), hp = hd.data; for (let i = 0; i < hp.length; i += 4) { if (!hp[i + 3]) continue; const l = Math.min(1.3, (hp[i] + hp[i + 1] + hp[i + 2]) / 3 / 165); for (let q = 0; q < 3; q++) hp[i + q] = Math.min(255, hcol[q] * l); } hg.putImageData(hd, 0, 0);
  let htop = H; for (let i = 3, j = 0; i < hp.length; i += 4, j++) if (hp[i] > 40) { htop = (j / W) | 0; break; }
  const cos = (slot, over) => { const id = a[slot]; if (!id || id === '-' || !COS[id]) return; const C = COS[id], im = img(`assets/cos/${id}.png`); if (!im) return; let w, cx = hcx + (C.dx || 0) * hw * (back ? -1 : 1), cy, h;
    if (slot === 'hat') { w = hw * (C.w || 1) * .95; h = w * im.height / im.width; cy = Math.min(htop, top) + hh * (C.sink || 0) * .9 - h / 2; }
    else if (slot === 'face') { if (back) return; w = hw * (C.w || .8) * (side ? .7 : 1); h = w * im.height / im.width; cx = side ? hcx - hw * .2 : cx + (d === 'SW' ? (C.dxsw || 0) * hw : 0); cy = top + hh * (.6 + (C.dy || 0)); }
    else if (slot === 'back') { if ((C.front ? !back : back) !== over) return; w = hw * (C.w || .8) * 1.15; h = w * im.height / im.width; cy = top + hh * (.93 + (C.dy || 0)) + 8 - h * (C.ay ?? .3); }
    else { if (back) return; w = hw * (C.w || .32) * 1.5; h = w * im.height / im.width; const nk = top + hh * .93, hy = nk + (272 - nk) * .5; cx = side ? hcx - hw * .3 : hcx + hw * .42; cy = hy - h * .6 + hh * (C.dy || 0); }
    g.drawImage(im, cx - w / 2, cy, w, h); };
  cos('back', false); g.drawImage(bc, 0, 0); g.drawImage(oc, 0, 0); g.drawImage(hc2, 0, 0); cos('back', true); cos('face'); cos('hat'); cos('held');
  c.lay = 1; c.top = Math.min(htop, top); c.bodyTop = top; if (lcache.size > 600) lcache.clear(); lcache.set(k, c); return c; }
export function preloadLayers(a) { for (const d of Object.keys(LDIR)) { const L = layerSrcs(a, d); img(L.base); img(L.out); img(L.hair); if (L.tint) img(L.tint); } }
const SHEET_OK = { player: ['basic', 'mint', 'choir'], boy: ['basic', 'mint'] };
export function apply(ch, code) { const a = parse(code); ch.av = encode(a); ch._avp = a; ch.char = GENDER[a.g].char; ch.outfit = SHEET_OK[ch.char]?.includes(OUTFITS[a.g].find(x => x[0] === a.o)[2]) ? OUTFITS[a.g].find(x => x[0] === a.o)[2] : 'basic'; ch.drawH = Math.round(150 * AGE[a.a].k); preloadLayers(a); }
let RIG = null; export const rig = () => RIG;
export function init(atlas) { ATLAS = atlas; fetch('assets/characters/rig.json').then(r => r.json()).then(j => { RIG = j; cache.clear(); }).catch(() => { }); for (const [k, s] of Object.entries(atlas.sheets || {})) if (/^(player|boy)\//.test(k)) img('assets/characters/' + s.img.replace('.png', '_mask.png')); Object.keys(HP).forEach(h => { img(`assets/cos/${h}.png`); img(`assets/cos/${h}_b.png`); }); }
export function preload(a) { preloadLayers(a); SLOTS.forEach(s => a[s] && a[s] !== '-' && img(`assets/cos/${a[s]}.png`)); }
export function rollCos(atBox, owned) { const pool = Object.entries(COS).filter(([id]) => !owned.includes(id)); if (!pool.length) return null;
  const w = { 일반: 10, 희귀: atBox ? 6 : 3.5, 영웅: atBox ? 2.2 : 1, 전설: atBox ? .8 : .3 }; let r = Math.random() * pool.reduce((s, [, c]) => s + w[c.rar], 0);
  for (const [id, c] of pool) if ((r -= w[c.rar]) < 0) return { id, kind: 'cos', name: c.name, rar: c.rar, img: `cos/${id}.png` }; return null; }
export const AV = { _cc: () => cache.clear(), GENDER, AGE, SKIN, HAIRC, OUTFITS, HAIRS, COS, SLOTS, DEFAULT, parse, encode, frame, apply, init, preload, rollCos, rig, lastAnchor, still, layeredReady, SHIP, LOCKED_OUTFITS, shipHair, shipOutfit, LAYER_PIVOT, layered: true };
window.AV = AV;

// Character customizer (title screen inline + in-game modal) and the cosmetics shop shelf.
import { AV } from './avatar.js';
import { Char } from './world.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RC = { 일반: '#8aa0c8', 희귀: '#b06cff', 영웅: '#ff6fa8', 전설: '#ffb020' };
const TAL = '<img class="tal" src="assets/v7/ic_talent.webp" alt="">';
let SP = null, CFG = null; const live = new Set();
export function init(sp, cfg) { SP = sp; CFG = cfg; requestAnimationFrame(tick); }
let lt = 0; function tick(t) { const dt = Math.min(.05, (t - lt) / 1000 || 0); lt = t;
  for (const v of live) { if (!v.c.isConnected) { live.delete(v); continue; } const g = v.c.getContext('2d'), pr = v.pr; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, v.c.width, v.c.height); g.setTransform(pr, 0, 0, pr, 0, 0); g.imageSmoothingQuality = 'high';
    const ch = v.ch; ch.update(dt); v.spin += dt; const dirs = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE']; ch.face = v.walk ? dirs[Math.floor(v.spin / 1.1) % 8] : 'S'; ch.speedNow = v.walk ? 1 : 0; if (v.walk) ch.dist += dt * 80; ch.draw(g); }
  requestAnimationFrame(tick); }
function preview(c, code, w, h) { const pr = Math.min(3, devicePixelRatio || 1); c.width = w * pr; c.height = h * pr; c.style.width = w + 'px'; c.style.height = h + 'px';
  const ch = new Char(SP, 'player', 'basic', w / 2, h - 12, { cfg: CFG, drawH: 150 }); AV.apply(ch, code); const k = h / 210; ch.drawH = Math.round(ch.drawH * k); const v = { c, ch, pr, spin: 0, walk: false }; live.add(v); return v; }
const sw = rgb => rgb ? `rgb(${rgb.join(',')})` : 'conic-gradient(#f4a0ba,#4a3428,#f4a0ba)';
// v10 carousel: click-drag with momentum (mouse + touch via pointer events), wheel→horizontal, keyboard arrows,
// a drag >5px never selects, selected chip scrolled into view, fade edges hint at more items.
function scroller(el) {
  const edge = () => { const m = el.scrollWidth - el.clientWidth; el.classList.toggle('fl', el.scrollLeft > 2); el.classList.toggle('fr', el.scrollLeft < m - 2); };
  let down = null, v = 0, raf = 0;
  const glide = () => { cancelAnimationFrame(raf); const step = () => { if (Math.abs(v) < .3) return; el.scrollLeft -= v; v *= .93; edge(); raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); };
  el.addEventListener('pointerdown', e => { if (e.button) return; cancelAnimationFrame(raf); down = { x: e.clientX, sl: el.scrollLeft, lx: e.clientX, lt: performance.now(), id: e.pointerId }; el._dragged = false; v = 0; });
  el.addEventListener('pointermove', e => { if (!down || e.pointerId !== down.id) return; const dx = e.clientX - down.x;
    if (!el._dragged && Math.abs(dx) > 5) { el._dragged = true; try { el.setPointerCapture(e.pointerId); } catch { } el.classList.add('drag'); }
    if (el._dragged) { el.scrollLeft = down.sl - dx; const t = performance.now(), dt = Math.max(1, t - down.lt); v = v * .5 + ((e.clientX - down.lx) * 16 / dt) * .5; down.lx = e.clientX; down.lt = t; edge(); e.preventDefault(); } });
  const up = e => { if (!down) return; down = null; el.classList.remove('drag'); if (el._dragged) { glide(); setTimeout(() => el._dragged = false, 0); } };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('click', e => { if (el._dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
  el.addEventListener('wheel', e => { const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; const m = el.scrollWidth - el.clientWidth; if (m <= 0) return; if ((d < 0 && el.scrollLeft <= 0) || (d > 0 && el.scrollLeft >= m)) return; el.scrollLeft += d; edge(); e.preventDefault(); }, { passive: false });
  el.addEventListener('scroll', edge, { passive: true });
  el.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; const bs = [...el.querySelectorAll('button')], i = bs.indexOf(document.activeElement), n = bs[Math.max(0, Math.min(bs.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))]; if (n) { n.focus(); n.scrollIntoView({ inline: 'nearest', block: 'nearest' }); e.preventDefault(); } });
  const on = el.querySelector('.on'); if (on) el.scrollLeft = Math.max(0, on.offsetLeft - el.offsetLeft - el.clientWidth / 2 + on.offsetWidth / 2);
  requestAnimationFrame(edge); edge();
}
// mount the editor into `el`. opts: {owned: [cosIds], onChange(code), compact}
export function mount(el, code, opts = {}) {
  let a = AV.parse(code); a.hs = AV.shipHair(a.g, a.hs); a.o = AV.shipOutfit(a.g, a.o); el.innerHTML = `<div class="cz"><div class="cz-prev"><canvas></canvas><button class="cz-turn" type="button">🔄 돌려보기</button></div><div class="cz-ctl"></div></div>`;
  const v = preview(el.querySelector('canvas'), AV.encode(a), opts.compact ? 120 : 150, opts.compact ? 160 : 200);
  el.querySelector('.cz-turn').onclick = () => { v.walk = !v.walk; v.spin = 0; };
  const set = (k, val) => { a[k] = val; if (k === 'g') { a.hs = AV.SHIP[val].hairs[0]; if (!AV.OUTFITS[a.g].find(o => o[0] === a.o)) a.o = 'basic'; } const c = AV.encode(a); AV.apply(v.ch, c); v.ch.drawH = Math.round(v.ch.drawH * (+v.c.style.height.replace('px', '') / 210)); AV.preload(a); draw(); opts.onChange?.(c); };
  const row = (label, k, items) => `<div class="cz-row"><span>${label}</span><div class="cz-ch">${items.map(([val, txt, st]) => `<button type="button" class="chip ${String(a[k]) === String(val) ? 'on' : ''}" data-k="${k}" data-v="${val}" ${st ? `style="${st}"` : ''} title="${esc(txt)}">${st ? '' : esc(txt)}</button>`).join('')}</div></div>`;
  const draw = () => { const owned = opts.owned || [];
    let h = row('성별', 'g', Object.entries(AV.GENDER).map(([k, g]) => [k, g.name])) + row('나이', 'a', AV.AGE.map((x, i) => [i, x.name]))
      + row('피부', 's', AV.SKIN.map((x, i) => [i, x[0], `background:${i ? `rgb(${x[1].map(q => Math.round(q * 236)).join(',')})` : '#f6d2c0'}`]))
      + row('헤어', 'hs', AV.SHIP[a.g].hairs.map(i => [i, AV.HAIRS[a.g][i][0]])) + row('머리색', 'hc', AV.HAIRC.map((x, i) => [i, x[0], `background:${sw(x[1])}`]))
      + row('옷', 'o', AV.OUTFITS[a.g].filter(x => AV.SHIP[a.g].outfits.includes(x[0])).map(x => [x[0], x[1]]));
    for (const [slot, lab] of [['hat', '모자'], ['face', '얼굴'], ['back', '등'], ['held', '손']]) { const its = owned.filter(id => AV.COS[id]?.slot === slot); if (its.length || a[slot] !== '-') h += `<div class="cz-row"><span>${lab}</span><div class="cz-ch"><button type="button" class="chip ${a[slot] === '-' ? 'on' : ''}" data-k="${slot}" data-v="-">없음</button>${its.map(id => `<button type="button" class="chip cos ${a[slot] === id ? 'on' : ''}" data-k="${slot}" data-v="${id}" title="${esc(AV.COS[id].name)}"><img src="assets/cos/${id}.png" alt=""></button>`).join('')}</div></div>`; }
    if (!owned.length && !opts.title) h += `<p class="mnote">🎩 모자·날개·손소품은 옷가게나 헌금 축복에서 얻어요</p>`;
    const ctl = el.querySelector('.cz-ctl'); ctl.innerHTML = h;
    ctl.querySelectorAll('.cz-ch').forEach(scroller);
    ctl.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { if (b.closest('.cz-ch')?._dragged) return; const k = b.dataset.k, val = b.dataset.v; set(k, ['g', 'o', 'hat', 'face', 'back', 'held'].includes(k) ? val : +val); }); };
  draw(); return { get code() { return AV.encode(a); } }; }
// in-game modal
export function open() { const G = window.G, S = G.S; S.cos ||= []; let m = document.getElementById('p2cust');
  if (!m) { m = document.createElement('div'); m.id = 'p2cust'; m.className = 'modal'; m.innerHTML = `<div class="panel wide"><button class="close">✕</button><h2>👗 꾸미기</h2><div class="body"></div><div class="row"><button class="big" id="czsave">저장하기</button></div></div>`; document.body.append(m); m.querySelector('.close').onclick = () => G.closeModal(); }
  const ed = mount(m.querySelector('.body'), S.av || AV.DEFAULT, { owned: S.cos });
  m.querySelector('#czsave').onclick = () => { S.av = ed.code; AV.apply(G.player, S.av); G.persist(); G.closeModal(); G.toast('✨ 새 모습으로 바뀌었어요!'); window.P2?.sfx?.('levelup'); };
  G.openModal('#p2cust'); }
// cosmetics shelf for the clothes shop
export function shelf(el, redraw) { const G = window.G, S = G.S; S.cos ||= [];
  const ids = Object.keys(AV.COS); el.insertAdjacentHTML('beforeend', `<h4>✨ 꾸미기 아이템 <small>(${S.cos.length}/${ids.length} 보유)</small></h4><div class="shopgrid cosgrid">${ids.map(id => { const c = AV.COS[id], own = S.cos.includes(id);
    return `<button class="sitem" data-cos="${id}" ${own || S.coins < c.price ? 'disabled' : ''} style="--rc:${RC[c.rar]}"><img src="assets/cos/${id}.png" alt=""><b>${esc(c.name)}</b><i class="rar">${c.rar}</i><small>${own ? '보유 중' : TAL + c.price}</small></button>`; }).join('')}</div>`);
  el.querySelectorAll('[data-cos]').forEach(b => b.onclick = () => { const id = b.dataset.cos, c = AV.COS[id]; if (S.coins < c.price || S.cos.includes(id)) return; S.coins -= c.price; S.cos.push(id); window.W?.spend(c.price, 'cos:' + id);
    const a = AV.parse(S.av); a[c.slot] = id; S.av = AV.encode(a); AV.apply(G.player, S.av); G.refreshHud(); G.coinFx?.(); G.persist(); window.P2?.sfx?.('coin'); G.toast(`✨ ${c.name} 착용! · 👗 꾸미기에서 바꿀 수 있어요`); redraw(); }); }
export const Cust = { init, mount, open, shelf }; window.Cust = Cust;

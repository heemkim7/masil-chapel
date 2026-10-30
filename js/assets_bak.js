// Asset loading + character sprite atlas access
export const IMG = {};
export function loadImg(key, src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => { IMG[key] = i; res(i); }; i.onerror = () => rej(new Error('img ' + src)); i.src = src; });
}
export async function loadAll(cfg, onProgress) {
  const atlas = await (await fetch('assets/characters/atlas.json')).json();
  const jobs = [];
  const add = (k, s) => jobs.push([k, s]);
  add('island', cfg.world.bg); add('mask', cfg.world.mask);
  const misc = new Set([cfg.chapel.img, ...cfg.props.map(p => p.img), ...cfg.decor.map(d => d.img),
    ...Object.values(cfg.acc).map(a => a.img), 'item_0_1.png', 'item_0_2.png', 'item_1_2.png', 'prop_0_2.png', 'item_1_0.png', 'item_1_1.png']);
  misc.forEach(m => add(m, 'assets/' + m));
  for (const [c, outs] of Object.entries(atlas.chars)) for (const [o, anims] of Object.entries(outs))
    for (const fr of Object.values(anims)) for (const f of fr) add(`${c}/${o}/${f}`, `assets/characters/${c}/${o}/${f}`);
  let done = 0;
  await Promise.all(jobs.map(([k, s]) => loadImg(k, s).then(() => onProgress && onProgress(++done / jobs.length))));
  return atlas;
}
// 8 facings, index 0=E going clockwise (screen y down): E SE S SW W NW N NE
export const DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
export function facingFromAngle(a) { return DIRS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; }

export class Sprites {
  constructor(atlas) { this.a = atlas; }
  has(c, o, k) { const s = this.a.chars[c]?.[o]; return !!(s && s[k] && s[k].length); }
  // returns {frames:[keys], flip}
  get(c, o, anim, dir) {
    let flip = false, d = dir;
    if (this.a.mirror[d]) { flip = true; d = this.a.mirror[d]; }
    const tryOrder = [d];
    if (d === 'NW') tryOrder.push('N', 'W'); if (d === 'SW') tryOrder.push('S', 'W');
    for (const t of tryOrder) if (this.has(c, o, `${anim}_${t}`)) return { frames: this.a.chars[c][o][`${anim}_${t}`].map(f => `${c}/${o}/${f}`), flip, dir: t };
    if (this.has(c, o, anim + '_S')) return { frames: this.a.chars[c][o][anim + '_S'].map(f => `${c}/${o}/${f}`), flip: false, dir: 'S' };
    return null;
  }
}

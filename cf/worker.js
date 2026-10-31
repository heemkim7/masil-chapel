// Worker name: masil (https://masil.heemkim7.workers.dev; target masil.chapel.workers.dev)
// 마실채플 realtime on Cloudflare Workers Free: static assets + SQLite Durable Objects (WebSocket Hibernation).
// Room DO (one per channel topic): presence, broadcast relay (pos filtered by floor = zone sync), FIFO queue, CAP per channel.
// Meter DO: daily (UTC) estimate of billed DO requests -> lean mode at 80%, solo (down) at 95% of the Free 100k/day.
// Supabase keeps auth, DB and RPCs only. No timers in DOs (hibernation-friendly); alarms only while someone waits.
import { DurableObject } from 'cloudflare:workers';
const CAP = 100, DAY = 100000, GBS = 13000, MEM = 0.125, LEAN = 0.8, HARD = 0.95, STALE = 15000, SCAN = 5000, REP = 30000;
const lvlOf = (n, g = 0) => { const f = Math.max(n / DAY, g / GBS); return f >= HARD ? 2 : f >= LEAN ? 1 : 0; };
const today = () => new Date().toISOString().slice(0, 10);
const SUPA = 'https://gisykxqhticmdhmupnry.supabase.co', ANON = 'sb_publishable__yq2TXlS1wg8-6FotfrbEg_ckhZxgTj'; // public
// Supabase JWT check (guest = anonymous sign-in tokens too). Public JWKS only: no secret needed or stored.
let JW = { at: 0, keys: new Map() };
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function jwk(kid) { if (!JW.keys.has(kid) || Date.now() - JW.at > 6e5) { const r = await fetch(SUPA + '/auth/v1/.well-known/jwks.json', { cf: { cacheTtl: 600 } }); const j = await r.json(); JW = { at: Date.now(), keys: new Map() };
    for (const k of j.keys || []) if (k.kty === 'EC') JW.keys.set(k.kid, await crypto.subtle.importKey('jwk', k, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])); } return JW.keys.get(kid); }
export async function verifyJwt(t) { const [h, p, g] = String(t || '').split('.'); if (!g) return null; const H = JSON.parse(new TextDecoder().decode(b64u(h))); if (H.alg !== 'ES256') return null;
  const key = await jwk(H.kid); if (!key) return null; const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64u(g), new TextEncoder().encode(h + '.' + p)); if (!ok) return null;
  const P = JSON.parse(new TextDecoder().decode(b64u(p))); if (!P.sub || P.exp * 1000 < Date.now() - 30000 || P.iss !== SUPA + '/auth/v1' || P.aud !== 'authenticated') return null; return P; }
const FLUSH_N = 20, FLUSH_MS = 30000;

export class Meter extends DurableObject {
  constructor(ctx, env) { super(ctx, env); ctx.storage.sql.exec('create table if not exists d(day text primary key, n real)'); ctx.storage.sql.exec('create table if not exists g(day text primary key, s real)'); }
  add(n, gbs = 0) { const d = today(); if (gbs) this.ctx.storage.sql.exec('insert into g values(?,?) on conflict(day) do update set s = s + excluded.s', d, gbs); this.ctx.storage.sql.exec('insert into d values(?,?) on conflict(day) do update set n = n + excluded.n', d, n + 1);
    const t = this.ctx.storage.sql.exec('select n from d where day = ?', d).one().n, g = [...this.ctx.storage.sql.exec('select s from g where day = ?', d)][0]?.s || 0; return { n: t, g, lvl: lvlOf(t, g) }; }
}

export class Room extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.env = env; this.S = null; this.msgs = 0; this.conns = 0; this.lastRep = 0; this.lastScan = 0; this.lvl = 0;
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong')); }
  socks() { if (!this.S) { this.S = new Map(); for (const w of this.ctx.getWebSockets()) { const a = w.deserializeAttachment(); if (a) this.S.set(w, a); } } return this.S; }
  save(w, a) { try { w.serializeAttachment(a); } catch { } }
  adm() { let n = 0; for (const a of this.socks().values()) if (a.q) n++; return n; }
  waiters() { return [...this.socks()].filter(([, a]) => !a.q).sort((x, y) => x[1].t - y[1].t); }
  tx(w, o) { try { w.send(typeof o === 'string' ? o : JSON.stringify(o)); } catch { } }
  bc(o, skip) { const s = JSON.stringify(o); for (const [w, a] of this.socks()) if (a.q && w !== skip) this.tx(w, s); }
  async fetch(req) {
    const u = new URL(req.url), topic = u.searchParams.get('topic') || '', k = req.headers.get('x-uid') || ''; if (!k) return new Response('auth', { status: 401 });
    if (this.lvl >= 2) return new Response('down', { status: 503 });
    const [c, s] = Object.values(new WebSocketPair()); this.ctx.acceptWebSocket(s);
    const a = { k, an: req.headers.get('x-anon') === '1', m: null, q: false, t: Date.now() + Math.random(), ls: Date.now(), lob: /lobby$/.test(topic) };
    this.socks().set(s, a); this.conns++;
    if (a.lob || this.adm() < CAP) this.admit(s, a); else { this.save(s, a); this.waitMsgs(); this.arm(); }
    this.meter(); return new Response(null, { status: 101, webSocket: c, headers: { 'Sec-WebSocket-Protocol': 'masil' } });
  }
  admit(w, a) { a.q = true; this.save(w, a); const st = {}; for (const b of this.socks().values()) if (b.q && b.m) st[b.k] = b.m;
    this.tx(w, { t: 'ok', s: st, cap: a.lob ? 0 : CAP, live: this.adm(), lean: this.lvl >= 1 }); }
  waitMsgs() { const ws = this.waiters(), live = this.adm(); ws.forEach(([w], i) => this.tx(w, { t: 'wait', pos: i + 1, live, cap: CAP })); }
  promote() { let n = this.adm(); for (const [w, a] of this.waiters()) { if (n >= CAP) break; this.admit(w, a); n++; } this.waitMsgs(); }
  async arm() { if ((this.waiters().length || this.tapN) && !(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + SCAN); }
  async alarm() { this.tapDb(); this.scan(true); this.meter(true); if (this.tapN && Date.now() - (this.tapAt || 0) >= FLUSH_MS - 1000) await this.flush();
    if (this.waiters().length || this.tapN) await this.ctx.storage.setAlarm(Date.now() + (this.waiters().length ? SCAN : FLUSH_MS)); }
  // '함께 기도했어요' / candle taps: deduped + counted in memory, also kept in DO SQLite so a restart loses nothing; flushed in one RPC per N taps or 30s.
  tapDb() { if (!this._tdb) { this.ctx.storage.sql.exec('create table if not exists tap(kind text, ref text, uid text, primary key(kind, ref, uid))'); this._tdb = 1; this.tapN = this.ctx.storage.sql.exec('select count(*) c from tap').one().c; } }
  tap(a, kind, ref) { this.tapDb(); const c = this.ctx.storage.sql.exec('insert or ignore into tap values(?,?,?)', kind, ref, a.k).rowsWritten; if (!c) return false;
    if (!this.tapN) this.tapAt = Date.now(); this.tapN++; if (this.tapN >= FLUSH_N) this.flush(); else this.arm(); return true; }
  async flush() { this.tapDb(); const rows = this.ctx.storage.sql.exec('select kind, ref, uid from tap limit 500').toArray(); if (!rows.length) { this.tapN = 0; return; }
    try { const r = await fetch(SUPA + '/rest/v1/rpc/tap_batch', { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: JSON.stringify({ p_key: this.env.FLUSH_KEY || '', p_items: rows }) });
      if (!r.ok) throw new Error('flush ' + r.status); const out = await r.json();
      for (const q of rows) this.ctx.storage.sql.exec('delete from tap where kind = ? and ref = ? and uid = ?', q.kind, q.ref, q.uid);
      this.tapN = this.ctx.storage.sql.exec('select count(*) c from tap').one().c; this.tapAt = Date.now(); this.flushes = (this.flushes || 0) + 1;
      for (const o of out || []) this.bc({ t: 'b', e: o.kind === 'pray' ? 'prayer' : 'candle', p: o.kind === 'pray' ? { op: 'amen', pid: +o.ref, n: o.n } : { room: o.ref, n: o.n } });
    } catch (e) { this.flushErr = String(e).slice(0, 80); this.arm(); } }
  scan(force) { const now = Date.now(); if (!force && now - this.lastScan < SCAN) return; this.lastScan = now;
    for (const [w, a] of [...this.socks()]) { const ar = this.ctx.getWebSocketAutoResponseTimestamp(w)?.getTime() || 0;
      if (now - Math.max(a.ls, ar, a.t) > STALE) { try { w.close(4000, 'stale'); } catch { } this.gone(w); } } }
  meter(force) { const now = Date.now(); if (!force && now - this.lastRep < REP) return; this.lastRep = now;
    const n = this.msgs / 20 + this.conns, awake = this.lastRep0 ? Math.min(now - this.lastRep0, 2 * REP) / 1000 : 1; this.lastRep0 = now; this.msgs = 0; this.conns = 0;
    this.env.METER.get(this.env.METER.idFromName('day')).add(n, awake * MEM).then(r => this.setLvl(r.lvl)).catch(() => { }); }
  setLvl(l) { if (l === this.lvl) return; this.lvl = l; this.bc({ t: 'cfg', lean: l >= 1 });
    if (l >= 2) for (const w of this.socks().keys()) { this.tx(w, { t: 'down' }); try { w.close(4002, 'budget'); } catch { } } }
  leaveK(k, skip) { for (const [w, a] of this.socks()) if (w !== skip && a.q && a.k === k && a.m) return; this.bc({ t: 'pl', k }); }
  gone(w) { const a = this.socks().get(w); if (!a) return; this.socks().delete(w); if (a.q) { if (a.m) this.leaveK(a.k, w); this.promote(); } else this.waitMsgs(); }
  async webSocketMessage(w, msg) { this.msgs++; const a = this.socks().get(w); if (!a || typeof msg !== 'string' || msg.length > 4000) return; a.ls = Date.now();
    let m; try { m = JSON.parse(msg); } catch { return; }
    if (m.t === 'b' && a.q) { const e = String(m.e || '').slice(0, 16), p = m.p;
      if (p && typeof p === 'object') p.id = a.k; // identity always from the verified token
      if (e === 'pos' && p) { a.fl = p.fl ?? null; a.m = Object.assign(a.m || {}, { x: p.x, y: p.y, face: p.face, anim: p.anim, fl: p.fl }); if (Date.now() - (a.sv || 0) > 2000) { a.sv = Date.now(); this.save(w, a); } const s = JSON.stringify({ t: 'b', e, p }); for (const [x, b] of this.socks()) if (x !== w && b.q && (b.fl == null || a.fl == null || b.fl === a.fl)) this.tx(x, s); }
      else this.bc({ t: 'b', e, p }, w); }
    else if (m.t === 'tap' && a.q && /^(pray|candle)$/.test(m.k)) { const ok = this.tap(a, m.k, String(m.r ?? '').slice(0, 64)); this.tx(w, { t: 'tapok', k: m.k, r: m.r, dup: !ok }); }
    else if (m.t === 'tr' && m.m && typeof m.m === 'object' && JSON.stringify(m.m).length < 1500) { const M = m.m, keep = ['name', 'outfit', 'av', 'equip', 'fl', 'x', 'y', 'face', 'anim', 'st', 'seat', 'g', 'hair'];
      a.m = { id: a.k }; for (const f of keep) if (M[f] !== undefined) a.m[f] = M[f]; if (typeof a.m.name === 'string') a.m.name = a.m.name.slice(0, 12); a.fl = a.m.fl ?? a.fl ?? null; this.save(w, a); if (a.q) this.bc({ t: 'pj', k: a.k, m: a.m }); }
    else if (m.t === 'ut') { a.m = null; this.save(w, a); if (a.q) this.leaveK(a.k, w); }
    this.scan(); this.meter(); }
  async webSocketClose(w, code) { this.gone(w); try { w.close(code === 1005 ? 1000 : code, 'bye'); } catch { } }
  async webSocketError(w) { this.gone(w); }
  stats() { this.tapDb(); return { live: this.adm(), wait: this.waiters().length, lvl: this.lvl, tapPending: this.tapN, flushes: this.flushes || 0, flushErr: this.flushErr || null }; }
}

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/rt/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
      const t = u.searchParams.get('topic') || ''; if (!/^chapel(qa)?:[^\s/]{1,96}$/.test(t)) return new Response('bad topic', { status: 400 });
      const pr = (req.headers.get('Sec-WebSocket-Protocol') || '').split(',').map(x => x.trim()), at = (pr.find(x => x.startsWith('at.')) || '').slice(3);
      let P = null; try { P = await verifyJwt(at); } catch { } if (!P) return new Response('unauthorized', { status: 401 });
      const h = new Headers(req.headers); h.set('x-uid', P.sub); h.set('x-anon', P.is_anonymous ? '1' : '0');
      return env.ROOM.get(env.ROOM.idFromName(t)).fetch(new Request(req, { headers: h }));
    }
    if (u.pathname === '/rt/gate') { try { const r = await env.METER.get(env.METER.idFromName('day')).add(0), l = r.lvl, used = Math.round(r.n), gbs = Math.round(r.g);
        return J(l >= 2 ? { full: true, used, gbs } : { ok: true, cap: CAP, used, gbs, lean: l >= 1 }); } catch (e) { return J({ full: true, err: 1 }, 503); } }
    if (u.pathname === '/rt/room') { const t = u.searchParams.get('topic') || ''; if (!/^chapelqa:/.test(t)) return J({ err: 'qa only' }, 403);
      return J(await env.ROOM.get(env.ROOM.idFromName(t)).stats()); }
    return env.ASSETS.fetch(req);
  }
};

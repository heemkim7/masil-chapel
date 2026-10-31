// Worker name: masil (https://masil.heemkim7.workers.dev; target masil.chapel.workers.dev)
// 마실채플 realtime on Cloudflare Workers Free: static assets + SQLite Durable Objects (WebSocket Hibernation).
// Room DO (one per channel topic): presence, broadcast relay (pos filtered by floor = zone sync), FIFO queue, CAP per channel.
// Meter DO: daily (UTC) estimate of billed DO requests -> lean mode at 80%, solo (down) at 95% of the Free 100k/day.
// Supabase keeps auth, DB and RPCs only. No timers in DOs (hibernation-friendly); alarms only while someone waits.
import { DurableObject } from 'cloudflare:workers';
const CAP = 100, DAY = 100000, GBS = 13000, MEM = 0.125, LEAN = 0.8, HARD = 0.95, STALE = 15000, SCAN = 5000, REP = 30000;
const lvlOf = (n, g = 0) => { const f = Math.max(n / DAY, g / GBS); return f >= HARD ? 2 : f >= LEAN ? 1 : 0; };
const today = () => new Date().toISOString().slice(0, 10);

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
    const u = new URL(req.url), topic = u.searchParams.get('topic') || '', k = (u.searchParams.get('k') || '').slice(0, 64);
    if (this.lvl >= 2) return new Response('down', { status: 503 });
    const [c, s] = Object.values(new WebSocketPair()); this.ctx.acceptWebSocket(s);
    const a = { k, m: null, q: false, t: Date.now() + Math.random(), ls: Date.now(), lob: /lobby$/.test(topic) };
    this.socks().set(s, a); this.conns++;
    if (a.lob || this.adm() < CAP) this.admit(s, a); else { this.save(s, a); this.waitMsgs(); this.arm(); }
    this.meter(); return new Response(null, { status: 101, webSocket: c });
  }
  admit(w, a) { a.q = true; this.save(w, a); const st = {}; for (const b of this.socks().values()) if (b.q && b.m) st[b.k] = b.m;
    this.tx(w, { t: 'ok', s: st, cap: a.lob ? 0 : CAP, live: this.adm(), lean: this.lvl >= 1 }); }
  waitMsgs() { const ws = this.waiters(), live = this.adm(); ws.forEach(([w], i) => this.tx(w, { t: 'wait', pos: i + 1, live, cap: CAP })); }
  promote() { let n = this.adm(); for (const [w, a] of this.waiters()) { if (n >= CAP) break; this.admit(w, a); n++; } this.waitMsgs(); }
  async arm() { if (this.waiters().length && !(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + SCAN); }
  async alarm() { this.scan(true); this.meter(true); if (this.waiters().length) await this.ctx.storage.setAlarm(Date.now() + SCAN); }
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
      if (e === 'pos' && p) { a.fl = p.fl ?? null; const s = JSON.stringify({ t: 'b', e, p }); for (const [x, b] of this.socks()) if (x !== w && b.q && (b.fl == null || a.fl == null || b.fl === a.fl)) this.tx(x, s); }
      else this.bc({ t: 'b', e, p }, w); }
    else if (m.t === 'tr' && m.m && typeof m.m === 'object') { a.m = m.m; a.fl = m.m.fl ?? a.fl ?? null; this.save(w, a); if (a.q) this.bc({ t: 'pj', k: a.k, m: a.m }); }
    else if (m.t === 'ut') { a.m = null; this.save(w, a); if (a.q) this.leaveK(a.k, w); }
    this.scan(); this.meter(); }
  async webSocketClose(w, code) { this.gone(w); try { w.close(code === 1005 ? 1000 : code, 'bye'); } catch { } }
  async webSocketError(w) { this.gone(w); }
  stats() { return { live: this.adm(), wait: this.waiters().length, lvl: this.lvl }; }
}

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/rt/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
      const t = u.searchParams.get('topic') || ''; if (!/^chapel(qa)?:[^\s/]{1,96}$/.test(t)) return new Response('bad topic', { status: 400 });
      return env.ROOM.get(env.ROOM.idFromName(t)).fetch(req);
    }
    if (u.pathname === '/rt/gate') { try { const r = await env.METER.get(env.METER.idFromName('day')).add(0), l = r.lvl, used = Math.round(r.n), gbs = Math.round(r.g);
        return J(l >= 2 ? { full: true, used, gbs } : { ok: true, cap: CAP, used, gbs, lean: l >= 1 }); } catch (e) { return J({ full: true, err: 1 }, 503); } }
    if (u.pathname === '/rt/room') { const t = u.searchParams.get('topic') || ''; if (!/^chapelqa:/.test(t)) return J({ err: 'qa only' }, 403);
      return J(await env.ROOM.get(env.ROOM.idFromName(t)).stats()); }
    return env.ASSETS.fetch(req);
  }
};

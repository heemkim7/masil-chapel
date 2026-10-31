// Realtime multiplayer via Supabase Realtime (Presence = who's here, Broadcast = ≤2Hz moves, chat, emotes, jumps).
// SYNC LAYER: this file is the ONLY module that talks to the realtime transport. The game uses just
//   join(room,me) leave() tick(me) sample(peer) send(ev,payload) chat() on(ev,fn) lobby()/leaveLobby() peers/status/counts
// To move to a dedicated WebSocket server, reimplement these methods here; nothing else needs to change.
// Fully optional: if the CDN or Supabase is unreachable, the game keeps running single-player.
// v6: Seoul project (ap-northeast-2). Rooms = 행정동 code + scene; a shared lobby presence channel gives per-dong head counts.
export const SUPA_URL = 'https://gisykxqhticmdhmupnry.supabase.co';
export const SUPA_KEY = 'sb_publishable__yq2TXlS1wg8-6FotfrbEg_ckhZxgTj'; // publishable key: public by design
// v13: QA/test clients (?qa=1) live in a separate namespace and never appear in real players' rooms, lobby counts or chat history
export const NS = /[?&]qa=1/.test(location.search) || window.__QA || navigator.webdriver ? 'chapelqa:' : 'chapel:';
const CDN = 'https://esm.sh/@supabase/supabase-js@2.45.4';
// Interest management: the room channel (≤100 users/shard, see v6.cap) carries presence diffs + chat/events only.
// Positions go to a spatial-grid cell channel; each client subscribes to the 3x3 cells around it (≈ one screen each way),
// so it only receives nearby users. Rate: 2Hz if someone is within NEAR, else 1Hz (edge/far); idle or seated → nothing.
const CELL = 900, KEEP = 2; // cell size (world px); drop a cell only when ≥KEEP cells away (hysteresis, no flapping)


// v15 Cloudflare transport: on *.workers.dev (or ?rt=do) realtime goes to SQLite Durable Objects over one WebSocket per channel.
// The shim mimics the small part of supabase-js RealtimeChannel this game uses, so the rest of the file is unchanged.
// Supabase stays for auth, DB and RPCs. Any failure → solo mode (game keeps working single-player).
export const DO_MODE = /^(studio\.masilchapel|(masil|masilchapel)\.[a-z0-9-]+)\.workers\.dev$/.test(location.hostname) || /[?&]rt=do/.test(location.search); // Worker "masil" (target masil.chapel.workers.dev)
const DO_TRY = [800, 2000, 4500, 8000];
// Identity for the DO = verified Supabase JWT (guests use anonymous sign-in). Sent as a WebSocket subprotocol, never in the URL.
const AUTH_LS = 'sb-gisykxqhticmdhmupnry-auth-token';
export async function doToken(sb) { try { const c = window.G?.net?.sb || sb; let { data } = await c.auth.getSession(); let s = data?.session;
    if (!s && c === sb) { try { const j = JSON.parse(localStorage.getItem(AUTH_LS) || 'null'); if (j?.access_token && j.expires_at * 1000 > Date.now() + 60000) return j.access_token; } catch { } }
    if (!s) { const r = await c.auth.signInAnonymously(); s = r.data?.session; } return s?.access_token || null; } catch { return null; } }
class DOChan {
  constructor(rt, topic, cfg) { this.rt = rt; this.topic = topic; this.key = cfg?.config?.presence?.key || ('w' + Math.random().toString(36).slice(2, 10)); this.hs = []; this.st = {}; this.state = 'closed'; this.mine = null; this.tries = 0; }
  on(type, f, fn) { this.hs.push([type, f?.event, fn]); return this; }
  fire(type, ev, arg) { for (const [t, e, fn] of this.hs) if (t === type && (e === ev || e === '*')) try { fn(arg); } catch (x) { console.warn('[rt]', x); } }
  presenceState() { const o = {}; for (const k in this.st) o[k] = [this.st[k]]; return o; }
  subscribe(cb) { this.cb = cb || (() => { }); this.open(); return this; }
  async open() { if (this.dead) return; const tok = await doToken(this.rt.sb); if (this.dead) return; if (!tok) return this.closed(null, true); const u = new URL('/rt/ws', location.href); u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'; u.searchParams.set('topic', this.topic); 
    let ws; try { ws = this.ws = new WebSocket(u, ['masil', 'at.' + tok]); } catch { return this.closed(null); }
    ws.onmessage = e => this.msg(e.data); ws.onclose = () => this.closed(ws); ws.onerror = () => { };
    clearInterval(this.pt); this.pt = setInterval(() => { if (ws.readyState === 1) ws.send('ping'); }, 5000); }
  msg(d) { if (d === 'pong') return; let m; try { m = JSON.parse(d); } catch { return; }
    if (m.t === 'ok') { this.st = m.s || {}; this.state = 'joined'; this.tries = 0; this.rt.ev(this, { ok: true, live: m.live, cap: m.cap }); this.rt.cfg(m); this.cb('SUBSCRIBED'); if (this.mine) this.raw({ t: 'tr', m: this.mine }); this.fire('presence', 'sync'); }
    else if (m.t === 'wait') { this.state = 'waiting'; this.rt.ev(this, { pos: m.pos, live: m.live, cap: m.cap }); }
    else if (m.t === 'pj') { this.st[m.k] = m.m; this.fire('presence', 'sync'); }
    else if (m.t === 'pl') { delete this.st[m.k]; this.fire('presence', 'sync'); }
    else if (m.t === 'b') this.fire('broadcast', m.e, { type: 'broadcast', event: m.e, payload: m.p });
    else if (m.t === 'cfg') this.rt.cfg(m);
    else if (m.t === 'down') { this.dead = true; this.rt.down(this); } }
  raw(o) { if (this.ws?.readyState === 1) { this.ws.send(JSON.stringify(o)); return true; } return false; }
  send(o) { if (this.state !== 'joined') return Promise.resolve('error'); this.raw({ t: 'b', e: o.event, p: o.payload }); return Promise.resolve('ok'); }
  track(m) { this.mine = m; if (this.state === 'joined') this.raw({ t: 'tr', m }); return Promise.resolve('ok'); }
  untrack() { this.mine = null; this.raw({ t: 'ut' }); return Promise.resolve('ok'); }
  closed(ws, noTok) { if (!noTok && ws && ws !== this.ws) return; clearInterval(this.pt); const was = this.state; this.state = 'closed'; this.st = {}; if (this.dead) return;
    if (was === 'joined') { this.fire('presence', 'sync'); this.cb('CLOSED'); }
    if (this.tries >= DO_TRY.length) { this.dead = true; this.cb('CHANNEL_ERROR'); this.rt.down(this); return; }
    setTimeout(() => this.open(), DO_TRY[this.tries++] * (0.8 + Math.random() * 0.4)); }
  close() { this.dead = true; clearInterval(this.pt); try { this.ws?.close(1000); } catch { } }
}
export function rtPatch(sb, net) { if (!DO_MODE || !sb || sb.__do) return sb; const chans = new Set(), base = { POS: Net.POS_MS, FAR: Net.FAR_MS };
  const rt = { net, sb, ev(ch, g) { if (net && ch.topic === net.topic) { if (g.ok) net.emit('gate', { ok: true, live: g.live, cap: g.cap }); else { net.pos = g.pos; net.emit('gate', g); } } },
    cfg(m) { Net.POS_MS = m.lean ? base.POS * 2 : base.POS; Net.FAR_MS = m.lean ? base.FAR * 2 : base.FAR; },
    down(ch) { if (net && (ch.topic === net.topic || !net.ch)) { net.gateDown = true; net.setStatus('offline'); net.emit('gate', { down: true }); } } };
  sb.channel = (t, c) => { const ch = new DOChan(rt, t, c); chans.add(ch); return ch; };
  sb.removeChannel = async ch => { ch?.close?.(); chans.delete(ch); return 'ok'; };
  sb.getChannels = () => [...chans]; sb.__do = true; return sb; }

export class Net {
  static GRID_ON = 30; static GRID_OFF = 20; /* grid cells only pay off in a crowd; below that one room channel = fewer joins */ static POS_MS = 1000; static FAR_MS = 2000; static NEAR = 1400; // 2Hz with a peer near, 1Hz otherwise (edge/far); 0 when idle/seated
  constructor() { this.sb = null; this.ch = null; this.room = null; this.id = Net.cid(); this.peers = new Map(); this.status = 'offline'; this.h = {}; this.me = null; this.lastSend = 0; this.lastPres = 0; }
  // v13: ONE stable presence key per user/device (persisted) → the same person can never appear as two peers (join/leave flapping after 혼자 모드 ↔ 함께)
  static cid() { try { let c = localStorage.getItem('maeul_cid'); if (!c) { c = Math.random().toString(36).slice(2, 10); localStorage.setItem('maeul_cid', c); } return c; } catch { return Math.random().toString(36).slice(2, 10); } }
  on(ev, fn) { (this.h[ev] ||= []).push(fn); } emit(ev, ...a) { for (const f of this.h[ev] || []) f(...a); }
  async init() {
    try { const m = globalThis.__SUPA_MOD || await Promise.race([import(CDN), new Promise((_, r) => setTimeout(() => r(new Error('cdn timeout')), 8000))]);
      this.sb = m.createClient(SUPA_URL, SUPA_KEY, { realtime: { params: { eventsPerSecond: 30 } }, auth: { persistSession: true, storageKey: 'maeul_auth', detectSessionInUrl: true, flowType: 'pkce' } }); rtPatch(this.sb, this); if (DO_MODE) { Net.GRID_ON = 1e9; Net.GRID_OFF = 1e9 - 1; try { await doToken(this.sb); const { data } = await this.sb.auth.getSession(); if (data?.session?.user?.id) this.id = data.session.user.id; } catch { } } return true;
    } catch (e) { console.warn('[net] offline:', e.message); this.setStatus('offline'); return false; }
  }
  setStatus(s) { this.status = s; this.emit('status', s, this.peers.size); }
  // ENTRY GATE (global cap + FIFO queue, server-side counter via REST RPC; DO-ready: swap gateBeat() for a DO fetch).
  // Waiting costs 1 REST call / GATE_POLL ms and zero Realtime messages; admitted users heartbeat every GATE_BEAT ms.
  static GATE_POLL = 5000; static GATE_BEAT = 5000; static GATE_TRY = [800, 2000, 4500]; // waiters poll 5s (refill ≤~6s), admitted beat 10s (abandon expiry 30s), retry with backoff before solo
  static gid() { try { let c = sessionStorage.getItem('maeul_gid'); if (!c) { c = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 36); sessionStorage.setItem('maeul_gid', c); } return c; } catch { return Math.random().toString(36).slice(2, 12); } }
  // One entry per tab session (sessionStorage id, not the shared localStorage cid) → idempotent server upsert; responses are sequence-checked so a late reply can't overwrite a newer state.
  async gateBeat() { this.gidv ||= Net.gid(); const seq = this._gseq = (this._gseq || 0) + 1;
    for (let k = 0; ; k++) { try { const { data, error } = DO_MODE ? { data: await fetch('/rt/gate', { cache: 'no-store' }).then(r => r.json()) } : await this.sb.rpc('gate_beat', { p_cid: this.gidv, p_qa: NS !== 'chapel:' }); if (error) throw error; if (seq !== this._gseq) return { stale: true }; return data; }
      catch (e) { if (k >= Net.GATE_TRY.length) throw e; await new Promise(r => setTimeout(r, Net.GATE_TRY[k] * (0.8 + Math.random() * 0.4))); } } }
  gateEnter() { if (this._gate) return this._gate; this.emit('gate', { checking: true });
    const tok = this._gtok = (this._gtok || 0) + 1;
    return this._gate = (async () => { for (;;) { if (this.solo || tok !== this._gtok) return false; let r; try { r = await this.gateBeat(); } catch (e) { this.gateDown = true; this._gate = null; this.emit('gate', { down: true }); return false; }
        if (r.stale) continue;
        if (r.full) { this.gateDown = true; this._gate = null; this.emit('gate', { down: true, full: true }); return false; }
        if (r.ok) { this.admitted = true; if (this.lobbyMe) this.lobby(this.lobbyMe.dong, this.lobbyMe.name, this.lobbyMe.shard); this.emit('gate', { ok: true, live: r.live, cap: r.cap }); clearInterval(this._hb); if (!DO_MODE) this._hb = setInterval(() => this.gateHeart(), Net.GATE_BEAT); return true; }
        this.pos = r.pos; this.emit('gate', { pos: r.pos, live: r.live, cap: r.cap, guard: r.guard }); await new Promise(res => setTimeout(res, Net.GATE_POLL)); } })(); }
  // Heartbeat while admitted. If the server no longer holds our slot (expired after sleep/network loss) we drop Realtime and re-queue instead of silently over-filling.
  async gateHeart() { let r; try { r = await this.gateBeat(); } catch { return; } if (r.stale || r.ok || !this.admitted) return;
    clearInterval(this._hb); this.admitted = false; this._gate = null; const want = this.room || this._want; this.leave?.(true); this._want = want; this.gateEnter().then(ok => { if (ok && this._want) this.join(this._want, this.me); }); }
  gateLeave() { clearInterval(this._hb); this.admitted = false; this._gate = null; this._gtok = (this._gtok || 0) + 1; this._gseq = (this._gseq || 0) + 1; const id = this.gidv; if (!id || DO_MODE) return;
    try { const body = JSON.stringify({ p_cid: id }), u = SUPA_URL + '/rest/v1/rpc/gate_leave'; // keepalive so a tab close still frees the slot at once
      fetch(u, { method: 'POST', keepalive: true, headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' }, body }).catch(() => { }); } catch { } }
  goSolo() { this.solo = true; this.emit('gate', { solo: true }); }
  async join(room, me) {
    this.me = me; if (!this.sb || this.solo || this.gateDown) return;
    if (!this.admitted) { const first = !this._gate; this._want = room; if (first) this.gateEnter().then(ok => { if (ok && this._want) this.join(this._want, this.me); }); return; } if (this.room === room && this.ch) return; const seq = this._jseq = (this._jseq || 0) + 1;
    await this.leave(true); if (seq !== this._jseq) return; this.room = room; this.setStatus('connecting');
    const topic = NS + room.replace(/^d(\d+)(?:-(\d+))?/, (m, c, n) => c + '-' + (n || 1));
    for (const c of this.sb.getChannels?.() || []) if (c.topic === 'realtime:' + topic || c.topic === topic) { try { await this.sb.removeChannel(c); } catch { } } // never two subscriptions to one room
    if (seq !== this._jseq) return;
    this.topic = topic; this.cells = new Map(); const ch = this.ch = this.sb.channel(topic, { config: { presence: { key: this.id }, broadcast: { self: false } } });
    ch.on('presence', { event: 'sync' }, () => { const st = ch.presenceState(), seen = new Set();
      for (const [k, arr] of Object.entries(st)) { const m = arr[arr.length - 1]; if (k === this.id || m?.id === this.id) continue; seen.add(k); const q = this.peers.get(k); if (q) q.goneAt = 0; this.upsert(k, m, true); }
      // v13: leave debounced 10s (a presence blip / reconnect never shows 나갔어요→접속했어요 loops)
      for (const [k, q] of this.peers) if (!seen.has(k) && !q.goneAt) { q.goneAt = performance.now(); setTimeout(() => { const z = this.peers.get(k); if (z && z.goneAt && performance.now() - z.goneAt >= 9900 && this.ch === ch) { this.peers.delete(k); this.emit('leave', k); this.emit('status', this.status, this.peers.size); } }, 10000); }
      this.emit('status', this.status, this.peers.size); });
    ch.on('broadcast', { event: 'pos' }, ({ payload: p }) => { if (p.id !== this.id && this.peers.has(p.id)) this.upsert(p.id, p, false); });
    ch.on('broadcast', { event: 'chat' }, ({ payload: p }) => this.emit('chat', p));
    ch.on('broadcast', { event: 'emote' }, ({ payload: p }) => this.emit('emote', p));
    ch.on('broadcast', { event: 'praise' }, ({ payload: p }) => this.emit('praise', p));
    ch.on('broadcast', { event: 'prayer' }, ({ payload: p }) => this.emit('prayer', p));
    ch.on('broadcast', { event: 'pick' }, ({ payload: p }) => this.emit('pick', p));
    ch.on('broadcast', { event: 'picks' }, ({ payload: p }) => this.emit('picks', p));
    for (const ev of ['lead', 'lmsg', 'svc', 'offer', 'tier', 'seat', 'photo', 'amen', 'decor', 'obi', 'wh']) ch.on('broadcast', { event: ev }, ({ payload: p }) => this.emit(ev, p));
    ch.on('broadcast', { event: 'jump' }, ({ payload: p }) => this.emit('jump', p));
    ch.subscribe(async (s) => { if (ch !== this.ch) return;
      if (s === 'SUBSCRIBED') { this.setStatus('online'); await ch.track(this.state()); this.history(room); }
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') this.setStatus('offline'); });
  }
  async leave(rejoin) { this._jseq = rejoin ? this._jseq : (this._jseq || 0) + 1; for (const c of (this.cells || new Map()).values()) { try { this.sb.removeChannel(c.ch); } catch { } } this.cells = new Map(); if (this.ch) { const c = this.ch; this.ch = null; try { await c.untrack(); await this.sb.removeChannel(c); } catch { } } for (const k of this.peers.keys()) this.emit('leave', k, true); this.peers.clear(); } // local=true: we left, no '나갔어요' toasts
  state() { const m = this.me; return { id: this.id, name: m.name, outfit: m.outfit, x: Math.round(m.x), y: Math.round(m.y), face: m.face, anim: m.anim, fl: m.fl, equip: m.equip, av: m.av }; }
  upsert(k, m, fromPresence) {
    let p = this.peers.get(k); const now = performance.now();
    if (!p) { p = { id: k, buf: [] }; this.peers.set(k, p); this.emit('join', p, m); }
    Object.assign(p, { name: m.name ?? p.name, outfit: m.outfit ?? p.outfit, equip: m.equip ?? p.equip, av: m.av ?? p.av, fl: m.fl ?? p.fl });
    if (!fromPresence || !p.buf.length) { p.buf.push({ t: now, x: m.x, y: m.y, face: m.face, anim: m.anim }); if (p.buf.length > 20) p.buf.shift(); }
    this.emit('update', p);
  }
  // Sync budget (v14 cost pass): idle/seated → 0 msgs; moving → ≤2Hz and only when a peer is near (same floor, ≤NEAR px),
  // otherwise one keep-alive every 5s; +1 final stop update. Presence (track) only when appearance/floor/name changes.
  tick(me) {
    this.me = me; if (!this.ch || this.status !== 'online') return; const now = performance.now();
    const st = this.state(), L = this.lastSt, moved = !L || st.x !== L.x || st.y !== L.y || st.face !== L.face || st.anim !== L.anim || st.fl !== L.fl;
    this.gridOn = this.peers.size >= Net.GRID_ON || (this.gridOn && this.peers.size > Net.GRID_OFF); if (this.gridOn) this.updateCells(st); else if (this.cells?.size) { for (const c of this.cells.values()) { try { this.sb.removeChannel(c.ch); } catch { } } this.cells.clear(); this._cc = null; };
    let due; if (DO_MODE) { // send on direction/target/anim/floor change (+3s keepalive while moving, +final stop); receivers interpolate
      const dx = L ? Math.sign(st.x - L.x) : 0, dy = L ? Math.sign(st.y - L.y) : 0, dir = dx + ',' + dy + ',' + st.face + ',' + st.anim + ',' + st.fl;
      due = moved && ((dir !== this.lastDir && now - this.lastSend > 120) || now - this.lastSend > 3000); if (due) this.lastDir = dir; }
    else due = moved && now - this.lastSend > (this.nearPeer(st) ? Net.POS_MS : Net.FAR_MS);
    if (due) { this.lastSend = now; this.lastSt = st; this.sent = (this.sent || 0) + 1;
      const own = this.cells.get(this.cellKey(st)); (own?.ok ? own.ch : this.ch).send({ type: 'broadcast', event: 'pos', payload: st }); }
    const K = JSON.stringify([st.outfit, st.av, st.equip, st.fl, st.name]);
    if (K !== this.lastPresK && now - this.lastPres > 2500) { this.lastPres = now; this.lastPresK = K; this.ch.track(st); }
  }
  cellOf(st) { return [Math.floor(st.x / CELL), Math.floor(st.y / CELL)]; }
  cellKey(st, cx, cy) { if (cx === undefined) [cx, cy] = this.cellOf(st); return `${this.topic}:g${st.fl ?? 0}_${cx}_${cy}`; }
  updateCells(st) { const [cx, cy] = this.cellOf(st), f = st.fl ?? 0; if (this._cc === `${f},${cx},${cy}`) return; this._cc = `${f},${cx},${cy}`;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const k = this.cellKey(st, cx + dx, cy + dy); if (this.cells.has(k)) continue;
      const c = { ch: this.sb.channel(k, { config: { broadcast: { self: false } } }), ok: false, cx: cx + dx, cy: cy + dy, f }; this.cells.set(k, c);
      c.ch.on('broadcast', { event: 'pos' }, ({ payload: p }) => { if (p.id !== this.id && this.peers.has(p.id)) this.upsert(p.id, p, false); this.rx = (this.rx || 0) + 1; });
      c.ch.on('broadcast', { event: 'want' }, () => { const me = this.me && this.state(), now = performance.now(); if (!me || this.cellKey(me) !== k || now - (this._ans || 0) < 2000) return; this._ans = now; c.ch.send({ type: 'broadcast', event: 'pos', payload: me }); });
      c.ch.subscribe(s => { c.ok = s === 'SUBSCRIBED'; if (c.ok) c.ch.send({ type: 'broadcast', event: 'want', payload: {} }); }); } // newcomer asks idle users in that cell for one position
    for (const [k, c] of this.cells) if (c.f !== f || Math.abs(c.cx - cx) > KEEP || Math.abs(c.cy - cy) > KEEP) { this.cells.delete(k); try { this.sb.removeChannel(c.ch); } catch { } } }
  nearPeer(st) { for (const p of this.peers.values()) { const b = p.buf[p.buf.length - 1]; if (!b || p.goneAt) continue; if ((p.fl ?? null) !== (st.fl ?? null)) continue; if (Math.abs(b.x - st.x) < Net.NEAR && Math.abs(b.y - st.y) < Net.NEAR) return true; } return false; }
  // interpolated sample ~1.15s in the past (1Hz near / 0.5Hz far senders)
  sample(p) { const b = p.buf; if (!b.length) return null; const t = performance.now() - 1150;
    if (b.length === 1 || t <= b[0].t) return b[0];
    for (let i = b.length - 1; i > 0; i--) if (b[i - 1].t <= t) { const a = b[i - 1], c = b[i]; if (t >= c.t) return { ...c, stale: t - c.t }; const k = (t - a.t) / (c.t - a.t); return { x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k, face: c.face, anim: c.anim }; }
    return b[b.length - 1]; }
  send(ev, payload) { if (this.ch && this.status === 'online') this.ch.send({ type: 'broadcast', event: ev, payload: { id: this.id, ...payload } }); }
  async chat(name, text) { this.send('chat', { name, text }); if (this.sb && this.room && NS === 'chapel:') try { await this.sb.from('chat_messages').insert({ room: this.room, name: name.slice(0, 12), body: text.slice(0, 80), client_id: this.id }); } catch { } }
  // ---- lobby: one presence channel, each member tracks {dong}; gives head counts per 행정동 for the map
  async lobby(dong, name, shard = 1) { if (!this.sb) return; this.lobbyMe = { dong, name, shard }; if (!this.admitted) return; /* waiting/solo: no Realtime at all */
    if (this.lb) { const k = JSON.stringify(this.lobbyMe); if (k !== this.lbKey) { this.lbKey = k; try { await this.lb.track(this.lobbyMe); } catch { } } return; }
    const lb = this.lb = this.sb.channel(NS + 'lobby', { config: { presence: { key: this.id } } });
    lb.on('presence', { event: 'sync' }, () => { const c = {}, sh = {}; for (const arr of Object.values(lb.presenceState())) { const m = arr[arr.length - 1], d = m.dong; if (d) { c[d] = (c[d] || 0) + 1; const n = m.shard || 1; (sh[d] ||= {})[n] = (sh[d][n] || 0) + 1; } } this.counts = c; this.shards = sh; this.lbSynced = true; this.emit('counts', c); });
    lb.subscribe(async s => { if (s === 'SUBSCRIBED' && this.lobbyMe) { this.lbKey = JSON.stringify(this.lobbyMe); await lb.track(this.lobbyMe); } }); }
  async leaveLobby() { if (this.lb) { const c = this.lb; this.lb = null; this.lbKey = null; try { await c.untrack(); await this.sb.removeChannel(c); } catch { } } this.counts = {}; }
  // ---- prayer wall (RLS: public rows readable; writes only via rate-limited security-definer RPCs)
  secret() { let s = localStorage.getItem('maeul_secret'); if (!s) { s = Array.from(crypto.getRandomValues(new Uint8Array(18)), b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('maeul_secret', s); } return s; }
  async prayers(dong) { if (!this.sb) throw new Error('offline'); const [pub, mine] = await Promise.all([
      this.sb.from('prayers').select('id,room,name,body,is_public,amen_count,created_at').eq('room', dong).order('created_at', { ascending: false }).limit(40),
      this.sb.rpc('my_prayers', { p_secret: this.secret() })]);
    if (pub.error) throw pub.error; const ids = new Set((mine.data || []).map(r => r.id));
    return { list: pub.data.map(r => ({ ...r, mine: ids.has(r.id) })), mine: (mine.data || []).filter(r => r.room === dong && !r.is_public).map(r => ({ ...r, mine: true })) }; }
  async postPrayer(dong, name, body, pub) { body = window.Safe ? window.Safe.clean(body) : body; const r = await this.sb.rpc('post_prayer', { p_room: dong, p_name: name, p_body: body, p_public: pub, p_secret: this.secret() }); if (r.error) throw r.error; if (pub) this.send('prayer', { op: 'new' }); return r.data; }
  async prayWith(id, cur) { if (DO_MODE && this.ch?.raw) { if (!this.ch.raw({ t: 'tap', k: 'pray', r: String(id) })) throw new Error('offline'); return (+cur || 0) + 1; } const r = await this.sb.rpc('pray_with', { p_id: id, p_secret: this.secret() }); if (r.error) throw r.error; this.send('prayer', { op: 'amen', pid: id, n: r.data }); return r.data; }
  async history(room) { if (NS !== 'chapel:') return; try { const { data } = await this.sb.from('chat_messages').select('name,body,created_at').eq('room', room).order('created_at', { ascending: false }).limit(8); if (data && this.room === room) this.emit('history', data.reverse()); } catch { } }
}

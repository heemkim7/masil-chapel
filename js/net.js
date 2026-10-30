// Realtime multiplayer via Supabase Realtime (Presence = who's here, Broadcast = 10Hz moves, chat, emotes, jumps).
// Fully optional: if the CDN or Supabase is unreachable, the game keeps running single-player.
// v6: Seoul project (ap-northeast-2). Rooms = 행정동 code + scene; a shared lobby presence channel gives per-dong head counts.
export const SUPA_URL = 'https://gisykxqhticmdhmupnry.supabase.co';
export const SUPA_KEY = 'sb_publishable__yq2TXlS1wg8-6FotfrbEg_ckhZxgTj'; // publishable key: public by design
const CDN = 'https://esm.sh/@supabase/supabase-js@2.45.4';

export class Net {
  constructor() { this.sb = null; this.ch = null; this.room = null; this.id = Math.random().toString(36).slice(2, 10); this.peers = new Map(); this.status = 'offline'; this.h = {}; this.me = null; this.lastSend = 0; this.lastPres = 0; }
  on(ev, fn) { (this.h[ev] ||= []).push(fn); } emit(ev, ...a) { for (const f of this.h[ev] || []) f(...a); }
  async init() {
    try { const m = await Promise.race([import(CDN), new Promise((_, r) => setTimeout(() => r(new Error('cdn timeout')), 8000))]);
      this.sb = m.createClient(SUPA_URL, SUPA_KEY, { realtime: { params: { eventsPerSecond: 30 } }, auth: { persistSession: false } }); return true;
    } catch (e) { console.warn('[net] offline:', e.message); this.setStatus('offline'); return false; }
  }
  setStatus(s) { this.status = s; this.emit('status', s, this.peers.size); }
  async join(room, me) {
    this.me = me; if (!this.sb) return; if (this.room === room && this.ch) return;
    await this.leave(); this.room = room; this.setStatus('connecting');
    const ch = this.ch = this.sb.channel('chapel:' + room.replace(/^d(\d+)(?:-(\d+))?/, (m, c, n) => c + '-' + (n || 1)), { config: { presence: { key: this.id }, broadcast: { self: false } } });
    ch.on('presence', { event: 'sync' }, () => { const st = ch.presenceState(), seen = new Set();
      for (const [k, arr] of Object.entries(st)) { if (k === this.id) continue; const m = arr[arr.length - 1]; seen.add(k); this.upsert(k, m, true); }
      for (const k of [...this.peers.keys()]) if (!seen.has(k)) { this.peers.delete(k); this.emit('leave', k); }
      this.emit('status', this.status, this.peers.size); });
    ch.on('broadcast', { event: 'pos' }, ({ payload: p }) => { if (p.id !== this.id) this.upsert(p.id, p, false); });
    ch.on('broadcast', { event: 'chat' }, ({ payload: p }) => this.emit('chat', p));
    ch.on('broadcast', { event: 'emote' }, ({ payload: p }) => this.emit('emote', p));
    ch.on('broadcast', { event: 'praise' }, ({ payload: p }) => this.emit('praise', p));
    ch.on('broadcast', { event: 'prayer' }, ({ payload: p }) => this.emit('prayer', p));
    ch.on('broadcast', { event: 'pick' }, ({ payload: p }) => this.emit('pick', p));
    ch.on('broadcast', { event: 'picks' }, ({ payload: p }) => this.emit('picks', p));
    for (const ev of ['lead', 'lmsg', 'svc', 'offer', 'tier', 'seat', 'photo', 'amen', 'decor']) ch.on('broadcast', { event: ev }, ({ payload: p }) => this.emit(ev, p));
    ch.on('broadcast', { event: 'jump' }, ({ payload: p }) => this.emit('jump', p));
    ch.subscribe(async (s) => { if (ch !== this.ch) return;
      if (s === 'SUBSCRIBED') { this.setStatus('online'); await ch.track(this.state()); this.history(room); }
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') this.setStatus('offline'); });
  }
  async leave() { if (this.ch) { const c = this.ch; this.ch = null; try { await c.untrack(); await this.sb.removeChannel(c); } catch { } } for (const k of this.peers.keys()) this.emit('leave', k); this.peers.clear(); }
  state() { const m = this.me; return { id: this.id, name: m.name, outfit: m.outfit, x: Math.round(m.x), y: Math.round(m.y), face: m.face, anim: m.anim, equip: m.equip, av: m.av }; }
  upsert(k, m, fromPresence) {
    let p = this.peers.get(k); const now = performance.now();
    if (!p) { p = { id: k, buf: [] }; this.peers.set(k, p); this.emit('join', p, m); }
    Object.assign(p, { name: m.name ?? p.name, outfit: m.outfit ?? p.outfit, equip: m.equip ?? p.equip, av: m.av ?? p.av });
    if (!fromPresence || !p.buf.length) { p.buf.push({ t: now, x: m.x, y: m.y, face: m.face, anim: m.anim }); if (p.buf.length > 20) p.buf.shift(); }
    this.emit('update', p);
  }
  // called each frame; broadcasts at ~10Hz (and immediately on stop), presence refresh at ~0.5Hz
  tick(me) {
    this.me = me; if (!this.ch || this.status !== 'online') return; const now = performance.now();
    const st = this.state(), moved = !this.lastSt || st.x !== this.lastSt.x || st.y !== this.lastSt.y || st.face !== this.lastSt.face || st.anim !== this.lastSt.anim;
    if (now - this.lastSend > 100 && moved) { this.lastSend = now; this.lastSt = st; this.ch.send({ type: 'broadcast', event: 'pos', payload: st }); }
    if (now - this.lastPres > 2500 && (JSON.stringify([st.outfit, st.av, st.equip]) !== this.lastPresK || st.name !== this.lastPresSt?.name || (now - this.lastPres > 15000 && (st.x !== this.lastPresSt?.x || st.y !== this.lastPresSt?.y || st.face !== this.lastPresSt?.face)))) { this.lastPres = now; this.lastPresSt = st; this.lastPresK = JSON.stringify([st.outfit, st.av, st.equip]); this.ch.track(st); }
  }
  // interpolated sample ~120ms in the past
  sample(p) { const b = p.buf; if (!b.length) return null; const t = performance.now() - 120;
    if (b.length === 1 || t <= b[0].t) return b[0];
    for (let i = b.length - 1; i > 0; i--) if (b[i - 1].t <= t) { const a = b[i - 1], c = b[i]; if (t >= c.t) return { ...c, stale: t - c.t }; const k = (t - a.t) / (c.t - a.t); return { x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k, face: c.face, anim: c.anim }; }
    return b[b.length - 1]; }
  send(ev, payload) { if (this.ch && this.status === 'online') this.ch.send({ type: 'broadcast', event: ev, payload: { id: this.id, ...payload } }); }
  async chat(name, text) { this.send('chat', { name, text }); if (this.sb && this.room) try { await this.sb.from('chat_messages').insert({ room: this.room, name: name.slice(0, 12), body: text.slice(0, 80), client_id: this.id }); } catch { } }
  // ---- lobby: one presence channel, each member tracks {dong}; gives head counts per 행정동 for the map
  async lobby(dong, name, shard = 1) { if (!this.sb) return; this.lobbyMe = { dong, name, shard };
    if (this.lb) { const k = JSON.stringify(this.lobbyMe); if (k !== this.lbKey) { this.lbKey = k; try { await this.lb.track(this.lobbyMe); } catch { } } return; }
    const lb = this.lb = this.sb.channel('chapel:lobby', { config: { presence: { key: this.id } } });
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
  async prayWith(id) { const r = await this.sb.rpc('pray_with', { p_id: id, p_secret: this.secret() }); if (r.error) throw r.error; this.send('prayer', { op: 'amen', pid: id, n: r.data }); return r.data; }
  async history(room) { try { const { data } = await this.sb.from('chat_messages').select('name,body,created_at').eq('room', room).order('created_at', { ascending: false }).limit(8); if (data && this.room === room) this.emit('history', data.reverse()); } catch { } }
}

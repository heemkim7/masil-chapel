const BUILD = '9da57f1302';
// 마실채플 service worker (cost pass). Same-origin /assets/* only; HTML/JS/CSS/config go straight to the network (no-cache headers).
// - every asset request is rewritten to /assets/X?v=<content hash> from asset-manifest.json → immutable URL, new file = new URL
// - images/json: cache-first after first fetch. Audio: cached on FIRST PLAY only (never prefetched), then served from Cache API with
//   Range support → zero network bytes on replay / next visit. Entries whose hash is no longer in the manifest are deleted on activate.
const C_AUD = 'maeul-audio-v1', C_IMG = 'maeul-img-v1';
let MAN = null;
async function man() { if (MAN) return MAN; try { const r = await fetch('/asset-manifest.json', { cache: 'no-cache' }); MAN = await r.json(); } catch { MAN = {}; } return MAN; }
self.addEventListener('install', e => { e.waitUntil(man().then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil((async () => { MAN = null; const m = await man(); const keep = new Set(Object.entries(m).map(([p, h]) => '/' + p + '?v=' + h));
  for (const n of [C_AUD, C_IMG]) { const c = await caches.open(n); for (const q of await c.keys()) { const u = new URL(q.url); if (!keep.has(decodeURIComponent(u.pathname) + u.search)) await c.delete(q); } }
  for (const k of await caches.keys()) if (![C_AUD, C_IMG].includes(k)) await caches.delete(k);
  await self.clients.claim(); })()); });
function rangeResp(full, range) { return full.arrayBuffer().then(buf => { const m = /bytes=(\d*)-(\d*)/.exec(range || ''); const n = buf.byteLength; let a = m && m[1] ? +m[1] : 0, b = m && m[2] ? +m[2] : n - 1; if (!m || !m[1] && m[2]) { a = m ? n - +m[2] : 0; b = n - 1; }
  if (a >= n) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${n}` } });
  return new Response(buf.slice(a, b + 1), { status: 206, headers: { 'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${a}-${b}/${n}`, 'Content-Length': String(b - a + 1), 'Accept-Ranges': 'bytes', 'X-SW-Cache': 'hit' } }); }); }
self.addEventListener('fetch', e => { const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith('/assets/')) return;
  e.respondWith((async () => { const m = await man(), p = decodeURIComponent(u.pathname.slice(1)), h = m[p]; if (!h) return fetch(e.request);
    const key = '/' + p + '?v=' + h, audio = /\.(mp3|m4a|ogg)$/.test(p), cn = audio ? C_AUD : C_IMG, c = await caches.open(cn);
    let hit = await c.match(key);
    if (!hit) { // revalidate the plain URL (304 → body from HTTP cache, ~0 bytes) instead of re-downloading under the versioned key
      let r = await fetch('/' + p, { cache: 'no-cache' }).catch(() => null); if (!r || !r.ok || r.status === 206) r = await fetch(key); if (!r.ok) return r; await c.put(key, r.clone()); if (!audio) return r; hit = await c.match(key); }
    if (audio) { const rg = e.request.headers.get('range'); if (rg) return rangeResp(hit, rg); }
    return hit; })()); });

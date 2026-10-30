// Runs synchronously BEFORE any module: installs the 'resetting' guard so no save/unload handler can re-write storage
// while we wipe. window.MaeulReset.logout() = local wipe (server data kept). .full() = server delete_account + local wipe.
(function () {
  var SB = 'https://gisykxqhticmdhmupnry.supabase.co', KEY = 'sb_publishable__yq2TXlS1wg8-6FotfrbEg_ckhZxgTj';
  window.__RESETTING = false;
  var si = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (window.__RESETTING) return; return si.call(this, k, v); };
  var stop = function (e) { if (window.__RESETTING) { e.stopImmediatePropagation(); } };
  ['pagehide', 'beforeunload', 'unload', 'visibilitychange'].forEach(function (t) { addEventListener(t, stop, true); });
  async function wipeLocal() {
    try { var sb = window.G && window.G.net && window.G.net.sb; if (sb && sb.auth) await Promise.race([sb.auth.signOut(), new Promise(function (r) { setTimeout(r, 800); })]); } catch (e) { }
    try { localStorage.clear(); } catch (e) { } try { sessionStorage.clear(); } catch (e) { }
    try { if (indexedDB.databases) { var ds = await indexedDB.databases(); ds.forEach(function (d) { d.name && indexedDB.deleteDatabase(d.name); }); } } catch (e) { }
    try { if (window.caches) { var ks = await caches.keys(); await Promise.all(ks.map(function (k) { return caches.delete(k); })); } } catch (e) { }
    try { if (navigator.serviceWorker) { var rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(function (r) { return r.unregister(); })); } } catch (e) { }
    try { document.cookie.split(';').forEach(function (c) { var n = c.split('=')[0].trim(); if (n) document.cookie = n + '=; Max-Age=0; path=/'; }); } catch (e) { }
  }
  function go() { location.replace(location.pathname); }
  async function full() {
    window.__RESETTING = true; var s = null; try { s = localStorage.getItem('maeul_secret'); } catch (e) { }
    var ok = true;
    if (s) { try { var r = await fetch(SB + '/rest/v1/rpc/delete_account', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_secret: s }) }); ok = r.ok; } catch (e) { ok = false; } }
    await wipeLocal(); try { si.call(sessionStorage, 'maeul_reset_done', ok ? '1' : 'local'); } catch (e) { } go(); return ok;
  }
  async function logout() { window.__RESETTING = true; await wipeLocal(); go(); }
  window.MaeulReset = { full: full, logout: logout };
  if (/[?&]reset=1(&|$)/.test(location.search)) { window.__RESETTING = true; document.documentElement.style.visibility = 'hidden'; full(); }
})();

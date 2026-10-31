// Mobile hardening: realtime unsubscribe while backgrounded (rejoin on return), adaptive DPR on slow devices,
// no long-press menus / double-tap zoom on the game surface, orientation/viewport resync.
export function initMobile() {
  const G = () => window.G, net = () => G()?.net; let hideT = null, parked = null;
  document.addEventListener('visibilitychange', () => {
    const n = net(); if (!n) return;
    if (document.hidden) { clearTimeout(hideT); hideT = setTimeout(() => { if (!document.hidden || !n.ch) return; parked = { room: n.room, me: n.me, lob: n.lobbyMe }; n.room = null; n.leave(); n.leaveLobby?.(); window.__parked = true; }, 45000); }
    else { clearTimeout(hideT); if (parked) { const p = parked; parked = null; window.__parked = false; try { p.room && n.join(p.room, p.me); p.lob && n.lobby(p.lob.dong, p.lob.name, p.lob.shard); } catch (e) { console.warn(e); } } }
  });
  addEventListener('pagehide', e => { if (e.persisted) return; const n = net(); try { n?.leave(); n?.leaveLobby?.(); n?.gateLeave?.(); } catch { } });
  // adaptive DPR: if the frame budget is blown for ~3s, drop the canvas pixel ratio cap 2 -> 1.5 -> 1
  window.__dprCap = 2; let acc = 0, n = 0, lastT = performance.now();
  const tick = t => { const d = t - lastT; lastT = t; if (!document.hidden && d < 500) { acc += d; n++; if (acc > 3000) { const avg = acc / n; if (avg > 28 && window.__dprCap > 1) { window.__dprCap = Math.max(1, window.__dprCap - .5); } acc = 0; n = 0; } } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const cv = document.querySelector('#cv') || document.querySelector('canvas'); cv && cv.addEventListener('contextmenu', e => e.preventDefault());
  let lt = 0; document.addEventListener('touchend', e => { const t = Date.now(); if (t - lt < 320 && !e.target.closest('input,textarea')) e.preventDefault(); lt = t; }, { passive: false });
  addEventListener('orientationchange', () => setTimeout(() => dispatchEvent(new Event('resize')), 250));
}

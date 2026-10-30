// Phase 1 extras: guest instant entry, live headcount → room list, 장면 담기 share card, amen toasts.
const $ = s => document.querySelector(s);
export function initPhase1() {
  const G = () => window.G;
  const g0 = $('#guest'); if (g0) g0.onclick = () => { location.search = '?play=1'; };
  const on = $('#online'); if (on) on.onclick = () => G()?.V?.openShards?.();
  for (const id of ['btn-candle', 'btn-church']) { const b = document.getElementById(id); if (b) b.style.display = 'none'; } // later phase
  const sb = $('#btn-shot'); if (sb) sb.onclick = shot;
  let lastT = 0;
  G()?.net?.on('emote', p => { if (p.e !== 'pray') return; const c = G().remotes.get(p.id); const n = performance.now(); if (!c || n - lastT < 2500) return; lastT = n; G().toast(`🙏 ${c.name}님이 아멘했어요`); });
}
let shotUrl = '';
function shot() {
  const G = window.G, cv = $('#cv') || document.querySelector('canvas'); if (!cv) return;
  const W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#fff6ec'; g.fillRect(0, 0, W, H);
  const s = Math.max(W / cv.width, (H - 110) / cv.height), w = cv.width * s, h = cv.height * s;
  g.save(); g.beginPath(); g.roundRect(24, 24, W - 48, H - 140, 24); g.clip(); g.drawImage(cv, (W - w) / 2, 24 + (H - 140 - h) / 2, w, h); g.restore();
  const d = G.V?.current?.(), n = (G.remotes?.size || 0) + 1;
  g.fillStyle = '#5b4a7a'; g.font = '800 40px Pretendard,sans-serif'; g.fillText('마실채플', 40, H - 52);
  g.font = '600 24px Pretendard,sans-serif'; g.fillStyle = '#7d6a99';
  g.fillText(`${d ? d.name + ' 예배당' : '우리 동네 예배당'} · 지금 ${n}명 · ${new Date().toLocaleDateString('ko-KR')}`, 240, H - 58);
  g.font = '500 20px Pretendard,sans-serif'; g.fillText('링크로 바로 같은 방에 들어와요 🐑', 240, H - 28);
  shotUrl = c.toDataURL('image/png'); $('#shotimg').src = shotUrl; G.openModal ? G.openModal('#shotm') : ($('#shotm').style.display = 'flex');
  $('#shotsave').onclick = () => { const a = document.createElement('a'); a.href = shotUrl; a.download = 'maeul-chapel.png'; a.click(); };
  $('#shotlink').onclick = () => window.shareLink(G.V?.link?.() || location.href);
}

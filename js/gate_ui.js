// Entry-gate waiting screen. Driven only by net 'gate' events (REST polling inside net.js) — no Realtime while waiting.
export function gateUI(net, onSolo) {
  let el = null; const box = () => { if (el) return el; el = document.createElement('div'); el.id = 'gatewait';
    el.innerHTML = '<div class="gw-card"><div class="gw-ic">⛪</div><b class="gw-t">입장 대기 중</b><p class="gw-s"></p><small class="gw-n">자리가 나면 순서대로 자동으로 들어가요 · 약 10초마다 확인해요</small><button class="gw-solo">혼자 둘러보기</button></div>';
    el.querySelector('.gw-solo').onclick = () => { net.goSolo(); onSolo?.(); hide(); }; document.body.appendChild(el); return el; };
  const hide = () => { if (el) el.style.display = 'none'; };
  net.on('gate', g => {
    if (g.ok || g.solo || g.checking) return hide();
    if (!g.down && !Number.isFinite(+g.pos)) return hide(); // malformed gate reply: never show 'NaN명'
    if (g.down) { box().style.display = 'flex'; el.querySelector('.gw-t').textContent = '혼잡: 혼자 둘러보기'; el.querySelector('.gw-s').textContent = '지금은 함께 모드 연결이 어려워요. 혼자서 마을과 예배당을 둘러볼 수 있어요.'; el.querySelector('.gw-n').textContent = ''; el.querySelector('.gw-solo').textContent = '혼자 둘러보기'; return; }
    box().style.display = 'flex'; el.querySelector('.gw-t').textContent = `입장 대기 중 · 앞에 ${Math.max(0, g.pos - 1)}명`;
    el.querySelector('.gw-s').textContent = `지금 ${g.live}/${g.cap}명이 함께 있어요${g.guard && g.guard !== 'none' ? ' · 오늘은 이용이 많아 인원을 조금 줄였어요' : ''}`;
  });
}

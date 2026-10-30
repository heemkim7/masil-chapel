// fb5 UI layer (no character rendering): gacha rates label, 꾸미기 pet/instrument categories,
// touch/PC control guide split, title live badge from REAL Supabase lobby presence.
(function () {
  const $ = s => document.querySelector(s);
  // --- device class for the control guide (CSS also has a pointer:coarse media query)
  const touch = matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  document.documentElement.classList.add(touch ? 'touch' : 'fine');

  const ready = () => window.G && G.cfg && G.cfg();
  const wait = (fn, t = 0) => ready() ? fn() : t < 600 && setTimeout(() => wait(fn, t + 1), 100);

  // --- drop rates per grade, derived from the SAME cfg.gacha.pool weights the roll logic uses
  // (js/state.js rollGacha + phase2 roll; server gacha_pool seeds identical weights), so label == logic.
  function rates() {
    const pool = G.cfg().gacha.pool, tot = pool.reduce((a, p) => a + p.w, 0), by = {};
    for (const p of pool) by[p.rar] = (by[p.rar] || 0) + p.w;
    return ['일반', '희귀', '전설'].filter(k => by[k]).map(k => [k, Math.round(10000 * by[k] / tot) / 100]);
  }
  function paintRates() {
    const g = G.cfg().gacha, txt = '❓ 등급별 확률 (' + rates().map(([k, v]) => `${k} ${v}%`).join(' · ') + ')';
    for (const el of document.querySelectorAll('[data-rates]')) el.textContent = el.closest('#gacha') ? `${txt} · 중복 장신구는 ${g.dupRefund}달란트 환급` : `🎁 달란트 뽑기 ${txt}`;
  }
  window.FB5 = { rates, live: () => ({ ch: !!ch, state: ch?.state, topic: ch?.topic, ps: ch && ch.presenceState() }) };

  // --- copy fix inside main.js-rendered gacha text (main.js is owned by another worker)
  function fixGres() { const r = $('#gres'); if (!r) return; new MutationObserver(() => { const p = r.querySelector('p'); if (p && /^헌금 /.test(p.textContent)) p.textContent = p.textContent.replace(/^헌금 /, ''); }).observe(r, { childList: true, subtree: true }); }

  // --- 꾸미기: relabel the existing pet slot, add 악기 only for instruments that really exist in the cosmetics catalog
  const INSTR = ['기타', '수금', '하프', '바이올린', '플루트', '나팔', '탬버린', '우쿨렐레', '피아노', '드럼'];
  function invExtra() {
    const items = $('#inv-items'); if (!items) return;
    for (const b of items.querySelectorAll('.slot > b')) if (b.textContent === '친구') b.textContent = '🕊 동행 펫';
    const COS = G.AV?.COS || {}; const ins = Object.entries(COS).filter(([, c]) => INSTR.includes(c.name));
    let sec = $('#inv-instr');
    if (!ins.length) { sec?.remove(); return; }
    if (!sec) { sec = document.createElement('div'); sec.id = 'inv-instr'; sec.className = 'fb5-cat'; items.after(sec); }
    const own = new Set(G.S?.cos || []);
    sec.innerHTML = '<h4>🎸 악기</h4><div class="slot">' + ins.map(([id, c]) => `<button class="item" data-cz="${id}" ${own.has(id) ? '' : 'disabled'}><small>${own.has(id) ? c.name : '🔒 ' + c.name + ' · ' + c.rar}</small></button>`).join('') + '</div><small class="grates">악기는 👗 캐릭터 꾸미기 › 등 슬롯에서 착용해요</small>';
    sec.querySelectorAll('button[data-cz]').forEach(b => b.onclick = () => { G.closeModal(); G.Cust?.open(); });
  }
  function watchInv() { const it = $('#inv-items'); if (it) new MutationObserver(() => { if (!it.dataset.fb) { it.dataset.fb = 1; invExtra(); delete it.dataset.fb; } }).observe(it, { childList: true }); }

  // --- title live badge: real lobby presence (production namespace 'chapel:'; QA clients live in 'chapelqa:' and are never counted here)
  let ch = null;
  function liveBadges(n) { const el = $('#tlive'); if (!el) return;
    el.innerHTML = n > 0 ? `<span class="lb">🔥 지금 전국 예배당에 ${n}명의 이웃이 모여 있어요</span>` : ''; } // 0 / no data → hidden; no candle badge: no real candle data exists
  async function startLive() {
    const title = $('#title'); if (!title) return;
    let sb, N;
    try { N = await import('./net.js'); const m = await Promise.race([import('https://esm.sh/@supabase/supabase-js@2.45.4'), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000))]);
      // separate, auth-less, read-only client: the title screen runs before the game's own net.init()
      sb = m.createClient(N.SUPA_URL, N.SUPA_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'maeul_title_watch' } });
    } catch (e) { console.warn('[fb5 live]', e); return; } // offline → no badge (never a fake number)
    if (N.NS !== 'chapel:' && !/[?&]qa=1/.test(location.search) && !window.__QA && !navigator.webdriver) return;
    ch = sb.channel(N.NS + 'lobby', { config: { presence: { key: 'title-watch-' + Math.random().toString(36).slice(2, 8), enabled: true } } }); // never track() → watcher is not counted
    ch.on('presence', { event: 'sync' }, () => { let n = 0; for (const arr of Object.values(ch.presenceState())) { const m = arr[arr.length - 1]; if (m && m.dong && !m.bot && !m.npc) n++; } liveBadges(n); });
    ch.subscribe();
    const stop = () => { if (!ch) return; const c = ch; ch = null; sb.removeChannel(c).catch(() => { }); sb.realtime?.disconnect?.(); };
    let seen = false; const o = new MutationObserver(() => { const vis = getComputedStyle(title).display !== 'none'; if (vis) seen = true; else if (seen) { stop(); o.disconnect(); } }); o.observe(title, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  startLive(); wait(() => { paintRates(); fixGres(); watchInv(); });
})();
